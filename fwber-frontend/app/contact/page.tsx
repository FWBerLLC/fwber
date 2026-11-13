'use client'

import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import { Mail, MessageSquare, ShieldAlert, BookOpen, Clock, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default function ContactPage() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Contact & Support" />
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-foreground">Contact FWBer Support</h1>
            <p className="mt-2 text-muted-foreground">
              Choose the fastest channel below for account assistance, bug reports, safety escalations, or platform inquiries.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Mail className="h-5 w-5 text-blue-500" />
                    Direct Email Support
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Email support info" className="text-muted-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Best for billing, account recovery, or legal requests</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Email <a href="mailto:support@fwber.online" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">support@fwber.online</a> for billing, login recovery, or privacy inquiries.
                </p>
              </div>

              <Link href="/feedback" className="block rounded-xl border border-border p-5 space-y-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    In-App Feedback &amp; Bug Reports
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground">
                        <Info className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Routed directly into the engineering &amp; admin triage queue</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Submit feature ideas, UI polish notes, or bug reports straight to the developer queue.
                </p>
              </Link>

              <Link href="/safety" className="block rounded-xl border border-border p-5 space-y-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  Safety Center &amp; Incident Reports
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage blocked users, configure Safe Walk check-ins, or review submitted abuse reports at <span className="underline">/reports</span>.
                </p>
              </Link>

              <Link href="/help" className="block rounded-xl border border-border p-5 space-y-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <BookOpen className="h-5 w-5 text-emerald-500" />
                  User Manual &amp; Guides
                </div>
                <p className="text-sm text-muted-foreground">
                  Read step-by-step documentation on Privacy Tiers, Friends &amp; Messaging, Solana Wallet, and AI Wingman.
                </p>
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center gap-4">
            <Clock className="h-6 w-6 text-muted-foreground shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Operator Response Hours</h2>
              <p className="text-sm text-muted-foreground">
                Safety &amp; moderation queues are monitored continuously; standard account &amp; billing inquiries are answered Monday – Friday, 9:00 AM – 5:00 PM EST.
              </p>
            </div>
          </section>
        </main>
      </div>
    </TooltipProvider>
  )
}
