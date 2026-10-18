'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { CalendarHeart, Compass, Map, MapPin, Shield, Store, Telescope } from 'lucide-react'

const placeSurfaces = [
  {
    href: '/nearby',
    title: 'Nearby People',
    description: 'Open the nearby discovery surface anchored to your current location context.',
    icon: MapPin,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    href: '/venues',
    title: 'Venues',
    description: 'Browse nearby venues and venue-aware scene discovery from a dedicated route.',
    icon: Store,
    accent: 'from-purple-500 to-fuchsia-500',
  },
  {
    href: '/date-planner',
    title: 'Date Planner',
    description: 'Use the date-planning surface to shape meetup ideas around your area.',
    icon: CalendarHeart,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    href: '/deals',
    title: 'Deals',
    description: 'Open local offer and merchant-discovery surfaces that complement venue exploration.',
    icon: Telescope,
    accent: 'from-cyan-500 to-sky-500',
  },
  {
    href: '/location-settings',
    title: 'Location Settings',
    description: 'Review the branch’s location-aware controls and routing assumptions from one place.',
    icon: Compass,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/safety',
    title: 'Safety in Context',
    description: 'Jump into the safety tooling that complements local discovery and in-person meetups.',
    icon: Shield,
    accent: 'from-slate-500 to-slate-700',
  },
]

export default function PlacesPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Places & Nearby" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:border-gray-800 dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Map className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Places & Nearby</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A central destination for the branch’s place-aware discovery surfaces so nearby people, venues, deals, date planning, and location controls are easier to navigate as one local-discovery cluster.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {placeSurfaces.map((surface) => {
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
