'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { BarChart3, Lock, Radio, Settings, Shield, Store, Gavel, Bluetooth } from 'lucide-react'

export default function OperationsPage() {
  const { user } = useAuth()
  const isMerchant = user?.role === 'merchant'
  const isModerator = Boolean(user?.is_moderator)

  const operationSurfaces = [
    {
      href: '/safety',
      title: 'Safety Center',
      description: 'Manage emergency contacts, safe walks, and panic-alert tooling from the safety layer.',
      icon: Shield,
      accent: 'from-red-500 to-rose-500',
    },
    {
      href: '/settings',
      title: 'Settings',
      description: 'Open the broader account and privacy controls that anchor the signed-in shell.',
      icon: Settings,
      accent: 'from-slate-500 to-slate-700',
    },
    {
      href: '/settings/security',
      title: 'Security',
      description: 'Jump directly into passkeys, vault, recovery, and device-protection controls.',
      icon: Lock,
      accent: 'from-indigo-500 to-purple-500',
    },
    {
      href: isMerchant ? '/merchant/dashboard' : '/merchant/register',
      title: isMerchant ? 'Merchant Portal' : 'Become a Merchant',
      description: isMerchant
        ? 'Open the merchant dashboard for promotions, local intelligence, and trust-sensitive business tooling.'
        : 'Start the merchant onboarding flow that unlocks the local business side of the platform.',
      icon: Store,
      accent: 'from-amber-500 to-orange-500',
    },
    {
      href: isMerchant ? '/merchant/analytics' : '/merchant/vibe',
      title: isMerchant ? 'Merchant Analytics' : 'Merchant Vibe Preview',
      description: isMerchant
        ? 'Review promotion performance, local traction, and business-side delivery signals.'
        : 'Preview the local-intelligence and broadcast layer that powers the merchant surface.',
      icon: BarChart3,
      accent: 'from-emerald-500 to-green-500',
    },
    {
      href: isModerator ? '/moderation' : '/settings/travel',
      title: isModerator ? 'Moderation Console' : 'Travel Mode',
      description: isModerator
        ? 'Access the moderation dashboard and trust enforcement surface.'
        : 'Control location-shifting behavior and travel-aware discovery from a dedicated settings route.',
      icon: isModerator ? Gavel : Radio,
      accent: isModerator ? 'from-fuchsia-500 to-pink-500' : 'from-cyan-500 to-sky-500',
    },
    {
      href: '/settings/hardware',
      title: 'Hardware Token',
      description: 'Pair and manage your physical "Anti-App" bracelet or keychain for proximity alerts.',
      icon: Bluetooth,
      accent: 'from-blue-600 to-indigo-600',
    },
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Operations" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-red-100 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Trust & Operations</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A central hub for the branch&apos;s trust, safety, settings, merchant, and moderation-adjacent operational tooling so the product&apos;s control surfaces feel intentional instead of scattered.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {operationSurfaces.map((surface) => {
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
