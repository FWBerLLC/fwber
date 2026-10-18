'use client'

import AppHeader from '@/components/AppHeader'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth-context'
import { useEffect, useState, useMemo } from 'react'
import { getNearbyUsers, getCurrentGeolocation, NearbyUser } from '@/lib/api/location'
import Link from 'next/link'
import { 
  PresenceIndicator, 
  ConnectionStatusBadge, 
  OnlineUsersList
} from '@/components/realtime/PresenceComponents'
import { ProximityPresenceView } from '@/components/realtime/ProximityPresenceView'
import { MapPin, Users, RefreshCw, Wifi, Sparkles } from 'lucide-react'

export default function NearbyPage() {
  const { token, logout } = useAuth()
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [rankingSummary, setRankingSummary] = useState<string | null>(null)
  const [radius, setRadius] = useState(5000) // 5km default
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Get user IDs for presence tracking
  const nearbyUserIds = useMemo(() => nearbyUsers.map(u => String(u.id)), [nearbyUsers])

  // Transform for ProximityPresenceView
  const proximityUsers = useMemo(() => nearbyUsers.map(u => ({
    id: String(u.id),
    displayName: u.display_name || 'Anonymous',
    distance: ((u.distance_meters ?? u.location.distance_meters ?? parseFloat(u.location.distance.replace(/[^\d.]/g, '')) * (u.location.distance.includes('km') ? 1000 : 1)) || 0) / 1000,
  })), [nearbyUsers])

  useEffect(() => {
    const fetchNearbyUsers = async () => {
      if (!token) {
        // Let ProtectedRoute handle the redirect
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Get user's current location
        const position = await getCurrentGeolocation()
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setUserLocation(location)

        // Fetch nearby users
        const response: any = await getNearbyUsers(token, {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: radius,
          limit: 50,
          ranking_strategy: 'trust-aware',
        })
        
        setNearbyUsers(Array.isArray(response.data) ? response.data : response.data?.data || (response as any).users || [])
        setRankingSummary(response.meta?.ranking_strategy?.summary ?? null)
        setError(null)
      } catch (err: any) {
        console.error('Failed to fetch nearby users:', err)
        setError(err.message || 'Failed to load nearby users.')
        if (err.message === 'Unauthenticated') {
          logout()
        }
      } finally {
        setLoading(false)
      }
    }

    fetchNearbyUsers()
  }, [token, logout, radius])

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Trigger re-fetch
    if (token && userLocation) {
      try {
        const response: any = await getNearbyUsers(token, {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius: radius,
          limit: 50,
          ranking_strategy: 'trust-aware',
        })
        setNearbyUsers(Array.isArray(response.data) ? response.data : response.data?.data || (response as any).users || [])
        setRankingSummary(response.meta?.ranking_strategy?.summary ?? null)
      } catch (err) {
        console.error('Failed to refresh:', err)
      }
    }
    setIsRefreshing(false)
  }

  const formatLastSeen = (lastUpdated: string) => {
    const date = new Date(lastUpdated)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-muted dark:bg-background">
          <AppHeader title="Nearby" />
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-muted dark:bg-background">
          <AppHeader title="Nearby" />
          <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-red-500">
            <div className="text-center">
              <p className="text-xl mb-4">{error}</p>
              <button type="button"
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Nearby" />
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
          <div className="bg-card dark:bg-card rounded-lg shadow-md p-8 mb-6">
            {/* Header with Real-time Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground dark:text-foreground">People Nearby</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <ConnectionStatusBadge />
                    <span className="text-sm text-muted-foreground dark:text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground dark:text-muted-foreground">{nearbyUsers.length} found</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-muted dark:bg-card hover:bg-muted rounded-lg text-foreground dark:text-muted-foreground transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <div className="flex border border-border dark:border-border rounded-lg overflow-hidden">
                  <button type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-card dark:bg-card text-muted-foreground hover:bg-muted dark:bg-background'}`}
                  >
                    Grid
                  </button>
                  <button type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-card dark:bg-card text-muted-foreground hover:bg-muted dark:bg-background'}`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>
            
            {userLocation && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Your Location:</strong> {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                </p>
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="radius" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                Search Radius: {(radius / 1609.34).toFixed(1)}mi
              </label>
              <input
                type="range"
                id="radius"
                min="100"
                max="10000"
                step="100"
                value={radius}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="w-full h-2 bg-muted dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                <span>100m</span>
                <span>5km</span>
                <span>10km</span>
              </div>
            </div>

            {rankingSummary && (
              <div className="mb-6 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-4 py-3 text-sm text-purple-900 dark:text-purple-200">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Trust-aware nearby ranking</span>
                </div>
                <p>{rankingSummary}</p>
              </div>
            )}

            {nearbyUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground text-6xl mb-4">📍</div>
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No one nearby</h3>
                <p className="text-muted-foreground dark:text-muted-foreground">
                  Try increasing your search radius or check back later!
                </p>
              </div>
            ) : (
              <>
                {/* Online Users Summary */}
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-300">Online Now</span>
                  </div>
                  <OnlineUsersList userIds={nearbyUserIds} maxDisplay={6} showCount />
                </div>

                {/* User Grid/List */}
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                  : "space-y-4"
                }>
                {nearbyUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className={`border border-border dark:border-border bg-card dark:bg-card rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
                      viewMode === 'list' ? 'flex items-center justify-between' : ''
                    }`}
                  >
                    <div className={viewMode === 'list' ? 'flex items-center gap-4' : ''}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {user.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5">
                              <PresenceIndicator userId={String(user.id)} size="sm" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-foreground dark:text-foreground">
                              {user.display_name}
                            </h3>
                            <PresenceIndicator userId={String(user.id)} showLabel size="sm" />
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_recent 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {user.is_recent ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {typeof user.ranking_score === 'number' && (
                        <div className="mb-3 inline-flex rounded-full bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1 text-xs font-medium text-purple-800 dark:text-purple-300">
                          Ranked {Math.round(user.ranking_score)}
                        </div>
                      )}

                      {user.scene_signals?.headline && (
                        <p className="mb-3 text-sm text-purple-800 dark:text-purple-300">
                          {user.scene_signals.headline}
                        </p>
                      )}

                      {(Array.isArray(user.scene_signals?.matched_topics) && user.scene_signals.matched_topics.length > 0) || (Array.isArray(user.scene_signals?.matched_tags) && user.scene_signals.matched_tags.length > 0) ? (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {(Array.isArray(user.scene_signals?.matched_topics) ? user.scene_signals.matched_topics : []).slice(0, 2).map((topic: any) => (
                            <span
                              key={topic.slug}
                              className="rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300"
                            >
                              {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                            </span>
                          ))}
                          {(Array.isArray(user.scene_signals?.matched_tags) ? user.scene_signals.matched_tags : []).slice(0, 2).map((tag: string) => (
                            <span
                              key={tag}
                              className="rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className={`space-y-2 text-sm text-muted-foreground dark:text-muted-foreground ${viewMode === 'list' ? 'flex gap-4' : ''}`}>
                        {user.age && (
                          <p><strong>Age:</strong> {user.age}</p>
                        )}
                        {user.gender && (
                          <p><strong>Gender:</strong> {user.gender}</p>
                        )}
                        <p><strong>Distance:</strong> {user.distance_miles ?? user.location.distance_miles ? `${user.distance_miles ?? user.location.distance_miles} mi` : user.location.distance}</p>
                        <p><strong>Last seen:</strong> {formatLastSeen(user.location.last_updated)}</p>
                      </div>
                    </div>

                    <div className={`mt-4 flex space-x-2 ${viewMode === 'list' ? 'mt-0' : ''}`}>
                      <Link
                        href={`/profile/${user.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded transition duration-200"
                      >
                        View Profile
                      </Link>
                      <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition duration-200">
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Found {nearbyUsers.length} people within {(radius / 1609.34).toFixed(1)}mi of your location
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
