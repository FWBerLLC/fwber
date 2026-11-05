"use client";

import { useState, useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/lib/auth-context';
import { LocationCoords } from '@/lib/api/bulletin-boards';
import { useRouter } from 'next/navigation';
import { 
  useBulletinBoards, 
  useBulletinBoard, 
  useBulletinBoardMessages, 
  usePostMessage, 
  useCreateBulletinBoard 
} from '@/lib/hooks/use-bulletin-boards';
import { useWebSocket } from '@/lib/hooks/use-websocket';
import { PostSuggester } from '@/components/ai/PostSuggester';

export default function BulletinBoardsPageClient() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  // Use optimized hooks
  const { data: boardsData, isLoading: boardsLoading, error: boardsError } = useBulletinBoards({
    lat: location?.lat || 0,
    lng: location?.lng || 0,
    radius: 5000,
    ranking_strategy: 'trust-aware',
  });
  const rankingStrategy = boardsData?.meta?.ranking_strategy ?? null;
  const boards = boardsData?.data ?? boardsData?.boards ?? [];
  
  const { data: boardData, isLoading: boardLoading } = useBulletinBoard(
    selectedBoardId || 0,
    location || undefined
  );
  
  const { data: messagesData, isLoading: messagesLoading } = useBulletinBoardMessages(
    selectedBoardId || 0
  );
  
  const postMessageMutation = usePostMessage();
  const createBoardMutation = useCreateBulletinBoard();
  
  // Set up real-time updates
  const { connectionStatus } = useWebSocket();
  const reverbConnected = connectionStatus.connected;

  // Get user's current location
  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Location error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  const handlePostMessage = async () => {
    if (!selectedBoardId || !newMessage.trim() || !location) return;

    postMessageMutation.mutate({
      boardId: selectedBoardId,
      content: newMessage.trim(),
      location,
      options: {
        is_anonymous: isAnonymous,
        expires_in_hours: 24, // Messages expire in 24 hours
      }
    });

    setNewMessage('');
  };

  const handleCreateBoard = async () => {
    if (!location) return;

    createBoardMutation.mutate({
      location,
      radius: 1000, // 1km radius
    });
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  if (boardsLoading) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background text-foreground dark:text-foreground">
        <AppHeader title="Bulletin Boards" />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-muted-foreground dark:text-muted-foreground">Loading bulletin boards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (boardsError) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background text-foreground dark:text-foreground">
        <AppHeader title="Bulletin Boards" />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 text-xl mb-4">⚠️</div>
            <p className="text-red-600 dark:text-red-400 mb-4">Failed to load bulletin boards</p>
            <button type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted dark:bg-background text-foreground dark:text-foreground transition-colors duration-300">
      <AppHeader title="Bulletin Boards" />
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="bg-card dark:bg-background rounded-lg shadow-sm border border-border dark:border-border dark:dark:border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-foreground dark:text-foreground">
              📍 Local Bulletin Boards
            </h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${reverbConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                {reverbConnected ? 'Real-time' : 'Connecting...'}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Connect with people in your area through location-based discussions
          </p>
          {location && (
            <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-2">
              Your location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bulletin Boards List */}
          <div className="lg:col-span-1">
            <div className="bg-card dark:bg-background rounded-lg shadow-sm border border-border dark:border-border dark:dark:border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
                  Nearby Boards
                </h2>
                <button type="button"
                  onClick={handleCreateBoard}
                  disabled={createBoardMutation.isPending}
                  className="px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createBoardMutation.isPending ? 'Creating...' : '+ New Board'}
                </button>
              </div>

              {rankingStrategy && (
                <div className="mb-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3 text-sm text-purple-900 dark:text-purple-300">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
                    Trust-aware bulletin board ranking
                  </div>
                  <p>{rankingStrategy.summary}</p>
                </div>
              )}

              <div className="space-y-3">
                {boards.map((board) => (
                  <div
                    key={board.id}
                    onClick={() => setSelectedBoardId(board.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedBoardId === board.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-border dark:dark:border-border hover:border-border dark:hover:dark:border-border'
                    }`}
                  >
                    <h3 className="font-medium text-foreground dark:text-foreground">{board.name}</h3>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                      {board.message_count} messages • {board.active_users} active
                    </p>
                    {board.scene_signals?.headline && (
                      <p className="mt-2 text-sm text-purple-800 dark:text-purple-400">
                        {board.scene_signals.headline}
                      </p>
                    )}
                    {board.scene_signals && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(Array.isArray(board.scene_signals.matched_topics) ? board.scene_signals.matched_topics : []).slice(0, 2).map((topic) => (
                          <span
                            key={`board-topic-${board.id}-${topic.slug}`}
                            className="rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-1 text-xs font-medium text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          >
                            {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                          </span>
                        ))}
                        {(Array.isArray(board.scene_signals.matched_tags) ? board.scene_signals.matched_tags : []).slice(0, 2).map((tag) => (
                          <span
                            key={`board-tag-${board.id}-${tag}`}
                            className="rounded-full bg-muted dark:bg-card px-2 py-1 text-xs font-medium text-foreground dark:text-muted-foreground border border-border dark:border-border"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                      {board.radius_meters}m radius
                    </p>
                    {board.last_activity_at && (
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                        Last activity: {new Date(board.last_activity_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-2">
            {selectedBoardId && boardData ? (
              <div className="bg-card dark:bg-background rounded-lg shadow-sm border border-border dark:border-border dark:dark:border-border">
                {/* Board Header */}
                <div className="p-6 border-b border-border dark:border-border dark:dark:border-border">
                  <h2 className="text-xl font-semibold text-foreground dark:text-foreground">
                    {boardData.board.name}
                  </h2>
                  <p className="text-muted-foreground dark:text-muted-foreground mt-1">
                    {boardData.board.description}
                  </p>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-2">
                    {boardData.board.message_count} messages • {boardData.board.active_users} active users
                  </p>
                </div>

                {/* Messages */}
                <div className="h-96 overflow-y-auto p-6 space-y-4">
                  {messagesLoading ? (
                    <div className="text-center text-muted-foreground dark:text-muted-foreground py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                      <p className="mt-2">Loading messages...</p>
                    </div>
                  ) : messagesData?.messages.data.length === 0 ? (
                    <div className="text-center text-muted-foreground dark:text-muted-foreground py-8">
                      <p>No messages yet. Be the first to post!</p>
                    </div>
                  ) : (
                    messagesData?.messages.data.map((message) => (
                      <div key={message.id} className="border-b border-border dark:dark:border-border pb-4 last:border-b-0">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-muted dark:dark:bg-muted rounded-full flex items-center justify-center">
                            {message.is_anonymous ? (
                              <span className="text-muted-foreground dark:text-muted-foreground text-sm">?</span>
                            ) : (
                              <span className="text-muted-foreground dark:text-muted-foreground text-sm">
                                {message.user?.name?.charAt(0) || 'U'}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-foreground dark:text-foreground">
                                {message.is_anonymous ? 'Anonymous' : message.user?.name || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                                {new Date(message.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-foreground dark:text-foreground dark:text-foreground mt-1">{message.content}</p>
                            {message.expires_at && (
                              <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                                Expires: {new Date(message.expires_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-6 border-t border-border dark:border-border dark:dark:border-border">
                  <div className="mb-4">
                    <PostSuggester 
                      boardId={selectedBoardId}
                      onSelectPost={(content) => setNewMessage(content)}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="anonymous"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="rounded border-border dark:border-border bg-card dark:bg-card text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="anonymous" className="text-sm text-muted-foreground dark:text-muted-foreground">
                          Post anonymously
                        </label>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Share something with your local community..."
                        className="flex-1 px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground dark:text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handlePostMessage()}
                      />
                      <button type="button"
                        onClick={handlePostMessage}
                        disabled={!newMessage.trim() || postMessageMutation.isPending}
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {postMessageMutation.isPending ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card dark:bg-background rounded-lg shadow-sm border border-border dark:border-border dark:dark:border-border p-12 text-center">
                <div className="text-muted-foreground dark:text-muted-foreground text-6xl mb-4">📍</div>
                <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">
                  Select a Bulletin Board
                </h3>
                <p className="text-muted-foreground dark:text-muted-foreground">
                  Choose a board from the list to start participating in local discussions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
