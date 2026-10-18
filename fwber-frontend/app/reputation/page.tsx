'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { Award, BadgeCheck, Eye, Medal, Shield, Sparkles, Trophy, UserCheck } from 'lucide-react'

const reputationSurfaces = [
  {
    href: '/achievements',
    title: 'Achievements',
    description: 'Open the achievement surface for streak, verification, and viral milestone progress.',
    icon: Award,
    accent: 'from-amber-500 to-yellow-500',
  },
  {
    href: '/leaderboard',
    title: 'Leaderboard',
    description: 'Browse public ranking surfaces for vouches and other social-performance signals.',
    icon: Trophy,
    accent: 'from-orange-500 to-rose-500',
  },
  {
    href: '/profile-views',
    title: 'Profile Views',
    description: 'Review recent profile-view activity from a dedicated route.',
    icon: Eye,
    accent: 'from-sky-500 to-cyan-500',
  },
  {
    href: '/settings/verification',
    title: 'Verification',
    description: 'Jump into the identity-verification controls that support trust and anti-catfish flows.',
    icon: BadgeCheck,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/vouch/placeholder',
    title: 'Vouch Flow',
    description: 'Use the vouch code flow and social proof mechanics that feed reputation surfaces.',
    icon: UserCheck,
    accent: 'from-purple-500 to-fuchsia-500',
    disabled: true,
    note: 'Use active vouch links generated from referral / invite flows.',
  },
  {
    href: '/matches/dashboard',
    title: 'Match Dashboard',
    description: 'Open the richer match dashboard that reflects compatibility and relationship-progress surfaces.',
    icon: Medal,
    accent: 'from-pink-500 to-rose-500',
  },
]

export default function ReputationPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Reputation & Trust" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Reputation & Trust</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  Track your achievements, verification status, leaderboard rank, and profile trust signals from one hub.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reputationSurfaces.map((surface) => {
              const Icon = surface.icon
              const card = (
                <div className="h-full rounded-2xl border border-border dark:border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:dark:border-border dark:bg-background">
                  <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${surface.accent} p-3 text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground dark:text-foreground">{surface.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">{surface.description}</p>
                  {surface.note ? (
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-muted-foreground">{surface.note}</p>
                  ) : null}
                </div>
              )

              if (surface.disabled) {
                return <div key={surface.title} className="opacity-80">{card}</div>
              }

              return (
                <Link key={surface.href} href={surface.href} prefetch={false} className="block">
                  {card}
                </Link>
              )
            })}
          </section>

          <section className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/20">
            <div className="flex items-center gap-3 text-purple-700 dark:text-purple-300">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Why this hub matters</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-purple-800 dark:text-purple-200/90">
              A central place for trust and reputation — achievements, verification, leaderboard, and profile views all in one spot.
            </p>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}
