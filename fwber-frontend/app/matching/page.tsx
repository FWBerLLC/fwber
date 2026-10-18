'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { BarChart3, Compass, Eye, Heart, Sparkles, Users, Smartphone } from 'lucide-react'

const matchingSurfaces = [
  {
    href: '/settings/matching',
    title: 'Answer Questions',
    description:
      '95 personality questions across 7 categories. Answer them to build your compatibility profile.',
    icon: Sparkles,
    accent: 'from-purple-500 to-violet-500',
  },
  {
    href: '/recommendations',
    title: 'Recommendations',
    description:
      'Open the richer recommendation stack with AI, nearby, collaborative, and feed-driven match suggestions.',
    icon: Sparkles,
    accent: 'from-violet-500 to-purple-500',
  },
  {
    href: '/matches',
    title: 'Matches Feed',
    description:
      'Jump directly into the swipe-and-match flow that turns attraction into mutual signals.',
    icon: Heart,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    href: '/matches/dashboard',
    title: 'Match Dashboard',
    description:
      'Review the richer match-overview layer with score, progress, and relationship-style signal context.',
    icon: BarChart3,
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    href: '/who-likes-you',
    title: 'Who Likes You',
    description:
      'See the admirers layer that feeds premium reveals and mutual-interest conversion paths.',
    icon: Users,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    href: '/profile-views',
    title: 'Profile Views',
    description:
      'Track who is checking you out and use that intent signal as part of the dating funnel.',
    icon: Eye,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/nearby',
    title: 'Nearby & AR',
    description:
      'Use proximity-aware discovery and AR navigation when the dating funnel needs real local context.',
    icon: Compass,
    accent: 'from-sky-500 to-cyan-500',
  },
  {
    href: '/groups/matching',
    title: 'Group Matching',
    description:
      'Bridge community discovery and one-to-one relationship formation through group-level matching.',
    icon: Users,
    accent: 'from-indigo-500 to-blue-500',
  },
  {
    href: '/matching/nfc',
    title: 'NFC Flash Match',
    description:
      'Tap phones to verify a physical meetup and exchange profiles instantly using NFC and ZK-Proximity.',
    icon: Smartphone,
    accent: 'from-amber-500 to-orange-600',
  },
  {
    href: '/wingman/date-ideas',
    title: 'AI Date Ideas',
    description: 'Get personalized local date suggestions based on mutual interests and proximity.',
    icon: Sparkles,
    accent: 'from-rose-500 to-pink-600',
  },
]

export default function MatchingPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Matching" />
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:border-border dark:border-gray-800 dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-pink-100 p-3 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300">
                <Heart className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">
                  Matching & Attraction
                </h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A central hub for the core dating funnel so recommendations, mutual-interest
                  flows, profile-view signals, and nearby matching context feel like one intentional
                  product area instead of scattered routes.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matchingSurfaces.map((surface) => {
              const Icon = surface.icon
              return (
                <Link key={surface.href} href={surface.href} prefetch={false} className="block">
                  <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-border dark:border-gray-800 dark:bg-background">
                    <div
                      className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${surface.accent} p-3 text-white`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
                      {surface.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
                      {surface.description}
                    </p>
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
