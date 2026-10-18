'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { Crown, Eye, Heart, Lock, Share2, Sparkles } from 'lucide-react'

const unlockSurfaces = [
  {
    href: '/premium/unlocks',
    title: 'Premium Unlock Catalog',
    description: 'Browse token-gated perks like match insights, read receipts, and premium attention boosts.',
    icon: Lock,
    accent: 'from-purple-500 to-fuchsia-500',
  },
  {
    href: '/who-likes-you',
    title: 'Who Likes You',
    description: 'Open the admirers surface and move from teaser state into premium or share-based reveal flows.',
    icon: Heart,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    href: '/share-unlock',
    title: 'Share to Unlock',
    description: 'Use the viral unlock surface to trade distribution for gated profile rewards.',
    icon: Share2,
    accent: 'from-sky-500 to-cyan-500',
  },
  {
    href: '/photos/reveals',
    title: 'Photo Reveals',
    description: 'Jump into the private-photo reveal route when token-gated visual content is part of the conversation.',
    icon: Eye,
    accent: 'from-amber-500 to-orange-500',
  },
]

export default function UnlocksPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Unlock Center" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:border-gray-800 dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Unlock Center</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A single top-level destination for the token-gated and paywall-era surfaces so they are reachable as a coherent system instead of scattered across hidden routes.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {unlockSurfaces.map((surface) => {
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

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-center gap-3 text-amber-700 dark:text-amber-300">
              <Crown className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Why this page matters</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-amber-800 dark:text-amber-200/90">
              The approved restoration scope includes token-era unlock and paywall flows. Giving them a first-class landing page keeps the richer branch closer to the old full-surface product while still remaining legible and deployable on the modern Hetzner baseline.
            </p>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}
