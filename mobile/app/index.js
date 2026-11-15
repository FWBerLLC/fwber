import { StyleSheet, View, BackHandler, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

const TARGET_DOMAIN = 'fwber.online';

/**
 * Strict hostname verification for WebView navigation and WebRTC media permissions.
 *
 * WHY THIS DESIGN:
 * Using `hostname.includes('fwber.online')` is vulnerable to subdomain spoofing
 * (e.g. `fwber.online.attacker.example`). We explicitly verify exact match or
 * dot-prefixed subdomain match (`*.fwber.online`), plus loopback dev hosts.
 */
function isTrustedHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase();
  return (
    normalized === TARGET_DOMAIN ||
    normalized.endsWith(`.${TARGET_DOMAIN}`) ||
    normalized === 'localhost' ||
    normalized === '127.0.0.1'
  );
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Home() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);

  // 1. Initialize Native Capabilities
  useEffect(() => {
    (async () => {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(locStatus === 'granted');

      await Notifications.requestPermissionsAsync();

      try {
        const supported = await NfcManager.isSupported();
        setNfcSupported(supported);
        if (supported) {
          await NfcManager.start();
        }
      } catch (e) {
        console.warn('NFC initialization failed', e);
      }
    })();
  }, []);

  // 2. NFC Native -> WebView Bridge (invoked on demand when WebView dispatches START_NFC_SCAN)
  const startNfcDiscovery = useCallback(async () => {
    if (!nfcSupported) return;
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();

      if (tag && Array.isArray(tag.ndefMessage) && tag.ndefMessage.length > 0) {
        const payload = Ndef.text.decodePayload(tag.ndefMessage[0].payload);
        const js = `
          if (window.handleNativeNFC) {
            window.handleNativeNFC(${JSON.stringify(payload)});
          }
          true;
        `;
        webViewRef.current?.injectJavaScript(js);
      }
    } catch (ex) {
      console.warn('NFC Read Error', ex);
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }, [nfcSupported]);

  // 2.5 Notification Bridge (Foreground)
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const js = `
        if (window.handleNativeNotification) {
          window.handleNativeNotification(${JSON.stringify(notification.request.content)});
        }
        true;
      `;
      webViewRef.current?.injectJavaScript(js);
    });

    return () => subscription.remove();
  }, []);

  // 3. WebView -> Native Bridge
  const onMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'START_NFC_SCAN') {
        await startNfcDiscovery();
      }

      if (data.type === 'NFC_WRITE' && typeof data.payload === 'string') {
        try {
          await NfcManager.requestTechnology(NfcTech.Ndef);
          const bytes = Ndef.encodeMessage([Ndef.textRecord(data.payload)]);
          if (bytes) {
            await NfcManager.ndefHandler.writeNdefMessage(bytes);
          }
        } finally {
          NfcManager.cancelTechnologyRequest().catch(() => {});
        }
      }
    } catch (e) {
      console.error('Bridge Error', e);
    }
  };

  // 4. Handle Android Hardware Back Button (RN 0.83+ EventSubscription.remove())
  useEffect(() => {
    const handleBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    const { url } = navState;
    if (!url) return;

    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'about:' || parsed.protocol === 'blob:') return;
      if (!isTrustedHostname(parsed.hostname)) {
        webViewRef.current?.stopLoading();
        Linking.openURL(url);
      }
    } catch {
      // Ignore malformed transient WebView URLs
    }
  };

  // Grant WebRTC camera/microphone capture inside Android WebView only for trusted fwber.online origins
  const handlePermissionRequest = (request) => {
    try {
      const originHost = new URL(request.origin).hostname;
      if (isTrustedHostname(originHost)) {
        request.grant(request.resources);
        return;
      }
    } catch {
      // Deny if origin cannot be parsed
    }
    request.deny();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <WebView
        ref={webViewRef}
        source={{ uri: `https://${TARGET_DOMAIN}` }}
        style={styles.webview}
        bounces={false}
        showsVerticalScrollIndicator={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onPermissionRequest={handlePermissionRequest}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={onMessage}
        geolocationEnabled={locationGranted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
