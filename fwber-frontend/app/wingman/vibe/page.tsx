'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import {
  Sparkles, ArrowLeft, RefreshCw, Share2,
  Flag, ThumbsUp, ThumbsDown, Zap
} from 'lucide-react'
import Link from 'next/link'

interface VibeCheckResponse {
  green_flags: string[]
  red_flags: string[]
  share_id: string
}

export default function VibeCheckPage() {
  const [result, setResult] = useState<VibeCheckResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  async function getVibeCheck() {
    setLoading(true)
    setError(null)
    setRevealed(false)

    try {
      const response = await apiClient.get<VibeCheckResponse>('/wingman/vibe-check')
      setResult(response.data)
      setTimeout(() => setRevealed(true), 500)
    } catch (err) {
      console.error('Failed to get vibe check:', err)
      setError('Could not read your vibes. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!result) return

    const greenList = (result.green_flags || []).slice(0, 2).join(', ')
    const redList = (result.red_flags || []).slice(0, 2).join(', ')
    const shareText = `My Vibe Check: Green flags - ${greenList}. Red flags - ${redList}. Get yours at fwber!`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Vibe Check',
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
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-teal-950 to-black">
        <AppHeader />

        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/wingman"
              className="p-2 -ml-2 hover:bg-teal-800/30 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Zap className="w-7 h-7 text-yellow-400" />
                Vibe Check
              </h1>
              <p className="text-sm text-gray-400">
                Discover your dating green flags and red flags
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-green-500/20 rounded-3xl blur-xl" />

            <div className="relative bg-gradient-to-br from-emerald-900/80 via-teal-900/80 to-slate-900/80 rounded-3xl border border-emerald-500/30 overflow-hidden">
              <div className="relative p-8 text-center">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Flag className="w-12 h-12 text-white" />
                  </div>
                </div>

                {!result && !loading && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">
                      What are your dating red and green flags?
                    </h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                      Based on your profile, we&apos;ll analyze your personality
                      to reveal your dating strengths and areas to work on.
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="space-y-4 py-4">
                    <div className="flex justify-center gap-4">
                      <div className="w-12 h-12 bg-green-500/30 rounded-full flex items-center justify-center animate-pulse">
                        <ThumbsUp className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="w-12 h-12 bg-red-500/30 rounded-full flex items-center justify-center animate-pulse" style={{ animationDelay: '0.5s' }}>
                        <ThumbsDown className="w-6 h-6 text-red-400" />
                      </div>
                    </div>
                    <p className="text-teal-300 animate-pulse">
                      Analyzing your vibes...
                    </p>
                  </div>
                )}

                {result && !loading && (
                  <div className={`space-y-6 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-2xl p-5">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <ThumbsUp className="w-6 h-6 text-green-400" />
                          <span className="text-green-300 font-semibold">Green Flags</span>
                        </div>
                        <ul className="space-y-3 text-left">
                          {(result.green_flags || []).map((flag, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-green-400 mt-0.5">✓</span>
                              <span className="text-sm text-gray-200">{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-500/30 rounded-2xl p-5">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <ThumbsDown className="w-6 h-6 text-red-400" />
                          <span className="text-red-300 font-semibold">Red Flags</span>
                        </div>
                        <ul className="space-y-3 text-left">
                          {(result.red_flags || []).map((flag, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-red-400 mt-0.5">⚠</span>
                              <span className="text-sm text-gray-200">{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 italic">
                      Remember: Everyone has room to grow. These are just for fun!
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300">
                    {error}
                  </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button type="button"
                    onClick={getVibeCheck}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 shadow-lg shadow-emerald-500/30"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Zap className="w-5 h-5" />
                    )}
                    {result ? 'Check Again' : 'Check My Vibe'}
                  </button>

                  {result && (
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
              href="/wingman/roast"
              className="p-4 bg-slate-800/50 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition text-center"
            >
              <Sparkles className="w-8 h-8 mx-auto text-orange-400 mb-2" />
              <span className="text-sm text-gray-300">Roast Me</span>
            </Link>
            <Link
              href="/wingman/cosmic"
              className="p-4 bg-slate-800/50 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition text-center"
            >
              <Sparkles className="w-8 h-8 mx-auto text-violet-400 mb-2" />
              <span className="text-sm text-gray-300">Cosmic Match</span>
            </Link>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
