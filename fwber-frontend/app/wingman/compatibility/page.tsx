'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import { ArrowLeft, RefreshCw, Share2, Heart, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface CompatibilityResponse {
  score: number
  strengths: string[]
  weaknesses: string[]
  tips: string[]
  share_id: string
}

export default function CompatibilityPage() {
  const [result, setResult] = useState<CompatibilityResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getCompatibility() {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.post<CompatibilityResponse>('/wingman/compatibility', {})
      setResult(response.data)
    } catch (err) {
      console.error('Failed:', err)
      setError('Could not analyze compatibility. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!result) return
    const text = `My dating compatibility score: ${result.score}/100! Get yours at fwber.site`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Compatibility Score', text })
      } else {
        await navigator.clipboard.writeText(text)
      }
    } catch { /* cancelled */ }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-rose-950 via-pink-950 to-black">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/wingman" className="p-2 -ml-2 hover:bg-pink-800/30 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Heart className="w-7 h-7 text-pink-400" />
                Compatibility Audit
              </h1>
              <p className="text-sm text-gray-400">AI-powered dating profile analysis</p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-red-500/20 rounded-3xl blur-xl" />
            <div className="relative bg-gradient-to-br from-rose-900/80 via-pink-900/80 to-slate-900/80 rounded-3xl border border-pink-500/30 overflow-hidden">
              <div className="relative p-8 text-center">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30">
                    <Heart className="w-12 h-12 text-white" />
                  </div>
                </div>

                {!result && !loading && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">How dateable is your profile?</h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                      Our AI analyzes your profile for strengths, weaknesses, and actionable dating tips.
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="py-8">
                    <div className="w-16 h-16 mx-auto border-4 border-pink-500/30 border-t-pink-400 rounded-full animate-spin" />
                    <p className="text-pink-300 mt-4 animate-pulse">Analyzing your profile...</p>
                  </div>
                )}

                {result && !loading && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/10 border border-pink-500/30 rounded-2xl p-6">
                      <div className="text-5xl font-bold text-white mb-2">{result.score}<span className="text-2xl text-gray-400">/100</span></div>
                      <p className="text-pink-300">Compatibility Score</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-left">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <h3 className="text-green-400 font-semibold mb-3">✅ Strengths</h3>
                        <ul className="space-y-2">
                          {(result.strengths || ['Profile exists']).map((s, i) => (
                            <li key={i} className="text-sm text-gray-200">• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                        <h3 className="text-amber-400 font-semibold mb-3">⚠️ Areas to Improve</h3>
                        <ul className="space-y-2">
                          {(result.weaknesses || ['AI is resting']).map((w, i) => (
                            <li key={i} className="text-sm text-gray-200">• {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {(result.tips || []).length > 0 && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-left">
                        <h3 className="text-blue-400 font-semibold mb-3">💡 Tips</h3>
                        <ul className="space-y-2">
                          {result.tips.map((t, i) => (
                            <li key={i} className="text-sm text-gray-200">• {t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300">{error}</div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={getCompatibility} disabled={loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-rose-700 transition disabled:opacity-50 shadow-lg shadow-pink-500/30">
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {result ? 'Analyze Again' : 'Analyze My Profile'}
                  </button>
                  {result && (
                    <button onClick={handleShare}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700/50 text-white font-semibold rounded-xl hover:bg-slate-700 transition border border-slate-600">
                      <Share2 className="w-5 h-5" /> Share
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
