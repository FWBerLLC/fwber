import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketLogic } from './use-socket-logic';
import { api } from '@/lib/api/client';
import type { UseWebSocketOptions, OnlineUser, PresenceUpdate, NotificationPayload } from '@/lib/types/realtime';

// Re-export types from centralized location
export * from '@/lib/types/realtime';
// Also re-export the WS-specific types for backwards compat
export type { UseWebSocketOptions } from '@/lib/types/realtime';

/**
 * Hook to access the Realtime (WebSocket) context.
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { connected, reconnectAttempts, chatMessages, typingIndicators, sendChatMessage, sendTypingIndicator, connect, disconnect } = useSocketLogic(options);

  return {
    connectionStatus: {
      connected,
      connecting: false,
      configured: true,
      connectionId: 'socket.io',
      userId: null,
      reconnectAttempts: reconnectAttempts || 0
    },
    messages: chatMessages,
    onlineUsers: [] as OnlineUser[],
    presenceUpdates: [] as PresenceUpdate[],
    notifications: [] as NotificationPayload[],
    chatMessages,
    typingIndicators,
    videoSignals: [] as any[],
    wingmanNudges: [],
    connect,
    disconnect,
    sendChatMessage,
    sendTypingIndicator,
    sendVideoSignal: async (_recipientId?: any, _signal?: any, _callId?: any) => {},
    updatePresence: async (_status?: any, _metadata?: any) => {},
    sendNotification: async () => {},
    loadConversationHistory: async () => {},
    injectMissedMessages: (_messages?: any) => {},
    clearMessages: () => {},
    clearNotifications: () => {},
    isReady: true,
  };
}

export function useWebSocketChat(recipientId?: string) {
  const { sendChatMessage, sendTypingIndicator, chatMessages, typingIndicators } = useWebSocket();

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter messages for specific recipient
  const recipientMessages = chatMessages.filter((msg: any) =>
    msg.from_user_id === recipientId || msg.to_user_id === recipientId
  );

  const handleSendMessage = useCallback((content: string) => {
    if (recipientId) {
      sendChatMessage(recipientId, content);
    }
  }, [sendChatMessage, recipientId]);

  const handleTypingChange = useCallback((value: string) => {
    if (recipientId && value.length > 0) {
      sendTypingIndicator(recipientId);
    }
  }, [sendTypingIndicator, recipientId]);

  return {
    messages: recipientMessages,
    typingIndicators: [],
    sendMessage: handleSendMessage,
    handleTypingChange,
    isTyping: false,
    chatMessages,
    onlineUsers: [] as OnlineUser[],
    currentNudges: [],
  };
}

/**
 * Hook for WebSocket presence functionality
 */
export function useWebSocketPresence() {
  const { updatePresence, onlineUsers, presenceUpdates } = useWebSocket();

  const [currentStatus, setCurrentStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');

  const setStatus = useCallback((status: 'online' | 'away' | 'busy' | 'offline', metadata?: Record<string, any>) => {
    setCurrentStatus(status);
    updatePresence(status, metadata);
  }, [updatePresence]);

  const setOnline = useCallback((metadata?: Record<string, any>) => {
    setStatus('online', metadata);
  }, [setStatus]);

  const setAway = useCallback((metadata?: Record<string, any>) => {
    setStatus('away', metadata);
  }, [setStatus]);

  const setBusy = useCallback((metadata?: Record<string, any>) => {
    setStatus('busy', metadata);
  }, [setStatus]);

  const setOffline = useCallback((metadata?: Record<string, any>) => {
    setStatus('offline', metadata);
  }, [setStatus]);

  return {
    currentStatus,
    onlineUsers,
    presenceUpdates,
    setStatus,
    setOnline,
    setAway,
    setBusy,
    setOffline,
  };
}

/**
 * Hook for WebSocket notifications
 */
export function useWebSocketNotifications() {
  const { notifications, clearNotifications } = useWebSocket();

  const [unreadCount, setUnreadCount] = useState(0);

  // Count unread notifications
  useEffect(() => {
    const unread = notifications.filter((notification: any) => !notification.read);
    setUnreadCount(unread.length);
  }, [notifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
    } catch (err) {
      // Silently fail — notification read status is non-critical
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all');
    } catch (err) {
      // Silently fail — notification read status is non-critical
    }
  }, []);

  return {
    notifications,
    unreadCount,
    clearNotifications,
    markAsRead,
    markAllAsRead,
  };
}
