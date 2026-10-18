'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { Calendar, Compass, Heart, MapPin, Sparkles, Store } from 'lucide-react'

const planSurfaces = [
  {
    href: '/events',
    title: 'Events',
    description: 'Browse the events layer for local meetups, date-ready gatherings, and attendance flows.',
    icon: Calendar,
    accent: 'from-violet-500 to-purple-500',
  },
  {
    href: '/events/create',
    title: 'Create an Event',
    description: 'Launch a new local event directly from one planning-focused destination instead of route hunting.',
    icon: Sparkles,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    href: '/date-planner',
    title: 'Date Planner',
    description: 'Use the planning surface to turn matches and local ideas into concrete date plans.',
    icon: Heart,
    accent: 'from-red-500 to-orange-500',
  },
  {
    href: '/nearby',
    title: 'Nearby',
    description: 'Jump into the real-time nearby discovery layer when planning around who and what is close now.',
    icon: Compass,
    accent: 'from-cyan-500 to-sky-500',
  },
  {
    href: '/venues',
    title: 'Venues',
    description: 'Open the venue surface for place-driven meetup and hangout discovery.',
    icon: MapPin,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/deals',
    title: 'Deals',
    description: 'Review date-friendly offers and local incentives tied to the commerce-and-places layer.',
    icon: Store,
    accent: 'from-amber-500 to-yellow-500',
  },
  {
    href: '/wingman/date-ideas',
    title: 'AI Date Ideas',
    description: 'Use the Wingman to generate personalized outing ideas based on local venues and vibes.',
    icon: Sparkles,
    accent: 'from-rose-500 to-orange-500',
  },
]

export default function PlansPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Plans & Meetups" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:border-gray-800 dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Plans & Meetups</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A central hub for the branch&apos;s real-world outing layer so events, nearby discovery, date planning, venues, and deals feel like one intentional product area instead of scattered local-destination pages.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {planSurfaces.map((surface) => {
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
