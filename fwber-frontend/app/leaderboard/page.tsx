'use client'

import { useState, useEffect } from 'react'
import AppHeader from '@/components/AppHeader'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserAvatar from '@/components/UserAvatar'
import { apiClient } from '@/lib/api/client'
import { Trophy, Users, MapPin, MessageCircle, Share2, Medal, Flame, Crown } from 'lucide-react'

interface LeaderboardEntry {
  user_id: number
  name: string
  avatar_url: string | null
  score: number
  matches: number
  messages: number
  completeness: number
  rank: number
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  total: number
  my_rank: number | null
}

type TabType = 'global' | 'friends' | 'nearby'

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('global')

  useEffect(() => {
    setLoading(true)
    apiClient.get<LeaderboardResponse>(`/leaderboard?type=${activeTab}&per_page=20`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeTab])

  const handleShare = async () => {
    const rank = data?.my_rank || '?'
    const text = `🏆 I'm ranked #${rank} on the fwber leaderboard! Join Detroit's hottest privacy-first dating platform. fwber.site #fwber #detroit`
    if (navigator.share) {
      try { await navigator.share({ title: 'fwber Leaderboard', text, url: window.location.origin }) } catch {}
    } else {
      try { await navigator.clipboard.writeText(text) } catch {}
    }
  }

  const getMedal = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />
    return null
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30'
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/10 to-gray-500/10 border-gray-400/30'
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/10 to-orange-600/10 border-amber-600/30'
    return 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'global', label: 'Global', icon: <Trophy className="w-4 h-4" /> },
    { id: 'friends', label: 'Friends', icon: <Users className="w-4 h-4" /> },
    { id: 'nearby', label: 'Nearby', icon: <MapPin className="w-4 h-4" /> },
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-8 h-8 text-yellow-500" />
                Leaderboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {data?.total || 0} ranked users
              </p>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition shadow-lg text-sm"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>

          {/* My Rank Badge */}
          {data?.my_rank && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Your Rank</p>
                  <p className="text-3xl font-black">#{data.my_rank}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-80">Score</p>
                  <p className="text-2xl font-bold">{data.leaderboard.find(e => e.rank === data.my_rank)?.score || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl mb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Leaderboard */}
          {!loading && data?.leaderboard && (
            <div className="space-y-3">
              {data.leaderboard.map((entry) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition hover:scale-[1.01] ${getRankBg(entry.rank)}`}
                >
                  {/* Rank */}
                  <div className="w-10 flex-shrink-0 flex items-center justify-center">
                    {getMedal(entry.rank) || (
                      <span className="text-lg font-bold text-gray-400">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <UserAvatar
                    src={entry.avatar_url}
                    name={entry.name}
                    userId={entry.user_id}
                    className="w-12 h-12 rounded-full"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-white truncate">{entry.name}</p>
                      {entry.rank <= 3 && (
                        <Flame className={`w-4 h-4 ${
                          entry.rank === 1 ? 'text-yellow-500' :
                          entry.rank === 2 ? 'text-gray-400' : 'text-amber-600'
                        }`} />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {entry.matches} matches
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {entry.messages} msgs
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-black text-gray-900 dark:text-white">{entry.score}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">pts</p>
                  </div>
                </div>
              ))}

              {data.leaderboard.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No rankings yet. Start matching to climb the board!</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
