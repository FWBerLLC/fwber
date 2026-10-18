'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useChatrooms, useChatroomCategories, usePopularChatrooms, useSearchChatrooms } from '@/lib/hooks/use-chatrooms';
import { useNearbyProximityChatrooms } from '@/lib/hooks/use-proximity-chatrooms';
import type { ChatroomFilters } from '@/lib/api/chatrooms';

export default function ChatroomsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'nearby'>('all');
  const [filters, setFilters] = useState<ChatroomFilters>({ ranking_strategy: 'trust-aware' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { data: chatrooms, isLoading: chatroomsLoading } = useChatrooms(filters);
  const { data: categories } = useChatroomCategories();
  const { data: popularChatrooms } = usePopularChatrooms();
  const { data: searchResults, isLoading: searchLoading } = useSearchChatrooms(searchQuery, filters);
  
  const { data: nearbyChatrooms, isLoading: nearbyLoading } = useNearbyProximityChatrooms({
    latitude: location?.latitude || 0,
    longitude: location?.longitude || 0,
    radius_meters: 5000, // 5km default radius
  });

  useEffect(() => {
    if (activeTab === 'nearby') {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError('Unable to retrieve your location. Please enable location services.');
          console.error('Geolocation error:', error);
        }
      );
    }
  }, [activeTab]);

  const handleFilterChange = (key: keyof ChatroomFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSearch(query.length >= 2);
  };

  const displayChatrooms = activeTab === 'nearby' 
    ? nearbyChatrooms?.chatrooms 
    : (showSearch ? searchResults?.data : (chatrooms?.chatrooms ?? chatrooms?.data));
     
  const isLoading = activeTab === 'nearby' 
    ? nearbyLoading 
    : (showSearch ? searchLoading : chatroomsLoading);

  const chatroomRankingSummary = activeTab === 'all' && !showSearch
    ? chatrooms?.meta?.ranking_strategy?.summary
    : null;

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground mb-2">
            💬 Real-time Chatrooms
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Join location-based chatrooms and connect with people in your area
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border dark:border-border dark:border-gray-800 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button type="button"
              onClick={() => setActiveTab('all')}
              className={`${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground hover:border-border dark:hover:border-gray-700'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              All Chatrooms
            </button>
            <button type="button"
              onClick={() => setActiveTab('nearby')}
              className={`${
                activeTab === 'nearby'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground hover:border-border dark:hover:border-gray-700'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              📍 Nearby
            </button>
          </nav>
        </div>

        {/* Search and Filters - Only show for 'all' tab or if we want to filter nearby too */}
        {activeTab === 'all' && (
          <div className="bg-card dark:bg-background rounded-lg shadow-sm border border-border dark:border-border dark:border-gray-800 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                Search Chatrooms
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground dark:text-foreground rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div className="lg:w-48">
              <label htmlFor="type" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                Type
              </label>
              <select
                id="type"
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground dark:text-foreground rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="interest">💬 Interest</option>
                <option value="city">🏙️ City</option>
                <option value="event">🎉 Event</option>
                <option value="private">🔒 Private</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="lg:w-48">
              <label htmlFor="category" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                Category
              </label>
              <select
                id="category"
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground dark:text-foreground rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories?.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="lg:w-48">
              <label htmlFor="sort" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                Sort By
              </label>
              <select
                id="sort"
                value={filters.sort || 'most_active'}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full px-3 py-2 border border-border dark:border-border bg-card dark:bg-card text-foreground dark:text-foreground rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="most_active">Most Active</option>
                <option value="newest">Newest</option>
                <option value="most_members">Most Members</option>
              </select>
            </div>
          </div>
        </div>
        )}

        {/* Location Error */}
        {activeTab === 'nearby' && locationError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {locationError}
          </div>
        )}

        {/* Popular Chatrooms - Only show on 'all' tab */}
        {activeTab === 'all' && !showSearch && popularChatrooms && popularChatrooms.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground dark:text-foreground mb-4">🔥 Popular Chatrooms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularChatrooms.slice(0, 6).map((chatroom) => (
                <Link
                  key={chatroom.id}
                  href={`/chatrooms/${chatroom.id}`}
                  className="bg-card dark:bg-background rounded-lg shadow-sm border border-border dark:border-border dark:border-gray-800 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-foreground dark:text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{chatroom.display_name}</h3>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm text-muted-foreground dark:text-muted-foreground">{chatroom.member_count} members</span>
                      {chatroom.token_entry_fee && chatroom.token_entry_fee > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          💎 {chatroom.token_entry_fee}
                        </span>
                      )}
                    </div>
                  </div>
                  {chatroom.description && (
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-2 line-clamp-2">{chatroom.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-muted-foreground">
                    <span>Created by {chatroom.creator?.name}</span>
                    <span>{new Date(chatroom.last_activity_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {chatroomRankingSummary && (
          <div className="mb-6 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-900 dark:text-blue-300">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
              <span>Trust-aware chatroom ranking</span>
            </div>
            <p>{chatroomRankingSummary}</p>
          </div>
        )}

        {/* Chatrooms List */}
        <div className="bg-card dark:bg-background rounded-lg shadow-sm border border-border dark:border-border dark:border-gray-800">
          <div className="px-6 py-4 border-b border-border dark:border-border dark:border-gray-800">
            <h2 className="text-xl font-semibold text-foreground dark:text-foreground">
              {activeTab === 'nearby' 
                ? '📍 Nearby Chatrooms'
                : (showSearch ? `Search Results for "${searchQuery}"` : 'All Chatrooms')
              }
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
                {activeTab === 'nearby' ? 'Finding chatrooms near you...' : 'Loading chatrooms...'}
              </p>
            </div>
          ) : displayChatrooms && displayChatrooms.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {displayChatrooms.map((chatroom) => (
                <Link
                  key={chatroom.id}
                  href={`/chatrooms/${chatroom.id}${activeTab === 'nearby' ? '?type=proximity' : ''}`}
                  className="block p-6 hover:bg-muted dark:bg-background dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-medium text-foreground dark:text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{chatroom.display_name || chatroom.name}</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          {chatroom.type}
                        </span>
                        {!chatroom.is_public && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted dark:bg-card text-foreground dark:text-foreground dark:text-muted-foreground border border-border dark:border-border">
                            Private
                          </span>
                        )}
                        {/* Show distance for nearby chatrooms */}
                        {(chatroom as any).distance_meters !== undefined && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800">
                            {((chatroom as any).distance_meters < 1000 
                              ? `${Math.round((chatroom as any).distance_meters)}m` 
                              : `${((chatroom as any).distance_meters / 1000).toFixed(1)}km`
                            )} away
                          </span>
                        )}
                        {/* Show Entry Fee Badge */}
                        {chatroom.token_entry_fee && chatroom.token_entry_fee > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            💎 {chatroom.token_entry_fee} Tokens
                          </span>
                        )}
                        {'ranking_score' in chatroom && typeof chatroom.ranking_score === 'number' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                            Ranked {Math.round(chatroom.ranking_score)}
                          </span>
                        )}
                      </div>
                       
                      {chatroom.description && (
                        <p className="text-muted-foreground dark:text-muted-foreground mb-3 line-clamp-2">{chatroom.description}</p>
                      )}

                      {(Array.isArray(chatroom.scene_signals?.matched_topics) && chatroom.scene_signals.matched_topics.length > 0) || (Array.isArray(chatroom.scene_signals?.matched_tags) && chatroom.scene_signals.matched_tags.length > 0) ? (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {(Array.isArray(chatroom.scene_signals?.matched_topics) ? chatroom.scene_signals.matched_topics : []).slice(0, 2).map((topic) => (
                            <span
                              key={topic.slug}
                              className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                            >
                              {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                            </span>
                          ))}
                          {(Array.isArray(chatroom.scene_signals?.matched_tags) ? chatroom.scene_signals.matched_tags : []).slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {chatroom.scene_signals?.headline && (
                        <p className="mb-3 text-sm text-purple-700 dark:text-purple-400 font-medium">{chatroom.scene_signals.headline}</p>
                      )}
                       
                      <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-muted-foreground flex-wrap">
                        <span>👥 {chatroom.member_count || (chatroom as any).current_members} members</span>
                        <span>💬 {chatroom.message_count} messages</span>
                        {chatroom.city && <span>📍 {chatroom.city}</span>}
                        <span>🕒 {new Date(chatroom.last_activity_at).toLocaleDateString()}</span>
                      </div>
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
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-muted-foreground dark:text-muted-foreground mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">No chatrooms found</h3>
              <p className="text-muted-foreground dark:text-muted-foreground mb-4">
                {activeTab === 'nearby'
                  ? 'No chatrooms found in your area. Try increasing the search radius or create one!'
                  : (showSearch 
                    ? 'Try adjusting your search terms or filters'
                    : 'Be the first to create a chatroom in your area'
                  )
                }
              </p>
              <Link
                href="/chatrooms/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                Create Chatroom
              </Link>
            </div>
          )}
        </div>

        {/* Pagination */}
        {displayChatrooms && displayChatrooms.length > 0 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button className="px-3 py-2 text-sm font-medium text-muted-foreground dark:text-muted-foreground bg-card dark:bg-background border border-border dark:border-border dark:border-gray-800 rounded-md hover:bg-muted dark:hover:bg-gray-800 transition-colors">
                Previous
              </button>
              <button className="px-3 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md">
                1
              </button>
              <button className="px-3 py-2 text-sm font-medium text-muted-foreground dark:text-muted-foreground bg-card dark:bg-background border border-border dark:border-border dark:border-gray-800 rounded-md hover:bg-muted dark:hover:bg-gray-800 transition-colors">
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
