'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, CreditCard, Sparkles } from 'lucide-react'

export default function PremiumSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push('/settings/subscription')
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50 px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950/20">
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-emerald-200/70 bg-card dark:bg-gray-800/90 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-emerald-500/20 dark:bg-slate-900/85">
        <div className="mb-5 rounded-full bg-emerald-100 p-4 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Sparkles className="h-3.5 w-3.5" />
          payment confirmed
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-foreground">Gold upgrade in motion</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
          Your Stripe payment finished successfully. We&apos;re redirecting you to your subscription settings so you can confirm your Gold access and billing details.
        </p>
        <div className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          <CreditCard className="h-4 w-4 text-amber-500" />
          Redirecting to subscription settings...
        </div>
        <Link
          href="/settings/subscription"
          className="mt-6 inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-card dark:bg-card dark:text-slate-950 dark:hover:bg-slate-100"
        >
          Go now
        </Link>
      </div>
    </div>
  )
}
