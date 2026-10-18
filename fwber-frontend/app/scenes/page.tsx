'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { Compass, Heart, LayoutGrid, Newspaper, Trophy, Users, Wand2 } from 'lucide-react'

const sceneSurfaces = [
  {
    href: '/recommendations',
    title: 'Recommendations',
    description: 'Open the richer personalized recommendation stack with AI, nearby, collaborative, and feed modes.',
    icon: Wand2,
    accent: 'from-violet-500 to-purple-500',
  },
  {
    href: '/groups',
    title: 'Groups',
    description: 'Browse and create interest-based groups from the community layer.',
    icon: Users,
    accent: 'from-cyan-500 to-sky-500',
  },
  {
    href: '/topics',
    title: 'Topic Hubs',
    description: 'Explore structured topic hubs built from interests, scenes, and visible activity.',
    icon: LayoutGrid,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/matches',
    title: 'Matches',
    description: 'Jump into the main match feed from the broader discovery cluster.',
    icon: Heart,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    href: '/matches/dashboard',
    title: 'Match Dashboard',
    description: 'Open the richer match overview that includes tier and relationship-progress style signals.',
    icon: Newspaper,
    accent: 'from-orange-500 to-amber-500',
  },
  {
    href: '/leaderboard',
    title: 'Leaderboard',
    description: 'See which users and signals rise to the top across the social/reputation layer.',
    icon: Trophy,
    accent: 'from-slate-500 to-slate-700',
  },
]

export default function ScenesPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Scenes & Discovery" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-violet-100 p-3 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Scenes & Discovery</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A unified discovery and community hub so recommendations, groups, topics, matches, and adjacent social-discovery systems are reachable as one coherent cluster instead of scattered destinations.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sceneSurfaces.map((surface) => {
              const Icon = surface.icon
              return (
                <Link key={surface.href} href={surface.href} prefetch={false} className="block">
                  <div className="h-full rounded-2xl border border-border dark:border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:dark:border-border dark:bg-background">
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
