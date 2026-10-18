'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  HelpCircle,
  Shield,
  Wallet,
  Heart,
  MessageSquare,
  Users,
  MapPin,
  Sparkles,
  Search,
  BookOpen,
  Bot,
  Eye,
  Lock
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

const HELP_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Everything you need to know to set up your profile and start meeting people.',
    icon: Sparkles,
    articles: [
      { title: 'Creating your account', slug: 'create-account' },
      { title: 'Setting up your profile', slug: 'profile-setup' },
      { title: 'Understanding Avatars', slug: 'avatars' },
    ]
  },
  {
    id: 'wallet-crypto',
    title: 'Wallet & Crypto',
    description: 'Learn about FWB tokens, Solana integration, and how to manage your funds.',
    icon: Wallet,
    articles: [
      { title: 'How FWB Tokens work', slug: 'fwb-tokens' },
      { title: 'Depositing from Solana', slug: 'deposits' },
      { title: 'Withdrawing funds', slug: 'withdrawals' },
      { title: 'Internal Ledger vs On-Chain', slug: 'ledger-vs-chain' },
    ]
  },
  {
    id: 'safety-privacy',
    title: 'Safety & Privacy',
    description: 'Your safety is our priority. Learn about our privacy features and moderation.',
    icon: Shield,
    articles: [
      { title: 'Photo Privacy & Blurring', slug: 'photo-privacy' },
      { title: 'Blocking & Reporting', slug: 'block-report' },
      { title: 'Location Privacy', slug: 'location-privacy' },
    ]
  },
  {
    id: 'features',
    title: 'Platform Features',
    description: 'Deep dive into Matches, Chat, Groups, and Proximity features.',
    icon: BookOpen,
    articles: [
      { title: 'How Matching works', slug: 'matching' },
      { title: 'Proximity Chatrooms', slug: 'chatrooms-guide' },
      { title: 'Creating & Joining Groups', slug: 'groups-guide' },
      { title: 'Achievements & Rewards', slug: 'achievements-guide' },
    ]
  },
  {
    id: 'ai-wingman',
    title: 'AI Wingman & Tools',
    description: 'Learn how to use AI to generate roasts, check vibes, and get conversation suggestions.',
    icon: Bot,
    articles: [
      { title: 'Cosmic Matches & Fortune', slug: 'cosmic-fortune' },
      { title: 'Roasts & Hypes', slug: 'roasts-hypes' },
      { title: 'Conversation Coach', slug: 'conversation-coach' },
      { title: 'Red & Green Flags', slug: 'vibe-check' },
    ]
  },
  {
    id: 'privacy-tiers',
    title: 'Tiered Privacy System',
    description: 'Understand the 5-tiered connection system (Blur to Clear) and how to manage face reveals.',
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
    description: 'Protect your sensitive photos with on-device encryption and robust vault features.',
    icon: Lock,
    articles: [
      { title: 'On-Device Encryption', slug: 'on-device-encryption' },
      { title: 'The Local Vault', slug: 'local-vault' },
      { title: 'Recovering Master Keys', slug: 'key-recovery' },
    ]
  }
]

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCategories = HELP_CATEGORIES.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.articles.length > 0)

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground dark:text-foreground">
          How can we help you?
        </h1>
        <p className="text-lg text-muted-foreground dark:text-muted-foreground max-w-2xl mx-auto">
          Browse our guides and documentation to get the most out of your fwber experience.
        </p>

        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for answers..."
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
                      className="text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-primary dark:hover:text-primary flex items-center gap-2 group"
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
        <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
          Still need help?
        </h3>
        <p className="text-muted-foreground dark:text-muted-foreground mb-4">
          Our support team is available 24/7 to assist you with any issues.
        </p>
        <Link
          href="/contact" // Assuming this exists, or we can route to email
          className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Contact Support
        </Link>
      </div>
    </div>
  )
}
