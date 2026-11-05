'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import {
  Sparkles, ArrowLeft, RefreshCw, Share2,
  Moon, Star, Wand2
} from 'lucide-react'
import Link from 'next/link'

interface FortuneResponse {
  fortune: string
  share_id: string
}

export default function FortunePage() {
  const [fortune, setFortune] = useState<FortuneResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  async function getFortune() {
    setLoading(true)
    setError(null)
    setRevealed(false)

    try {
      const response = await apiClient.get<FortuneResponse>('/wingman/fortune')
      setFortune(response.data)
      setTimeout(() => setRevealed(true), 500)
    } catch (err) {
      console.error('Failed to get fortune:', err)
      setError('The spirits are unavailable. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!fortune) return

    const shareText = `My Dating Fortune: "${fortune.fortune}" - Get yours at fwber!`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Dating Fortune',
          text: shareText,
        })
      } catch {
        await navigator.clipboard.writeText(shareText)
      }
    } else {
      await navigator.clipboard.writeText(shareText)
      // Clipboard copy succeeded
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black">
        <AppHeader />

        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/wingman"
              className="p-2 -ml-2 hover:bg-purple-800/30 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Moon className="w-7 h-7 text-indigo-400" />
                Dating Fortune
              </h1>
              <p className="text-sm text-muted-foreground">
                Discover what the dating spirits have in store for you
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl" />

            <div className="relative bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-slate-900/80 rounded-3xl border border-indigo-500/30 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <Star
                    key={i}
                    className="absolute text-yellow-300/20 animate-pulse"
                    style={{
                      width: `${Math.random() * 12 + 8}px`,
                      height: `${Math.random() * 12 + 8}px`,
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 3}s`,
                      animationDuration: `${Math.random() * 2 + 2}s`,
                    }}
                  />
                ))}
              </div>

              <div className="relative p-8 text-center">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Wand2 className="w-12 h-12 text-white" />
                  </div>
                </div>

                {!fortune && !loading && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">
                      Ready to know your dating destiny?
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      The AI spirits will reveal a personalized fortune about your love life.
                      Are you prepared for the truth?
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="space-y-4 py-4">
                    <Sparkles className="w-16 h-16 mx-auto text-yellow-400 animate-spin" />
                    <p className="text-purple-300 animate-pulse">
                      Consulting the dating spirits...
                    </p>
                  </div>
                )}

                {fortune && !loading && (
                  <div className={`space-y-4 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
                      <Sparkles className="w-8 h-8 mx-auto text-yellow-400 mb-4" />
                      <p className="text-lg text-yellow-100 font-medium leading-relaxed">
                        &ldquo;{fortune.fortune}&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300">
                    {error}
                  </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button type="button"
                    onClick={getFortune}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-50 shadow-lg shadow-purple-500/30"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Wand2 className="w-5 h-5" />
                    )}
                    {fortune ? 'Get Another Fortune' : 'Reveal My Fortune'}
                  </button>

                  {fortune && (
                    <button type="button"
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700/50 text-white font-semibold rounded-xl hover:bg-slate-700 transition border border-slate-600"
                    >
                      <Share2 className="w-5 h-5" />
                      Share
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <Link
              href="/wingman/cosmic"
              className="p-4 bg-slate-800/50 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition text-center"
            >
              <Star className="w-8 h-8 mx-auto text-purple-400 mb-2" />
              <span className="text-sm text-muted-foreground">Cosmic Match</span>
            </Link>
            <Link
              href="/wingman/vibe"
              className="p-4 bg-slate-800/50 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition text-center"
            >
              <Sparkles className="w-8 h-8 mx-auto text-green-400 mb-2" />
              <span className="text-sm text-muted-foreground">Vibe Check</span>
            </Link>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
