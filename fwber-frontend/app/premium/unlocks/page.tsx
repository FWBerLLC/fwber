'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import { 
  Lock, Unlock, Sparkles, Eye, Heart, MessageCircle,
  ArrowLeft, Crown, Zap, Star, Gift, RefreshCw, CheckCircle
} from 'lucide-react'
import Link from 'next/link'

interface ContentUnlock {
  id: number
  content_type: string
  content_id: number
  token_cost: number
  unlocked_at: string
  content_preview?: string
  match_name?: string
}

interface UnlockableContent {
  id: number
  type: string
  title: string
  description: string
  preview?: string
  token_cost: number
  is_locked: boolean
  match_id?: number
  match_name?: string
}

interface UnlocksResponse {
  unlocked: ContentUnlock[]
  available: UnlockableContent[]
  token_balance: number
}

const contentTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'match_insights': Eye,
  'who_likes_you': Heart,
  'read_receipts': CheckCircle,
  'priority_messages': MessageCircle,
  'profile_boost': Zap,
  'super_like': Star,
}

const contentTypeLabels: Record<string, string> = {
  'match_insights': 'Match Insights',
  'who_likes_you': 'Who Likes You',
  'read_receipts': 'Read Receipts',
  'priority_messages': 'Priority Messages',
  'profile_boost': 'Profile Boost',
  'super_like': 'Super Like',
}

export default function ContentUnlocksPage() {
  const [unlocks, setUnlocks] = useState<ContentUnlock[]>([])
  const [available, setAvailable] = useState<UnlockableContent[]>([])
  const [tokenBalance, setTokenBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'available' | 'unlocked'>('available')

  useEffect(() => {
    fetchUnlocks()
  }, [])

  const fetchUnlocks = async () => {
    setLoading(true)
    try {
      // Fetch unlocked content
      const [unlockedRes, walletRes, insightsRes] = await Promise.all([
        apiClient.get<{ data: ContentUnlock[] }>('/matches/insights/unlocked').catch(() => ({ data: { data: [] } })),
        apiClient.get<{ balance: number }>('/wallet').catch(() => ({ data: { balance: 0 } })),
        apiClient.get<{ data: UnlockableContent[] }>('/matches/insights/available').catch(() => ({ data: { data: [] } })),
      ])

      setUnlocks(unlockedRes.data.data || [])
      setTokenBalance(walletRes.data.balance || 0)
      setAvailable(insightsRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch unlocks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async (matchId: number, tokenCost: number) => {
    if (tokenBalance < tokenCost) {
      console.warn('Insufficient tokens for unlock')
      return
    }

    setUnlocking(matchId)
    try {
      await apiClient.post(`/matches/${matchId}/insights/unlock`)
      await fetchUnlocks()
    } catch (error) {
      console.error('Failed to unlock content:', error)
    } finally {
      setUnlocking(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-slate-900 to-black">
        <AppHeader />
        
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Back Navigation */}
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Premium Unlocks</h1>
            </div>
            <p className="text-slate-400">
              Unlock exclusive content and features to enhance your dating experience
            </p>
          </div>

          {/* Token Balance Card */}
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-200/70 text-sm mb-1">Your Token Balance</p>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                  <span className="text-3xl font-bold text-white">{tokenBalance.toLocaleString()}</span>
                  <span className="text-amber-300">tokens</span>
                </div>
              </div>
              <Link
                href="/wallet"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-xl transition-colors"
              >
                Get More Tokens
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button type="button"
              onClick={() => setActiveTab('available')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                activeTab === 'available'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Available to Unlock
              </div>
            </button>
            <button type="button"
              onClick={() => setActiveTab('unlocked')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                activeTab === 'unlocked'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Unlock className="w-4 h-4" />
                Unlocked ({unlocks.length})
              </div>
            </button>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-end mb-4">
            <button type="button"
              onClick={fetchUnlocks}
              disabled={loading}
              className="flex items-center gap-2 text-purple-300 hover:text-purple-200 text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : activeTab === 'available' ? (
            <div className="space-y-4">
              {available.length === 0 ? (
                <div className="text-center py-16">
                  <Gift className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Content Available</h3>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Match with more people to unlock exclusive insights about your connections
                  </p>
                  <Link
                    href="/matches"
                    className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
                  >
                    <Heart className="w-5 h-5" />
                    Find Matches
                  </Link>
                </div>
              ) : (
                Array.isArray(available) && available.map((item) => {
                  const Icon = contentTypeIcons[item.type] || Eye
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-900/50 rounded-xl">
                          <Icon className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">
                              {contentTypeLabels[item.type] || item.title}
                            </h3>
                            {item.match_name && (
                              <span className="text-sm text-purple-300">
                                for {item.match_name}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm mb-3">
                            {item.description || `Unlock ${contentTypeLabels[item.type]?.toLowerCase() || 'this content'} to see more details`}
                          </p>
                          {item.preview && (
                            <div className="bg-slate-900/50 rounded-lg p-3 mb-3 blur-sm select-none">
                              <p className="text-slate-500 text-sm">{item.preview}</p>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-400">
                              <Sparkles className="w-4 h-4" />
                              <span className="font-medium">{item.token_cost} tokens</span>
                            </div>
                            <button type="button"
                              onClick={() => item.match_id && handleUnlock(item.match_id, item.token_cost)}
                              disabled={unlocking === item.match_id || tokenBalance < item.token_cost}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                                tokenBalance >= item.token_cost
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {unlocking === item.match_id ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Unlocking...
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4" />
                                  Unlock
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {unlocks.length === 0 ? (
                <div className="text-center py-16">
                  <Unlock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Unlocked Content Yet</h3>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Unlock premium content to see it here. Your unlocked content never expires!
                  </p>
                </div>
              ) : (
                Array.isArray(unlocks) && unlocks.map((unlock) => {
                  const Icon = contentTypeIcons[unlock.content_type] || Eye
                  return (
                    <div
                      key={unlock.id}
                      className="bg-slate-800/50 border border-green-500/30 rounded-2xl p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-900/50 rounded-xl">
                          <Icon className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <h3 className="text-lg font-semibold text-white">
                              {contentTypeLabels[unlock.content_type] || unlock.content_type}
                            </h3>
                            {unlock.match_name && (
                              <span className="text-sm text-green-300">
                                for {unlock.match_name}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm mb-2">
                            Unlocked on {formatDate(unlock.unlocked_at)}
                          </p>
                          {unlock.content_preview && (
                            <div className="bg-slate-900/50 rounded-lg p-3">
                              <p className="text-slate-300 text-sm">{unlock.content_preview}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500">Cost</span>
                          <div className="flex items-center gap-1 text-amber-400">
                            <Sparkles className="w-3 h-3" />
                            <span className="text-sm">{unlock.token_cost}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Premium Features Info */}
          <div className="mt-12 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Premium Features
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(contentTypeLabels).map(([type, label]) => {
                const Icon = contentTypeIcons[type] || Eye
                return (
                  <div key={type} className="flex items-center gap-3 text-slate-300">
                    <Icon className="w-5 h-5 text-purple-400" />
                    <span>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
