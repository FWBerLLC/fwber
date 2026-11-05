'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import { 
  Gift, Heart, Sparkles, ArrowLeft, Send, Inbox,
  RefreshCw, Star, Crown, Coffee, Flower2, Diamond,
  Music, Cake, PartyPopper, Flame
} from 'lucide-react'
import Link from 'next/link'

interface GiftType {
  id: string
  name: string
  icon: string
  token_cost: number
}

interface GiftRecord {
  id: number
  gift_type: string
  gift_name: string
  token_cost: number
  message: string | null
  sender_id: number
  sender_name: string
  sender_avatar?: string
  recipient_id: number
  recipient_name: string
  recipient_avatar?: string
  created_at: string
  animation_played?: boolean
}

interface GiftsResponse {
  sent: GiftRecord[]
  received: GiftRecord[]
}

const giftIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'heart': Heart,
  'star': Star,
  'crown': Crown,
  'coffee': Coffee,
  'flower': Flower2,
  'diamond': Diamond,
  'music': Music,
  'cake': Cake,
  'party': PartyPopper,
  'flame': Flame,
  'sparkle': Sparkles,
  'default': Gift,
}

const giftColors: Record<string, string> = {
  'heart': 'from-pink-500 to-rose-600',
  'star': 'from-amber-400 to-yellow-500',
  'crown': 'from-amber-500 to-orange-600',
  'coffee': 'from-amber-700 to-amber-800',
  'flower': 'from-pink-400 to-purple-500',
  'diamond': 'from-cyan-400 to-blue-500',
  'music': 'from-purple-500 to-indigo-600',
  'cake': 'from-pink-500 to-rose-500',
  'party': 'from-amber-400 to-pink-500',
  'flame': 'from-orange-500 to-red-600',
  'sparkle': 'from-purple-400 to-pink-500',
  'default': 'from-purple-500 to-pink-600',
}

export default function GiftHistoryPage() {
  const [sentGifts, setSentGifts] = useState<GiftRecord[]>([])
  const [receivedGifts, setReceivedGifts] = useState<GiftRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')
  const [playingAnimation, setPlayingAnimation] = useState<number | null>(null)

  useEffect(() => {
    fetchGifts()
  }, [])

  const fetchGifts = async () => {
    setLoading(true)
    try {
      const [receivedRes, sentRes] = await Promise.all([
        apiClient.get<{ data: GiftRecord[] }>('/gifts/received').catch(() => ({ data: { data: [] } })),
        apiClient.get<{ data: GiftRecord[] }>('/gifts').catch(() => ({ data: { data: [] } })),
      ])

      setReceivedGifts(receivedRes.data.data || [])
      setSentGifts(sentRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch gifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const playGiftAnimation = (giftId: number) => {
    setPlayingAnimation(giftId)
    setTimeout(() => setPlayingAnimation(null), 2000)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
  }

  const getGiftIcon = (giftType: string) => {
    const normalizedType = giftType.toLowerCase()
    return giftIcons[normalizedType] || giftIcons['default']
  }

  const getGiftColor = (giftType: string) => {
    const normalizedType = giftType.toLowerCase()
    return giftColors[normalizedType] || giftColors['default']
  }

  const currentGifts = activeTab === 'received' ? receivedGifts : sentGifts

  const totalReceived = receivedGifts.reduce((sum, g) => sum + g.token_cost, 0)
  const totalSent = sentGifts.reduce((sum, g) => sum + g.token_cost, 0)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-slate-900 to-black">
        <AppHeader />
        
        {/* Gift Animation Overlay */}
        {playingAnimation !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="animate-bounce">
              <div className="relative">
                <Gift className="w-32 h-32 text-pink-500 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-amber-400 animate-spin" />
                </div>
              </div>
              <div className="text-center mt-4">
                <p className="text-2xl font-bold text-white animate-pulse">🎁 Gift Received! 🎁</p>
              </div>
            </div>
          </div>
        )}

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
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Gift History</h1>
            </div>
            <p className="text-slate-400">
              View all the gifts you&apos;ve sent and received
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-pink-900/30 to-rose-900/30 border border-pink-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Inbox className="w-5 h-5 text-pink-400" />
                <span className="text-pink-200/70 text-sm">Gifts Received</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-white">{receivedGifts.length}</span>
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>{totalReceived.toLocaleString()} tokens value</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Send className="w-5 h-5 text-purple-400" />
                <span className="text-purple-200/70 text-sm">Gifts Sent</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-white">{sentGifts.length}</span>
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>{totalSent.toLocaleString()} tokens spent</span>
                </div>
              </div>
            </div>
          </div>

          {/* Send Gift CTA */}
          <div className="bg-gradient-to-r from-pink-900/30 via-purple-900/30 to-indigo-900/30 border border-pink-500/20 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Send a Gift</h3>
                <p className="text-slate-400 text-sm">Show someone you care with a virtual gift</p>
              </div>
              <Link
                href="/gifts/send"
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-medium rounded-xl transition-all"
              >
                <Gift className="w-5 h-5" />
                Send Gift
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button type="button"
              onClick={() => setActiveTab('received')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                activeTab === 'received'
                  ? 'bg-pink-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Inbox className="w-4 h-4" />
                Received ({receivedGifts.length})
              </div>
            </button>
            <button type="button"
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                activeTab === 'sent'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Sent ({sentGifts.length})
              </div>
            </button>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-end mb-4">
            <button type="button"
              onClick={fetchGifts}
              disabled={loading}
              className="flex items-center gap-2 text-purple-300 hover:text-purple-200 text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Gift List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : currentGifts.length === 0 ? (
            <div className="text-center py-16">
              <Gift className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {activeTab === 'received' ? 'No Gifts Received Yet' : 'No Gifts Sent Yet'}
              </h3>
              <p className="text-slate-400 max-w-md mx-auto mb-6">
                {activeTab === 'received' 
                  ? "When someone sends you a gift, it will appear here"
                  : "Send a gift to someone special to show you care"
                }
              </p>
              {activeTab === 'sent' && (
                <Link
                  href="/gifts/send"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-medium rounded-xl transition-all"
                >
                  <Gift className="w-5 h-5" />
                  Send Your First Gift
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {currentGifts.map((gift) => {
                const GiftIcon = getGiftIcon(gift.gift_type)
                const colorClass = getGiftColor(gift.gift_type)
                const isReceived = activeTab === 'received'
                const otherPerson = isReceived 
                  ? { name: gift.sender_name, avatar: gift.sender_avatar }
                  : { name: gift.recipient_name, avatar: gift.recipient_avatar }

                return (
                  <div
                    key={gift.id}
                    className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:border-pink-500/30 transition-all ${
                      playingAnimation === gift.id ? 'ring-2 ring-pink-500 animate-pulse' : ''
                    }`}
                    onClick={() => isReceived && !gift.animation_played && playGiftAnimation(gift.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Gift Icon */}
                      <div className={`p-3 bg-gradient-to-br ${colorClass} rounded-xl shadow-lg`}>
                        <GiftIcon className="w-6 h-6 text-white" />
                      </div>

                      {/* Gift Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white">
                            {gift.gift_name || gift.gift_type}
                          </h3>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400 text-sm">{formatDate(gift.created_at)}</span>
                        </div>

                        <p className="text-slate-400 text-sm mb-2">
                          {isReceived ? 'From' : 'To'}{' '}
                          <span className="text-purple-300 font-medium">{otherPerson.name}</span>
                        </p>

                        {gift.message && (
                          <div className="bg-slate-900/50 rounded-lg p-3 mt-2">
                            <p className="text-slate-300 text-sm italic">&ldquo;{gift.message}&rdquo;</p>
                          </div>
                        )}
                      </div>

                      {/* Token Cost */}
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-amber-400">
                          <Sparkles className="w-4 h-4" />
                          <span className="font-medium">{gift.token_cost}</span>
                        </div>
                        <span className="text-xs text-slate-500">tokens</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Available Gifts Preview */}
          <div className="mt-12 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Available Gifts
            </h3>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
              {Object.entries(giftIcons).filter(([key]) => key !== 'default').map(([type, Icon]) => (
                <div
                  key={type}
                  className={`aspect-square rounded-xl bg-gradient-to-br ${giftColors[type] || giftColors['default']} p-2 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}
                  title={type.charAt(0).toUpperCase() + type.slice(1)}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <Link
                href="/gifts/send"
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
              >
                View all gifts →
              </Link>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
