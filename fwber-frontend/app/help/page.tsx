'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  HelpCircle,
  Shield,
  Wallet,
  Sparkles,
  Search,
  BookOpen,
  Bot,
  Eye,
  Lock,
  Globe
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

const HELP_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started & Dashboard',
    description: 'Set up your profile, navigate the consolidated Dashboard, and start meeting people.',
    icon: Sparkles,
    articles: [
      { title: 'Creating your account', slug: 'create-account' },
      { title: 'Setting up your profile', slug: 'profile-setup' },
      { title: 'Understanding Avatars', slug: 'avatars' },
      { title: 'Navigating the Consolidated Dashboard', slug: 'dashboard-guide' },
    ]
  },
  {
    id: 'features',
    title: 'Matches, Friends & Real-Time Chat',
    description: 'Deep dive into Compatibility Matching, Direct Messaging, Friends, Groups, and Proximity.',
    icon: BookOpen,
    articles: [
      { title: 'How Matching works', slug: 'matching' },
      { title: 'Friends & Direct Messaging', slug: 'friends-messaging' },
      { title: 'Proximity Chatrooms', slug: 'chatrooms-guide' },
      { title: 'Creating & Joining Groups', slug: 'groups-guide' },
      { title: 'Achievements & Virtual Gifts', slug: 'achievements-guide' },
    ]
  },
  {
    id: 'safety-privacy',
    title: 'Safety, Blocking & Hardware Beacons',
    description: 'Your safety is our priority. Manage bidirectional blocks, Safe Walk, and BLE safety keys.',
    icon: Shield,
    articles: [
      { title: 'Photo Privacy & Blurring', slug: 'photo-privacy' },
      { title: 'Bidirectional Blocking & Reporting', slug: 'block-report' },
      { title: 'Location Privacy & Fuzzing', slug: 'location-privacy' },
      { title: 'Hardware BLE Safety Beacons', slug: 'ble-safety-tokens' },
    ]
  },
  {
    id: 'wallet-crypto',
    title: 'Wallet, Tokens & Solana Sign-In',
    description: 'Learn about FWB tokens, Solana wallet login, virtual gifts, and on-chain transfers.',
    icon: Wallet,
    articles: [
      { title: 'Sign-In with Solana Wallet', slug: 'solana-signin' },
      { title: 'How FWB Tokens work', slug: 'fwb-tokens' },
      { title: 'Depositing from Solana', slug: 'deposits' },
      { title: 'Withdrawing funds', slug: 'withdrawals' },
      { title: 'Internal Ledger vs On-Chain', slug: 'ledger-vs-chain' },
    ]
  },
  {
    id: 'ai-wingman',
    title: 'AI Wingman Hub & Coaching',
    description: 'Use private on-box AI to craft openers, audit drafts, check vibes, and play arcade roasts.',
    icon: Bot,
    articles: [
      { title: 'Conversation Coach & Draft Analyzer', slug: 'conversation-coach' },
      { title: 'Cosmic Matches & Fortune', slug: 'cosmic-fortune' },
      { title: 'Roasts & Hypes', slug: 'roasts-hypes' },
      { title: 'Red & Green Flags', slug: 'vibe-check' },
    ]
  },
  {
    id: 'privacy-tiers',
    title: 'Tiered Privacy System',
    description: 'Understand the 5-tiered connection system (Blur to Clear) and progressive face reveals.',
    icon: Eye,
    articles: [
      { title: 'The 5 Privacy Tiers', slug: 'privacy-tiers-guide' },
      { title: 'Sharing Unlocks', slug: 'sharing-unlocks' },
      { title: 'Managing Face Reveals', slug: 'managing-reveals' },
    ]
  },
  {
    id: 'security-vault',
    title: 'Security & Media Vault',
    description: 'Protect sensitive media with client-side AES-256-GCM encryption and master recovery phrases.',
    icon: Lock,
    articles: [
      { title: 'On-Device Encryption', slug: 'on-device-encryption' },
      { title: 'The Local Vault', slug: 'local-vault' },
      { title: 'Recovering Master Keys', slug: 'key-recovery' },
    ]
  },
  {
    id: 'federation',
    title: 'ActivityPub & Fediverse',
    description: 'Connect your fwber handle to Mastodon and ActivityPub servers with strict location isolation.',
    icon: Globe,
    articles: [
      { title: 'ActivityPub & Fediverse Connectivity', slug: 'federation-guide' },
    ]
  }
]

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCategories = HELP_CATEGORIES.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.articles.length > 0)

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          FWBer User Manual &amp; Help Center
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Comprehensive guides covering privacy tiers, direct messaging, AI Wingman coaching, Solana tokens, safety beacons, and ActivityPub federation.
        </p>

        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search manual articles (e.g. block, friends, wallet, tiers)..."
            className="pl-10 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCategories.map((category) => (
          <Card key={category.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <category.icon className="w-6 h-6" />
                </div>
                <CardTitle>{category.title}</CardTitle>
              </div>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {category.articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/help/${article.slug}`}
                      className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-2 group"
                    >
                      <HelpCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Contact */}
      <div className="mt-12 p-6 bg-primary/5 rounded-2xl border border-primary/10 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Need operator support or want to report a bug?
        </h3>
        <p className="text-muted-foreground mb-4">
          Reach our support team directly or submit feature feedback from inside the app.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
          >
            Contact Support
          </Link>
          <Link
            href="/feedback"
            className="inline-flex items-center justify-center px-6 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-muted"
          >
            Submit Product Feedback
          </Link>
        </div>
      </div>
    </div>
  )
}
