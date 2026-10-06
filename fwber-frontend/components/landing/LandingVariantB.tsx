'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import InspireQuote from '@/components/InspireQuote'
import { ThemeToggle } from '@/components/ThemeToggle'
import { trackCTAClick } from '@/lib/ab-testing'
import {
  Shield,
  Heart,
  Zap,
  MapPin,
  MessageCircle,
  Users,
  Lock,
  Ghost,
  Layers,
  Code,
  CheckCircle2,
  Sparkles,
  Flame,
  Link as LinkIcon,
  Gift,
  Home,
  UserPlus,
  Star,
} from 'lucide-react'
import { Suspense } from 'react'
import ReferralBanner from '@/components/ReferralBanner'

export default function LandingVariantB() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <p className="text-gray-600 dark:text-gray-300">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 dark:bg-slate-950">
      <Suspense fallback={null}>
        <ReferralBanner />
      </Suspense>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white backdrop-blur-xl dark:border-slate-800/80 dark:bg-gray-800/90 dark:bg-slate-950/85">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link
                href="/"
                className="flex flex-shrink-0 items-center gap-1 transition-transform duration-200 hover:scale-105"
              >
                <Logo className="text-4xl" />
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden items-center space-x-8 md:flex">
              <Link href="#features" className="font-medium text-gray-600 hover:text-blue-600">
                Features
              </Link>
              <Link href="#safety" className="font-medium text-gray-600 hover:text-blue-600">
                Safety
              </Link>
              <ThemeToggle />
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="font-medium text-gray-900 hover:text-blue-600 dark:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Sign up
                </Link>
              </div>
            </div>

            {/* Mobile Theme Toggle */}
            <div className="flex items-center gap-4 md:hidden">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-fuchsia-50/40 pb-4 pt-16 transition-colors duration-500 lg:pb-8 lg:pt-32 dark:from-slate-950 dark:via-slate-900 dark:to-fuchsia-950/15">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 flex justify-center">
              <Logo className="text-6xl md:text-8xl" showDotMe={true} />
            </div>

            <h2 className="mb-4 animate-gradient-x cursor-default bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-[length:200%_auto] bg-clip-text text-3xl font-bold text-transparent hover:animate-bounce md:text-5xl">
              Real Connections. Zero Trace.
            </h2>

            <p className="mx-auto mb-8 max-w-2xl text-lg font-medium text-slate-900 md:text-xl dark:text-slate-300">
              The open-source social network built on privacy. Meet locals, verify with AI, and chat
              with end-to-end encryption.
            </p>

            <div className="mx-auto mb-10 w-full max-w-2xl rounded-[28px] border border-white/70 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-800/70 dark:bg-slate-900/35">
              <InspireQuote />
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0">
              <Link
                href="/rate-my-pussy"
                className="flex w-full animate-bounce items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-10 py-4 text-xl font-black text-white shadow-lg transition-all duration-200 hover:animate-none hover:from-pink-600 hover:to-purple-700 hover:shadow-xl sm:w-auto"
              >
                <Heart className="mr-2 h-6 w-6 fill-current" />
                Rate My Cat
              </Link>
              <Link
                href="/roast"
                className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-10 py-4 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:from-orange-600 hover:to-red-700 hover:shadow-xl sm:w-auto"
              >
                <Flame className="mr-2 h-5 w-5 fill-current" />
                Roast My Profile
              </Link>
              <Link
                href="/register"
                onClick={() => trackCTAClick('hero_cta_b')}
                className="flex w-full items-center justify-center rounded-full bg-blue-600 px-10 py-4 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:bg-blue-700 hover:shadow-xl sm:w-auto"
              >
                Create Anonymous Account
              </Link>
            </div>

            <div className="relative mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border-2 border-yellow-400/80 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-6 text-left shadow-[0_0_40px_rgba(234,179,8,0.25),0_16px_45px_rgba(234,179,8,0.15)] backdrop-blur-sm dark:border-yellow-500/50 dark:from-gray-900/90 dark:via-yellow-950/30 dark:to-gray-900/90 dark:shadow-[0_0_40px_rgba(234,179,8,0.15)]">
              {/* Floating gold coins */}
              <div
                className="absolute right-3 top-2 animate-bounce text-4xl"
                style={{ animationDuration: '2s' }}
              >
                🪙
              </div>
              <div
                className="absolute bottom-2 left-4 animate-bounce text-3xl"
                style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}
              >
                💰
              </div>
              <div
                className="absolute right-16 top-1/2 animate-bounce text-2xl"
                style={{ animationDuration: '3s', animationDelay: '1s' }}
              >
                🪙
              </div>

              <div className="relative z-10 flex items-start gap-4">
                <div className="mt-1 flex-shrink-0 animate-pulse rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 p-3 shadow-lg shadow-yellow-500/30">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                      EARN GOLD COINS & REAL MONEY 💸
                    </h3>
                    <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-sm">
                      referral rewards
                    </span>
                    <span className="animate-pulse rounded-full bg-green-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                      real cash
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-gray-700 dark:text-gray-200">
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">
                      Stack FWBcoin
                    </span>{' '}
                    with every invite. Gold referrals unlock{' '}
                    <span className="font-bold text-green-600 dark:text-green-400">
                      real-money bonuses
                    </span>{' '}
                    paid directly to you — plus smaller rewards one level deeper. Your network
                    literally pays off. 🪙💵
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 border-t border-gray-200/60 pt-8 dark:border-gray-700/60">
              <p className="mb-6 text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                A Community for Every Orientation and Identity
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  { name: 'Inclusive', icon: Users },
                  { name: 'Open-Minded', icon: Flame },
                  { name: 'Body Positive', icon: CheckCircle2 },
                  { name: 'Wellness Advocates', icon: Shield },
                  { name: 'Lifestyle Community', icon: LinkIcon },
                ].map((item) => (
                  <span
                    key={item.name}
                    className="flex cursor-default items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Decorative blobs */}
        <div className="absolute left-0 top-0 -ml-20 -mt-20 h-96 w-96 rounded-full bg-sky-200/70 opacity-60 blur-3xl transition-colors duration-500 dark:bg-sky-500/10"></div>
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-fuchsia-200/70 opacity-60 blur-3xl transition-colors duration-500 dark:bg-fuchsia-500/10"></div>
      </div>

      {/* Why fwber Section (Moved Up) */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-24 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Privacy-First Architecture
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your secrets are safe. Photos are encrypted on your device—we can&apos;t see them,
                  and neither can hackers.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <Zap className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Find Who’s Nearby
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  See active matches in your immediate vicinity without compromising your exact
                  coordinates. Perfect for conventions, clubs, or spontaneous meetups.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <Layers className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Earn Their Trust
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Start as an avatar. As your connection deepens, your profile reveals more. You
                  control exactly when and what your match sees.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <Ghost className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">AI Avatars</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Be anyone you want. Browse anonymously with a custom AI persona until you&apos;re
                  ready to reveal the real you.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <Lock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  The Local Vault
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  A secure, dedicated gallery for your private content that never touches the cloud
                  unencrypted.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Verify Your Date
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No more catfishing. Our Face Reveal system ensures the person you meet matches
                  their profile.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <Sparkles className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Smart Behavioral Matching{' '}
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-green-800">
                    New
                  </span>
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  An AI matchmaker that learns your true &quot;type&quot; based on who you actually
                  interact with, not just who you say you like.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <Shield className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  AI Safety Guardrails{' '}
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-green-800">
                    Active
                  </span>
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Advanced AI that blocks unsolicited explicit content before it ruins your mood.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <Users className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Social Circles & Events
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Because sometimes the best connections happen in a crowd. Find local events and
                  groups.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0">
                <MapPin className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Native Mobile Experience
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  The full fwber experience in your pocket. Install directly to your home screen.
                </p>
              </div>
            </div>

            <div className="flex gap-4 md:col-span-2">
              <div className="mt-1 flex-shrink-0">
                <Code className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Trust Through Transparency
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Unlike corporate dating apps, we don&apos;t sell your data. Our code is
                  open-source and auditable by anyone. Your secrets stay on your device, not our
                  servers.{' '}
                  <a
                    href="https://github.com/FWBerLLC/fwber"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View on GitHub
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Section */}
      <div id="safety" className="bg-gray-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-12 md:mb-0 md:w-1/2">
              <h2 className="mb-6 text-3xl font-bold md:text-4xl">Your Privacy Matters</h2>
              <p className="mb-8 text-xl leading-relaxed text-gray-300">
                We use state-of-the-art encryption and security measures to protect your data.
                You&apos;re in control of what you share and who sees it.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-300">
                  <Shield className="mr-3 h-6 w-6 text-green-400" />
                  <span>End-to-end encryption for messages</span>
                </li>
                <li className="flex items-center text-gray-300">
                  <Users className="mr-3 h-6 w-6 text-blue-400" />
                  <span>Verified profiles only</span>
                </li>
                <li className="flex items-center text-gray-300">
                  <MessageCircle className="mr-3 h-6 w-6 text-purple-400" />
                  <span>Private and secure chat</span>
                </li>
              </ul>
            </div>
            <div className="md:w-5/12">
              <div className="rounded-2xl border border-gray-700 bg-gray-800 p-8">
                <h3 className="mb-4 text-2xl font-bold">Join 50,000+ Members</h3>
                <p className="mb-8 text-gray-400">
                  Create your free account today and start exploring matches in your area.
                </p>
                <Link
                  href="/register"
                  onClick={() => trackCTAClick('bottom_cta_b')}
                  className="block w-full rounded-xl bg-blue-600 py-4 text-center font-bold text-white transition-colors hover:bg-blue-700"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-12 dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-8 md:mb-0">
              <div className="flex items-baseline gap-1">
                <Logo className="text-3xl" />
              </div>
              <p className="mt-2 text-gray-500">© 2026 fwber. All rights reserved.</p>
            </div>
            <div className="flex space-x-8">
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900 dark:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-gray-900 dark:text-white">
                Terms of Service
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900 dark:text-white">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div className="pb-safe fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden dark:border-gray-700 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-16 items-center justify-around">
          <Link
            href="/"
            className="flex h-full w-full flex-col items-center justify-center text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500"
          >
            <Home className="mb-1 h-6 w-6" />
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link
            href="#features"
            className="flex h-full w-full flex-col items-center justify-center text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500"
          >
            <Star className="mb-1 h-6 w-6" />
            <span className="text-xs font-medium">Features</span>
          </Link>
          <Link
            href="#safety"
            className="flex h-full w-full flex-col items-center justify-center text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500"
          >
            <Shield className="mb-1 h-6 w-6" />
            <span className="text-xs font-medium">Safety</span>
          </Link>
          <Link
            href="/register"
            className="flex h-full w-full flex-col items-center justify-center font-semibold text-blue-600 dark:text-blue-500"
          >
            <UserPlus className="mb-1 h-6 w-6" />
            <span className="text-xs">Join</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
