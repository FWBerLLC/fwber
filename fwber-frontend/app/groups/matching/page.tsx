'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import { 
  Users, ArrowLeft, MapPin, Heart, RefreshCw,
  ChevronDown, Star, Zap, Check, X, Clock,
  Send, UserPlus, Crown, Tag
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getAvatarUrl } from '@/lib/utils/avatar'
import type { Group, GroupMatchRankingStrategy } from '@/lib/api/groups'

interface MatchRequest {
  id: number
  other_group: Group
  initiator?: {
    id: number
    name?: string
  }
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

type Tab = 'discover' | 'pending' | 'connected'

export default function GroupMatchingPage() {
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [matches, setMatches] = useState<Group[]>([])
  const [pendingRequests, setPendingRequests] = useState<MatchRequest[]>([])
  const [connectedGroups, setConnectedGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('discover')
  const [radius, setRadius] = useState(50)
  const [connecting, setConnecting] = useState<number | null>(null)
  const [rankingStrategy, setRankingStrategy] = useState<GroupMatchRankingStrategy | null>(null)

  const fetchMyGroups = useCallback(async () => {
    try {
      const response = await apiClient.get<{ data?: Group[]; groups?: Group[] }>('/groups/my-groups')
      const groups = response.data.data || response.data.groups || []
      setMyGroups(groups)
      if (groups.length > 0 && !selectedGroup) {
        setSelectedGroup(groups[0])
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedGroup])

  useEffect(() => {
    fetchMyGroups()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMatches = useCallback(async () => {
    if (!selectedGroup) return

    try {
      const response = await apiClient.get<{ data?: Group[]; matches?: Group[]; meta?: { ranking_strategy?: GroupMatchRankingStrategy } }>(
        `/groups/${selectedGroup.id}/matches?radius=${radius}&ranking_strategy=trust-aware`
      )
      setMatches(response.data.data || response.data.matches || [])
      setRankingStrategy(response.data.meta?.ranking_strategy || null)
    } catch (err) {
      console.error('Failed to fetch matches:', err)
    }
  }, [selectedGroup, radius])

  const fetchRequests = useCallback(async () => {
    if (!selectedGroup) return

    try {
      const response = await apiClient.get<{ incoming: MatchRequest[]; outgoing: MatchRequest[] }>(
        `/groups/${selectedGroup.id}/matches/requests`
      )
      setPendingRequests([...(response.data.incoming || []), ...(response.data.outgoing || [])])
    } catch (err) {
      console.error('Failed to fetch requests:', err)
    }
  }, [selectedGroup])

  const fetchConnected = useCallback(async () => {
    if (!selectedGroup) return

    try {
      const response = await apiClient.get<{ connected: Group[] }>(
        `/groups/${selectedGroup.id}/matches/connected`
      )
      setConnectedGroups(response.data.connected || [])
    } catch (err) {
      console.error('Failed to fetch connected:', err)
    }
  }, [selectedGroup])

  useEffect(() => {
    if (selectedGroup) {
      fetchMatches()
      fetchRequests()
      fetchConnected()
    }
  }, [selectedGroup, radius, fetchMatches, fetchRequests, fetchConnected])

  async function handleConnect(targetGroupId: number) {
    if (!selectedGroup) return

    setConnecting(targetGroupId)
    try {
      await apiClient.post(`/groups/${selectedGroup.id}/matches/${targetGroupId}/connect`)
      fetchMatches()
      fetchRequests()
    } catch (err) {
      console.error('Failed to connect:', err)
    } finally {
      setConnecting(null)
    }
  }

  async function handleRequest(matchId: number, action: 'accept' | 'reject') {
    if (!selectedGroup) return

    try {
      await apiClient.post(`/groups/${selectedGroup.id}/matches/requests/${matchId}/${action}`)
      fetchRequests()
      fetchConnected()
    } catch (err) {
      console.error('Failed to handle request:', err)
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  function getScoreBg(score: number): string {
    if (score >= 80) return 'bg-green-500/20 border-green-500/30'
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30'
    if (score >= 40) return 'bg-orange-500/20 border-orange-500/30'
    return 'bg-red-500/20 border-red-500/30'
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-slate-900 to-black">
        <AppHeader />
        
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link 
                href="/groups" 
                className="p-2 -ml-2 hover:bg-purple-800/30 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="w-7 h-7 text-purple-500" />
                  Group Matching
                </h1>
                <p className="text-sm text-gray-400">
                  Find compatible groups for group dates
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                fetchMatches()
                fetchRequests()
                fetchConnected()
              }}
              className="p-2 hover:bg-purple-800/30 rounded-lg transition"
            >
              <RefreshCw className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-4 animate-pulse">
                  <div className="h-5 bg-slate-700 rounded w-1/3 mb-3" />
                  <div className="h-4 bg-slate-700/50 rounded w-full" />
                </div>
              ))}
            </div>
          ) : myGroups.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-slate-800/50 rounded-full flex items-center justify-center">
                <Users className="w-10 h-10 text-purple-500/50" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Groups Yet</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Join or create a group to start matching with other groups for group dates!
              </p>
              <Link
                href="/groups/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 transition"
              >
                <UserPlus className="w-5 h-5" />
                Create a Group
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Select Your Group</label>
                <div className="relative">
                  <select
                    value={selectedGroup?.id || ''}
                    onChange={(e) => {
                      const group = myGroups.find(g => g.id === Number(e.target.value))
                      setSelectedGroup(group || null)
                    }}
                    className="w-full appearance-none px-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-500/50 pr-10"
                  >
                    {myGroups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.member_count} members)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {(['discover', 'pending', 'connected'] as Tab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                      activeTab === tab
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50'
                    }`}
                  >
                    {tab === 'discover' && 'Discover'}
                    {tab === 'pending' && `Pending (${pendingRequests.length})`}
                    {tab === 'connected' && `Connected (${connectedGroups.length})`}
                  </button>
                ))}
              </div>

              {activeTab === 'discover' && (
                <>
                  {rankingStrategy && (
                    <div className="mb-4 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-300">
                        Trust-aware group ranking
                      </div>
                      <p className="text-sm text-gray-200">
                        {rankingStrategy.summary}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-400">Search radius:</span>
                    <div className="flex gap-1">
                      {[25, 50, 100].map(r => (
                        <button
                          key={r}
                          onClick={() => setRadius(r)}
                          className={`px-3 py-1 rounded-lg text-sm transition ${
                            radius === r
                              ? 'bg-purple-500 text-white'
                              : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50'
                          }`}
                        >
                          {r}km
                        </button>
                      ))}
                    </div>
                  </div>

                  {matches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No matching groups found within {radius}km
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {matches.map(match => {
                        const matchScore = match.match_score ?? 0

                        return (
                        <div
                          key={match.id}
                          className="bg-slate-800/50 rounded-xl border border-purple-500/20 p-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                              {match.group?.avatar_url ? (
                                <Image
                                  src={getAvatarUrl(match.group.avatar_url, match.group?.name)}
                                  alt={match.group?.name || match.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <Users className="w-7 h-7 text-purple-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-white truncate">
                                  {match.group?.name || match.name}
                                </h3>
                                {(match.group as any)?.is_owner && (
                                  <Crown className="w-4 h-4 text-yellow-400" />
                                )}
                              </div>

                              <p className="text-sm text-gray-400 mb-2">
                                {match.member_count} members • {match.category || 'community'}
                              </p>

                              {match.scene_signals?.headline && (
                                <p className="mb-2 text-sm text-purple-200">
                                  {match.scene_signals.headline}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-1 mb-3">
                                {(match.shared_tags || []).slice(0, 3).map(tag => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full flex items-center gap-1"
                                  >
                                    <Tag className="w-3 h-3" />
                                    {tag}
                                  </span>
                                ))}
                                {(Array.isArray(match.scene_signals?.matched_topics) ? match.scene_signals.matched_topics : []).slice(0, 2).map(topic => (
                                  <span
                                    key={`topic-${match.id}-${topic.slug}`}
                                    className="px-2 py-0.5 bg-pink-500/20 text-pink-200 text-xs rounded-full"
                                  >
                                    {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                                  </span>
                                ))}
                                {(match.shared_tags || []).length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{(match.shared_tags || []).length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <div className={`px-3 py-1 rounded-full border ${getScoreBg(matchScore)}`}>
                                <span className={`text-sm font-bold ${getScoreColor(matchScore)}`}>
                                  {matchScore}%
                                </span>
                              </div>

                              <button
                                onClick={() => handleConnect(match.id)}
                                disabled={connecting === match.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-pink-600 hover:to-purple-700 transition disabled:opacity-50"
                              >
                                {connecting === match.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="w-4 h-4" />
                                    Connect
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-4 text-xs text-gray-500">
                            {match.category_match && (
                              <span className="flex items-center gap-1 text-green-400">
                                <Check className="w-3.5 h-3.5" />
                                Same category
                              </span>
                            )}
                            {match.distance_km !== undefined && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {match.distance_km.toFixed(1)}km away
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5" />
                              {(match.shared_tags || []).length} shared interests
                            </span>
                          </div>
                        </div>
                      )})}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'pending' && (
                <div className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No pending requests
                    </div>
                  ) : (
                    pendingRequests.map(request => {
                      const isIncoming = request.initiator?.id !== selectedGroup?.created_by_user_id
                      const otherGroup = request.other_group

                      return (
                        <div
                          key={request.id}
                          className="bg-slate-800/50 rounded-xl border border-purple-500/20 p-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
                              <Users className="w-6 h-6 text-purple-400" />
                            </div>

                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{otherGroup.name}</h3>
                              <p className="text-sm text-gray-400">
                                {isIncoming ? 'Wants to connect with you' : 'Connection sent'}
                              </p>
                            </div>

                            {isIncoming ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRequest(request.id, 'accept')}
                                  className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleRequest(request.id, 'reject')}
                                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-400 text-sm">
                                <Clock className="w-4 h-4" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {activeTab === 'connected' && (
                <div className="space-y-4">
                  {connectedGroups.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No connected groups yet
                    </div>
                  ) : (
                    connectedGroups.map(match => (
                      <div
                        key={match.id}
                        className="bg-slate-800/50 rounded-xl border border-green-500/20 p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <Heart className="w-6 h-6 text-green-400" />
                          </div>

                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{match.name}</h3>
                            <p className="text-sm text-gray-400">
                              {match.member_count} members
                            </p>
                          </div>

                          <Link
                            href={`/groups/${match.id}/chat`}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 text-sm font-medium rounded-lg hover:bg-green-500/30 transition"
                          >
                            <Zap className="w-4 h-4" />
                            Chat
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-8 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/20">
            <div className="flex items-start gap-3">
              <Zap className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white mb-1">How Group Matching Works</h3>
                <p className="text-sm text-gray-300">
                  Our algorithm now blends compatibility, trusted members, scene alignment, member health, and distance.
                  It keeps private relationship details inside the ranking logic while surfacing group-date matches that are safer
                  and more aligned with your group&apos;s scene.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
