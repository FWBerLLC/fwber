'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { Crown, Gift, Lock, Rocket, Sparkles, Wallet, ArrowDownCircle } from 'lucide-react'

const economySurfaces = [
  {
    href: '/premium',
    title: 'Gold Premium',
    description: 'Open the main premium upgrade surface with feature breakdowns and purchase entry points.',
    icon: Crown,
    accent: 'from-amber-500 to-yellow-500',
  },
  {
    href: '/wallet',
    title: 'Wallet',
    description: 'Review token balances, in-app value flows, and the broader account economy dashboard.',
    icon: Wallet,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/referrals',
    title: 'Referrals & Payouts',
    description: 'Manage invite growth, pending rewards, and payout-oriented affiliate surfaces.',
    icon: Sparkles,
    accent: 'from-violet-500 to-purple-500',
  },
  {
    href: '/boosts',
    title: 'Boosts',
    description: 'Open the visibility-boost purchase and history surface from one coherent economy hub.',
    icon: Rocket,
    accent: 'from-orange-500 to-red-500',
  },
  {
    href: '/gifts',
    title: 'Gift Shop',
    description: 'Jump into token gifting, received gifts, and playful spending flows tied to social interaction.',
    icon: Gift,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    href: '/gifts/history',
    title: 'Gift History',
    description: 'Review your full gifting history, including tokens sent and received across the social layer.',
    icon: Sparkles,
    accent: 'from-purple-500 to-indigo-500',
  },
  {
    href: '/unlocks',
    title: 'Unlock Center',
    description: 'Reach the token-gated unlock and paywall-era surfaces that monetize access and reveals.',
    icon: Lock,
    accent: 'from-sky-500 to-cyan-500',
  },
  {
    href: '/wallet?tab=bridge',
    title: 'Token Bridge (Swap)',
    description: 'Exchange FWB tokens for other assets or bridge value across the economy layer.',
    icon: ArrowDownCircle,
    accent: 'from-indigo-500 to-blue-600',
  },
]

export default function EconomyPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Premium & Economy" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Premium & Economy</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A central hub for the branch&apos;s premium, token, referral, gifting, boosts, and unlock-related monetization surfaces so the economy layer feels intentional instead of scattered across separate routes.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {economySurfaces.map((surface) => {
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
