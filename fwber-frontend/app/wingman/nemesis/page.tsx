'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import {
  Skull, ArrowLeft, RefreshCw, Share2,
  Zap, AlertTriangle, Brain, Ghost, Globe
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface NemesisResponse {
  nemesis_type: string
  clashing_traits: string[]
  why_it_would_fail: string
  scientific_explanation: string
  share_id: string
}

export default function ScientificNemesisPage() {
  const [result, setResult] = useState<NemesisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  async function findNemesis() {
    setLoading(true)
    setError(null)
    setRevealed(false)

    try {
      const response = await apiClient.get<NemesisResponse>('/wingman/nemesis')
      setResult(response.data)
      setTimeout(() => setRevealed(true), 500)
    } catch (err) {
      console.error('Failed to find nemesis:', err)
      setError('The psychological data is corrupted. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!result) return

    const shareText = `My Scientific Nemesis is "${result.nemesis_type}". Avoid at all costs! Find your dating rival at fwber.`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Scientific Nemesis',
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
      <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 relative overflow-hidden">
        {/* Dark Red Ambient Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-900/10 blur-[120px] rounded-full" />

        <AppHeader />

        <main className="max-w-2xl mx-auto px-4 py-12 relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <Link
              href="/wingman"
              className="p-2 -ml-2 hover:bg-white dark:bg-gray-800/5 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </Link>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic text-white flex items-center gap-3">
                <Skull className="w-8 h-8 text-rose-600" />
                Scientific Nemesis
              </h1>
              <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">
                Personality Polar Opposite Analysis
              </p>
            </div>
          </div>

          <div className="relative">
            {/* Main Card */}
            <div className={`relative bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border ${revealed ? 'border-rose-500/30 shadow-[0_0_40px_rgba(225,29,72,0.15)]' : 'border-zinc-800'} overflow-hidden transition-all duration-1000`}>
              
              {/* Scanline Animation */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                <motion.div
                  initial={{ y: -500 }}
                  animate={{ y: 500 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-full h-[2px] bg-rose-500 blur-[2px]"
                />
              </div>

              <div className="p-8 md:p-12 text-center">
                <AnimatePresence mode="wait">
                  {!result && !loading && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-6 py-8"
                    >
                      <div className="w-24 h-24 mx-auto bg-zinc-800 rounded-3xl flex items-center justify-center border border-zinc-700 shadow-inner">
                        <Brain className="w-12 h-12 text-zinc-600" />
                      </div>
                      <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Who is your rival?</h2>
                        <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
                          Our AI will analyze your psychological profile to reconstruct the exact personality type guaranteed to drive you insane.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {loading && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-12 space-y-6"
                    >
                      <div className="flex justify-center">
                        <div className="relative">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="w-24 h-24 rounded-full border-4 border-dashed border-rose-500/30"
                          />
                          <Skull className="w-8 h-8 text-rose-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-rose-500 font-bold uppercase tracking-widest text-xs animate-pulse">Scanning Shadow Traits...</p>
                        <div className="flex justify-center gap-1">
                          {[1,2,3].map(i => (
                            <motion.div
                              key={i}
                              animate={{ scaleY: [1, 2, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1 h-4 bg-rose-600 rounded-full"
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {result && revealed && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-8 py-4"
                    >
                      <div className="space-y-2">
                        <Badge variant="outline" className="border-rose-500/50 text-rose-500 font-black tracking-widest px-4 py-1">TARGET IDENTIFIED</Badge>
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">{result.nemesis_type}</h2>
                      </div>

                      <div className="grid grid-cols-1 gap-4 text-left">
                        <div className="bg-white dark:bg-gray-800/5 border border-white/10 rounded-2xl p-6">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" /> Toxic Trait Overlap
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {result.clashing_traits.map((trait, i) => (
                              <span key={i} className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-[10px] font-bold text-rose-400">
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800/5 border border-white/10 rounded-2xl p-6">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-4 flex items-center gap-2">
                            <Skull className="w-3 h-3" /> The Disaster Scenario
                          </h3>
                          <p className="text-sm text-zinc-300 leading-relaxed italic">
                            &quot;{result.why_it_would_fail}&quot;
                          </p>
                        </div>

                        <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-6">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 flex items-center gap-2">
                            <Zap className="w-3 h-3" /> Scientific Post-Mortem
                          </h3>
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            {result.scientific_explanation}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-400 text-sm font-bold">
                    {error}
                  </div>
                )}

                <div className="mt-12 flex flex-col gap-4">
                  <button type="button"
                    onClick={findNemesis}
                    disabled={loading}
                    className="w-full h-16 flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-black font-black uppercase tracking-tighter italic rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 group"
                  >
                    {loading ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
                    ) : (
                      <>
                        <Skull className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                        {result ? 'Recalculate Rivalry' : 'Expose My Nemesis'}
                      </>
                    )}
                  </button>

                  {result && (
                    <button type="button"
                      onClick={handleShare}
                      className="w-full h-12 flex items-center justify-center gap-2 bg-zinc-800/50 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-zinc-800 transition border border-zinc-700"
                    >
                      <Share2 className="w-4 h-4" />
                      Broadcast Warnings
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Grid */}
          <div className="mt-12 grid grid-cols-2 gap-4">
            <Link
              href="/wingman/cosmic"
              className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cosmic Match</span>
            </Link>
            <Link
              href="/wingman/vibe"
              className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Vibe Check</span>
            </Link>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
            {children}
        </span>
    );
}
