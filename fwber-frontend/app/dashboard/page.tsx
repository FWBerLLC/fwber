'use client'

import { useAuth } from '@/lib/auth-context'
import ProtectedRoute from '@/components/ProtectedRoute'
import { api } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Heart,
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  Crown,
  Sparkles,
  MapPin,
  Shield,
  Compass,
  Radio,
  Award,
  Wallet,
  Store,
  Wand2,
  Calendar,
  UserPlus,
  Eye,
  Star,
  Rocket,
  Gift,
  Lock,
  Phone,
  Share2,
  Settings,
  Bell,
  Plane,
  Search,
  Gavel,
  Flame,
  CheckCircle2,
  User,
  Palette,
  Lightbulb,
  Activity,
} from 'lucide-react'
import Link from 'next/link'
import ProfileCompletenessWidget from '@/components/ProfileCompletenessWidget'
import AppHeader from '@/components/AppHeader'
import { ActivityFeed } from '@/components/ActivityFeed'
import { DailyStreakModal } from '@/components/gamification/DailyStreakModal'
import QuestBoard from '@/components/quests/QuestBoard'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info, Globe, ScrollText, BarChart3, Trophy, FileWarning, Plug } from 'lucide-react'

interface DashboardStats {
  total_matches: number
  pending_matches: number
  accepted_matches: number
  conversations: number
  profile_views: number
  today_views: number
  match_score_avg: number
  response_rate: number
  days_active: number
  last_login: string
  current_streak: number
  streak_just_updated: boolean
  reverb_healthy?: boolean
}

export default function DashboardPage() {
  const { user, token, isAuthenticated } = useAuth()
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    enabled: isAuthenticated && !!token,
    queryFn: async () => {
      try {
        const data = await api.get<DashboardStats>('/dashboard/stats')
        if (data?.streak_just_updated) {
          setIsStreakModalOpen(true)
        }
        return data || null
      } catch (error) {
        console.error('Dashboard stats fetch failed:', error)
        return null
      }
    },
  })

  const dailyStreak = stats?.current_streak || 0

  return (
    <ProtectedRoute>
      <TooltipProvider delayDuration={200}>
        <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader />
        <DailyStreakModal
          isOpen={isStreakModalOpen}
          currentStreak={dailyStreak}
          onClose={() => setIsStreakModalOpen(false)}
        />

        <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* ── Greeting ── */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground dark:text-foreground">
                Hey, {(user as any)?.display_name || (user as any)?.name || 'there'} 👋
              </h2>
              <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
                Your matches, messages, and everything else — one glance.
              </p>
            </div>

            {/* ── Key Metrics Row ── */}
            {statsLoading ? (
              <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-border bg-card p-5 dark:border-border dark:bg-card"
                  >
                    <div className="mb-3 h-4 w-2/3 rounded bg-muted dark:dark:bg-muted" />
                    <div className="h-7 w-1/2 rounded bg-muted dark:dark:bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <MetricCard
                  icon={<Heart className="h-5 w-5" />}
                  label="Matches"
                  value={stats?.total_matches || 0}
                  detail={`${stats?.pending_matches || 0} pending`}
                  accent="pink"
                  href="/matches"
                />
                <MetricCard
                  icon={<MessageSquare className="h-5 w-5" />}
                  label="Chats"
                  value={stats?.conversations || 0}
                  detail={`${stats?.response_rate || 0}% response`}
                  accent="blue"
                  href="/messages"
                />
                <MetricCard
                  icon={<Eye className="h-5 w-5" />}
                  label="Views"
                  value={stats?.profile_views || 0}
                  detail={`${stats?.today_views || 0} today`}
                  accent="green"
                  href="/profile-views"
                />
                <MetricCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Compatibility"
                  value={`${stats?.match_score_avg || 0}%`}
                  detail="avg score"
                  accent="purple"
                  href="/matching"
                />
                <MetricCard
                  icon={<Flame className="h-5 w-5" />}
                  label="Streak"
                  value={dailyStreak}
                  detail={dailyStreak > 0 ? 'days active' : 'Start today!'}
                  accent="orange"
                  href="/daily-checkin"
                />
              </div>
            )}

            {/* ── Main Grid: Activity + Sidebar ── */}
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left: Quests + Activity Feed */}
              <div className="space-y-8 lg:col-span-2">
                <QuestBoard />

                <ActivityFeed maxItems={6} showRefresh />

                {/* Quick Actions */}
                <div className="rounded-xl border border-border bg-card p-5 dark:border-border dark:bg-card">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    <QuickAction
                      href="/settings/matching"
                      label="Answer Questions"
                      icon={<Heart className="h-4 w-4" />}
                    />
                    <QuickAction
                      href="/recommendations"
                      label="Discover"
                      icon={<Compass className="h-4 w-4" />}
                    />
                    <QuickAction
                      href="/messages"
                      label="Messages"
                      icon={<MessageSquare className="h-4 w-4" />}
                    />
                    <QuickAction
                      href="/profile/edit"
                      label="Edit Profile"
                      icon={<User className="h-4 w-4" />}
                      accent="green"
                    />
                    <QuickAction
                      href="/premium"
                      label="Go Premium"
                      icon={<Crown className="h-4 w-4" />}
                      accent="amber"
                    />
                    <QuickAction
                      href="/studio"
                      label="AI Wingman"
                      icon={<Sparkles className="h-4 w-4" />}
                      accent="purple"
                    />
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                <ProfileCompletenessWidget />

                {/* Streak & Account Card */}
                <div className="rounded-xl border border-border bg-card p-5 dark:border-border dark:bg-card">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground dark:text-foreground">
                        Account
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                      {stats?.days_active || 0} days
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground dark:text-muted-foreground">Last active</span>
                      <span className="font-medium text-foreground dark:text-foreground">
                        {stats?.last_login
                          ? new Date(stats.last_login).toLocaleDateString()
                          : 'Today'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground dark:text-muted-foreground">Network</span>
                      <span
                        className={`font-medium ${
                          stats?.reverb_healthy
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}
                      >
                        {stats?.reverb_healthy ? '● Live' : '○ Syncing'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Who Liked You CTA */}
                <Link href="/premium/who-likes-you" prefetch={false} className="block">
                  <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 transition hover:shadow-md dark:border-amber-800 dark:from-amber-900/20 dark:to-orange-900/20">
                    <div className="mb-2 flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        Who Liked You
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      See who&apos;s already interested in you
                    </p>
                  </div>
                </Link>
              </div>
            </div>

                        {/* ── Feature Navigation (Consolidated & Reorganized by High Value) ── */}
            <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground dark:text-foreground">Explore FWBer Ecosystem</h3>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Every platform capability, portal, and tool organized by priority with detailed guidance.</p>
              </div>
            </div>

            {/* Discover & Connect */}
            <SectionHeader icon={<Heart className="h-4 w-4" />} title="Discover & Connect" />
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <FeatureTile
                href="/recommendations"
                title="Recommendations"
                subtitle="Browse nearby people"
                icon={<Compass className="h-5 w-5" />}
                accent="purple"
                tooltip="Browse personalized nearby recommendations matched by location and preferences."
              />
              <FeatureTile
                href="/matches"
                title="Matches"
                subtitle="Your mutual likes"
                icon={<Star className="h-5 w-5" />}
                accent="amber"
                tooltip="View your confirmed mutual matches and start conversations."
              />
              <FeatureTile
                href="/who-likes-you"
                title="Admirers"
                subtitle="Who likes you"
                icon={<Crown className="h-5 w-5" />}
                accent="amber"
                tooltip="See members who have liked your profile and want to connect."
              />
              <FeatureTile
                href="/settings/matching"
                title="Matching Preferences"
                subtitle="95 personality questions"
                icon={<Heart className="h-5 w-5" />}
                accent="pink"
                tooltip="Fine-tune compatibility answers, lifestyle criteria, and matching filters."
              />
              <FeatureTile
                href="/matches/dashboard"
                title="Match Analytics"
                subtitle="Compatibility insights"
                icon={<BarChart3 className="h-5 w-5" />}
                accent="blue"
                tooltip="Detailed analytics, acceptance ratios, and trends across your matches."
              />
              <FeatureTile
                href="/groups/matching"
                title="Group Matching"
                subtitle="Match by interests"
                icon={<Users className="h-5 w-5" />}
                accent="purple"
                tooltip="Discover groups and shared communities aligned with your personality profile."
              />
              <FeatureTile
                href="/matching/nfc"
                title="NFC Tap Exchange"
                subtitle="Tap to connect"
                icon={<Phone className="h-5 w-5" />}
                accent="green"
                tooltip="Instantly exchange contact cards and profiles using near-field physical tap."
              />
              <FeatureTile
                href="/search"
                title="Search"
                subtitle="Find anyone"
                icon={<Search className="h-5 w-5" />}
                accent="slate"
                tooltip="Search users across the network by name, handle, or shared interests."
              />
              <FeatureTile
                href="/scenes"
                title="Scenes & Vibe Hub"
                subtitle="Community clusters"
                icon={<Compass className="h-5 w-5" />}
                accent="purple"
                tooltip="Unified discovery layer grouping local scenes, vibe recommendations, and subcultures."
              />
              <FeatureTile
                href="/discover"
                title="Discover Feed"
                subtitle="Find new people"
                icon={<Compass className="h-5 w-5" />}
                accent="blue"
                tooltip="Infinite discovery stream of verified profiles, fresh newcomers, and active singles."
              />
              <FeatureTile
                href="/rate-my-pussy"
                title="Rate My Cat"
                subtitle="Pet photo showcase"
                icon={<Sparkles className="h-5 w-5" />}
                accent="pink"
                tooltip="Community pet showcase and rating arena for beloved feline and pet companions."
              />
              <FeatureTile
                href="/connections"
                title="Connections Hub"
                subtitle="Social graph view"
                icon={<Users className="h-5 w-5" />}
                accent="blue"
                tooltip="Unified directory of friends, followers, mutual likes, and active social ties."
              />
            </div>

            {/* Real-Time Chat & Social Spaces */}
            <SectionHeader icon={<MessageSquare className="h-4 w-4" />} title="Real-Time Chat & Social Spaces" />
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <FeatureTile
                href="/messages"
                title="Messages"
                subtitle="Private direct chats"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="blue"
                tooltip="Encrypted direct messaging with rich media, audio notes, and instant notifications."
              />
              <FeatureTile
                href="/friends"
                title="Friends List"
                subtitle="Your inner circle"
                icon={<UserPlus className="h-5 w-5" />}
                accent="green"
                tooltip="Manage trusted friendships, favorites, and mutual connection status."
              />
              <FeatureTile
                href="/chatrooms"
                title="Chatrooms"
                subtitle="Public group rooms"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="blue"
                tooltip="Join open topical chatrooms and community channels with live participants."
              />
              <FeatureTile
                href="/audio-rooms"
                title="Audio Rooms"
                subtitle="Live voice spaces"
                icon={<Radio className="h-5 w-5" />}
                accent="purple"
                tooltip="Drop into interactive real-time voice lounges and group audio stages."
              />
              <FeatureTile
                href="/spaces"
                title="Live Spaces"
                subtitle="Ephemeral gatherings"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="purple"
                tooltip="Ephemeral group conversations, stage panels, and scheduled live spaces."
              />
              <FeatureTile
                href="/groups"
                title="Groups"
                subtitle="Interest communities"
                icon={<Users className="h-5 w-5" />}
                accent="purple"
                tooltip="Browse and participate in member-led groups and special interest guilds."
              />
              <FeatureTile
                href="/topics"
                title="Topics & Threads"
                subtitle="Discussion boards"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="slate"
                tooltip="Participate in threaded discussions, open debates, and local topic threads."
              />
              <FeatureTile
                href="/bulletin-boards"
                title="Bulletins"
                subtitle="Community corkboard"
                icon={<ScrollText className="h-5 w-5" />}
                accent="slate"
                tooltip="Local community bulletin board for announcements, classifieds, and flyers."
              />
              <FeatureTile
                href="/burner"
                title="Ephemeral QR Burner"
                subtitle="Fast disposable share"
                icon={<Lock className="h-5 w-5" />}
                accent="red"
                tooltip="Generate instant QR codes for disposable ephemeral sharing that expires on read."
              />
              <FeatureTile
                href="/burner-links"
                title="Burner Links Hub"
                subtitle="Temporary links ledger"
                icon={<Flame className="h-5 w-5" />}
                accent="red"
                tooltip="Manage, monitor, and revoke your active self-destructing burner links."
              />
              <FeatureTile
                href="/notifications"
                title="Notifications"
                subtitle="Alerts & updates"
                icon={<Bell className="h-5 w-5" />}
                accent="red"
                tooltip="Real-time feed of match requests, message pings, and platform notifications."
              />
              <FeatureTile
                href="/activity"
                title="Activity Stream"
                subtitle="Recent interactions"
                icon={<Rocket className="h-5 w-5" />}
                accent="blue"
                tooltip="Comprehensive timeline of your recent unlocks, logins, reactions, and check-ins."
              />
            </div>

            {/* Local Pulse, Outings & Meetups */}
            <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Local Pulse, Outings & Meetups" />
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <FeatureTile
                href="/local-pulse"
                title="Local Pulse"
                subtitle="Real-time area vibes"
                icon={<MapPin className="h-5 w-5" />}
                accent="green"
                tooltip="Real-time geographic pulse with active check-ins, vibe ratings, and crowd density."
              />
              <FeatureTile
                href="/places"
                title="Places Directory"
                subtitle="Venues & hangouts"
                icon={<MapPin className="h-5 w-5" />}
                accent="green"
                tooltip="Curated catalog of local date-ready spots, bars, cafes, and scenic viewpoints."
              />
              <FeatureTile
                href="/plans"
                title="Plans & Dates Hub"
                subtitle="Organize outings"
                icon={<Calendar className="h-5 w-5" />}
                accent="purple"
                tooltip="Centralized planner combining events, date invites, nearby suggestions, and bookings."
              />
              <FeatureTile
                href="/events"
                title="Events & Meetups"
                subtitle="Local gatherings"
                icon={<Calendar className="h-5 w-5" />}
                accent="purple"
                tooltip="Browse upcoming community meetups, social mixers, parties, and speed-dating events."
              />
              <FeatureTile
                href="/venues"
                title="Venues"
                subtitle="Bars, cafes & spots"
                icon={<Store className="h-5 w-5" />}
                accent="green"
                tooltip="Partner venues offering verified vibes, perks, and check-in rewards for members."
              />
              <FeatureTile
                href="/deals"
                title="Deals & Offers"
                subtitle="Local merchant discounts"
                icon={<Store className="h-5 w-5" />}
                accent="orange"
                tooltip="Exclusive local venue discounts and 2-for-1 specials for FWBer date planners."
              />
              <FeatureTile
                href="/date-planner"
                title="Date Planner"
                subtitle="Curated itineraries"
                icon={<Calendar className="h-5 w-5" />}
                accent="pink"
                tooltip="Plan step-by-step romantic or casual itineraries with venue suggestions and timing."
              />
              <FeatureTile
                href="/nearby"
                title="Nearby Radar"
                subtitle="People around you"
                icon={<MapPin className="h-5 w-5" />}
                accent="green"
                tooltip="View nearby opted-in users within your chosen radius with privacy geofencing."
              />
              <FeatureTile
                href="/date-ideas"
                title="Date Ideas"
                subtitle="Outing inspiration"
                icon={<Lightbulb className="h-5 w-5" />}
                accent="amber"
                tooltip="Creative conversation starters and unconventional date ideas tested by the community."
              />
              <FeatureTile
                href="/proximity"
                title="Proximity Alerts"
                subtitle="Close encounter alerts"
                icon={<Radio className="h-5 w-5" />}
                accent="green"
                tooltip="Configurable alerts when compatible matches or mutual friends enter your vicinity."
              />
              <FeatureTile
                href="/proximity-chatrooms"
                title="Proximity Chatrooms"
                subtitle="Geo-fenced local chat"
                icon={<MapPin className="h-5 w-5" />}
                accent="green"
                tooltip="Chatrooms unlocked only when you are physically within range of a specific neighborhood."
              />
              <FeatureTile
                href="/pulse"
                title="Activity Heatmap"
                subtitle="City-wide activity feed"
                icon={<Activity className="h-5 w-5" />}
                accent="red"
                tooltip="Interactive spatial heatmap highlighting active social hubs and real-time foot traffic."
              />
              <FeatureTile
                href="/conference-pulse"
                title="Conference Mode"
                subtitle="Convention channels"
                icon={<Radio className="h-5 w-5" />}
                accent="blue"
                tooltip="Dedicated event and summit channels designed for networking at high-density conferences."
              />
            </div>

            {/* AI Wingman Studio & Coaching */}
            <SectionHeader icon={<Sparkles className="h-4 w-4" />} title="AI Wingman Studio & Coaching" />
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <FeatureTile
                href="/wingman"
                title="Wingman Command Hub"
                subtitle="All AI coaching tools"
                icon={<Sparkles className="h-5 w-5" />}
                accent="purple"
                tooltip="Central suite of AI-driven wingman tools, personality analyzers, and conversation aids."
              />
              <FeatureTile
                href="/studio"
                title="Creative Studio"
                subtitle="Bio & profile builder"
                icon={<Wand2 className="h-5 w-5" />}
                accent="purple"
                tooltip="Generate punchy bios, engaging photo captions, and personalized opening hooks."
              />
              <FeatureTile
                href="/content-generation"
                title="Content Generation"
                subtitle="AI writing assistant"
                icon={<Wand2 className="h-5 w-5" />}
                accent="purple"
                tooltip="AI assistant for crafting ice breakers, profile introductions, and responses."
              />
              <FeatureTile
                href="/wingman/vibe-check"
                title="Vibe Check"
                subtitle="Tone & sentiment scan"
                icon={<Activity className="h-5 w-5" />}
                accent="blue"
                tooltip="Analyze the tone, romantic warmth, and underlying sentiment of any conversation draft."
              />
              <FeatureTile
                href="/wingman/vibe"
                title="Room Vibe Radar"
                subtitle="Read the room"
                icon={<Sparkles className="h-5 w-5" />}
                accent="blue"
                tooltip="Instant room vibe and tone analysis to calibrate your next response."
              />
              <FeatureTile
                href="/wingman/compatibility"
                title="Compatibility Deep Dive"
                subtitle="Algorithmic match audit"
                icon={<Star className="h-5 w-5" />}
                accent="purple"
                tooltip="In-depth multi-dimensional compatibility assessment comparing values, humor, and lifestyle."
              />
              <FeatureTile
                href="/wingman/ice-breaker"
                title="Ice-Breakers"
                subtitle="Contextual openers"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="pink"
                tooltip="Generate witty, tailored conversation starters based on match bios and shared interests."
              />
              <FeatureTile
                href="/wingman/draft-analysis"
                title="Draft Analyzer"
                subtitle="Pre-flight message critique"
                icon={<ScrollText className="h-5 w-5" />}
                accent="slate"
                tooltip="Constructive pre-flight critique of message drafts before hitting send."
              />
              <FeatureTile
                href="/wingman/date-ideas"
                title="AI Date Architect"
                subtitle="Tailored date ideas"
                icon={<Calendar className="h-5 w-5" />}
                accent="purple"
                tooltip="AI-generated date concepts combining both match preferences, schedules, and local spots."
              />
              <FeatureTile
                href="/wingman/roast"
                title="Profile Roast"
                subtitle="Constructive critique"
                icon={<Flame className="h-5 w-5" />}
                accent="pink"
                tooltip="Lighthearted, constructive profile critique pointing out clichés and photo red flags."
              />
              <FeatureTile
                href="/roast"
                title="Community Roast"
                subtitle="Public profile roasts"
                icon={<Flame className="h-5 w-5" />}
                accent="red"
                tooltip="Community-rated profile roasts and witty constructive feedback."
              />
              <FeatureTile
                href="/wingman/nemesis"
                title="Nemesis Mode"
                subtitle="Brutal honesty"
                icon={<Flame className="h-5 w-5" />}
                accent="red"
                tooltip="No-holds-barred brutal feedback on dating strategy, profile choices, and conversation habits."
              />
              <FeatureTile
                href="/wingman/cosmic"
                title="Cosmic Alignment"
                subtitle="Astrological chemistry"
                icon={<Star className="h-5 w-5" />}
                accent="amber"
                tooltip="Astrological and cosmic synastry breakdown blending chart data with dating psychology."
              />
              <FeatureTile
                href="/wingman/fortune"
                title="Love Fortune"
                subtitle="Playful predictions"
                icon={<Sparkles className="h-5 w-5" />}
                accent="amber"
                tooltip="Playful algorithmic fortunes and dating predictions for your upcoming week."
              />
              <FeatureTile
                href="/roast-date"
                title="Roast Date"
                subtitle="Post-date debrief"
                icon={<Flame className="h-5 w-5" />}
                accent="orange"
                tooltip="Hilarious post-date debrief tool to catalog awkward moments and laugh off bad dates."
              />
              <FeatureTile
                href="/journal"
                title="Journals"
                subtitle="Private notes"
                icon={<ScrollText className="h-5 w-5" />}
                accent="slate"
                tooltip="Private dating journal to log thoughts, memorable date details, and personal growth."
              />
              <FeatureTile
                href="/ice-breakers"
                title="Openers Library"
                subtitle="Community opener bank"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="blue"
                tooltip="Searchable repository of high-performing ice breakers submitted and upvoted by users."
              />
            </div>

            {/* Economy, Tokens & Premium Perks */}
            <SectionHeader icon={<Wallet className="h-4 w-4" />} title="Economy, Tokens & Premium Perks" />
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <FeatureTile
                href="/wallet"
                title="Token Wallet"
                subtitle="FWB token balance"
                icon={<Wallet className="h-5 w-5" />}
                accent="green"
                tooltip="Manage your native FWB token balance, transactions, wallet address, and on-chain claims."
              />
              <FeatureTile
                href="/economy"
                title="Economy Hub"
                subtitle="Platform economics"
                icon={<Wallet className="h-5 w-5" />}
                accent="green"
                tooltip="Overview of platform economic mechanisms, token mints, rewards, and staking tiers."
              />
              <FeatureTile
                href="/premium"
                title="Premium Membership"
                subtitle="Upgrade your tier"
                icon={<Crown className="h-5 w-5" />}
                accent="amber"
                tooltip="Unlock unlimited swipes, incognito browsing, advanced filters, and priority boosts."
              />
              <FeatureTile
                href="/subscription"
                title="Subscription Plans"
                subtitle="Membership tiers"
                icon={<Crown className="h-5 w-5" />}
                accent="amber"
                tooltip="Review membership tiers, recurring billing options, and benefits."
              />
              <FeatureTile
                href="/tier-demo"
                title="Tier Capabilities"
                subtitle="Relationship tier demo"
                icon={<Crown className="h-5 w-5" />}
                accent="purple"
                tooltip="Interactive demonstration of progressive relationship tiers and photo reveal gates."
              />
              <FeatureTile
                href="/boosts"
                title="Visibility Boosts"
                subtitle="Top profile spotlight"
                icon={<Rocket className="h-5 w-5" />}
                accent="orange"
                tooltip="Spotlight your profile at the top of local feeds to increase view rates up to 10x."
              />
              <FeatureTile
                href="/gifts"
                title="Virtual Gifts"
                subtitle="Send tokens & flowers"
                icon={<Gift className="h-5 w-5" />}
                accent="pink"
                tooltip="Browse tokenized virtual gifts, digital drinks, and roses to send to your matches."
              />
              <FeatureTile
                href="/gifts/send"
                title="Send a Gift"
                subtitle="Direct match gifting"
                icon={<Gift className="h-5 w-5" />}
                accent="pink"
                tooltip="Send an immediate surprise gift or token tip directly to an open conversation."
              />
              <FeatureTile
                href="/gifts/history"
                title="Gift History"
                subtitle="Received & sent gifts"
                icon={<Clock className="h-5 w-5" />}
                accent="slate"
                tooltip="Track history of all virtual gifts received, redeemed, or sent to date."
              />
              <FeatureTile
                href="/referrals"
                title="Refer & Earn"
                subtitle="Invite friends for tokens"
                icon={<Share2 className="h-5 w-5" />}
                accent="green"
                tooltip="Share your unique referral link to earn token bounties and premium upgrade credits."
              />
              <FeatureTile
                href="/bounties"
                title="Community Bounties"
                subtitle="Earn tokens helping out"
                icon={<Rocket className="h-5 w-5" />}
                accent="purple"
                tooltip="Complete neighborhood verification and matchmaking bounties to earn token payouts."
              />
              <FeatureTile
                href="/unlocks"
                title="Feature Unlocks"
                subtitle="Active privileges"
                icon={<Lock className="h-5 w-5" />}
                accent="yellow"
                tooltip="View your active paid and earned perks, unblurred photos, and special permissions."
              />
              <FeatureTile
                href="/premium/unlocks"
                title="Unlock Ledger"
                subtitle="Audit past unlocks"
                icon={<Lock className="h-5 w-5" />}
                accent="yellow"
                tooltip="Full permanent audit ledger of all content and features you have unlocked."
              />
              <FeatureTile
                href="/leaderboard"
                title="Leaderboard"
                subtitle="Top community ranking"
                icon={<Award className="h-5 w-5" />}
                accent="amber"
                tooltip="Community rankings for token earnings, daily streaks, and verified reputation."
              />
            </div>

            {/* Profile, Identity & Reputation */}
            <SectionHeader icon={<Users className="h-4 w-4" />} title="Profile, Identity & Reputation" />
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <FeatureTile
                href="/profile"
                title="My Public Profile"
                subtitle="Preview your page"
                icon={<User className="h-5 w-5" />}
                accent="blue"
                tooltip="View exactly how your public card, photos, bio, and vibe badges look to others."
              />
              <FeatureTile
                href="/profile/edit"
                title="Edit Profile"
                subtitle="Update information"
                icon={<User className="h-5 w-5" />}
                accent="blue"
                tooltip="Edit your bio, occupation, passions, lifestyle tags, and orientation settings."
              />
              <FeatureTile
                href="/photos"
                title="Photo Gallery"
                subtitle="Manage profile photos"
                icon={<Users className="h-5 w-5" />}
                accent="blue"
                tooltip="Upload, reorder, crop, and set visibility gates on your primary profile photos."
              />
              <FeatureTile
                href="/photos/reveals"
                title="Photo Reveals"
                subtitle="Progressive reveal logs"
                icon={<Eye className="h-5 w-5" />}
                accent="pink"
                tooltip="Monitor mutual tier-gated photo reveals unlocked with your active matches."
              />
              <FeatureTile
                href="/profile-views"
                title="Profile Views"
                subtitle="Who checked you out"
                icon={<Eye className="h-5 w-5" />}
                accent="green"
                tooltip="See real-time notifications and lists of visitors who viewed your profile."
              />
              <FeatureTile
                href="/identity"
                title="Identity Hub"
                subtitle="Zero-Knowledge proofs"
                icon={<Shield className="h-5 w-5" />}
                accent="blue"
                tooltip="Manage cryptographic Zero-Knowledge identity credentials, passports, and age checks."
              />
              <FeatureTile
                href="/verify"
                title="Verification Portal"
                subtitle="Trust & authenticity"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="green"
                tooltip="Complete photo, identity, and social verification to earn trusted verification badges."
              />
              <FeatureTile
                href="/reputation"
                title="Reputation & Trust"
                subtitle="Trust score & vouches"
                icon={<Award className="h-5 w-5" />}
                accent="amber"
                tooltip="Inspect your trust score, community standing, positive reviews, and vouch badges."
              />
              <FeatureTile
                href="/vouch"
                title="Vouch for Friends"
                subtitle="Endorse mutual contacts"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="green"
                tooltip="Submit cryptographic trust endorsements for friends to boost their verification level."
              />
              <FeatureTile
                href="/settings/physical-profile"
                title="Physical Profile"
                subtitle="Height, lifestyle & stats"
                icon={<User className="h-5 w-5" />}
                accent="green"
                tooltip="Configure optional physical attributes, gym habits, sleep schedule, and height."
              />
              <FeatureTile
                href="/scrapbook"
                title="Scrapbook"
                subtitle="Saved memories"
                icon={<Star className="h-5 w-5" />}
                accent="pink"
                tooltip="Save favorite match moments, date milestones, and memorable photos to your private book."
              />
              <FeatureTile
                href="/achievements"
                title="Achievements"
                subtitle="Badges & rewards"
                icon={<Trophy className="h-5 w-5" />}
                accent="amber"
                tooltip="Earn collectible gamification badges, streak milestones, and token rewards."
              />
              <FeatureTile
                href="/analytics"
                title="Personal Analytics"
                subtitle="Profile performance"
                icon={<BarChart3 className="h-5 w-5" />}
                accent="blue"
                tooltip="Engagement charts, response timing, profile impressions, and swipe statistics."
              />
            </div>

            {/* Safety, Privacy & Account Governance */}
            <SectionHeader icon={<Shield className="h-4 w-4" />} title="Safety, Privacy & Account Governance" />
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <FeatureTile
                href="/safety"
                title="Safety Center"
                subtitle="Emergency & safe walk"
                icon={<Shield className="h-5 w-5" />}
                accent="red"
                tooltip="Access panic assistance, trusted contact check-ins, and safety guidelines for meetups."
              />
              <FeatureTile
                href="/settings"
                title="All Settings"
                subtitle="Platform configuration"
                icon={<Settings className="h-5 w-5" />}
                accent="slate"
                tooltip="Comprehensive settings dashboard covering all account, device, and network options."
              />
              <FeatureTile
                href="/settings/account"
                title="Account Settings"
                subtitle="Email, handle & login"
                icon={<User className="h-5 w-5" />}
                accent="blue"
                tooltip="Update primary email address, registered handle, password, or request data export."
              />
              <FeatureTile
                href="/settings/privacy"
                title="Privacy Controls"
                subtitle="Stealth & visibility"
                icon={<Lock className="h-5 w-5" />}
                accent="red"
                tooltip="Toggle incognito mode, location blurring, search indexing, and online presence."
              />
              <FeatureTile
                href="/settings/notifications"
                title="Notification Prefs"
                subtitle="Alerts & quiet hours"
                icon={<Bell className="h-5 w-5" />}
                accent="slate"
                tooltip="Control push notifications, email summaries, sound effects, and quiet hours."
              />
              <FeatureTile
                href="/settings/security"
                title="Security Hub"
                subtitle="Sessions & credentials"
                icon={<Shield className="h-5 w-5" />}
                accent="red"
                tooltip="Review active device sessions, security log events, and update authorization keys."
              />
              <FeatureTile
                href="/settings/two-factor"
                title="Two-Factor Auth"
                subtitle="TOTP authenticator app"
                icon={<Lock className="h-5 w-5" />}
                accent="blue"
                tooltip="Set up TOTP authenticator app codes and download backup recovery codes."
              />
              <FeatureTile
                href="/settings/vault"
                title="Encrypted Vault"
                subtitle="Zero-Knowledge storage"
                icon={<Lock className="h-5 w-5" />}
                accent="slate"
                tooltip="Private client-side encrypted vault for sensitive notes, passwords, and photos."
              />
              <FeatureTile
                href="/settings/verification"
                title="Identity Verification"
                subtitle="Verify credentials"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="green"
                tooltip="Complete identity verification flows and verify documents."
              />
              <FeatureTile
                href="/settings/identity"
                title="Identity & Handles"
                subtitle="Handles & aliases"
                icon={<User className="h-5 w-5" />}
                accent="blue"
                tooltip="Manage linked identities, social handles, and primary display alias."
              />
              <FeatureTile
                href="/settings/blocked"
                title="Blocked Users"
                subtitle="Blacklist management"
                icon={<Shield className="h-5 w-5" />}
                accent="red"
                tooltip="Manage your blocked user list and adjust harassment defense filters."
              />
              <FeatureTile
                href="/settings/travel"
                title="Travel Mode"
                subtitle="Set destination city"
                icon={<Plane className="h-5 w-5" />}
                accent="blue"
                tooltip="Change your virtual location ahead of trips to match and meet people before arriving."
              />
              <FeatureTile
                href="/location-settings"
                title="Location Precision"
                subtitle="GPS radius & fuzzing"
                icon={<MapPin className="h-5 w-5" />}
                accent="green"
                tooltip="Adjust GPS precision, randomize exact coordinates, and configure background pinging."
              />
              <FeatureTile
                href="/settings/hardware"
                title="Hardware BLE Token"
                subtitle="Wearable safety key"
                icon={<Radio className="h-5 w-5" />}
                accent="slate"
                tooltip="Pair a Bluetooth LE physical safety beacon or distress bracelet to your account."
              />
              <FeatureTile
                href="/settings/subscription"
                title="Subscription Billing"
                subtitle="Invoices & membership"
                icon={<Crown className="h-5 w-5" />}
                accent="amber"
                tooltip="View billing history, invoices, renew or cancel your premium subscription tier."
              />
              <FeatureTile
                href="/reports"
                title="Safety Reports"
                subtitle="Submitted incident status"
                icon={<FileWarning className="h-5 w-5" />}
                accent="red"
                tooltip="Track real-time resolution status of incident and abuse reports you submitted."
              />
              <FeatureTile
                href="/support"
                title="Support & Policies"
                subtitle="Help center & legal"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="blue"
                tooltip="Central support hub containing tutorials, knowledgebase articles, and contact forms."
              />
              <FeatureTile
                href="/help"
                title="Help Center"
                subtitle="Guides & FAQs"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="slate"
                tooltip="Browse guides, knowledge base articles, and common questions."
              />
              <FeatureTile
                href="/privacy"
                title="Privacy Policy"
                subtitle="Data protection terms"
                icon={<Lock className="h-5 w-5" />}
                accent="red"
                tooltip="Review our strict privacy policy and cryptographic data handling commitments."
              />
            </div>

            {/* Commerce & Merchant Portals */}
            <SectionHeader icon={<Store className="h-4 w-4" />} title="Commerce & Merchant Portals" />
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <FeatureTile
                href="/marketplace"
                title="Local Marketplace"
                subtitle="Browse products & perks"
                icon={<Store className="h-5 w-5" />}
                accent="orange"
                tooltip="Shop local offerings, date packages, flowers, venue tickets, and partner goods."
              />
              <FeatureTile
                href="/commerce"
                title="Commerce Hub"
                subtitle="Business operations overview"
                icon={<Store className="h-5 w-5" />}
                accent="orange"
                tooltip="Master commerce dashboard aggregating merchant tools, storefronts, and sales."
              />
              <FeatureTile
                href="/merchant/dashboard"
                title="Merchant Dashboard"
                subtitle="Storefront administration"
                icon={<Store className="h-5 w-5" />}
                accent="orange"
                tooltip="Manage store profile, track redemptions, update hours, and manage staff access."
              />
              <FeatureTile
                href="/merchant/register"
                title="Register as Merchant"
                subtitle="Onboard your business"
                icon={<Store className="h-5 w-5" />}
                accent="orange"
                tooltip="Apply for verified merchant status to list promotional deals and accept FWB tokens."
              />
              <FeatureTile
                href="/merchant/inventory"
                title="Inventory Management"
                subtitle="Stock & menu items"
                icon={<Store className="h-5 w-5" />}
                accent="orange"
                tooltip="Update item catalog, pricing in tokens and fiat, and adjust live product availability."
              />
              <FeatureTile
                href="/merchant/promotions"
                title="Promotions & Specials"
                subtitle="Launch campaigns"
                icon={<TrendingUp className="h-5 w-5" />}
                accent="amber"
                tooltip="Create and schedule discount campaigns and happy hour promotions for singles."
              />
              <FeatureTile
                href="/merchant/loyalty"
                title="Loyalty Program"
                subtitle="Punchcards & customer perks"
                icon={<Gift className="h-5 w-5" />}
                accent="pink"
                tooltip="Configure automated digital stamp cards and repeat reward tiers for patrons."
              />
              <FeatureTile
                href="/merchant/vibe"
                title="Merchant Vibe Intel"
                subtitle="Area crowd analytics"
                icon={<Radio className="h-5 w-5" />}
                accent="green"
                tooltip="View neighborhood foot traffic trends, peak dating hours, and crowd sentiment."
              />
              <FeatureTile
                href="/merchant/profile"
                title="Storefront Profile"
                subtitle="Customer-facing branding"
                icon={<Store className="h-5 w-5" />}
                accent="orange"
                tooltip="Customize your public business bio, photos, venue atmosphere, and website link."
              />
              <FeatureTile
                href="/merchant/analytics"
                title="Merchant Analytics"
                subtitle="Revenue & redemption stats"
                icon={<BarChart3 className="h-5 w-5" />}
                accent="blue"
                tooltip="Track weekly revenue, FWB token settlement, and coupon redemption trends."
              />
              <FeatureTile
                href="/venue/dashboard"
                title="Venue Host Portal"
                subtitle="Live event hosting"
                icon={<Store className="h-5 w-5" />}
                accent="purple"
                tooltip="Dedicated operations portal for bars, lounges, and spaces hosting FWBer meetups."
              />
            </div>

            {/* Community Governance & Federation */}
            <SectionHeader icon={<Globe className="h-4 w-4" />} title="Community Governance & Federation" />
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <FeatureTile
                href="/council"
                title="Community Council"
                subtitle="Decentralized governance"
                icon={<Gavel className="h-5 w-5" />}
                accent="amber"
                tooltip="Vote on community proposals, feature prioritization, and platform governance changes."
              />
              <FeatureTile
                href="/council/appeals"
                title="Dispute Appeals"
                subtitle="Peer moderation review"
                icon={<Gavel className="h-5 w-5" />}
                accent="amber"
                tooltip="Submit moderation appeals and participate as a juror in peer-reviewed dispute claims."
              />
              <FeatureTile
                href="/federation"
                title="ActivityPub Federation"
                subtitle="Fediverse connectivity"
                icon={<Globe className="h-5 w-5" />}
                accent="blue"
                tooltip="Connect and cross-interact with Mastodon and ActivityPub instances across the Fediverse."
              />
              <FeatureTile
                href="/settings/federation"
                title="Federation Settings"
                subtitle="Instance handles & relays"
                icon={<Globe className="h-5 w-5" />}
                accent="blue"
                tooltip="Configure federated actors, relay addresses, signature keys, and outbox visibility."
              />
              <FeatureTile
                href="/integrations"
                title="Third-Party Integrations"
                subtitle="Connect external apps"
                icon={<Plug className="h-5 w-5" />}
                accent="purple"
                tooltip="Link Spotify, Instagram, calendars, and OAuth providers to your FWBer profile."
              />
              <FeatureTile
                href="/integrations/contacts"
                title="Synced Contacts"
                subtitle="Address book sync"
                icon={<Users className="h-5 w-5" />}
                accent="green"
                tooltip="Sync contacts securely with client-side hashing to find friends and prevent awkward overlaps."
              />
              <FeatureTile
                href="/journal"
                title="Private Journal"
                subtitle="Reflections & notes"
                icon={<ScrollText className="h-5 w-5" />}
                accent="green"
                tooltip="Write private journal reflections about dates and personal growth, encrypted for your eyes only."
              />
              <FeatureTile
                href="/video"
                title="Video Calling"
                subtitle="Encrypted WebRTC calls"
                icon={<Phone className="h-5 w-5" />}
                accent="blue"
                tooltip="High-definition encrypted one-on-one video dates and call history directly in the browser."
              />
              <FeatureTile
                href="/share-unlock"
                title="Share to Unlock"
                subtitle="Viral rewards"
                icon={<Share2 className="h-5 w-5" />}
                accent="purple"
                tooltip="Unlock premium features and badges by sharing anonymous links with external friends."
              />
              <FeatureTile
                href="/feedback"
                title="Submit Feedback"
                subtitle="Direct developer channel"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="slate"
                tooltip="Send bugs, suggestions, and feature requests directly to the core engineering team."
              />
              <FeatureTile
                href="/contact"
                title="Contact Support"
                subtitle="Reach our operators"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="slate"
                tooltip="Direct support ticket channel for account recovery, billing, and operator assistance."
              />
              <FeatureTile
                href="/terms"
                title="Terms & Policies"
                subtitle="Platform legal agreements"
                icon={<ScrollText className="h-5 w-5" />}
                accent="slate"
                tooltip="Read our complete Terms of Service, Community Standards, and safety guidelines."
              />
            </div>

            {/* Operations & System Administration */}
            {(user as any)?.is_moderator && (
              <>
                <SectionHeader icon={<Rocket className="h-4 w-4" />} title="Operations & System Administration" />
                <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  <FeatureTile
                    href="/operations"
                    title="Operations Command Hub"
                    subtitle="Platform operations"
                    icon={<Rocket className="h-5 w-5" />}
                    accent="purple"
                    tooltip="Unified operational command center providing real-time platform metrics and node status."
                  />
                  <FeatureTile
                    href="/admin/dashboard"
                    title="Admin Dashboard"
                    subtitle="System health & users"
                    icon={<BarChart3 className="h-5 w-5" />}
                    accent="red"
                    tooltip="Administrative control center for user bans, dispute resolution, and system status."
                  />
                  <FeatureTile
                    href="/admin/monitoring"
                    title="Autonomous Monitor"
                    subtitle="Real-time health telemetry"
                    icon={<Rocket className="h-5 w-5" />}
                    accent="purple"
                    tooltip="Telemetry graphs displaying CPU load, memory utilization, WebSocket pings, and latency."
                  />
                  <FeatureTile
                    href="/moderation"
                    title="Moderation Queue"
                    subtitle="Content & report review"
                    icon={<Gavel className="h-5 w-5" />}
                    accent="red"
                    tooltip="Review flagged photos, abusive messages, and user reports with AI assist recommendations."
                  />
                  <FeatureTile
                    href="/admin/federation"
                    title="Federation Admin"
                    subtitle="Peers & domain controls"
                    icon={<Globe className="h-5 w-5" />}
                    accent="purple"
                    tooltip="Manage federated peer relays, domain defederation blocks, and activity queues."
                  />
                  <FeatureTile
                    href="/admin/system"
                    title="System Diagnostics"
                    subtitle="Worker jobs & caches"
                    icon={<Settings className="h-5 w-5" />}
                    accent="red"
                    tooltip="Inspect background BullMQ jobs, clear Redis caches, and run automated health checks."
                  />
                  <FeatureTile
                    href="/admin/settings"
                    title="System Configuration"
                    subtitle="Platform environment flags"
                    icon={<Settings className="h-5 w-5" />}
                    accent="red"
                    tooltip="Adjust live global platform toggles, rate limits, onboarding flags, and Stripe keys."
                  />
                  <FeatureTile
                    href="/admin/feedback"
                    title="User Feedback Triage"
                    subtitle="Inbound user tickets"
                    icon={<MessageSquare className="h-5 w-5" />}
                    accent="red"
                    tooltip="Triage, respond to, and categorize inbound user feedback and bug submissions."
                  />
                </div>
              </>
            )}

          </div>
        </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  )
}

/* ────────────────────── Sub-Components ────────────────────── */

function MetricCard({
  icon,
  label,
  value,
  detail,
  accent,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  detail: string
  accent: string
  href: string
}) {
  const accents: Record<string, string> = {
    pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <Link href={href} prefetch={false} className="group block">
      <div className="rounded-xl border border-border bg-card p-5 transition-all hover:border-purple-300 hover:shadow-lg dark:border-border dark:bg-card dark:hover:border-purple-700">
        <div
          className={`h-10 w-10 rounded-lg ${
            accents[accent] || accents.purple
          } mb-3 flex items-center justify-center`}
        >
          {icon}
        </div>
        <div className="mb-1 text-2xl font-bold leading-none text-foreground dark:text-foreground">
          {value}
        </div>
        <div className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground dark:text-muted-foreground">{detail}</div>
      </div>
    </Link>
  )
}

function QuickAction({
  href,
  label,
  icon,
  accent,
}: {
  href: string
  label: string
  icon: React.ReactNode
  accent?: string
}) {
  const bg =
    accent === 'green'
      ? 'hover:bg-green-50 dark:hover:bg-green-900/20'
      : accent === 'amber'
        ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
        : accent === 'purple'
          ? 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
          : 'hover:bg-muted dark:hover:dark:bg-muted'

  return (
    <Link
      href={href}
      prefetch={false}
      className={`flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 transition-colors dark:border-border ${bg}`}
    >
      <div className="text-muted-foreground dark:text-muted-foreground">{icon}</div>
      <span className="text-center text-[11px] font-medium leading-tight text-foreground dark:text-muted-foreground">
        {label}
      </span>
    </Link>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="text-muted-foreground dark:text-muted-foreground">{icon}</div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
        {title}
      </h3>
    </div>
  )
}

function FeatureTile({
  href,
  title,
  subtitle,
  icon,
  accent,
  tooltip,
}: {
  href: string
  title: string
  subtitle: string
  icon: React.ReactNode
  accent: string
  tooltip?: string
}) {
  const accents: Record<string, { border: string; bg: string; iconBg: string }> = {
    pink: {
      border: 'border-pink-200 dark:border-pink-800',
      bg: 'bg-pink-50 dark:bg-pink-900/10',
      iconBg: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
    },
    blue: {
      border: 'border-blue-200 dark:border-blue-800',
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    },
    green: {
      border: 'border-green-200 dark:border-green-800',
      bg: 'bg-green-50 dark:bg-green-900/10',
      iconBg: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    },
    purple: {
      border: 'border-purple-200 dark:border-purple-800',
      bg: 'bg-purple-50 dark:bg-purple-900/10',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    },
    orange: {
      border: 'border-orange-200 dark:border-orange-800',
      bg: 'bg-orange-50 dark:bg-orange-900/10',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    },
    amber: {
      border: 'border-amber-200 dark:border-amber-800',
      bg: 'bg-amber-50 dark:bg-amber-900/10',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
    red: {
      border: 'border-red-200 dark:border-red-800',
      bg: 'bg-red-50 dark:bg-red-900/10',
      iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    },
    yellow: {
      border: 'border-yellow-200 dark:border-yellow-800',
      bg: 'bg-yellow-50 dark:bg-yellow-900/10',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    },
    slate: {
      border: 'border-slate-200 dark:border-slate-700',
      bg: 'bg-slate-50 dark:bg-slate-900/10',
      iconBg: 'bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400',
    },
  }

  const a = accents[accent] || accents.slate

  return (
    <Link href={href} prefetch={false} className="group block">
      <div
        className={`h-full rounded-xl border p-4 transition-all hover:shadow-md ${a.border} ${a.bg}`}
      >
        <div className={`mb-3 inline-flex rounded-lg p-2 ${a.iconBg}`}>{icon}</div>
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-sm font-semibold leading-tight text-foreground dark:text-foreground">
            {title}
          </h4>
          {(tooltip ?? subtitle) ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`More info about ${title}`}
                  className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-muted-foreground dark:hover:text-muted-foreground"
                  onClick={(e) => e.preventDefault()}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                {tooltip ?? subtitle}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground dark:text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  )
}
