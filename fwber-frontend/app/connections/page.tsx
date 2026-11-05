'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { Bell, HeartHandshake, MessageCircle, Activity, Users, UserRoundCheck, Phone } from 'lucide-react'

const connectionSurfaces = [
  {
    href: '/messages',
    title: 'Messages',
    description: 'Open the real-time conversations shell with call history, safety actions, and chat tools.',
    icon: MessageCircle,
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    href: '/friends',
    title: 'Friends & Connections',
    description: 'Manage friends, friend requests, and mutual relationship-link flows from the social layer.',
    icon: HeartHandshake,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    href: '/activity',
    title: 'Activity Feed',
    description: 'Review social activity and recent movement across the branch’s signed-in experience.',
    icon: Activity,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/notifications',
    title: 'Notifications',
    description: 'See alerts, callouts, and recent account-level signals in one notification surface.',
    icon: Bell,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    href: '/matches',
    title: 'Matches',
    description: 'Jump back into the active match layer that feeds the rest of the direct-social experience.',
    icon: UserRoundCheck,
    accent: 'from-violet-500 to-purple-500',
  },
  {
    href: '/groups',
    title: 'Groups',
    description: 'Use groups as the bridge between community discovery and one-to-one relationship formation.',
    icon: Users,
    accent: 'from-slate-500 to-slate-700',
  },
  {
    href: '/video',
    title: 'Video Calls',
    description: 'Open the video call surface to start real-time face-to-face conversations with matches.',
    icon: Phone,
    accent: 'from-indigo-500 to-blue-500',
  },
]

export default function ConnectionsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Connections" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-pink-100 p-3 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Connections</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A central hub for the branch’s direct-social layer so messaging, friends, activity, notifications, and adjacent relationship flows feel like one intentional destination instead of scattered endpoints.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {connectionSurfaces.map((surface) => {
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
