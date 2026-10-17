'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChatroom, useChatroomMessages, useSendMessage, useAddReaction, useRemoveReaction, useJoinChatroom } from '@/lib/hooks/use-chatrooms';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth-context';
import { useSocketLogic } from '@/lib/hooks/use-socket-logic';
import {
  ConnectionStatusBadge,
  PresenceIndicator,
  TypingIndicator,
  OnlineUsersList,
} from '@/components/realtime/PresenceComponents';

interface ChatroomProps {
  chatroomId: number;
}

export default function Chatroom({ chatroomId }: ChatroomProps) {
  const { user } = useAuth();

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Standard Chatroom Hooks
  const { data: chatroomData, isLoading: chatroomLoading } = useChatroom(chatroomId);
  const { data: messagesData, isLoading: messagesLoading } = useChatroomMessages(chatroomId);
  const sendStandardMessageMutation = useSendMessage();
  const addStandardReactionMutation = useAddReaction();
  const removeStandardReactionMutation = useRemoveReaction();
  const joinChatroomMutation = useJoinChatroom();

  // Real-time atmospheric integration
  const { connected, joinChatroom, leaveChatroom, sendRoomMessage } = useSocketLogic();

  useEffect(() => {
    if (connected && chatroomId) {
      joinChatroom(chatroomId.toString());
      return () => leaveChatroom(chatroomId.toString());
    }
  }, [connected, chatroomId, joinChatroom, leaveChatroom]);


  const chatroom = chatroomData?.chatroom;
  const messages = useMemo(() => messagesData?.data || [], [messagesData?.data]);
  const isSending = sendStandardMessageMutation.isPending;

  // Get member IDs for presence tracking
  const memberIds = useMemo(() => {
    if (!chatroom) return [];
    return chatroom.members?.map((m: any) => String(m.id)) || [];
  }, [chatroom]);

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
    } catch (error) {
      console.error('Failed to join chatroom:', error);
      alert('Failed to join chatroom. You may not have enough tokens.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    try {
      await sendStandardMessageMutation.mutateAsync({
        chatroomId,
        data: {
          content: newMessage.trim(),
          message_type: 'text',
        },
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleReaction = async (messageId: number, emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const message = messages.find((m: any) => m.id === messageId);
      const userReaction = message?.reactions?.find((r: any) => r.user_id === user?.id && r.emoji === emoji);

      if (userReaction) {
        await removeStandardReactionMutation.mutateAsync({
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


  // Determine dynamic chatroom theme based on group_aura
  const auraTheme = useMemo(() => {
    const aura = chatroom?.group_aura || 'standard';
    switch (aura) {
      case 'warm': return 'bg-orange-50/30 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800';
      case 'electric': return 'bg-yellow-50/30 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
      case 'contemplative': return 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800';
      case 'noir': return 'bg-purple-50/30 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800';
      case 'moody': return 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800';
      default: return 'bg-gray-50 dark:bg-gray-900 border-transparent';
    }
  }, [chatroom?.group_aura]);

  const auraLabel = useMemo(() => {
    const aura = chatroom?.group_aura || 'standard';
    return aura.charAt(0).toUpperCase() + aura.slice(1) + ' Vibe';
  }, [chatroom?.group_aura]);

  if (chatroomLoading) {
    return (
      <div className="min-h-[400px] bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chatroom...</p>
        </div>
      </div>
    );
  }

  if (!chatroom) {
    return (
      <div className="min-h-[400px] bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Chatroom not found</h1>
          <p className="text-gray-600 mb-4">The chatroom you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[600px] rounded-lg border transition-colors duration-500 ${auraTheme}`}>
      <div className="flex flex-col h-[600px]">
        {/* Chatroom Header */}
        <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow-sm border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{chatroom.display_name || chatroom.name}</h1>
                <ConnectionStatusBadge />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {chatroom?.group_aura && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="px-2 py-1 text-xs rounded-full bg-black/5 dark:bg-white/10 font-medium tracking-wide cursor-help">
                          ✨ {auraLabel}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent><p>The Group Aura is calculated based on the current emotional headspace of the active participants in this room.</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <button type="button"
                  onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  👥 {chatroom.member_count} members
                </button>
                <span>💬 {chatroom.message_count} messages</span>
              </div>

              {/* Online Users Panel */}
              {showOnlineUsers && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg absolute z-20 shadow-lg border">
                  <OnlineUsersList userIds={memberIds} maxDisplay={8} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white dark:bg-gray-800 flex-1 flex flex-col relative rounded-b-lg">

          {/* Preview Mode Overlay */}
          {(chatroomData?.preview_mode) && (
            <div className="absolute inset-0 z-10 bg-white dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔒</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Join to Chat</h2>
                <p className="text-gray-600 mb-6">
                  {chatroom?.token_entry_fee && chatroom.token_entry_fee > 0
                    ? `This chatroom requires an entry fee of ${chatroom.token_entry_fee} tokens.`
                    : "You need to join this chatroom to view messages and participate."}
                </p>
                <button type="button"
                  onClick={handleJoin}
                  disabled={joinChatroomMutation.isPending}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${(chatroomData?.preview_mode) ? 'filter blur-sm select-none overflow-hidden' : ''}`}>
            {messagesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading messages...</p>
              </div>
            ) : messages.length > 0 ? (
              messages.map((message: any) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 relative">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {message.user?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <PresenceIndicator userId={String(message.user?.id || message.user_id)} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {message.display_user}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.created_at)}
                      </span>
                      {message.is_edited && (
                        <span className="text-xs text-gray-400">(edited)</span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{message.display_content}</p>

                    {/* Reactions */}
                    {Array.isArray(message.reactions) && message.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(message.reaction_summary || {}).map(([emoji, count]) => (
                          <button type="button"
                            key={emoji}
                            onClick={() => handleReaction(message.id, emoji)}
                            className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-full transition-colors"
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
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No messages yet</h3>
                <p className="text-gray-600">Start the conversation by sending the first message!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-black"
                  disabled={isSending}
                />
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </form>

            {/* Typing Indicator - Real-time from WebSocket or local state */}
            <TypingIndicator contextId={String(chatroomId)} contextType="chatroom" className="mt-2" />
            {isTyping && (
              <div className="mt-2 text-sm text-gray-500">
                <span className="animate-pulse">You are typing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Reactions */}
        <div className="bg-gray-50 dark:bg-gray-900 p-2 flex items-center space-x-2 rounded-b-lg">
          <span className="text-sm text-gray-500">Quick reactions:</span>
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
  );
}
