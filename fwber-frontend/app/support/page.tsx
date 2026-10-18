'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { CircleHelp, FileText, LifeBuoy, Mail, Shield, UserRoundX } from 'lucide-react'

const supportSurfaces = [
  {
    href: '/help',
    title: 'Help Center',
    description: 'Browse the help articles covering onboarding, privacy, wallet flows, features, and AI tooling.',
    icon: LifeBuoy,
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    href: '/contact',
    title: 'Contact Support',
    description: 'Reach the direct support contact surface when articles are not enough and a human response is needed.',
    icon: Mail,
    accent: 'from-violet-500 to-purple-500',
  },
  {
    href: '/privacy',
    title: 'Privacy Policy',
    description: 'Review the product’s privacy commitments around location, encryption, and sensitive personal data.',
    icon: Shield,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/terms',
    title: 'Terms of Service',
    description: 'Open the platform rules, age restrictions, token terms, and user-conduct expectations.',
    icon: FileText,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    href: '/safety',
    title: 'Safety Center',
    description: 'Jump into emergency contacts, safe walks, and panic-alert tooling from the support/trust layer.',
    icon: Shield,
    accent: 'from-rose-500 to-red-500',
  },
  {
    href: '/settings/blocked',
    title: 'Blocked Users',
    description: 'Manage who you have blocked and keep support-adjacent personal safety controls easy to reach.',
    icon: UserRoundX,
    accent: 'from-slate-500 to-slate-700',
  },
]

export default function SupportPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Support & Policies" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:border-gray-800 dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <CircleHelp className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Support & Policies</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A central hub for help, support contact, legal policies, safety information, and user-protection resources so the branch&apos;s trust-information layer feels intentional instead of scattered.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {supportSurfaces.map((surface) => {
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
