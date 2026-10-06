'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { trackCTAClick } from '@/lib/ab-testing'
import {
  Shield, Heart, MapPin, MessageCircle, Lock, Ghost, Layers,
  CheckCircle2, Sparkles, Star, Eye, Fingerprint, UserCheck,
  Home, UserPlus, Compass, ArrowRight, Zap,
} from 'lucide-react'
import { Suspense } from 'react'
import ReferralBanner from '@/components/ReferralBanner'
import { PremiumBadge, GradientIcon, ShimmerBorder } from '@/components/PremiumEffects'

function FadeInUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

function StaggerGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const staggerItem = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

function FloatUp({ children }: { children: React.ReactNode }) {
  return <motion.div variants={staggerItem}>{children}</motion.div>
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <div className="orb orb-pink" style={{ width: '600px', height: '600px', top: '-10%', left: '-5%', animation: 'blob 12s ease-in-out infinite' }} />
      <div className="orb orb-purple" style={{ width: '500px', height: '500px', top: '20%', right: '-8%', animation: 'blob 15s ease-in-out infinite reverse' }} />
      <div className="orb orb-cyan" style={{ width: '400px', height: '400px', bottom: '-5%', left: '30%', animation: 'blob 18s ease-in-out infinite 2s' }} />
      <div className="orb orb-pink" style={{ width: '300px', height: '300px', top: '50%', left: '10%', animation: 'blob 20s ease-in-out infinite 5s', opacity: 0.2 }} />
      <div className="orb orb-purple" style={{ width: '350px', height: '350px', bottom: '15%', right: '15%', animation: 'blob 14s ease-in-out infinite 3s', opacity: 0.25 }} />
      {/* 3D geometric shapes */}
      <div className="absolute top-[18%] left-[6%] w-20 h-20 border-2 border-purple-400/25 rounded-xl rotate-45 animate-float-slow dark:border-purple-500/15" />
      <div className="absolute top-[55%] right-[10%] w-24 h-24 border-2 border-pink-400/20 rounded-full animate-float dark:border-pink-500/10" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-[20%] left-[18%] w-14 h-14 border-2 border-cyan-400/20 rounded-lg rotate-12 animate-float-slow dark:border-cyan-500/10" style={{ animationDelay: '4s' }} />
      <div className="absolute top-[35%] left-[48%] w-10 h-10 border-2 border-purple-400/15 rotate-[30deg] animate-float dark:border-purple-500/8" style={{ animationDelay: '1s' }} />
      {/* Shooting star streaks */}
      <div className="absolute top-[12%] right-[25%] w-24 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent -rotate-45 animate-pulse-glow" style={{ animationDuration: '4s' }} />
      <div className="absolute top-[22%] right-[35%] w-16 h-px bg-gradient-to-r from-transparent via-pink-400/30 to-transparent -rotate-45 animate-pulse-glow" style={{ animationDuration: '5s', animationDelay: '2s' }} />
    </div>
  )
}

export default function LandingVariantA() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const timer = setTimeout(() => router.push('/dashboard'), 100)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950/30">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="h-14 w-14 rounded-full border-[3px] border-purple-200 border-t-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.2)] dark:border-purple-800 dark:border-t-purple-400"
        />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950/30">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-4 h-14 w-14 rounded-full border-[3px] border-purple-200 border-t-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.2)] dark:border-purple-800 dark:border-t-purple-400"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Taking you to your dashboard…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950/30 overflow-hidden">
      <Suspense fallback={null}><ReferralBanner /></Suspense>

      {/* ── Navigation ── */}
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50 glass-strong border-b border-white/20 dark:border-white/5"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <Link href="/" className="flex-shrink-0">
              <motion.div whileHover={{ scale: 1.02 }}><Logo className="text-3xl" /></motion.div>
            </Link>
            <div className="hidden items-center space-x-6 md:flex">
              {['How it works', 'Features', 'Safety'].map((label) => (
                <Link key={label} href={`#${label.toLowerCase().replace(/\s/g, '-')}`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-purple-500 after:transition-all hover:after:w-full"
                >{label}</Link>
              ))}
              <ThemeToggle />
              <Link href="/login" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all">Log in</Link>
              <Link href="/register"
                className="btn-shiny rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-[length:200%_auto] animate-gradient-x px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/30 active:scale-95 transition-all duration-300">
                Get started <ArrowRight className="inline h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="flex items-center gap-3 md:hidden">
              <ThemeToggle />
              <Link href="/register"
                className="btn-shiny rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">Join</Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <FloatingOrbs />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #a855f7 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-20 text-center sm:pb-32 sm:pt-28">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-6 flex justify-center">
              <Logo className="text-6xl sm:text-8xl" showDotMe={true} />
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-gray-900 dark:text-white">Meet people for who </span>
              <br />
              <span className="text-gradient-pink">they really are</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl dark:text-gray-400">
              Photos stay hidden until you choose to reveal them. Values, personality, and real
              connection come first. Your privacy is the foundation, not a feature toggle.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register" onClick={() => trackCTAClick('hero_cta_a')}
                className="group relative btn-shiny rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-[length:200%_auto] animate-gradient-x px-8 py-4 text-base font-bold text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/35 active:scale-[0.97] transition-all duration-300 w-full sm:w-auto">
                Create your account — it&apos;s free
                <ArrowRight className="inline h-4 w-4 ml-2 group-hover:translate-x-1.5 transition-transform" />
              </Link>
              <Link href="#how-it-works"
                className="group glass border border-white/30 dark:border-white/10 rounded-full px-8 py-4 text-base font-medium text-gray-700 dark:text-gray-300 hover:shadow-premium-lg active:scale-[0.97] transition-all duration-300 w-full sm:w-auto flex items-center gap-2">
                See how it works <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-3 text-sm">
              {[
                { icon: Lock, text: 'End-to-end encrypted' },
                { icon: Ghost, text: 'Browse anonymously' },
                { icon: Eye, text: 'Photos are opt-in' },
                { icon: CheckCircle2, text: 'Open source' },
              ].map((item, i) => (
                <motion.span key={item.text}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-light border border-white/20 dark:border-white/5 shadow-sm">
                  <item.icon className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                  {item.text}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 dark:from-gray-950 to-transparent pointer-events-none" />
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 via-white to-white dark:from-gray-900/50 dark:via-gray-950 dark:to-gray-950" />
        <FloatingOrbs />
        <div className="relative mx-auto max-w-5xl px-4">
          <FadeInUp>
            <div className="mb-16 text-center">
              <motion.span initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                className="inline-flex items-center rounded-full border border-pink-500/30 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 backdrop-blur-sm px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-pink-500 dark:text-pink-400 mb-4">
                How it works
              </motion.span>
              <h2 className="text-4xl font-black text-gray-900 sm:text-5xl dark:text-white">
                Connection before <span className="text-gradient-pink">attraction</span>
              </h2>
            </div>
          </FadeInUp>
          <StaggerGrid className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Sparkles, title: '1. Answer questions', desc: 'Share what matters to you — your values, lifestyle, and what you\'re looking for. Our matching engine uses 100+ personality questions.', gradient: 'from-pink-500 to-purple-500' },
              { icon: Compass, title: '2. Discover nearby', desc: 'Browse people near you through AI-generated avatars — not photos. See compatibility scores, shared values, and local events.', gradient: 'from-purple-500 to-cyan-500' },
              { icon: Heart, title: '3. Reveal on your terms', desc: 'When you\'ve built trust through conversation, choose to reveal photos. You control the pace. No pressure.', gradient: 'from-cyan-500 to-pink-500' },
            ].map((item) => (
              <FloatUp key={item.title}>
                <motion.div whileHover={{ y: -10, scale: 1.02 }}
                  className="glass rounded-2xl p-8 text-center shadow-premium hover:shadow-premium-lg transition-all duration-300 border border-white/20 dark:border-white/5 h-full group">
                  <div className={`mx-auto mb-6 flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="leading-relaxed text-gray-600 dark:text-gray-400">{item.desc}</p>
                </motion.div>
              </FloatUp>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-50/30 to-white dark:from-gray-950 dark:via-purple-950/10 dark:to-gray-950" />
        <FloatingOrbs />
        <div className="relative mx-auto max-w-5xl px-4">
          <FadeInUp>
            <div className="mb-16 text-center">
              <span className="badge-shiny inline-block mb-4">Built different</span>
              <h2 className="text-4xl font-black text-gray-900 sm:text-5xl dark:text-white">
                Designed around <span className="text-gradient-pink">trust</span>
              </h2>
            </div>
          </FadeInUp>
          <StaggerGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Ghost, title: 'AI Avatars', desc: 'Your real photos stay hidden behind an AI persona. Personality first, photos on your terms.', color: 'from-purple-400 to-purple-600' },
              { icon: Fingerprint, title: 'Zero-Knowledge Proof', desc: 'Prove you\'re real without revealing your identity. Privacy-preserving verification.', color: 'from-blue-400 to-blue-600' },
              { icon: MapPin, title: 'Fuzzy Location', desc: 'Your neighborhood, not your address. Proximity without surveillance.', color: 'from-emerald-400 to-green-600' },
              { icon: Lock, title: 'E2E Encryption', desc: 'Messages encrypted on your device. We can\'t read them. No one can.', color: 'from-pink-400 to-rose-600' },
              { icon: Layers, title: 'Progressive Reveal', desc: 'Control when your match sees photos, name, details. Trust builds step by step.', color: 'from-orange-400 to-amber-600' },
              { icon: UserCheck, title: 'Value Matching', desc: '100+ questions across 7 categories. Matched on what matters, not just looks.', color: 'from-indigo-400 to-indigo-600' },
              { icon: Shield, title: 'AI Guardrails', desc: 'Block unsolicited explicit content automatically. Safety first, always.', color: 'from-red-400 to-rose-600' },
              { icon: Star, title: 'Open Source', desc: 'Every line auditable. We don\'t sell your data. Trust through transparency.', color: 'from-amber-400 to-yellow-600' },
            ].map((item) => (
              <FloatUp key={item.title}>
                <motion.div whileHover={{ y: -6, scale: 1.02 }}
                  className="glass rounded-2xl p-5 shadow-premium hover:shadow-premium-lg transition-all duration-300 border border-white/20 dark:border-white/5 h-full group">
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} shadow-lg group-hover:scale-110 transition-transform`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mb-1.5 font-bold text-gray-900 dark:text-white text-sm">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{item.desc}</p>
                </motion.div>
              </FloatUp>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── Safety ── */}
      <section id="safety" className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950" />
        <FloatingOrbs />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <FadeInUp>
            <motion.div whileHover={{ scale: 1.08, rotate: 5 }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/30">
              <Shield className="h-8 w-8 text-white" />
            </motion.div>
            <h2 className="mb-4 text-4xl font-black text-gray-900 sm:text-5xl dark:text-white">
              Your safety comes <span className="text-gradient-gold">first</span>
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              We built fwber because we believe dating apps should protect you, not exploit you.
            </p>
          </FadeInUp>
          <StaggerGrid className="mb-12 grid gap-4 text-left sm:grid-cols-2">
            {[
              { icon: Eye, title: 'Ghost Mode', desc: 'Browse invisibly. No one knows you looked at their profile unless you want them to.' },
              { icon: MapPin, title: 'Location Fuzzing', desc: 'Your location is approximate. We show your area, never your exact spot.' },
              { icon: Lock, title: 'Private Vault', desc: 'Encrypted storage for private content that never touches the cloud unencrypted.' },
              { icon: MessageCircle, title: 'Safe Walk', desc: 'Share your live route with trusted contacts when walking to meet someone.' },
            ].map((item) => (
              <FloatUp key={item.title}>
                <motion.div whileHover={{ x: 4 }}
                  className="flex gap-3 glass rounded-xl p-4 border border-white/20 dark:border-white/5 shadow-sm">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 shadow-md">
                    <item.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="mb-0.5 text-sm font-bold text-gray-900 dark:text-white">{item.title}</h4>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.desc}</p>
                  </div>
                </motion.div>
              </FloatUp>
            ))}
          </StaggerGrid>
          <FadeInUp delay={0.2}>
            <motion.div whileHover={{ y: -4 }}
              className="glass rounded-2xl p-8 sm:p-10 shadow-premium-lg border border-white/20 dark:border-white/5">
              <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                Ready to try a different kind of dating app?
              </h3>
              <p className="mb-6 text-gray-600 dark:text-gray-400">Free to join. No credit card required.</p>
              <Link href="/register" onClick={() => trackCTAClick('bottom_cta_a')}
                className="btn-shiny inline-block rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-[length:200%_auto] animate-gradient-x px-8 py-4 font-bold text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.97] transition-all duration-300">
                Create your account <ArrowRight className="inline h-4 w-4 ml-2" />
              </Link>
            </motion.div>
          </FadeInUp>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative border-t border-white/10 dark:border-white/5 py-12 glass-strong">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-4">
              <Logo className="text-2xl" />
              <span className="text-sm text-gray-500">© 2026 fwber</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              {[{ href: '/privacy', label: 'Privacy' }, { href: '/terms', label: 'Terms' }, { href: '/contact', label: 'Contact' }, { href: 'https://github.com/FWBerLLC/fwber', label: 'GitHub' }].map((link) => (
                <Link key={link.label} href={link.href} {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="transition-all hover:text-purple-500 dark:hover:text-purple-400">{link.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} transition={{ delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/10 dark:border-white/5 md:hidden">
        <div className="flex h-14 items-center justify-around">
          {[
            { href: '/', icon: Home, label: 'Home', active: true },
            { href: '#how-it-works', icon: Star, label: 'How' },
            { href: '#features', icon: Zap, label: 'Features' },
            { href: '/register', icon: UserPlus, label: 'Join', highlight: true },
          ].map((item) => (
            <Link key={item.label} href={item.href}
              className={`flex h-full w-full flex-col items-center justify-center transition-all duration-200 ${item.active || item.highlight ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'} ${item.highlight ? 'font-bold' : ''}`}>
              <item.icon className={`h-5 w-5 ${item.active || item.highlight ? 'drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]' : ''}`} />
              <span className="mt-0.5 text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
