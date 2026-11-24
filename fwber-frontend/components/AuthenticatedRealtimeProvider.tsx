'use client';

import { useAuth } from '@/lib/auth-context';
import { PresenceProvider, WebSocketContextValue } from '@/lib/contexts/PresenceContext';
import { useWebSocket } from '@/lib/hooks/use-websocket';

interface AuthenticatedRealtimeProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
}

/**
 * A wrapper that provides realtime features only when user is authenticated.
 * 
 * Use this in layouts for sections that need presence, typing indicators, etc.
 * It will gracefully degrade to no realtime features if user is not logged in.
 */
export function AuthenticatedRealtimeProvider({
  children,
  autoConnect = true,
}: AuthenticatedRealtimeProviderProps) {
  const { isAuthenticated } = useAuth();
  const websocket = useWebSocket({ autoConnect });

  // Always render the same PresenceProvider wrapper. Swapping between a bare
  // fragment (unauthenticated) and PresenceProvider (once auth resolved)
  // changes the element type above every page, which remounts the whole
  // subtree and wipes in-progress form input typed in the first moments
  // after navigation (observed on the event/group create forms). Presence
  // consumers already tolerate the disconnected default value.

  // Cast onlineUsers to any to bypass strict type check for now
  // Ideally, ensure types in PresenceContext and use-pusher-logic match exactly
  const contextValue: WebSocketContextValue = isAuthenticated
    ? {
        connectionStatus: {
            connected: websocket.connectionStatus.connected,
            connecting: websocket.connectionStatus.connecting,
            configured: websocket.connectionStatus.configured,
            reconnectAttempts: websocket.connectionStatus.reconnectAttempts
        },
        onlineUsers: (websocket.onlineUsers || []) as any,
        typingIndicators: (websocket.typingIndicators || []) as any,
        sendTypingIndicator: websocket.sendTypingIndicator,
      }
    : {
        connectionStatus: {
            connected: false,
            connecting: false,
            configured: false,
            reconnectAttempts: 0,
        },
        onlineUsers: [],
        typingIndicators: [],
      };

  return (
    <PresenceProvider value={contextValue}>
      {children}
    </PresenceProvider>
  );
}
