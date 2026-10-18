'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { BarChart3, Megaphone, Radio, Settings2, ShoppingBag, Store, UserRoundCog } from 'lucide-react'

export default function CommercePage() {
  const { user } = useAuth()
  const isMerchant = user?.role === 'merchant'

const commerceSurfaces = [
  {
    href: isMerchant ? '/merchant/dashboard' : '/merchant/register',
    title: isMerchant ? 'Merchant Dashboard' : 'Become a Merchant',
    description: isMerchant
      ? 'Open the merchant portal for live business operations, local intelligence, and promotion control.'
      : 'Start the merchant onboarding flow that unlocks the local-business side of the platform.',
    icon: Store,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    href: isMerchant ? '/merchant/profile' : '/merchant/register',
    title: 'Merchant Profile',
    description: 'Manage the business identity and verification-facing merchant profile that powers local trust.',
    icon: UserRoundCog,
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    href: isMerchant ? '/merchant/promotions' : '/merchant/register',
    title: 'Promotions',
    description: 'Review and manage merchant promotions, discount surfaces, and customer-facing campaign entries.',
    icon: Megaphone,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    href: isMerchant ? '/merchant/inventory' : '/merchant/register',
    title: 'Inventory',
    description: 'Manage your redeemable physical items, stock levels, and marketplace pricing.',
    icon: ShoppingBag,
    accent: 'from-orange-500 to-amber-600',
  },
  {
    href: isMerchant ? '/merchant/analytics' : '/merchant/register',
    title: 'Merchant Analytics',
    description: 'Open the business-side analytics surface for traction, visibility, and offer performance signals.',
    icon: BarChart3,
    accent: 'from-emerald-500 to-green-500',
  },
  {
    href: '/merchant/vibe',
    title: 'Neighborhood Vibe',
    description: 'Use the broadcast and local-intelligence layer that helps businesses speak to nearby users in real time.',
    icon: Radio,
    accent: 'from-violet-500 to-purple-500',
  },
  {
    href: '/marketplace',
    title: 'Nearby Marketplace',
    description: 'Browse and purchase physical items from local merchants using your FWB token balance.',
    icon: ShoppingBag,
    accent: 'from-amber-500 to-yellow-500',
  },
  {
    href: isMerchant ? '/operations' : '/settings',
    title: isMerchant ? 'Merchant Operations' : 'Business-Ready Settings',
    description: isMerchant
      ? 'Jump back into broader trust, safety, and operational controls that support the merchant surface.'
      : 'Review the account and operational settings that support business onboarding and trust-sensitive flows.',
    icon: Settings2,
    accent: 'from-slate-500 to-slate-700',
  },
]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Commerce" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Merchants & Local Commerce</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A central hub for the branch&apos;s merchant onboarding, business operations, analytics, promotions, and local broadcast tooling so the commerce layer feels intentional instead of split across scattered business routes.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {commerceSurfaces.map((surface) => {
              const Icon = surface.icon
              return (
                <Link key={surface.href + surface.title} href={surface.href} prefetch={false} className="block">
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
