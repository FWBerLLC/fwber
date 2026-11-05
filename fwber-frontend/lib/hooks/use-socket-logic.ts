import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/auth-context';
import { logWebSocket } from '@/lib/logger';

import type {
  ChatMessage,
  TypingIndicator,
} from '@/lib/types/realtime';

// ─── Singleton socket shared across all hook instances ───
let _socket: Socket | null = null;
let _connectionCount = 0;
let _listenersAttached = false;
const _chatMessages: ChatMessage[] = [];
const _typingIndicators: TypingIndicator[] = [];
type Setter<T> = (val: T | ((prev: T) => T)) => void;
const _chatMessageSetters = new Set<Setter<ChatMessage[]>>();
const _typingSetters = new Set<Setter<TypingIndicator[]>>();

const _connectedSetters = new Set<Setter<boolean>>();
const _reconnectAttemptsSetters = new Set<Setter<number>>();
const _eventAttendeesSetters = new Set<Setter<Record<string, {userId: number, lat: number, lng: number, timestamp: Date}>>>();

let _eventAttendeesLocations: Record<string, {userId: number, lat: number, lng: number, timestamp: Date}> = {};

function attachListeners(socket: Socket, userId: string | undefined) {
  if (_listenersAttached) return;
  _listenersAttached = true;

  socket.on('connect', () => {
    console.log('[Socket.io] Connected to server');
    _connectedSetters.forEach(s => s(true));
  });


  socket.on('disconnect', (reason) => {
    console.log('[Socket.io] Disconnected from server:', reason);
    _connectedSetters.forEach(s => s(false));
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    _reconnectAttemptsSetters.forEach(s => s(attempt));
  });

  socket.io.on('reconnect', () => {
    _reconnectAttemptsSetters.forEach(s => s(0));
  });

  socket.on('connect_error', (error) => {

    console.warn('[Socket.io] Connection error:', error.message);
  });

  socket.on('new_message', (data: any) => {
    logWebSocket.messageReceived('chat_message', String(data.senderId));
    const newMessage: ChatMessage = {
      id: data.id,
      from_user_id: String(data.senderId),
      to_user_id: String(userId),
      content: data.content,
      timestamp: data.createdAt,
      status: 'delivered',
    };
    _chatMessages.push(newMessage);
    const snapshot = [..._chatMessages];
    _chatMessageSetters.forEach(s => s(snapshot));
  });

  socket.on('location_updated', (data: { userId: number, lat: number, lng: number, timestamp: Date }) => {
    _eventAttendeesLocations = {
      ..._eventAttendeesLocations,
      [data.userId.toString()]: {
        userId: data.userId,
        lat: data.lat,
        lng: data.lng,
        timestamp: data.timestamp
      }
    };
    const snapshot = { ..._eventAttendeesLocations };
    _eventAttendeesSetters.forEach(s => s(snapshot));
  });

  socket.on('user_typing', (data: any) => {
    const indicator: TypingIndicator = {
      from_user_id: String(data.senderId),
      to_user_id: String(userId),
      is_typing: true,
      timestamp: new Date().toISOString(),
    };
    // Remove existing indicator for this user, then add new one
    const idx = _typingIndicators.findIndex(i => i.from_user_id === indicator.from_user_id);
    if (idx !== -1) _typingIndicators.splice(idx, 1);
    _typingIndicators.push(indicator);
    const snapshot = [..._typingIndicators];
    _typingSetters.forEach(s => s(snapshot));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      const i = _typingIndicators.findIndex(t => t.from_user_id === indicator.from_user_id);
      if (i !== -1) _typingIndicators.splice(i, 1);
      const snap = [..._typingIndicators];
      _typingSetters.forEach(s => s(snap));
    }, 3000);
  });
}

function detachListeners(socket: Socket) {
  socket.removeAllListeners();
  _listenersAttached = false;
}

export function useSocketLogic(options: { autoConnect?: boolean } = {}) {
  const { user, isAuthenticated, token } = useAuth();
  const [connected, setConnected] = useState(() => _socket?.connected ?? false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [..._chatMessages]);

  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>(() => [..._typingIndicators]);
  const [eventAttendeesLocations, setEventAttendeesLocations] = useState<Record<string, {userId: number, lat: number, lng: number, timestamp: Date}>>(() => ({..._eventAttendeesLocations}));
  const mountedRef = useRef(true);

  // Register setters so singleton can update all instances
  useEffect(() => {
    mountedRef.current = true;
    _connectedSetters.add(setConnected);
    _reconnectAttemptsSetters.add(setReconnectAttempts);
    _chatMessageSetters.add(setChatMessages);
    _typingSetters.add(setTypingIndicators);
    _eventAttendeesSetters.add(setEventAttendeesLocations);
    return () => {
      mountedRef.current = false;
      _connectedSetters.delete(setConnected);
      _reconnectAttemptsSetters.delete(setReconnectAttempts);
      _chatMessageSetters.delete(setChatMessages);
      _typingSetters.delete(setTypingIndicators);
      _eventAttendeesSetters.delete(setEventAttendeesLocations);
    };
  }, []);

  const connect = useCallback(() => {
    if (_socket || !token) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:4000';

    _socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    attachListeners(_socket, user?.id?.toString());
  }, [token, user?.id]);

  const disconnect = useCallback(() => {
    _connectionCount = Math.max(0, _connectionCount - 1);
    if (_connectionCount === 0 && _socket) {
      detachListeners(_socket);
      _socket.disconnect();
      _socket = null;
    }
  }, []);

  const sendChatMessage = useCallback((receiverId: string, content: string) => {
    if (_socket) {
      _socket.emit('send_message', {
        receiverId: parseInt(receiverId),
        content,
      });

      // Optimistic update
      const optimisticMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        from_user_id: String(user?.id),
        to_user_id: receiverId,
        content,
        timestamp: new Date().toISOString(),
        status: 'sending',
      };
      _chatMessages.push(optimisticMsg);
      const snapshot = [..._chatMessages];
      _chatMessageSetters.forEach(s => s(snapshot));
    }
  }, [user?.id]);

  const sendTypingIndicator = useCallback((receiverId: string) => {
    if (_socket) {
      _socket.emit('typing', {
        receiverId: parseInt(receiverId),
      });
    }
  }, []);

  const joinEventRoom = useCallback((eventId: number) => {
    if (_socket) {
      _socket.emit('join_event', { eventId });
    }
  }, []);

  const joinChatroom = useCallback((roomId: string) => {
    if (_socket) {
      _socket.emit('join_room', roomId);
    }
  }, []);

  const leaveChatroom = useCallback((roomId: string) => {
    if (_socket) {
      _socket.emit('leave_room', roomId);
    }
  }, []);

  const sendRoomMessage = useCallback((roomId: string, content: string) => {
    if (_socket) {
      _socket.emit('send_room_message', { roomId, content });
    }
  }, []);

  const leaveEventRoom = useCallback((eventId: number) => {
    if (_socket) {
      _socket.emit('leave_event', { eventId });
    }
  }, []);

  const broadcastLocation = useCallback((eventId: number, lat: number, lng: number) => {
    if (_socket) {
      _socket.emit('update_location', { eventId, lat, lng });
    }
  }, []);

  useEffect(() => {
    if (options.autoConnect && isAuthenticated) {
      _connectionCount++;
      connect();
    }
    return () => {
      if (options.autoConnect) {
        disconnect();
      }
    };
  }, [options.autoConnect, isAuthenticated, connect, disconnect]);

  return {
    connected,
    reconnectAttempts,
    chatMessages,

    typingIndicators,
    sendChatMessage,
    sendTypingIndicator,
    joinEventRoom,
    leaveEventRoom,
    joinChatroom,
    leaveChatroom,
    sendRoomMessage,
    broadcastLocation,
    eventAttendeesLocations,
    connect,
    disconnect,
  };
}
