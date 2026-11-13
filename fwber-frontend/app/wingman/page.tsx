'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
    Wand2, Star, Flame, Flag, Skull,
    Sparkles, Brain, Info, ArrowRight, PlayCircle,
    MessageSquare, ScrollText, Calendar, Activity
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface WingmanTool {
    id: string
    category: 'coaching' | 'arcade'
    badge: string
    title: string
    description: string
    tooltip: string
    icon: any
    href: string
    color: string
    borderColor: string
    shadowColor: string
    textColor: string
}

// Consolidated Wingman Command & Arcade Hub:
// Combines practical AI coaching utilities AND viral arcade games onto `/wingman`
// so users don't need 12 separate dashboard tiles just to find AI tools.
const WINGMAN_TOOLS: WingmanTool[] = [
    {
        id: 'studio',
        category: 'coaching',
        badge: 'Coaching Studio',
        title: 'Bio & Opener Studio',
        description: 'Generate magnetic bios, photo captions, and tailored opening hooks.',
        tooltip: 'Uses local Ollama / OpenRouter AI to draft profile bios and openers without exposing private data.',
        icon: Wand2,
        href: '/studio',
        color: 'from-purple-500 to-fuchsia-600',
        borderColor: 'border-purple-500/30',
        shadowColor: 'shadow-purple-500/20',
        textColor: 'text-purple-400',
    },
    {
        id: 'ice-breaker',
        category: 'coaching',
        badge: 'Conversation Aid',
        title: 'Contextual Ice-Breakers',
        description: 'Craft witty, non-generic conversation starters tailored to any match.',
        tooltip: 'Analyzes shared interests and personality tags to suggest high-reply opening lines.',
        icon: MessageSquare,
        href: '/wingman/ice-breaker',
        color: 'from-pink-500 to-rose-600',
        borderColor: 'border-pink-500/30',
        shadowColor: 'shadow-pink-500/20',
        textColor: 'text-pink-400',
    },
    {
        id: 'draft-analysis',
        category: 'coaching',
        badge: 'Pre-Flight Check',
        title: 'Message Draft Analyzer',
        description: 'Score your draft message for warmth, humor, and clarity before hitting send.',
        tooltip: 'Scores tone (0–100) and suggests a sharper rewrite before you send a risky opener.',
        icon: ScrollText,
        href: '/wingman/draft-analysis',
        color: 'from-sky-500 to-blue-600',
        borderColor: 'border-sky-500/30',
        shadowColor: 'shadow-sky-500/20',
        textColor: 'text-sky-400',
    },
    {
        id: 'compatibility',
        category: 'coaching',
        badge: 'Deep Audit',
        title: 'Compatibility Deep Dive',
        description: 'Multi-dimensional breakdown of values, lifestyle, and communication chemistry.',
        tooltip: 'Compares your 95-question matching vector and profile signals against a prospective partner.',
        icon: Star,
        href: '/wingman/compatibility',
        color: 'from-indigo-500 to-violet-600',
        borderColor: 'border-indigo-500/30',
        shadowColor: 'shadow-indigo-500/20',
        textColor: 'text-indigo-400',
    },
    {
        id: 'vibe-check',
        category: 'coaching',
        badge: 'Sentiment Scan',
        title: 'Conversation Vibe Check',
        description: 'Gauge mutual interest, pacing, and emotional warmth in an active chat.',
        tooltip: 'Reads conversational pacing and sentiment cues to tell whether it is time to suggest a date.',
        icon: Activity,
        href: '/wingman/vibe-check',
        color: 'from-cyan-500 to-teal-600',
        borderColor: 'border-cyan-500/30',
        shadowColor: 'shadow-cyan-500/20',
        textColor: 'text-cyan-400',
    },
    {
        id: 'date-ideas',
        category: 'coaching',
        badge: 'Outing Planner',
        title: 'AI Date Architect',
        description: 'Generate custom date itineraries blending both partners’ tastes and budgets.',
        tooltip: 'Creates actionable first-date concepts tailored to shared hobbies, vibe, and time of day.',
        icon: Calendar,
        href: '/wingman/date-ideas',
        color: 'from-emerald-500 to-green-600',
        borderColor: 'border-emerald-500/30',
        shadowColor: 'shadow-emerald-500/20',
        textColor: 'text-emerald-400',
    },
    {
        id: 'fortune',
        category: 'arcade',
        badge: 'Viral Arcade',
        title: 'Dating Fortune',
        description: 'Consult the AI spirits for your daily romantic prediction and lucky aura.',
        tooltip: 'Playful daily dating forecast based on your profile energy and streak activity.',
        icon: Sparkles,
        href: '/wingman/fortune',
        color: 'from-amber-500 to-orange-600',
        borderColor: 'border-amber-500/30',
        shadowColor: 'shadow-amber-500/20',
        textColor: 'text-amber-400',
    },
    {
        id: 'cosmic',
        category: 'arcade',
        badge: 'Viral Arcade',
        title: 'Cosmic Alignment',
        description: 'Discover your best and most chaotic astrological & personality pairings.',
        tooltip: 'Blends zodiac synastry with behavioral traits to highlight your best & worst matches.',
        icon: Star,
        href: '/wingman/cosmic',
        color: 'from-violet-500 to-indigo-600',
        borderColor: 'border-violet-500/30',
        shadowColor: 'shadow-violet-500/20',
        textColor: 'text-violet-400',
    },
    {
        id: 'roast',
        category: 'arcade',
        badge: 'Viral Arcade',
        title: 'Profile Roast & Hype',
        description: 'Can you handle the savage truth—or need a confidence boost—on your bio?',
        tooltip: 'Calls out profile clichés with constructive humor or generates a shareable hype reel.',
        icon: Flame,
        href: '/wingman/roast',
        color: 'from-orange-500 to-red-600',
        borderColor: 'border-orange-500/30',
        shadowColor: 'shadow-orange-500/20',
        textColor: 'text-orange-400',
    },
    {
        id: 'vibe',
        category: 'arcade',
        badge: 'Viral Arcade',
        title: 'Red & Green Flag Radar',
        description: 'Uncover the subtle green flags and hidden red flags in your profile.',
        tooltip: 'Objective AI audit of how newcomers interpret your bio, quirks, and prompts.',
        icon: Flag,
        href: '/wingman/vibe',
        color: 'from-emerald-500 to-teal-600',
        borderColor: 'border-emerald-500/30',
        shadowColor: 'shadow-emerald-500/20',
        textColor: 'text-emerald-400',
    },
    {
        id: 'nemesis',
        category: 'arcade',
        badge: 'Viral Arcade',
        title: 'Scientific Nemesis',
        description: 'Identify the exact persona statistically guaranteed to drive you crazy.',
        tooltip: 'Inverts your compatibility vector to reveal clashing traits and hilarious dealbreakers.',
        icon: Skull,
        href: '/wingman/nemesis',
        color: 'from-rose-500 to-red-600',
        borderColor: 'border-rose-500/30',
        shadowColor: 'shadow-rose-500/20',
        textColor: 'text-rose-400',
    },
    {
        id: 'roast-date',
        category: 'arcade',
        badge: 'Post-Date Debrief',
        title: 'Roast My Date',
        description: 'Turn an awkward outing into comedy gold with a post-date AI debrief.',
        tooltip: 'Private cathartic debrief tool to laugh off awkward first-date moments.',
        icon: Flame,
        href: '/roast-date',
        color: 'from-fuchsia-500 to-pink-600',
        borderColor: 'border-fuchsia-500/30',
        shadowColor: 'shadow-fuchsia-500/20',
        textColor: 'text-fuchsia-400',
    },
]

export default function WingmanArcadePage() {
    const [filter, setFilter] = useState<'all' | 'coaching' | 'arcade'>('all')

    const visibleTools = WINGMAN_TOOLS.filter(
        (t) => filter === 'all' || t.category === filter
    )

    return (
        <ProtectedRoute>
            <TooltipProvider delayDuration={200}>
                <div className="min-h-screen bg-[#050510] relative overflow-hidden">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-900/15 via-transparent to-[#050510]" />
                        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />
                        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
                    </div>

                    <AppHeader />

                    <main className="relative z-10 max-w-7xl mx-auto px-4 py-12">
                        <div className="text-center mb-10">
                            <motion.div
                                initial={{ y: 16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-4 backdrop-blur-sm"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Unified Coaching Suite &amp; Viral Arcade</span>
                            </motion.div>

                            <motion.h1
                                initial={{ y: 16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.05 }}
                                className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-tight italic"
                            >
                                AI Wingman <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Command Hub</span>
                            </motion.h1>

                            <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto mb-8">
                                Practical conversation coaching, compatibility audits, bio builders, and viral arcade games—all powered privately in one hub.
                            </p>

                            {/* Category Filter Tabs */}
                            <div className="inline-flex flex-wrap justify-center gap-2 rounded-2xl bg-slate-900/80 p-1.5 border border-white/10">
                                {[
                                    { key: 'all', label: `All Tools (${WINGMAN_TOOLS.length})` },
                                    { key: 'coaching', label: `Coaching & Openers (${WINGMAN_TOOLS.filter(t => t.category === 'coaching').length})` },
                                    { key: 'arcade', label: `Viral Arcade (${WINGMAN_TOOLS.filter(t => t.category === 'arcade').length})` },
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setFilter(tab.key as any)}
                                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                            filter === tab.key
                                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {visibleTools.map((tool, index) => (
                                <motion.div
                                    key={tool.id}
                                    initial={{ scale: 0.96, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.03 * index }}
                                    whileHover={{ y: -4 }}
                                >
                                    <Link href={tool.href} className="block h-full">
                                        <div className={`group relative h-full bg-slate-900/50 backdrop-blur-md rounded-3xl border ${tool.borderColor} p-7 overflow-hidden transition-all hover:bg-slate-800/70 shadow-xl ${tool.shadowColor}`}>
                                            <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${tool.color} blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity`} />

                                            <div className="relative flex flex-col h-full">
                                                <div className="flex items-start justify-between mb-5">
                                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-lg`}>
                                                        <tool.icon className="w-7 h-7" />
                                                    </div>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                type="button"
                                                                aria-label={`About ${tool.title}`}
                                                                onClick={(e) => e.preventDefault()}
                                                                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                                            >
                                                                <Info className="w-4 h-4" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs text-xs">
                                                            {tool.tooltip}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>

                                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                                    {tool.title}
                                                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-purple-400" />
                                                </h3>

                                                <p className="text-slate-300 text-sm leading-relaxed mb-6 flex-grow">
                                                    {tool.description}
                                                </p>

                                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                                                    <span className={`text-[11px] font-bold uppercase tracking-widest ${tool.textColor}`}>
                                                        {tool.badge}
                                                    </span>
                                                    <PlayCircle className={`w-5 h-5 ${tool.textColor} opacity-60 group-hover:opacity-100 transition-opacity`} />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-16 p-7 rounded-3xl bg-gradient-to-r from-purple-900/25 to-blue-900/25 border border-white/10 flex flex-col md:flex-row items-center gap-6 backdrop-blur-sm">
                            <div className="w-14 h-14 shrink-0 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Brain className="w-7 h-7 text-purple-300" />
                            </div>
                            <div className="flex-grow">
                                <h4 className="text-lg font-bold text-white mb-1">Privacy-First On-Box AI</h4>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Wingman coaching and arcade tools run primarily on fwber&apos;s local self-hosted LLM engine, analyzing only the context you submit inside your private session without sharing sensitive media externally.
                                </p>
                            </div>
                            <div className="flex gap-3 shrink-0">
                                <Link
                                    href="/ice-breakers"
                                    className="px-5 py-2.5 rounded-xl border border-white/15 hover:bg-white/10 text-white text-sm font-semibold transition"
                                >
                                    Openers Library
                                </Link>
                                <Link
                                    href="/help"
                                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition"
                                >
                                    Wingman Guide
                                </Link>
                            </div>
                        </div>
                    </main>
                </div>
            </TooltipProvider>
        </ProtectedRoute>
    )
}
