'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/lib/auth-context';
import { useNearbyProximityChatrooms, useCreateProximityChatroom } from '@/lib/hooks/use-proximity-chatrooms';
import { MapPin, Users, MessageCircle, Plus, Search, Filter, Map, Navigation, Compass } from 'lucide-react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
}


  const getAuraTheme = (aura: string) => {
    switch (aura?.toLowerCase()) {
      case 'warm': return 'border-orange-200 dark:border-orange-800/50 bg-orange-50/10 hover:shadow-orange-500/10';
      case 'electric': return 'border-yellow-200 dark:border-yellow-800/50 bg-yellow-50/10 hover:shadow-yellow-500/10';
      case 'contemplative': return 'border-blue-200 dark:border-blue-800/50 bg-blue-50/10 hover:shadow-blue-500/10';
      case 'noir': return 'border-gray-500 dark:border-gray-600/50 bg-gray-500/10 hover:shadow-gray-500/10';
      case 'moody': return 'border-indigo-300 dark:border-indigo-800/50 bg-indigo-50/10 hover:shadow-indigo-500/10';
      case 'shadowy': return 'border-violet-300 dark:border-violet-800/50 bg-violet-50/10 hover:shadow-violet-500/10';
      default: return 'border-border dark:border-border bg-card dark:bg-card';
    }
  };

export default function ProximityChatroomsPage() {
  const { user, token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'conference' | 'event' | 'venue' | 'area' | 'temporary' | 'networking' | 'social' | 'dating' | 'professional' | 'casual'>('all');
  const [radius, setRadius] = useState(1000); // 1km default
  const [showCreateForm, setShowCreateForm] = useState(false);

  const createProximityChatroom = useCreateProximityChatroom();

  // Get user's current location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation is not supported by this browser.' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
        });
      },
      (error) => {
        setLocation(prev => ({
          ...prev,
          error: `Error getting location: ${error.message}`,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  // Find nearby proximity chatrooms
  const { data: nearbyChatrooms, isLoading, error } = useNearbyProximityChatrooms({
    latitude: location.latitude || 0,
    longitude: location.longitude || 0,
    radius_meters: radius,
    type: selectedType === 'all' ? undefined : selectedType,
    search: searchTerm || undefined,
    ranking_strategy: 'trust-aware',
  });
  const rankingStrategy = nearbyChatrooms?.meta?.ranking_strategy ?? null;
  const chatroomResults = nearbyChatrooms?.data ?? nearbyChatrooms?.chatrooms ?? [];

  const handleCreateChatroom = async (formData: {
    name: string;
    description: string;
    type: any; // Type is constrained by select options but effectively string
    radius_meters?: number;
    is_public?: boolean;
    token_entry_fee?: number | string;
  }) => {
    if (!location.latitude || !location.longitude) {
      console.warn('Location required');
      return;
    }

    try {
      const newChatroom = await createProximityChatroom.mutateAsync({
        name: formData.name,
        description: formData.description,
        latitude: location.latitude,
        longitude: location.longitude,
        radius_meters: Number(formData.radius_meters) || 500,
        type: formData.type,
        is_public: formData.is_public !== false,
        token_entry_fee: formData.token_entry_fee ? Number(formData.token_entry_fee) : 0,
      });

      router.push(`/proximity-chatrooms/${newChatroom.id}`);
    } catch (error) {
      console.error('Failed to create proximity chatroom:', error);
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

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      <AppHeader title="Proximity Chatrooms" />

      {/* Header */}
      <div className="bg-card dark:bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <MapPin className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Proximity Chatrooms</h1>
                <p className="text-muted-foreground">Connect with people nearby for networking and social interaction</p>
              </div>
            </div>
            <button type="button"
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Chatroom</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Location Status */}
        {location.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Navigation className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Location Error</h3>
                <p className="text-sm text-red-600">{location.error}</p>
              </div>
            </div>
          </div>
        )}

        {location.latitude && location.longitude && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Map className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-green-800">Location Found</h3>
                <p className="text-sm text-green-600">
                  Lat: {location.latitude.toFixed(4)}, Lng: {location.longitude.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card dark:bg-card rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search chatrooms..."
                  className="w-full pl-10 pr-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="networking">Networking</option>
                <option value="social">Social</option>
                <option value="dating">Dating</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
              </select>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Radius (meters)</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={500}>500m</option>
                <option value={1000}>1km</option>
                <option value={2000}>2km</option>
                <option value={5000}>5km</option>
                <option value={10000}>10km</option>
              </select>
            </div>

            {/* Filter Button */}
            <div className="flex items-end">
              <button className="w-full bg-muted dark:bg-card text-foreground dark:text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted flex items-center justify-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </button>
            </div>
          </div>
        </div>

        {rankingStrategy && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 mb-2">
              <Compass className="h-4 w-4" />
              Ranking strategy
            </div>
            <p className="text-sm text-cyan-900 mb-3">{rankingStrategy.summary}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {rankingStrategy.trusted_connections && <span className="px-2 py-1 rounded-full bg-card dark:bg-card border border-cyan-200 text-cyan-700">Trusted creators</span>}
              {rankingStrategy.scene_alignment && <span className="px-2 py-1 rounded-full bg-card dark:bg-card border border-cyan-200 text-cyan-700">Scene alignment</span>}
              {rankingStrategy.freshness && <span className="px-2 py-1 rounded-full bg-card dark:bg-card border border-cyan-200 text-cyan-700">Recent activity</span>}
              {rankingStrategy.distance && <span className="px-2 py-1 rounded-full bg-card dark:bg-card border border-cyan-200 text-cyan-700">Distance</span>}
            </div>
          </div>
        )}

        {/* Chatrooms List */}
        <div className="space-y-4">
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-muted-foreground mt-2">Finding nearby chatrooms...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800">Error loading chatrooms</h3>
              <p className="text-sm text-red-600 mt-1">{error.message}</p>
            </div>
          )}

          {chatroomResults.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">No nearby chatrooms found</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a proximity chatroom in your area!
              </p>
              <button type="button"
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Create First Chatroom
              </button>
            </div>
          )}

          {(Array.isArray(chatroomResults) ? chatroomResults : []).map((chatroom) => (
            <div key={chatroom.id} className="bg-card dark:bg-card rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground dark:text-foreground">{chatroom.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      chatroom.is_networking ? 'bg-blue-100 text-blue-800' :
                      chatroom.is_social ? 'bg-green-100 text-green-800' :
                      chatroom.tags?.includes('dating') ? 'bg-pink-100 text-pink-800' :
                      'bg-muted text-foreground'
                    }`}>
                      {chatroom.type}
                    </span>
                    {!chatroom.is_public && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Private
                      </span>
                    )}
                    {(chatroom.token_entry_fee ?? 0) > 0 && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                        💎 {chatroom.token_entry_fee}
                      </span>
                    )}
                  </div>
                   
                  <p className="text-muted-foreground mb-3">{chatroom.description}</p>

                  {chatroom.scene_signals?.headline && (
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 mb-3">
                      <p className="text-sm text-cyan-900">{chatroom.scene_signals.headline}</p>
                    </div>
                  )}
                   
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{chatroom.member_count} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{Math.round(chatroom.distance_meters || 0)}m away</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>Active {chatroom.last_activity_at ? new Date(chatroom.last_activity_at).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>
                </div>
                
                <button type="button"
                  onClick={() => router.push(`/proximity-chatrooms/${chatroom.id}`)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 ml-4"
                >
                  Join Chatroom
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Chatroom Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card dark:bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground dark:text-foreground">Create Proximity Chatroom</h2>
                <button type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-muted-foreground hover:text-muted-foreground"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData);
                handleCreateChatroom({
                  name: data.name as string,
                  description: data.description as string,
                  type: data.type,
                  radius_meters: Number(data.radius_meters),
                  is_public: data.is_public === 'on', // Checkbox value
                  token_entry_fee: Number(data.token_entry_fee)
                });
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter chatroom name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Description</label>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe the purpose of this chatroom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Type</label>
                  <select
                    name="type"
                    required
                    className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="social">Social</option>
                    <option value="networking">Networking</option>
                    <option value="professional">Professional</option>
                    <option value="dating">Dating</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Radius (meters)</label>
                  <select
                    name="radius_meters"
                    className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={500}>500m</option>
                    <option value={1000}>1km</option>
                    <option value={2000}>2km</option>
                    <option value={5000}>5km</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Entry Fee (Tokens)</label>
                  <input
                    type="number"
                    name="token_entry_fee"
                    min="0"
                    defaultValue="0"
                    className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0 for free"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Charge tokens for entry. You will earn a commission on every join.
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_public"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border dark:border-border rounded"
                  />
                  <label className="ml-2 text-sm text-foreground dark:text-muted-foreground">Make this chatroom public</label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-muted dark:bg-card text-foreground dark:text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProximityChatroom.isPending}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createProximityChatroom.isPending ? 'Creating...' : 'Create Chatroom'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
