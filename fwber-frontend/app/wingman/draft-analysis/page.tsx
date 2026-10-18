'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import { ArrowLeft, RefreshCw, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'

interface DraftAnalysisResponse {
  original_score: number
  improved_score: number
  suggestions: string[]
  improved_draft: string
}

export default function DraftAnalysisPage() {
  const [result, setResult] = useState<DraftAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  async function analyzeDraft() {
    if (!draft.trim()) {
      setError('Please enter a message draft to analyze.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.post<DraftAnalysisResponse>('/wingman/draft-analysis', { draft })
      setResult(response.data)
    } catch (err) {
      console.error('Failed:', err)
      setError('Could not analyze draft. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-violet-950 via-purple-950 to-black">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/wingman" className="p-2 -ml-2 hover:bg-purple-800/30 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Pencil className="w-7 h-7 text-violet-400" />
                Draft Analysis
              </h1>
              <p className="text-sm text-muted-foreground">AI-powered message coaching</p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-3xl blur-xl" />
            <div className="relative bg-gradient-to-br from-violet-900/80 via-purple-900/80 to-slate-900/80 rounded-3xl border border-violet-500/30 overflow-hidden">
              <div className="relative p-8 text-center">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Pencil className="w-12 h-12 text-white" />
                  </div>
                </div>

                {!result && !loading && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white">Make every message count</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Paste a message draft and get instant AI feedback with a score, suggestions, and an improved version.
                    </p>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Paste your message draft here..."
                      className="w-full bg-slate-800/50 border border-slate-600 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none h-32"
                    />
                  </div>
                )}

                {loading && (
                  <div className="py-8">
                    <div className="w-16 h-16 mx-auto border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                    <p className="text-violet-300 mt-4 animate-pulse">Analyzing your draft...</p>
                  </div>
                )}

                {result && !loading && (
                  <div className="space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-amber-400">{result.original_score}</p>
                        <p className="text-xs text-muted-foreground">Original Score</p>
                      </div>
                      <div className="bg-slate-800/50 border border-green-500/30 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-green-400">{result.improved_score}</p>
                        <p className="text-xs text-muted-foreground">Improved Score</p>
                      </div>
                    </div>

                    {(result.suggestions || []).length > 0 && (
                      <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                        <h3 className="text-violet-400 font-semibold mb-3">💡 Suggestions</h3>
                        <ul className="space-y-2">
                          {result.suggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                              <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.improved_draft && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <h3 className="text-green-400 font-semibold mb-2">✨ Improved Version</h3>
                        <p className="text-gray-200 text-sm">{result.improved_draft}</p>
                      </div>
                    )}

                    <button type="button" onClick={() => { setResult(null); setDraft('') }}
                      className="w-full py-2 text-violet-400 hover:text-violet-300 transition text-sm">
                      Analyze another draft →
                    </button>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 flex items-center gap-2">
                    <X className="w-5 h-5 shrink-0" /> {error}
                  </div>
                )}

                {!result && (
                  <div className="mt-6">
                    <button type="button" onClick={analyzeDraft} disabled={loading || !draft.trim()}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-purple-700 transition disabled:opacity-50 shadow-lg shadow-violet-500/30 mx-auto">
                      <Pencil className="w-5 h-5" /> Analyze Draft
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
