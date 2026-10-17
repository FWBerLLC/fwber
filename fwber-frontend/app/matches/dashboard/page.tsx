'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/utils/avatar';
import { useAuth } from '@/lib/auth-context'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getMutualMatches, type Match } from '@/lib/api/matches'
import { RelationshipTier } from '@/lib/relationshipTiers'
import RelationshipTierBadge from '@/components/RelationshipTierBadge'
import { MessageCircle, Heart, Calendar, MapPin, Search } from 'lucide-react'
import Link from 'next/link'

interface MatchWithTierData extends Match {
  tierData: {
    tier: RelationshipTier
    messagesExchanged: number
    daysConnected: number
    hasMetInPerson: boolean
    lastMessageAt: string | null
  }
}

export default function MatchesDashboardPage() {
  const { token } = useAuth()
  const [matches, setMatches] = useState<MatchWithTierData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | RelationshipTier>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadMatches = useCallback(async () => {
    if (!token) return

    try {
      setIsLoading(true)
      setError(null)
      const matchesData = await getMutualMatches()
      
      // Simulate tier data - in real app, fetch from backend
      const matchesWithTierData: MatchWithTierData[] = matchesData.map((match, index) => ({
        ...match,
        tierData: {
          tier: [
            RelationshipTier.MATCHED,
            RelationshipTier.MATCHED,
            RelationshipTier.CONNECTED,
            RelationshipTier.CONNECTED,
            RelationshipTier.ESTABLISHED,
            RelationshipTier.VERIFIED
          ][index % 6],
          messagesExchanged: [5, 8, 15, 25, 75, 150][index % 6],
          daysConnected: [1, 2, 3, 5, 10, 30][index % 6],
          hasMetInPerson: index % 6 === 5,
          lastMessageAt: new Date(Date.now() - (index * 3600000)).toISOString()
        }
      }))
      
      setMatches(matchesWithTierData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      loadMatches()
    }
  }, [token, loadMatches])

  const filteredMatches = matches.filter(match => {
    const matchesFilter = filter === 'all' || match.tierData.tier === filter
    const matchesSearch = !searchQuery || 
      (match.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const getTierCounts = () => {
    const counts = {
      [RelationshipTier.MATCHED]: 0,
      [RelationshipTier.CONNECTED]: 0,
      [RelationshipTier.ESTABLISHED]: 0,
      [RelationshipTier.VERIFIED]: 0
    }
    matches.forEach(match => {
      if (match.tierData.tier !== RelationshipTier.DISCOVERY) {
        counts[match.tierData.tier]++
      }
    })
    return counts
  }

  const tierCounts = getTierCounts()

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  My Matches
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {matches.length} {matches.length === 1 ? 'connection' : 'connections'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/matches"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Heart className="w-4 h-4" />
                  <span>Find Matches</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {tierCounts[RelationshipTier.MATCHED]}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">💫 Matched</div>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {tierCounts[RelationshipTier.CONNECTED]}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">💬 Connected</div>
            </div>
            <div className="bg-pink-100 dark:bg-pink-900/30 rounded-lg p-4 border border-pink-200 dark:border-pink-700">
              <div className="text-2xl font-bold text-pink-900 dark:text-pink-100">
                {tierCounts[RelationshipTier.ESTABLISHED]}
              </div>
              <div className="text-sm text-pink-700 dark:text-pink-300">❤️ Established</div>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {tierCounts[RelationshipTier.VERIFIED]}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">✅ Verified</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-800 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search matches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Tier Filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter(RelationshipTier.MATCHED)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === RelationshipTier.MATCHED
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  💫 Matched
                </button>
                <button
                  onClick={() => setFilter(RelationshipTier.CONNECTED)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === RelationshipTier.CONNECTED
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  💬 Connected
                </button>
                <button
                  onClick={() => setFilter(RelationshipTier.ESTABLISHED)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === RelationshipTier.ESTABLISHED
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  ❤️ Established
                </button>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
              <div className="text-red-800 dark:text-red-200 font-medium">{error}</div>
            </div>
          )}

          {/* Matches Grid */}
          {filteredMatches.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">💔</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No matches found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? 'Try adjusting your search' : 'Start swiping to find connections!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMatches.map((match) => (
                <div
                  key={match.id}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Photo */}
                  <div className="relative aspect-square bg-gradient-to-br from-blue-400 to-purple-500">
                    {match.profile?.photos?.[0] ? (
                      <Image
                        src={getAvatarUrl(match.profile.photos[0].url, match.profile.display_name)}
                        alt={match.profile.display_name || 'Profile'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-4xl">
                        {match.profile?.display_name?.[0] || '?'}
                      </div>
                    )}
                    
                    {/* Tier Badge */}
                    <div className="absolute top-3 right-3">
                      <RelationshipTierBadge
                        tier={match.tierData.tier}
                        compact={true}
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                          {match.profile?.display_name || 'Anonymous'}
                        </h3>
                        {match.profile?.age && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {match.profile.age} years old
                          </p>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {Math.round(match.compatibilityScore * 100)}%
                      </div>
                    </div>

                    {/* Location */}
                    {match.profile?.location?.city && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {match.profile.location.city}
                          {match.profile.location.state && `, ${match.profile.location.state}`}
                        </span>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{match.tierData.messagesExchanged} msgs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{match.tierData.daysConnected}d</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/messages?userId=${match.id}`}
                        className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium text-center"
                      >
                        Message
                      </Link>
                      <Link
                        href={`/profile/${match.id}`}
                        className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-center"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
