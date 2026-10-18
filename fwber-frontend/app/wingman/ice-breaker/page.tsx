'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import { ArrowLeft, RefreshCw, MessageCircle, Send } from 'lucide-react'
import Link from 'next/link'

interface IceBreakerResponse {
  icebreakers: string[]
  share_id: string
}

export default function IceBreakerPage() {
  const [result, setResult] = useState<IceBreakerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState('')

  async function getIceBreakers() {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.post<IceBreakerResponse>('/wingman/ice-breaker', { context })
      setResult(response.data)
    } catch (err) {
      console.error('Failed:', err)
      setError('Could not generate ice breakers. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-cyan-950 via-blue-950 to-black">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/wingman" className="p-2 -ml-2 hover:bg-blue-800/30 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-7 h-7 text-cyan-400" />
                Ice Breakers
              </h1>
              <p className="text-sm text-muted-foreground">AI-generated conversation starters</p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-sky-500/20 rounded-3xl blur-xl" />
            <div className="relative bg-gradient-to-br from-cyan-900/80 via-blue-900/80 to-slate-900/80 rounded-3xl border border-cyan-500/30 overflow-hidden">
              <div className="relative p-8 text-center">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <MessageCircle className="w-12 h-12 text-white" />
                  </div>
                </div>

                {!result && !loading && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">Need help starting a conversation?</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Tell us about your match and we&apos;ll generate creative ice breakers to get the conversation flowing.
                    </p>
                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="Describe your match or the situation (optional)..."
                      className="w-full bg-slate-800/50 border border-slate-600 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none h-24"
                    />
                  </div>
                )}

                {loading && (
                  <div className="py-8">
                    <div className="flex justify-center gap-2 mb-4">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                    <p className="text-cyan-300 animate-pulse">Crafting the perfect opener...</p>
                  </div>
                )}

                {result && !loading && (
                  <div className="space-y-4 text-left">
                    <h3 className="text-lg font-semibold text-white text-center mb-4">Try these openers:</h3>
                    {(result.icebreakers || [
                      'What\'s the best thing that happened to you today?',
                      'If you could instantly become an expert in anything, what would it be?',
                      'What\'s your go-to karaoke song?',
                    ]).map((ib, i) => (
                      <div key={i} className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4 hover:border-cyan-500/40 transition group">
                        <p className="text-gray-200">{ib}</p>
                        <button type="button"
                          onClick={async () => {
                            try { await navigator.clipboard.writeText(ib) } catch { /* ok */ }
                          }}
                          className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300">{error}</div>
                )}

                <div className="mt-8">
                  <button type="button" onClick={getIceBreakers} disabled={loading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg shadow-cyan-500/30 mx-auto">
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {result ? 'Generate More' : 'Get Ice Breakers'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
