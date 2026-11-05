'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useChatroom, useChatroomMessages, useSendMessage, useAddReaction, useRemoveReaction, useJoinChatroom } from '@/lib/hooks/use-chatrooms';
import {
  useProximityChatroom,
  useProximityChatroomMessages,
  useSendProximityMessage,
  useAddProximityReaction,
  useRemoveProximityReaction,
  useJoinProximityChatroom
} from '@/lib/hooks/use-proximity-chatrooms';
import { useAuth } from '@/lib/auth-context';
import {
  ConnectionStatusBadge,
  PresenceIndicator,
  TypingIndicator,
  OnlineUsersList,
  PresenceProvider
} from '@/components/realtime/PresenceComponents';

export default function ChatroomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const chatroomId = parseInt(params.id as string);
  const isProximity = searchParams.get('type') === 'proximity';

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Get location for proximity chatrooms
  useEffect(() => {
    if (isProximity && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => console.error('Geolocation error:', error)
      );
    }
  }, [isProximity]);

  // Standard Chatroom Hooks
  const { data: standardChatroomData, isLoading: standardChatroomLoading } = useChatroom(chatroomId);
  const { data: standardMessagesData, isLoading: standardMessagesLoading } = useChatroomMessages(chatroomId);
  const sendStandardMessageMutation = useSendMessage();
  const addStandardReactionMutation = useAddReaction();
  const removeStandardReactionMutation = useRemoveReaction();
  const joinChatroomMutation = useJoinChatroom();

  // Proximity Chatroom Hooks
  const { data: proximityChatroomData, isLoading: proximityChatroomLoading } = useProximityChatroom(chatroomId, location || undefined);
  const { data: proximityMessagesData, isLoading: proximityMessagesLoading } = useProximityChatroomMessages(chatroomId);
  const sendProximityMessageMutation = useSendProximityMessage();
  const addProximityReactionMutation = useAddProximityReaction();
  const removeProximityReactionMutation = useRemoveProximityReaction();
  const joinProximityChatroomMutation = useJoinProximityChatroom();

  // Unified Data
  const chatroom = isProximity ? proximityChatroomData : standardChatroomData?.chatroom;
  const messages = useMemo(() =>
    (isProximity ? proximityMessagesData?.data : standardMessagesData?.data) || [],
    [isProximity, proximityMessagesData?.data, standardMessagesData?.data]
  );
  const isLoading = isProximity ? proximityChatroomLoading : standardChatroomLoading;
  const messagesLoading = isProximity ? proximityMessagesLoading : standardMessagesLoading;
  const isSending = isProximity ? sendProximityMessageMutation.isPending : sendStandardMessageMutation.isPending;

  // Join Proximity Chatroom if needed
  useEffect(() => {
    if (isProximity && chatroom && location) {
      // If we are within proximity, ensure we join so we can participate
      // We can check if we are already a member by looking at active_members or just try to join (idempotent usually)
      // For now, we'll try to join if we have location data to ensure presence is tracked
      if ((chatroom as any).is_within_proximity !== false) { // If true or undefined (implied)
        joinProximityChatroomMutation.mutate({
          id: chatroomId,
          data: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProximity, chatroomId, location?.latitude, location?.longitude]); // specific deps to avoid loops

  // Get member IDs for presence tracking
  const memberIds = useMemo(() => {
    if (!chatroom) return [];
    const members = isProximity
      ? (chatroom as any).active_members
      : (chatroom as any).members;
    return members?.map((m: any) => String(m.id)) || [];
  }, [chatroom, isProximity]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  const handleTyping = () => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const handleJoin = async () => {
    try {
      await joinChatroomMutation.mutateAsync(chatroomId);
      // The query invalidation in the hook will trigger a re-fetch, 
      // which should return is_member=true and preview_mode=false
    } catch (error) {
      console.error('Failed to join chatroom:', error);
      // Error shown via mutation onError handler
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    try {
      if (isProximity) {
        await sendProximityMessageMutation.mutateAsync({
          chatroomId,
          data: {
            content: newMessage.trim(),
            message_type: 'text',
          },
        });
      } else {
        await sendStandardMessageMutation.mutateAsync({
          chatroomId,
          data: {
            content: newMessage.trim(),
            message_type: 'text',
          },
        });
      }
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleReaction = async (messageId: number, emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const message = Array.isArray(messages) ? messages.find((m: any) => m.id === messageId) : null;
      const userReaction = message?.reactions?.find((r: any) => r.user_id === user?.id && r.emoji === emoji);

      if (userReaction) {
        if (isProximity) {
          await removeProximityReactionMutation.mutateAsync({
            chatroomId,
            messageId,
            data: { emoji },
          });
        } else {
          await removeStandardReactionMutation.mutateAsync({
            chatroomId,
            messageId,
            data: { emoji },
          });
        }
      } else {
        if (isProximity) {
          await addProximityReactionMutation.mutateAsync({
            chatroomId,
            messageId,
            data: { emoji },
          });
        } else {
          await addStandardReactionMutation.mutateAsync({
            chatroomId,
            messageId,
            data: { emoji },
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-muted-foreground dark:text-muted-foreground">Loading chatroom...</p>
        </div>
      </div>
    );
  }

  if (!chatroom) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-4">Chatroom not found</h1>
          <p className="text-muted-foreground dark:text-muted-foreground mb-4">The chatroom you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <button type="button"
            onClick={() => router.push('/chatrooms')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            Back to Chatrooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted dark:bg-background transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chatroom Header */}
        <div className="bg-card dark:bg-background rounded-lg shadow-sm border border-border dark:border-border dark:dark:border-border p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground dark:text-foreground">{chatroom.display_name || (chatroom as any).name}</h1>
                <ConnectionStatusBadge />
                {isProximity && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800">
                    Proximity
                  </span>
                )}
              </div>
              {chatroom.description && (
                <p className="text-muted-foreground dark:text-muted-foreground mb-4">{chatroom.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-muted-foreground flex-wrap">
                <button type="button"
                  onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  👥 {chatroom.member_count || (chatroom as any).current_members} members
                </button>
                <span>💬 {chatroom.message_count} messages</span>
                {chatroom.city && <span>📍 {chatroom.city}</span>}
                <span>🕒 Last active {formatTime(chatroom.last_activity_at)}</span>
              </div>

              {/* Online Users Panel */}
              {showOnlineUsers && (
                <div className="mt-4 p-4 bg-muted dark:bg-background dark:bg-card rounded-lg">
                  <OnlineUsersList userIds={memberIds} maxDisplay={8} />
                </div>
              )}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-sm text-muted-foreground dark:text-muted-foreground mb-1">
                Created by {chatroom.creator?.name}
              </div>
              <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                {new Date((chatroom as any).created_at || Date.now()).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-card dark:bg-background rounded-lg shadow-sm border border-border dark:border-border dark:dark:border-border flex flex-col h-[600px] relative">

          {/* Preview Mode Overlay */}
          {(standardChatroomData?.preview_mode && !isProximity) && (
            <div className="absolute inset-0 z-10 bg-card dark:dark:bg-card/80 dark:dark:bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="bg-card dark:bg-background p-8 rounded-xl shadow-2xl border border-border dark:border-border dark:dark:border-border max-w-md w-full text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔒</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-2">Join to Chat</h2>
                <p className="text-muted-foreground dark:text-muted-foreground mb-6">
                  {chatroom?.token_entry_fee && chatroom.token_entry_fee > 0
                    ? `This chatroom requires an entry fee of ${chatroom.token_entry_fee} tokens.`
                    : "You need to join this chatroom to view messages and participate."}
                </p>
                <button type="button"
                  onClick={handleJoin}
                  disabled={joinChatroomMutation.isPending}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg shadow-md transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {joinChatroomMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      {chatroom?.token_entry_fee && chatroom.token_entry_fee > 0 ? 'Pay & Join' : 'Join Chatroom'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${(standardChatroomData?.preview_mode && !isProximity) ? 'filter blur-sm select-none overflow-hidden' : ''}`}>
            {messagesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                <p className="mt-2 text-muted-foreground dark:text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length > 0 ? (
              (messages || []).map((message: any) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 relative">
                    <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {(message.user?.display_name || message.user?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <PresenceIndicator userId={String(message.user?.id || message.user_id)} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-foreground dark:text-foreground">
                        {message.user?.display_name || message.display_user || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                        {formatTime(message.created_at)}
                      </span>
                      {message.is_edited && (
                        <span className="text-xs text-muted-foreground dark:text-muted-foreground">(edited)</span>
                      )}
                    </div>
                    <p className="text-foreground dark:text-foreground dark:text-foreground whitespace-pre-wrap">{message.display_content}</p>

                      {(Array.isArray(message.reactions) && message.reactions.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(message.reaction_summary || {}).map(([emoji, count]) => (
                            <button type="button"
                              key={emoji}
                              onClick={() => handleReaction(message.id, emoji)}
                              className="inline-flex items-center px-2 py-1 text-xs bg-muted dark:bg-card hover:bg-muted dark:hover:dark:bg-muted text-foreground dark:text-foreground dark:text-foreground rounded-full transition-colors border border-border dark:border-border"
                            >
                              <span className="mr-1">{emoji}</span>
                              <span>{count as number}</span>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground dark:text-muted-foreground mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">No messages yet</h3>
                <p className="text-muted-foreground dark:text-muted-foreground">Start the conversation by sending the first message!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-border dark:border-border dark:dark:border-border p-4">
            <form onSubmit={handleSendMessage} className="flex space-x-3">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type your message..."
                  rows={2}
                  className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground dark:text-foreground rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  disabled={isSending}
                />
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </form>

            {/* Typing Indicator - Real-time from WebSocket or local state */}
            <TypingIndicator contextId={String(chatroomId)} contextType={isProximity ? "proximity_chatroom" : "chatroom"} className="mt-2" />
            {isTyping && (
              <div className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                <span className="animate-pulse">You are typing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Reactions */}
        <div className="mt-4 flex items-center space-x-2 flex-wrap gap-y-2">
          <span className="text-sm text-muted-foreground dark:text-muted-foreground">Quick reactions:</span>
          <div className="flex items-center space-x-2">
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
              <button type="button"
                key={emoji}
                onClick={() => {
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage) {
                    handleReaction(lastMessage.id, emoji);
                  }
                }}
                className="text-lg hover:scale-110 transition-transform disabled:opacity-50"
                disabled={messages.length === 0}
                title={messages.length > 0 ? `React to latest message with ${emoji}` : 'No messages to react to'}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
