'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import {
  Star, ArrowLeft, RefreshCw, Share2,
  Heart, HeartCrack, Sparkles, Moon,
  Infinity as InfinityIcon, Compass, Skull, Flame, Zap
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface CosmicMatchResponse {
  best_match: string
  best_reason: string
  worst_match: string
  worst_reason: string
  share_id: string
}

const zodiacEmojis: Record<string, string> = {
  aries: '♈',
  taurus: '♉',
  gemini: '♊',
  cancer: '♋',
  leo: '♌',
  virgo: '♍',
  libra: '♎',
  scorpio: '♏',
  sagittarius: '♐',
  capricorn: '♑',
  aquarius: '♒',
  pisces: '♓',
}

function getZodiacEmoji(sign: string | undefined | null): string {
  if (!sign) return '⭐'
  const normalized = sign.toLowerCase().trim()
  return zodiacEmojis[normalized] || '⭐'
}

export default function CosmicMatchPage() {
  const [result, setResult] = useState<CosmicMatchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  async function getCosmicMatch() {
    setLoading(true)
    setError(null)
    setRevealed(false)

    try {
      const response = await apiClient.get<CosmicMatchResponse>('/wingman/cosmic-match')
      setResult(response.data)
      setTimeout(() => setRevealed(true), 800)
    } catch (err) {
      console.error('Failed to get cosmic match:', err)
      setError('The stars are misaligned. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!result) return

    const shareText = `My Cosmic Match: Best with ${result.best_match} ${getZodiacEmoji(result.best_match)}, Avoid ${result.worst_match} ${getZodiacEmoji(result.worst_match)} - Get yours at fwber!`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Cosmic Match',
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
      <div className="min-h-screen bg-[#02020a] text-white relative overflow-hidden">
        {/* Deep Space Background */}
        <div className="absolute inset-0 z-0">
            {[...Array(100)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{ 
                        opacity: [0.2, 0.8, 0.2],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{
                        duration: Math.random() * 5 + 3,
                        repeat: Infinity,
                        delay: Math.random() * 5
                    }}
                    className="absolute bg-card dark:bg-card rounded-full"
                    style={{
                        width: Math.random() * 2 + 1 + 'px',
                        height: Math.random() * 2 + 1 + 'px',
                        top: Math.random() * 100 + '%',
                        left: Math.random() * 100 + '%',
                    }}
                />
            ))}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-950/20 via-transparent to-[#02020a]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/5 blur-[150px] rounded-full" />
        </div>

        <AppHeader />

        <main className="max-w-3xl mx-auto px-4 py-12 relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <Link
              href="/wingman"
              className="p-2 -ml-2 hover:bg-card dark:dark:bg-card/5 rounded-full transition"
            >
              <ArrowLeft className="w-6 h-6 text-zinc-500" />
            </Link>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                <Star className="w-9 h-9 text-yellow-400 fill-current" />
                Cosmic Match
              </h1>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em]">
                Celestial Compatibility Oracle
              </p>
            </div>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
                {!result && !loading && (
                    <motion.div 
                        key="idle"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="bg-zinc-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-12 text-center"
                    >
                        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.3)] mb-8">
                            <Moon className="w-16 h-12 text-white fill-current" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4 tracking-tight">The Stars Await Your Command</h2>
                        <p className="text-zinc-400 max-w-md mx-auto leading-relaxed mb-10">
                            Our AI Oracle will triangulate your profile data against the current celestial alignment to reveal your ultimate partner and your greatest clash.
                        </p>
                        <button type="button"
                            onClick={getCosmicMatch}
                            className="h-20 w-full bg-card dark:bg-card text-black font-black uppercase tracking-widest italic rounded-3xl hover:bg-zinc-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-4 text-xl shadow-xl shadow-white/5"
                        >
                            <Sparkles className="w-6 h-6" />
                            Align The Stars
                        </button>
                    </motion.div>
                )}

                {loading && (
                    <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-h-[400px] flex flex-col items-center justify-center space-y-8"
                    >
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="w-48 h-48 rounded-full border border-indigo-500/20 border-dashed"
                            />
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-4 rounded-full border border-violet-500/30 border-dashed"
                            />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
                                {['♈', '♌', '♐'].map((s, i) => (
                                    <motion.span 
                                        key={i}
                                        animate={{ 
                                            y: [0, -20, 0],
                                            opacity: [0.5, 1, 0.5]
                                        }}
                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                        className="text-3xl"
                                    >
                                        {s}
                                    </motion.span>
                                ))}
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-indigo-400 font-black uppercase tracking-[0.2em] animate-pulse">Calculating Compatibility...</p>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest">Querying Celestial Database</p>
                        </div>
                    </motion.div>
                )}

                {result && revealed && (
                    <motion.div 
                        key="result"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-8"
                    >
                        {/* Best Match Hero */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/30 rounded-[2.5rem] p-10 text-center relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <InfinityIcon className="w-32 h-32 rotate-12" />
                            </div>
                            
                            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 mb-6 font-black tracking-widest">
                                COSMIC SOULMATE
                            </Badge>
                            
                            <div className="text-7xl mb-4 filter drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]">
                                {getZodiacEmoji(result.best_match)}
                            </div>
                            
                            <h3 className="text-5xl font-black uppercase italic tracking-tighter text-white mb-4">
                                {result.best_match}
                            </h3>
                            
                            <p className="text-lg text-zinc-300 max-w-md mx-auto leading-relaxed">
                                {result.best_reason}
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Worst Match */}
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="bg-zinc-900/60 border border-red-900/30 rounded-3xl p-8 relative overflow-hidden"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                                        <HeartCrack className="w-6 h-6 text-red-500" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-red-400">Avoid At All Costs</span>
                                </div>
                                <div className="text-4xl mb-2">{getZodiacEmoji(result.worst_match)}</div>
                                <h4 className="text-2xl font-black uppercase italic tracking-tight mb-2 text-white">{result.worst_match}</h4>
                                <p className="text-sm text-zinc-400 leading-relaxed">{result.worst_reason}</p>
                            </motion.div>

                            {/* Share & Actions */}
                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="flex flex-col gap-4"
                            >
                                <button type="button"
                                    onClick={handleShare}
                                    className="flex-1 bg-card dark:bg-card text-black font-black uppercase tracking-widest italic rounded-3xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-lg shadow-white/5"
                                >
                                    <Share2 className="w-5 h-5" />
                                    Broadcast Destiny
                                </button>
                                <button type="button"
                                    onClick={getCosmicMatch}
                                    className="flex-1 bg-zinc-800/50 text-white font-black uppercase tracking-widest italic rounded-3xl border border-zinc-700 flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Consult Again
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-400 text-center font-bold"
              >
                <div className="flex justify-center mb-2">
                    <Compass className="w-8 h-8 animate-spin-slow" />
                </div>
                {error}
              </motion.div>
            )}
          </div>

          {/* Cross-Link Grid */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
                { href: '/wingman/fortune', icon: Sparkles, label: 'Fortune', color: 'text-yellow-400' },
                { href: '/wingman/nemesis', icon: Skull, label: 'Nemesis', color: 'text-rose-500' },
                { href: '/wingman/roast', icon: Flame, label: 'Roast', color: 'text-orange-500' },
                { href: '/wingman/vibe', icon: Zap, label: 'Vibe', color: 'text-emerald-400' }
            ].map((link, i) => (
                <Link
                    key={i}
                    href={link.href}
                    className="p-4 bg-zinc-900/40 rounded-2xl border border-white/5 hover:border-white/10 transition flex flex-col items-center gap-2 group"
                >
                    <link.icon className={`w-6 h-6 ${link.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{link.label}</span>
                </Link>
            ))}
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
