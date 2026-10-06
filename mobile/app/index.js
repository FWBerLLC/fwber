import { StyleSheet, View, BackHandler, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

const TARGET_DOMAIN = 'fwber.site';

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
      // Location
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(locStatus === 'granted');

      // Notifications
      const { status: pushStatus } = await Notifications.requestPermissionsAsync();
      if (pushStatus === 'granted') {
        // Forward token to webview if needed, or handle here
      }

      // NFC
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

  // 2. NFC Native -> WebView Bridge
  useEffect(() => {
    if (!nfcSupported) return;

    const startNfcDiscovery = async () => {
        try {
            await NfcManager.requestTechnology(NfcTech.Ndef);
            const tag = await NfcManager.getTag();
            
            if (tag && tag.ndefMessage) {
                const message = Ndef.decodeMessage(tag.ndefMessage[0].payload);
                const payload = Ndef.text.decodePayload(tag.ndefMessage[0].payload);
                
                // Inject into WebView
                const js = `
                  if (window.handleNativeNFC) {
                    window.handleNativeNFC(${JSON.stringify(payload)});
                  }
                `;
                webViewRef.current?.injectJavaScript(js);
            }
        } catch (ex) {
            console.warn('NFC Read Error', ex);
        } finally {
            NfcManager.cancelTechnologyRequest();
        }
    };

    // We can trigger this via a message from the WebView
  }, [nfcSupported]);

  // 2.5 Notification Bridge (Foreground)
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      // Inject into WebView as a toast trigger
      const js = `
        if (window.handleNativeNotification) {
          window.handleNativeNotification(${JSON.stringify(notification.request.content)});
        }
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
        // Trigger native NFC prompt
        NfcManager.registerTagEvent();
      }

      if (data.type === 'NFC_WRITE') {
        await NfcManager.requestTechnology(NfcTech.Ndef);
        const bytes = Ndef.encodeMessage([Ndef.textRecord(data.payload)]);
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        NfcManager.cancelTechnologyRequest();
      }
    } catch (e) {
      console.error('Bridge Error', e);
    }
  };

  // 4. Handle Android Hardware Back Button
  useEffect(() => {
    const handleBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
  }, [canGoBack]);

  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    const { url } = navState;
    if (!url) return;

    try {
      const hostname = new URL(url).hostname;
      if (!hostname.includes(TARGET_DOMAIN) && !url.includes('localhost')) {
        webViewRef.current.stopLoading();
        Linking.openURL(url);
      }
    } catch (error) {
      // Ignore
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <WebView
        ref={webViewRef}
        source={{ uri: `https://${TARGET_DOMAIN}` }}
        style={styles.webview}
        bounces={false}
        showsVerticalScrollIndicator={false}
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
  }
});
