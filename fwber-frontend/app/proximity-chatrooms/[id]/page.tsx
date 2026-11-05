'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  useProximityChatroom,
  useProximityChatroomMessages,
  useProximityChatroomMembers,
  useSendProximityMessage,
  useJoinProximityChatroom,
  useLeaveProximityChatroom,
  useAddProximityReaction,
  useRemoveProximityReaction,
  usePinProximityMessage,
  useUnpinProximityMessage,
  usePinnedProximityMessages,
  useNetworkingMessages,
  useSocialMessages,
} from '@/lib/hooks/use-proximity-chatrooms';
import {
  MapPin,
  Users,
  MessageCircle,
  Send,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  Pin,
  PinOff,
  ArrowLeft,
  Map,
  Navigation,
  UserPlus,
  UserMinus,
  Shield,
  Star,
} from 'lucide-react';

interface ProximityChatroomPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProximityChatroomPage(props: ProximityChatroomPageProps) {
  const params = use(props.params);
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const chatroomId = parseInt(params.id);
  const [newMessage, setNewMessage] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'networking' | 'social'>('all');
  const [showMembers, setShowMembers] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get user's current location
  const [location, setLocation] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Hooks
  const { data: chatroom, isLoading: chatroomLoading } = useProximityChatroom(
    chatroomId,
    (location && location.latitude != null && location.longitude != null)
      ? { latitude: location.latitude, longitude: location.longitude }
      : undefined
  );
  
  const { data: messages, isLoading: messagesLoading } = useProximityChatroomMessages(chatroomId, {
    type: selectedTab === 'all' ? undefined : selectedTab,
  });
  
  const { data: members, isLoading: membersLoading } = useProximityChatroomMembers(chatroomId);
  const { data: pinnedMessages } = usePinnedProximityMessages(chatroomId);
  const { data: networkingMessages } = useNetworkingMessages(chatroomId);
  const { data: socialMessages } = useSocialMessages(chatroomId);

  const sendMessage = useSendProximityMessage();
  const joinChatroom = useJoinProximityChatroom();
  const leaveChatroom = useLeaveProximityChatroom();
  const addReaction = useAddProximityReaction();
  const removeReaction = useRemoveProximityReaction();
  const pinMessage = usePinProximityMessage();
  const unpinMessage = useUnpinProximityMessage();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.data]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendMessage.isPending) return;

    try {
      await sendMessage.mutateAsync({
        chatroomId,
        data: {
          content: newMessage.trim(),
          message_type: 'text',
          is_networking: selectedTab === 'networking',
          is_social: selectedTab === 'social',
        },
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleJoinChatroom = async () => {
    if (!location.latitude || !location.longitude) {
      console.warn('Location required');
      return;
    }

    // Check for token entry fee
    if (chatroom && (chatroom.token_entry_fee ?? 0) > 0 && !showPaymentModal) {
      setShowPaymentModal(true);
      return;
    }

    try {
      await joinChatroom.mutateAsync({
        id: chatroomId,
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Failed to join chatroom:', error);
      console.error('Failed to join proximity chatroom');
    }
  };

  const handleLeaveChatroom = async () => {
    try {
      await leaveChatroom.mutateAsync(chatroomId);
      router.push('/proximity-chatrooms');
    } catch (error) {
      console.error('Failed to leave chatroom:', error);
    }
  };

  const handleReaction = async (messageId: number, emoji: string) => {
    try {
      await addReaction.mutateAsync({
        chatroomId,
        messageId,
        data: { emoji },
      });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handlePinMessage = async (messageId: number) => {
    try {
      await pinMessage.mutateAsync({ chatroomId, messageId });
    } catch (error) {
      console.error('Failed to pin message:', error);
    }
  };

  const handleUnpinMessage = async (messageId: number) => {
    try {
      await unpinMessage.mutateAsync({ chatroomId, messageId });
    } catch (error) {
      console.error('Failed to unpin message:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">Please log in to access proximity chatrooms.</p>
          <button type="button"
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (chatroomLoading) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading chatroom...</p>
        </div>
      </div>
    );
  }

  if (!chatroom) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-4">Chatroom Not Found</h1>
          <p className="text-muted-foreground mb-6">The proximity chatroom you&apos;re looking for doesn&apos;t exist.</p>
          <button type="button"
            onClick={() => router.push('/proximity-chatrooms')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Chatrooms
          </button>
        </div>
      </div>
    );
  }

  const isMember = members?.data?.some(member => member.user_id === user?.id);
  const isOwner = String(chatroom.owner_id) === String(user?.id);

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      {/* Header */}
      <div className="bg-card dark:bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button type="button"
                onClick={() => router.push('/proximity-chatrooms')}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-foreground dark:text-foreground">{chatroom.name}</h1>
                <p className="text-sm text-muted-foreground">{chatroom.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{chatroom.member_count} members</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{Math.round(chatroom.distance_meters || 0)}m away</span>
              </div>
              {!chatroom.is_public && (
                <div className="flex items-center space-x-1 text-sm text-yellow-600">
                  <Shield className="h-4 w-4" />
                  <span>Private</span>
                </div>
              )}
              {(chatroom.token_entry_fee ?? 0) > 0 && (
                 <div className="flex items-center space-x-1 text-sm text-amber-600 font-medium">
                   <span>💎 {chatroom.token_entry_fee} Entry</span>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-card dark:bg-card rounded-lg shadow-sm border">
              {/* Chat Header */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      chatroom.is_networking ? 'bg-blue-100 text-blue-800' :
                      chatroom.is_social ? 'bg-green-100 text-green-800' :
                      chatroom.tags?.includes('dating') ? 'bg-pink-100 text-pink-800' :
                      'bg-muted text-foreground'
                    }`}>
                      {chatroom.type}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {chatroom.radius_meters}m radius
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button type="button"
                      onClick={() => setShowMembers(!showMembers)}
                      className="text-muted-foreground hover:text-muted-foreground"
                    >
                      <Users className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Tabs */}
              <div className="border-b">
                <div className="flex">
                  <button type="button"
                    onClick={() => setSelectedTab('all')}
                    className={`px-4 py-2 text-sm font-medium ${
                      selectedTab === 'all'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All Messages
                  </button>
                  <button type="button"
                    onClick={() => setSelectedTab('networking')}
                    className={`px-4 py-2 text-sm font-medium ${
                      selectedTab === 'networking'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Networking
                  </button>
                  <button type="button"
                    onClick={() => setSelectedTab('social')}
                    className={`px-4 py-2 text-sm font-medium ${
                      selectedTab === 'social'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Social
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading messages...</p>
                  </div>
                ) : (Array.isArray(messages?.data) && messages.data.length === 0) ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">No messages yet</h3>
                    <p className="text-muted-foreground">Be the first to start the conversation!</p>
                  </div>
                ) : (
                  (Array.isArray(messages?.data) ? messages.data : []).map((message) => (
                    <div key={message.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {message.user?.name?.charAt(0) || 'U'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-foreground dark:text-foreground">
                            {message.user?.name || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                          {message.is_pinned && (
                            <Pin className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-foreground dark:text-muted-foreground mb-2">{message.content}</p>
                        
                        {Array.isArray(message.reactions) && message.reactions.length > 0 && (
                          <div className="flex items-center space-x-2 mb-2">
                            {message.reactions.map((reaction: any, index: number) => (
                              <button type="button"
                                key={index}
                                onClick={() => handleReaction(message.id, reaction.emoji)}
                                className="flex items-center space-x-1 text-xs bg-muted dark:bg-card rounded-full px-2 py-1 hover:bg-muted"
                              >
                                <span>{reaction.emoji}</span>
                                <span>{reaction.count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Message Actions */}
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <button type="button"
                            onClick={() => handleReaction(message.id, '👍')}
                            className="hover:text-blue-600 flex items-center space-x-1"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            <span>Like</span>
                          </button>
                          <button type="button"
                            onClick={() => handleReaction(message.id, '❤️')}
                            className="hover:text-red-600 flex items-center space-x-1"
                          >
                            <Heart className="h-3 w-3" />
                            <span>Love</span>
                          </button>
                          <button type="button"
                            onClick={() => handleReaction(message.id, '😂')}
                            className="hover:text-yellow-600 flex items-center space-x-1"
                          >
                            <Laugh className="h-3 w-3" />
                            <span>Laugh</span>
                          </button>
                          {isOwner && (
                            <button type="button"
                              onClick={() => message.is_pinned ? handleUnpinMessage(message.id) : handlePinMessage(message.id)}
                              className="hover:text-yellow-600 flex items-center space-x-1"
                            >
                              {message.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                              <span>{message.is_pinned ? 'Unpin' : 'Pin'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {isMember ? (
                <form onSubmit={handleSendMessage} className="border-t p-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={sendMessage.isPending}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sendMessage.isPending}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="border-t p-4 text-center">
                  <p className="text-muted-foreground mb-4">Join this chatroom to start messaging</p>
                  <button type="button"
                    onClick={handleJoinChatroom}
                    disabled={joinChatroom.isPending}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {joinChatroom.isPending ? 'Joining...' : 'Join Chatroom'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Chatroom Info */}
            <div className="bg-card dark:bg-card rounded-lg shadow-sm border p-4 mb-4">
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-3">Chatroom Info</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{chatroom.radius_meters}m radius</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{chatroom.member_count} members</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>Active {chatroom.last_activity_at ? new Date(chatroom.last_activity_at).toLocaleDateString() : 'Recently'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-card dark:bg-card rounded-lg shadow-sm border p-4 mb-4">
              <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-3">Actions</h3>
              <div className="space-y-2">
                {isMember ? (
                  <button type="button"
                    onClick={handleLeaveChatroom}
                    disabled={leaveChatroom.isPending}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <UserMinus className="h-4 w-4" />
                    <span>{leaveChatroom.isPending ? 'Leaving...' : 'Leave Chatroom'}</span>
                  </button>
                ) : (
                  <button type="button"
                    onClick={handleJoinChatroom}
                    disabled={joinChatroom.isPending}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{joinChatroom.isPending ? 'Joining...' : 'Join Chatroom'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Members */}
            {showMembers && (
              <div className="bg-card dark:bg-card rounded-lg shadow-sm border p-4">
                <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-3">Members</h3>
                <div className="space-y-2">
                  {membersLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : members?.data?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No members yet</p>
                  ) : (
                    members?.data?.map((member) => (
                      <div key={member.id} className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {member.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground dark:text-foreground truncate">
                            {member.user?.name || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        {member.role === 'admin' && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card dark:bg-card rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💎</span>
            </div>
            <h3 className="text-lg font-bold text-foreground dark:text-foreground mb-2">Pay to Join?</h3>
            <p className="text-muted-foreground mb-6">
              This chatroom requires an entry fee of <strong className="text-foreground dark:text-foreground">{chatroom?.token_entry_fee} tokens</strong>.
            </p>
            <div className="flex space-x-3">
              <button type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-muted dark:bg-card text-foreground dark:text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button type="button"
                onClick={handleJoinChatroom}
                disabled={joinChatroom.isPending}
                className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {joinChatroom.isPending ? 'Processing...' : 'Pay & Join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
