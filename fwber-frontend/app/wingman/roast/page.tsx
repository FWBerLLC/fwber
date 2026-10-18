'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import {
  Flame, ArrowLeft, RefreshCw, Share2,
  Sparkles, Star, Heart
} from 'lucide-react'
import Link from 'next/link'

interface RoastResponse {
  roast: string
  share_id: string
}

export default function RoastPage() {
  const [result, setResult] = useState<RoastResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'roast' | 'hype'>('roast')
  const [revealed, setRevealed] = useState(false)

  async function getRoast() {
    setLoading(true)
    setError(null)
    setRevealed(false)

    try {
      const response = await apiClient.post<RoastResponse>('/wingman/roast', { mode })
      setResult(response.data)
      setTimeout(() => setRevealed(true), 500)
    } catch (err) {
      console.error('Failed to get roast:', err)
      setError('The roast machine is cooling down. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!result) return

    const emoji = mode === 'roast' ? '🔥' : '🚀'
    const shareText = `${emoji} My Profile ${mode === 'roast' ? 'Roast' : 'Hype'}: "${result.roast}" - Get yours at fwber!`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Profile ${mode === 'roast' ? 'Roast' : 'Hype'}`,
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

  const isRoast = mode === 'roast'

  return (
    <ProtectedRoute>
      <div className={`min-h-screen bg-gradient-to-b ${isRoast ? 'from-orange-950 via-red-950 to-black' : 'from-cyan-950 via-blue-950 to-black'}`}>
        <AppHeader />

        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/wingman"
              className="p-2 -ml-2 hover:bg-orange-800/30 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Flame className={`w-7 h-7 ${isRoast ? 'text-orange-400' : 'text-cyan-400'}`} />
                {isRoast ? 'Profile Roast' : 'Profile Hype'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isRoast ? 'Get savagely roasted by AI' : 'Get hyped up by AI'}
              </p>
            </div>
          </div>

          <div className="mb-6 flex justify-center">
            <div className="inline-flex rounded-xl bg-slate-800/50 p-1 border border-slate-700">
              <button type="button"
                onClick={() => setMode('roast')}
                className={`px-6 py-2 rounded-lg font-medium transition ${isRoast
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                    : 'text-muted-foreground hover:text-white'
                  }`}
              >
                🔥 Roast Me
              </button>
              <button type="button"
                onClick={() => setMode('hype')}
                className={`px-6 py-2 rounded-lg font-medium transition ${!isRoast
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                    : 'text-muted-foreground hover:text-white'
                  }`}
              >
                🚀 Hype Me
              </button>
            </div>
          </div>

          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-r ${isRoast ? 'from-orange-500/20 via-red-500/20 to-orange-500/20' : 'from-cyan-500/20 via-blue-500/20 to-cyan-500/20'} rounded-3xl blur-xl`} />

            <div className={`relative bg-gradient-to-br ${isRoast ? 'from-orange-900/80 via-red-900/80 to-slate-900/80 border-orange-500/30' : 'from-cyan-900/80 via-blue-900/80 to-slate-900/80 border-cyan-500/30'} rounded-3xl border overflow-hidden`}>
              <div className="relative p-8 text-center">
                <div className="mb-6">
                  <div className={`w-24 h-24 mx-auto bg-gradient-to-br ${isRoast ? 'from-orange-500 to-red-600 shadow-orange-500/30' : 'from-cyan-500 to-blue-600 shadow-cyan-500/30'} rounded-full flex items-center justify-center shadow-lg`}>
                    <Flame className="w-12 h-12 text-white" />
                  </div>
                </div>

                {!result && !loading && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">
                      {isRoast ? 'Ready to get roasted?' : 'Ready to get hyped?'}
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {isRoast
                        ? 'Our AI will analyze your profile and deliver a savage (but fun) roast. Can you handle it?'
                        : 'Our AI will analyze your profile and make you feel like the legend you are!'}
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="space-y-4 py-4">
                    <Flame className={`w-16 h-16 mx-auto ${isRoast ? 'text-orange-400' : 'text-cyan-400'} animate-pulse`} />
                    <p className={`${isRoast ? 'text-orange-300' : 'text-cyan-300'} animate-pulse`}>
                      {isRoast ? 'Preparing the flames...' : 'Charging the hype cannon...'}
                    </p>
                  </div>
                )}

                {result && !loading && (
                  <div className={`space-y-4 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className={`bg-gradient-to-r ${isRoast ? 'from-orange-500/10 via-red-500/10 to-orange-500/10 border-orange-500/30' : 'from-cyan-500/10 via-blue-500/10 to-cyan-500/10 border-cyan-500/30'} border rounded-2xl p-6`}>
                      <Flame className={`w-8 h-8 mx-auto ${isRoast ? 'text-orange-400' : 'text-cyan-400'} mb-4`} />
                      <p className={`text-lg ${isRoast ? 'text-orange-100' : 'text-cyan-100'} font-medium leading-relaxed`}>
                        &ldquo;{result.roast}&rdquo;
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
                    onClick={getRoast}
                    disabled={loading}
                    className={`flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r ${isRoast ? 'from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/30' : 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-cyan-500/30'} text-white font-semibold rounded-xl transition disabled:opacity-50 shadow-lg`}
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Flame className="w-5 h-5" />
                    )}
                    {result ? (isRoast ? 'Roast Again' : 'Hype Again') : (isRoast ? 'Roast My Profile' : 'Hype My Profile')}
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
              href="/wingman/vibe"
              className="p-4 bg-slate-800/50 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition text-center"
            >
              <Sparkles className="w-8 h-8 mx-auto text-green-400 mb-2" />
              <span className="text-sm text-muted-foreground">Vibe Check</span>
            </Link>
            <Link
              href="/wingman/nemesis"
              className="p-4 bg-slate-800/50 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition text-center"
            >
              <Star className="w-8 h-8 mx-auto text-red-400 mb-2" />
              <span className="text-sm text-muted-foreground">Find Nemesis</span>
            </Link>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
