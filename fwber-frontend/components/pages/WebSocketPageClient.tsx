"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useWebSocket, useWebSocketPresence, useWebSocketNotifications } from '@/lib/hooks/use-websocket';
import RealTimeChat, { ChatList, OnlineUsers } from '@/components/RealTimeChat';

function WebSocketPageContent() {
  const { user, isAuthenticated, isLoading: loading } = useAuth();
  const router = useRouter();
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [testMessage, setTestMessage] = useState('');

  const {
    connectionStatus,
    messages,
    onlineUsers,
    presenceUpdates,
    notifications,
    chatMessages,
    typingIndicators,
    connect,
    disconnect,
    sendChatMessage,
    sendTypingIndicator,
    updatePresence,
    sendNotification,
    clearMessages,
    clearNotifications,
    isReady,
  } = useWebSocket();

  const {
    currentStatus,
    setOnline,
    setAway,
    setBusy,
    setOffline,
  } = useWebSocketPresence();

  const {
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useWebSocketNotifications();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleSendChatMessage = () => {
    if (selectedRecipient && testMessage.trim()) {
      sendChatMessage(selectedRecipient, testMessage);
      setTestMessage('');
    }
  };

  const handleSendNotification = () => {
    if (selectedRecipient) {
      sendNotification();
    }
  };

  const handleStartTyping = () => {
    if (selectedRecipient) {
      sendTypingIndicator(selectedRecipient);
    }
  };

  const handleStopTyping = () => {
    if (selectedRecipient) {
      sendTypingIndicator(selectedRecipient);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen dark:bg-background text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-red-500">WebSocket Real-Time Communication</h1>
          <div className="flex space-x-4">
            <button type="button"
              onClick={handleConnect}
              disabled={connectionStatus.connected || !isReady}
              className="bg-green-600 hover:bg-green-700 disabled:dark:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
            >
              {isReady ? 'Connect' : 'Initializing...'}
            </button>
            <button type="button"
              onClick={handleDisconnect}
              disabled={!connectionStatus.connected}
              className="bg-red-600 hover:bg-red-700 disabled:dark:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="dark:bg-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{connectionStatus.connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {connectionStatus.connectionId && (
              <p className="text-sm text-muted-foreground mt-2">ID: {connectionStatus.connectionId}</p>
            )}
          </div>

          <div className="dark:bg-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Messages</h3>
            <p className="text-2xl font-bold text-red-500">{messages.length}</p>
            <p className="text-sm text-muted-foreground">Total received</p>
          </div>

          <div className="dark:bg-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Online Users</h3>
            <p className="text-2xl font-bold text-green-500">{onlineUsers.length}</p>
            <p className="text-sm text-muted-foreground">Currently online</p>
          </div>

          <div className="dark:bg-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Notifications</h3>
            <p className="text-2xl font-bold text-yellow-500">{unreadCount}</p>
            <p className="text-sm text-muted-foreground">Unread notifications</p>
          </div>
        </div>

        {/* Presence Controls */}
        <div className="dark:bg-card p-6 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-4">Presence Status</h3>
          <div className="flex space-x-4">
            <button type="button"
              onClick={() => setOnline()}
              className={`px-4 py-2 rounded ${
                currentStatus === 'online' ? 'bg-green-600 text-white' : 'dark:bg-muted text-muted-foreground'
              }`}
            >
              Online
            </button>
            <button type="button"
              onClick={() => setAway()}
              className={`px-4 py-2 rounded ${
                currentStatus === 'away' ? 'bg-yellow-600 text-white' : 'dark:bg-muted text-muted-foreground'
              }`}
            >
              Away
            </button>
            <button type="button"
              onClick={() => setBusy()}
              className={`px-4 py-2 rounded ${
                currentStatus === 'busy' ? 'bg-red-600 text-white' : 'dark:bg-muted text-muted-foreground'
              }`}
            >
              Busy
            </button>
            <button type="button"
              onClick={() => setOffline()}
              className={`px-4 py-2 rounded ${
                currentStatus === 'offline' ? 'dark:bg-muted text-white' : 'dark:bg-muted text-muted-foreground'
              }`}
            >
              Offline
            </button>
          </div>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="dark:bg-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Test Controls</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient ID</label>
                <input
                  type="text"
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  placeholder="Enter recipient user ID"
                  className="w-full dark:bg-muted text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Test Message</label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter test message"
                  className="w-full dark:bg-muted text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex space-x-2">
                <button type="button"
                  onClick={handleSendChatMessage}
                  disabled={!selectedRecipient || !testMessage.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:dark:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                >
                  Send Chat Message
                </button>
              </div>

              <div className="flex space-x-2">
                <button type="button"
                  onClick={handleSendNotification}
                  disabled={!selectedRecipient}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:dark:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                >
                  Send Notification
                </button>
                <button type="button"
                  onClick={handleStartTyping}
                  disabled={!selectedRecipient}
                  className="bg-orange-600 hover:bg-orange-700 disabled:dark:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                >
                  Start Typing
                </button>
                <button type="button"
                  onClick={handleStopTyping}
                  disabled={!selectedRecipient}
                  className="dark:bg-muted hover:dark:bg-muted disabled:bg-muted disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                >
                  Stop Typing
                </button>
              </div>
            </div>
          </div>

          <div className="dark:bg-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Connection Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={connectionStatus.connected ? 'text-green-400' : 'text-red-400'}>
                  {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connection ID:</span>
                <span className="text-white">{connectionStatus.connectionId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span className="text-white">{connectionStatus.userId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reconnect Attempts:</span>
                <span className="text-white">{connectionStatus.reconnectAttempts}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Components */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Real-time Chat</h3>
            {selectedRecipient ? (
              <RealTimeChat
                recipientId={selectedRecipient}
                recipientName={`User ${selectedRecipient}`}
                className="h-96"
              />
            ) : (
              <div className="dark:bg-card p-8 rounded-lg text-center">
                <p className="text-muted-foreground">Select a recipient to start chatting</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <OnlineUsers />
            <ChatList />
          </div>
        </div>

        {/* Message Log */}
        <div className="mt-8 dark:bg-card p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Message Log</h3>
            <button type="button"
              onClick={clearMessages}
              className="dark:bg-muted hover:dark:bg-muted text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No messages received</p>
            ) : (
              messages.slice(-20).map((msg: any, index: number) => (
                <div key={index} className="dark:bg-muted p-3 rounded text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-red-400 font-medium">{msg.type}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-muted-foreground text-xs overflow-x-auto">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WebSocketPageClient() {
  return (
    <WebSocketPageContent />
  );
}
