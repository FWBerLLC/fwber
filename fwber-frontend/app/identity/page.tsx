'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { BadgeCheck, Camera, Fingerprint, IdCard, ScanFace, User, ShieldCheck } from 'lucide-react'

const identitySurfaces = [
  {
    href: '/profile',
    title: 'Profile',
    description: 'Open the main profile editor and visible self-presentation layer that anchors matching and discovery.',
    icon: User,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    href: '/photos',
    title: 'Photos',
    description: 'Manage gallery media, primary photos, and reveal-aware presentation from the media layer.',
    icon: Camera,
    accent: 'from-violet-500 to-purple-500',
  },
  {
    href: '/settings/identity',
    title: 'Identity Settings',
    description: 'Review identity-focused settings and account-level identity controls from one dedicated route.',
    icon: Fingerprint,
    accent: 'from-indigo-500 to-blue-500',
  },
  {
    href: '/settings/verification',
    title: 'Verification',
    description: 'Open verification workflows and proof-oriented trust controls tied to profile credibility.',
    icon: BadgeCheck,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/settings/physical-profile',
    title: 'Physical Profile',
    description: 'Refine appearance and body-profile data that power clearer matching and identity presentation.',
    icon: IdCard,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    href: '/settings/security',
    title: 'Security & Recovery',
    description: 'Jump into vault, recovery, and device-protection controls that defend the identity layer itself.',
    icon: ShieldCheck,
    accent: 'from-slate-500 to-slate-700',
  },
]

export default function IdentityPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Identity" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:border-gray-800 dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <ScanFace className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Identity & Profile</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A central hub for the branch&apos;s identity, media, verification, and self-presentation controls so the profile layer feels intentional instead of split across scattered settings and media routes.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {identitySurfaces.map((surface) => {
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
