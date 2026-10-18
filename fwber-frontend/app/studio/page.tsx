'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { Flame, Flag, Sparkles, Target, Wand2, Zap, Heart } from 'lucide-react'

const studioSurfaces = [
  {
    href: '/roast',
    title: 'Profile Roast',
    description: 'Use the roast/hype surface for public profile feedback and viral share prompts.',
    icon: Flame,
    accent: 'from-orange-500 to-red-500',
  },
  {
    href: '/roast-date',
    title: 'Roast Your Date',
    description: 'Jump into the playful public roast-date generator from one dedicated creative hub.',
    icon: Flame,
    accent: 'from-rose-500 to-pink-500',
  },
  {
    href: '/content-generation',
    title: 'AI Content Generation',
    description: 'Open the richer AI builder/editor/conversation-starter surface on the rewind branch.',
    icon: Wand2,
    accent: 'from-violet-500 to-purple-500',
  },
  {
    href: '/wingman',
    title: 'Wingman Arcade',
    description: 'Browse the AI mini-tools like fortune, cosmic match, nemesis, and vibe check.',
    icon: Sparkles,
    accent: 'from-indigo-500 to-blue-500',
  },
  {
    href: '/bounties',
    title: 'Bounties',
    description: 'Open the bounty surface for reward-driven profile discovery and social hunting loops.',
    icon: Target,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    href: '/rate-my-pussy',
    title: 'Rate My Pussy',
    description: 'Browse the viral cat-rating surface and join the world’s most provocative cat leaderboard.',
    icon: Heart,
    accent: 'from-pink-500 to-purple-500',
  },
  {
    href: '/analytics',
    title: 'Creator Analytics',
    description: 'Review the branch’s broader content/behavior analytics and experimentation surfaces.',
    icon: Flag,
    accent: 'from-emerald-500 to-teal-500',
  },
]

export default function StudioPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Studio & AI" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:border-gray-800 dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-violet-100 p-3 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Studio & AI</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A central hub for the branch’s AI, creative, viral, and playful content-generation surfaces so they are reachable as one intentional product area instead of scattered routes.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {studioSurfaces.map((surface) => {
              const Icon = surface.icon
              return (
                <Link key={surface.href} href={surface.href} prefetch={false} className="block">
                  <div className="h-full rounded-2xl border border-border dark:border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-background">
                    <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${surface.accent} p-3 text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground dark:text-foreground">{surface.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">{surface.description}</p>
                  </div>
                </Link>
              )
            })}
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}
