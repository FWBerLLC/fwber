'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { Briefcase, MessageSquare, Mic, Radio, Sparkles, SmartphoneNfc, Users } from 'lucide-react'

const spaces = [
  {
    href: '/chatrooms',
    title: 'Chatrooms',
    description: 'Browse the real-time public chatroom lobby for broader conversation threads.',
    icon: MessageSquare,
    accent: 'from-sky-500 to-blue-500',
  },
  {
    href: '/proximity-chatrooms',
    title: 'Proximity Chatrooms',
    description: 'Find nearby trust-aware rooms ranked around your real-world location.',
    icon: Radio,
    accent: 'from-indigo-500 to-purple-500',
  },
  {
    href: '/audio-rooms',
    title: 'Audio Rooms',
    description: 'Jump into live voice spaces and conference-style conversations.',
    icon: Mic,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    href: '/bulletin-boards',
    title: 'Bulletin Boards',
    description: 'Open local board-style conversations and community coordination surfaces.',
    icon: Users,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/local-pulse',
    title: 'Local Pulse',
    description: 'Use the richer local-pulse surface for in-the-moment posts and scene energy.',
    icon: Sparkles,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    href: '/conference-pulse',
    title: 'Conference Pulse',
    description: 'Browse event and networking-oriented live discovery around professional gatherings.',
    icon: Briefcase,
    accent: 'from-slate-500 to-slate-700',
  },
  {
    href: '/burner',
    title: 'Burner Bridge',
    description: 'Generate temporary in-person bridges and short-lived anonymous connection links.',
    icon: SmartphoneNfc,
    accent: 'from-cyan-500 to-teal-500',
  },
  {
    href: '/pulse',
    title: 'Live Proximity Feed',
    description: 'Open the dedicated real-time proximity feed to see what is happening in your immediate area.',
    icon: Sparkles,
    accent: 'from-orange-500 to-pink-500',
  },
]

export default function SpacesPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Live Spaces" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                <Radio className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Live Spaces</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A unified destination for the branch’s live, social, local, and ephemeral conversation surfaces so they are reachable as a coherent cluster instead of scattered isolated routes.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {spaces.map((space) => {
              const Icon = space.icon
              return (
                <Link key={space.href} href={space.href} prefetch={false} className="block">
                  <div className="h-full rounded-2xl border border-border dark:border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:dark:border-border dark:bg-background">
                    <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${space.accent} p-3 text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground dark:text-foreground">{space.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-muted-foreground">{space.description}</p>
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
