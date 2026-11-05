'use client'

import { useState, useEffect, Suspense } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import {
  Eye, ArrowLeft, Lock, Unlock, User,
  Calendar, Heart, ImageOff, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface RevealedPhoto {
  id: number
  photo_id: number
  match_id: number
  status: string
  created_at: string
  photo: {
    id: number
    url: string
    user_id: number
  }
  match: {
    id: number
    user1_id: number
    user2_id: number
    user1?: {
      id: number
      name: string
      profile?: { display_name: string }
    }
    user2?: {
      id: number
      name: string
      profile?: { display_name: string }
    }
  }
}

interface RevealsResponse {
  data: RevealedPhoto[]
  total: number
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function PhotoRevealsContent() {
  const [reveals, setReveals] = useState<RevealedPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReveals()
  }, [])

  async function fetchReveals() {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<RevealsResponse>('/photos/reveals')
      setReveals(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch reveals:', err)
      setError('Failed to load photo reveals. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-slate-900 to-black">
        <AppHeader />

        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/home"
                className="p-2 -ml-2 hover:bg-purple-800/30 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Eye className="w-7 h-7 text-pink-500" />
                  Photo Reveals
                </h1>
                <p className="text-sm text-muted-foreground">
                  Photos you&apos;ve unlocked from your matches
                </p>
              </div>
            </div>
            <button type="button"
              onClick={fetchReveals}
              className="p-2 hover:bg-purple-800/30 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="mb-6 p-4 bg-gradient-to-r from-pink-600/20 to-purple-600/20 rounded-xl border border-pink-500/20">
            <div className="flex items-start gap-3">
              <Unlock className="w-6 h-6 text-pink-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white mb-1">How Photo Reveals Work</h3>
                <p className="text-sm text-muted-foreground">
                  When you match with someone, you can unlock their hidden photos.
                  Revealed photos appear here for easy access. Some photos may require tokens to unlock.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {reveals.length} revealed photos
            </span>
          </div>

          {loading && reveals.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-slate-700" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-700/50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button type="button"
                onClick={fetchReveals}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
              >
                Try Again
              </button>
            </div>
          ) : reveals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-slate-800/50 rounded-full flex items-center justify-center">
                <Lock className="w-10 h-10 text-purple-500/50" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Revealed Photos Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                When you unlock hidden photos from your matches, they&apos;ll appear here.
              </p>
              <Link
                href="/matches"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition"
              >
                <Heart className="w-5 h-5" />
                View Your Matches
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(reveals || []).map(reveal => {
                const otherUser = reveal.match.user1 || reveal.match.user2
                const displayName = otherUser?.profile?.display_name || otherUser?.name || 'Your Match'

                return (
                  <div
                    key={reveal.id}
                    className="bg-slate-800/50 rounded-xl border border-purple-500/20 overflow-hidden hover:border-purple-500/40 transition group"
                  >
                    <div className="relative aspect-square bg-slate-700">
                      {reveal.photo?.url ? (
                        <Image
                          src={reveal.photo.url}
                          alt="Revealed photo"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-white" />
                        <span className="text-xs text-white font-medium">Revealed</span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {displayName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        Revealed {formatDate(reveal.created_at)}
                      </div>

                      <Link
                        href={`/matches/${reveal.match_id}`}
                        className="mt-3 block w-full text-center py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition text-sm font-medium"
                      >
                        View Match
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-8 p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
            <div className="flex items-center gap-3">
              <Eye className="w-10 h-10" />
              <div className="flex-1">
                <h3 className="font-semibold">Want to reveal more photos?</h3>
                <p className="text-sm text-purple-100">Browse your matches and unlock their hidden moments</p>
              </div>
              <Link
                href="/matches"
                className="px-4 py-2 bg-card dark:bg-card text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition"
              >
                My Matches
              </Link>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default function PhotoRevealsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>}>
      <PhotoRevealsContent />
    </Suspense>
  )
}
