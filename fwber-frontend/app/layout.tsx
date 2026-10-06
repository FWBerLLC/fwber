import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import QueryProvider from '@/lib/query-client'
import PerformanceMonitor from '@/components/PerformanceMonitor'
import { ToastProvider } from '@/components/ToastProvider'
import NotificationPermissionHandler from '@/components/NotificationPermissionHandler'
import SentryInitializer from '@/components/SentryInitializer'
import { ThemeProvider } from '@/components/ThemeProvider'
import FeedbackModal from '@/components/FeedbackModal'
// Legacy: Mercure provider removed, migrated to Reverb WebSocket
import { SolanaProvider } from '@/components/SolanaProvider'
import NotificationListener from '@/components/realtime/NotificationListener'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import { AnimatedParticles } from '@/components/AnimatedParticles'
import SafeWalkTracker from '@/components/safety/SafeWalkTracker'
import AssetRecovery from '@/components/AssetRecovery'
import { AuthenticatedRealtimeProvider } from '@/components/AuthenticatedRealtimeProvider'
import GlobalSubpageNav from '@/components/GlobalSubpageNav'
import NativeForegroundNotificationBridge from '@/components/NativeForegroundNotificationBridge'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap', // Optimize font loading
})

const faviconVersion = process.env.NEXT_PUBLIC_FRONTEND_VERSION || process.env.NEXT_PUBLIC_PROJECT_VERSION || '1.0.40'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f97316' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://fwber.site'),
  title: 'fwber.site - Social Network - Join the Revolution in Social Networking',
  description: 'Social Network - Friends, Dating, Connect, Ads, Groups, Fun, Love, and More! Sign up now to get 50 Tokens for AI Avatars and 3 Days of Gold Premium! fwber is the definitive privacy-first social network for dating, friends, and lifestyle matching.',
  keywords: ['dating', 'matching', 'relationships', 'connect', 'friends', 'groups', 'ads', 'free tokens', 'premium dating', 'ai avatars', 'art'],
  authors: [{ name: 'fwber.site Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: `/favicon.svg?v=${faviconVersion}`, type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512x512.png', type: 'image/png', sizes: '512x512' },
      { url: `/icon.svg?v=${faviconVersion}`, type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png' },
    ],
  },
  openGraph: {
    title: 'fwber.site - Social Network - Free Tokens for AI Avatars & Gold Premium!',
    description: 'Sign up today with a referral link to unlock 50 Tokens for custom AI Avatars and 3 Days of Gold Premium instantly. Experience the best in social networking.',
    type: 'website',
    locale: 'en_US',
    siteName: 'FWBer',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'fwber.site - Social Network - Get Free Tokens & Gold Premium!',
    description: 'Sign up today to unlock 50 Tokens for custom AI Avatars and 3 Days of Gold Premium instantly.',
  },
  alternates: {
    types: {
      'application/json+oembed': `${process.env.NEXT_PUBLIC_APP_URL || 'https://fwber.site'}/api/oembed`,
    },
  },
  robots: {
    index: true,
    follow: true,
  },
  // Performance optimizations
  other: {
    'X-DNS-Prefetch-Control': 'on',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* DNS prefetch for better performance */}
        <link rel="dns-prefetch" href="//api.fwber.site" />
        <link rel="preconnect" href="https://api.fwber.site" />
      </head>

      <body
        className="min-h-screen bg-background font-sans antialiased text-optimized"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <SolanaProvider>
                <AssetRecovery />
                <NotificationPermissionHandler />
                <SentryInitializer />
                <GlobalSubpageNav />
                <PWAInstallPrompt />
                <Suspense fallback={null}>
                  <AnalyticsProvider />
                </Suspense>
                <ToastProvider>
                  <AnimatedParticles />
                  <AuthenticatedRealtimeProvider>
                  <NativeForegroundNotificationBridge />
                  <NotificationListener />
                  <SafeWalkTracker />
                  <div className="relative flex min-h-screen flex-col">
                    <div className="flex-1">{children}</div>
                  </div>
                  <FeedbackModal />
                  <PerformanceMonitor />
                  {/* Version badge — reads from VERSION file at build time via next.config.js */}
                  <div className="fixed bottom-1 right-1 text-[10px] text-muted-foreground opacity-50 pointer-events-none z-50">
                    v{process.env.NEXT_PUBLIC_FRONTEND_VERSION || process.env.NEXT_PUBLIC_PROJECT_VERSION || '1.0.2'}
                  </div>
                  </AuthenticatedRealtimeProvider>
                </ToastProvider>
              </SolanaProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
