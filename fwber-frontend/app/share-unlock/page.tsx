'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import { 
  Share2, ArrowLeft, Gift, Unlock, Check,
  Twitter, MessageCircle, Copy, Sparkles,
  ChevronRight, Trophy, Star
} from 'lucide-react'
import Link from 'next/link'

interface ShareUnlock {
  id: number
  user_id: number
  target_profile_id: number
  platform: 'whatsapp' | 'twitter' | 'copy'
  created_at: string
  target_profile?: {
    id: number
    display_name: string
    avatar_url?: string
  }
}

interface ShareUnlocksResponse {
  data: ShareUnlock[]
  total: number
}

const PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
  { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: 'bg-slate-700', hoverColor: 'hover:bg-slate-600' },
  { id: 'copy', name: 'Copy Link', icon: Copy, color: 'bg-purple-500', hoverColor: 'hover:bg-purple-600' },
] as const

const BENEFITS = [
  { icon: Unlock, title: 'Unlock Hidden Photos', description: 'See photos your matches have kept private' },
  { icon: Star, title: 'Priority Visibility', description: 'Get seen first in discovery feeds' },
  { icon: Trophy, title: 'Earn Badges', description: 'Collect exclusive share streak badges' },
]

export default function ShareUnlockPage() {
  const [unlocks, setUnlocks] = useState<ShareUnlock[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState<string | null>(null)
  const [shareSuccess, setShareSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchUnlocks()
  }, [])

  async function fetchUnlocks() {
    try {
      const response = await apiClient.get<ShareUnlocksResponse>('/share-unlocks')
      setUnlocks(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch unlocks:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleShare(platform: 'whatsapp' | 'twitter' | 'copy') {
    setSharing(platform)
    setShareSuccess(null)

    const shareUrl = `${window.location.origin}/invite?ref=share`
    const shareText = "I'm meeting amazing people on fwber! Join me and let's find your perfect match 💕"

    try {
      if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank')
      } else if (platform === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
      } else {
        await navigator.clipboard.writeText(shareUrl)
      }

      setShareSuccess(platform)
      setTimeout(() => setShareSuccess(null), 3000)
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setSharing(null)
    }
  }

  const uniquePlatforms = new Set((unlocks || []).map(u => u.platform))
  const shareStreak = unlocks.length

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-slate-900 to-black">
        <AppHeader />
        
        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Link 
              href="/home" 
              className="p-2 -ml-2 hover:bg-purple-800/30 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Gift className="w-7 h-7 text-pink-500" />
                Share to Unlock
              </h1>
              <p className="text-sm text-muted-foreground">
                Share <span className="text-transparent bg-clip-text bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 animate-gradient-chaos font-semibold">FWBer</span> and unlock exclusive features
              </p>
            </div>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl" />
            <div className="relative bg-gradient-to-br from-pink-600/30 via-purple-600/30 to-slate-800/50 rounded-2xl border border-pink-500/30 p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/20 rounded-full mb-4">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span className="text-pink-300 text-sm font-medium">Limited Time Bonus!</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Share &amp; Get Rewarded
                </h2>
                <p className="text-muted-foreground">
                  Every share unlocks premium features. The more you share, the more you unlock!
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map(platform => {
                  const Icon = platform.icon
                  const isSharing = sharing === platform.id
                  const isSuccess = shareSuccess === platform.id

                  return (
                    <button type="button"
                      key={platform.id}
                      onClick={() => handleShare(platform.id)}
                      disabled={isSharing}
                      className={`flex flex-col items-center gap-2 p-4 ${platform.color} ${platform.hoverColor} rounded-xl transition disabled:opacity-50`}
                    >
                      {isSuccess ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : (
                        <Icon className="w-6 h-6 text-white" />
                      )}
                      <span className="text-sm text-white font-medium">
                        {isSuccess ? 'Shared!' : platform.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Unlock className="w-5 h-5 text-purple-400" />
              What You Unlock
            </h3>
            <div className="space-y-3">
              {BENEFITS.map((benefit, i) => {
                const Icon = benefit.icon
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-purple-500/20"
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{benefit.title}</h4>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Your Share Stats
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-xl border border-yellow-500/20 text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-1">
                  {shareStreak}
                </div>
                <div className="text-sm text-muted-foreground">Total Shares</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/20 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-1">
                  {uniquePlatforms.size}
                </div>
                <div className="text-sm text-muted-foreground">Platforms Used</div>
              </div>
            </div>

            {shareStreak >= 5 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl border border-yellow-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-300">Super Sharer Badge Unlocked!</p>
                    <p className="text-sm text-yellow-200/70">You&apos;ve shared 5+ times. Keep it up!</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!loading && unlocks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Recent Shares</h3>
              <div className="space-y-2">
                {unlocks.slice(0, 5).map(unlock => {
                  const platform = PLATFORMS.find(p => p.id === unlock.platform)
                  const Icon = platform?.icon || Share2
                  const date = new Date(unlock.created_at)

                  return (
                    <div
                      key={unlock.id}
                      className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg"
                    >
                      <div className={`w-8 h-8 rounded-full ${platform?.color || 'bg-purple-500'} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{platform?.name || 'Shared'}</p>
                        <p className="text-xs text-muted-foreground">
                          {date.toLocaleDateString()}
                        </p>
                      </div>
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
