'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
    Wand2, Star, Flame, Flag, Skull,
    Sparkles, Gamepad2, Brain,
    Zap, Info, ArrowRight, PlayCircle
} from 'lucide-react'

const arcadeGames = [
    {
        id: 'fortune',
        title: 'Dating Fortune',
        description: 'Consult the AI spirits for your daily love prediction.',
        icon: Wand2,
        href: '/wingman/fortune',
        color: 'from-indigo-500 to-purple-600',
        borderColor: 'border-indigo-500/30',
        shadowColor: 'shadow-indigo-500/20',
        textColor: 'text-indigo-400'
    },
    {
        id: 'cosmic',
        title: 'Cosmic Match',
        description: 'Find your best and worst zodiac alignments.',
        icon: Star,
        href: '/wingman/cosmic',
        color: 'from-violet-500 to-indigo-600',
        borderColor: 'border-violet-500/30',
        shadowColor: 'shadow-violet-500/20',
        textColor: 'text-violet-400'
    },
    {
        id: 'roast',
        title: 'Profile Roast',
        description: 'Can you handle the savage truth about your profile?',
        icon: Flame,
        href: '/wingman/roast',
        color: 'from-orange-500 to-red-600',
        borderColor: 'border-orange-500/30',
        shadowColor: 'shadow-orange-500/20',
        textColor: 'text-orange-400'
    },
    {
        id: 'vibe',
        title: 'Vibe Check',
        description: 'The AI analyzes your red and green flags.',
        icon: Flag,
        href: '/wingman/vibe',
        color: 'from-emerald-500 to-teal-600',
        borderColor: 'border-emerald-500/30',
        shadowColor: 'shadow-emerald-500/20',
        textColor: 'text-emerald-400'
    },
    {
        id: 'nemesis',
        title: 'Your Nemesis',
        description: 'Identify the person guaranteed to drive you crazy.',
        icon: Skull,
        href: '/wingman/nemesis',
        color: 'from-rose-500 to-red-600',
        borderColor: 'border-rose-500/30',
        shadowColor: 'shadow-rose-500/20',
        textColor: 'text-rose-400'
    }
]

export default function WingmanArcadePage() {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#050510] relative overflow-hidden">
                {/* Animated Star Field Background */}
                <div className="absolute inset-0 z-0">
                    {[...Array(50)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0.1 }}
                            animate={{ opacity: [0.1, 0.5, 0.1] }}
                            transition={{
                                duration: Math.random() * 3 + 2,
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
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-900/10 via-transparent to-[#050510]" />
                    <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />
                    <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
                </div>

                <AppHeader />

                <main className="relative z-10 max-w-7xl mx-auto px-4 py-12">
                    {/* Header Section */}
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-4 backdrop-blur-sm"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>AI-Driven Viral Fun</span>
                        </motion.div>

                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-7xl font-black text-white mb-6 uppercase tracking-tight italic"
                        >
                            Wingman <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Arcade</span>
                        </motion.h1>

                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-muted-foreground text-lg max-w-2xl mx-auto"
                        >
                            Play games, share roasts, and consult the spirits.
                            The most playful way to discover your dating destiny.
                        </motion.p>
                    </div>

                    {/* Arcade Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {arcadeGames.map((game, index) => (
                            <motion.div
                                key={game.id}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1 * index + 0.3 }}
                                whileHover={{ y: -5 }}
                            >
                                <Link href={game.href}>
                                    <div className={`group relative h-full bg-slate-900/40 backdrop-blur-md rounded-3xl border ${game.borderColor} p-8 overflow-hidden transition-all hover:bg-slate-800/60 shadow-xl ${game.shadowColor}`}>
                                        {/* Background Glow */}
                                        <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${game.color} blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity`} />

                                        <div className="relative flex flex-col h-full">
                                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-white mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform duration-300`}>
                                                <game.icon className="w-8 h-8" />
                                            </div>

                                            <h3 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                                                {game.title}
                                                <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-purple-400 font-bold" />
                                            </h3>

                                            <p className="text-muted-foreground leading-relaxed mb-8 flex-grow">
                                                {game.description}
                                            </p>

                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                                <span className={`text-xs font-bold uppercase tracking-widest ${game.textColor}`}>
                                                    Free to Play
                                                </span>
                                                <PlayCircle className={`w-6 h-6 ${game.textColor} opacity-50 group-hover:opacity-100 transition-opacity`} />
                                            </div>
                                        </div>

                                        {/* Scanner Effect */}
                                        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                                            <motion.div
                                                initial={{ y: -100 }}
                                                animate={{ y: 500 }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                className="w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-sm"
                                            />
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}

                        {/* Coming Soon Card */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 * arcadeGames.length + 0.3 }}
                            className="relative group h-full bg-slate-900/20 backdrop-blur-sm rounded-3xl border border-white/5 p-8 border-dashed"
                        >
                            <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-muted-foreground mb-6">
                                    <Gamepad2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-muted-foreground mb-2 italic">Coming Soon</h3>
                                <p className="text-muted-foreground text-sm italic">
                                    More AI chaos is currently in development...
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Footer/Info Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-white/10 flex flex-col md:flex-row items-center gap-8 backdrop-blur-sm"
                    >
                        <div className="w-16 h-16 shrink-0 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Brain className="w-8 h-8 text-purple-400" />
                        </div>
                        <div className="flex-grow">
                            <h4 className="text-xl font-bold text-white mb-2">How it works</h4>
                            <p className="text-muted-foreground leading-relaxed">
                                The Arcade games use our proprietary <strong>Roast & Hype Engine</strong> to analyze your profile attributes against local dating trends and cosmic alignments. None of your data is shared during these games—it&apos;s all performed within your private session.
                            </p>
                        </div>
                        <Link
                            href="/help"
                            className="px-6 py-3 rounded-xl bg-card dark:dark:bg-card/5 hover:bg-card/10 text-white text-sm font-semibold transition"
                        >
                            Learn More
                        </Link>
                    </motion.div>
                </main>
            </div>
        </ProtectedRoute>
    )
}
