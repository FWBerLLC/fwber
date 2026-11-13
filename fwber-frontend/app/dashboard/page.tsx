'use client'

import { useAuth } from '@/lib/auth-context'
import ProtectedRoute from '@/components/ProtectedRoute'
import { api } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useState } from 'react'
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
import { ConnectionStatusBadge } from '@/components/realtime/PresenceComponents'
import { Info, Globe, ScrollText, BarChart3, Trophy, FileWarning, Plug, Layers, LayoutGrid, X } from 'lucide-react'

interface DashboardFilterState {
  query: string
  showSubpages: boolean
  activeCategory: string
}

const DashboardFilterContext = createContext<DashboardFilterState>({
  query: '',
  showSubpages: false,
  activeCategory: 'all',
})

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
  token_balance?: number
  completion_percentage?: number
}

const ECOSYSTEM_CATEGORIES = [
  { id: 'all', label: 'All Hubs' },
  { id: 'discover', label: 'Discover' },
  { id: 'chat', label: 'Chat & Social' },
  { id: 'local', label: 'Local & Dates' },
  { id: 'wingman', label: 'AI Wingman' },
  { id: 'economy', label: 'Tokens & Perks' },
  { id: 'profile', label: 'Profile & Trust' },
  { id: 'safety', label: 'Safety & Settings' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'governance', label: 'Federation & Council' },
]

export default function DashboardPage() {
  const { user, token, isAuthenticated } = useAuth()
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false)
  const [ecosystemQuery, setEcosystemQuery] = useState('')
  const [showSubpages, setShowSubpages] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')

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
                  tooltip="Total mutual and pending matches. Click to review mutual likes and incoming requests."
                />
                <MetricCard
                  icon={<MessageSquare className="h-5 w-5" />}
                  label="Chats"
                  value={stats?.conversations || 0}
                  detail={`${stats?.response_rate || 0}% response`}
                  accent="blue"
                  href="/messages"
                  tooltip="Active 1-on-1 private conversations across accepted matches, accepted friends, and direct threads (excludes public chatrooms and blocked users)."
                />
                <MetricCard
                  icon={<Eye className="h-5 w-5" />}
                  label="Views"
                  value={stats?.profile_views || 0}
                  detail={`${stats?.today_views || 0} today`}
                  accent="green"
                  href="/profile-views"
                  tooltip="Members who visited your public profile card, including today's UTC visitor count."
                />
                <MetricCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Compatibility"
                  value={`${stats?.match_score_avg || 0}%`}
                  detail={(stats?.total_matches || 0) > 0 ? 'avg match score' : 'Answer questions to match'}
                  accent="purple"
                  href="/matching"
                  tooltip="Average algorithmic compatibility across your matches (0% until your first match is established)."
                />
                <MetricCard
                  icon={<Flame className="h-5 w-5" />}
                  label="Streak"
                  value={dailyStreak}
                  detail={dailyStreak > 0 ? 'days active' : 'Start today!'}
                  accent="orange"
                  href="/daily-checkin"
                  tooltip="Consecutive daily check-in streak — check in daily to earn bonus FWB tokens and badges."
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
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                      Quick Actions
                    </h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="About Quick Actions" className="text-muted-foreground hover:text-foreground">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Core daily workflows to boost match quality and reply rates</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    <QuickAction
                      href="/settings/matching"
                      label="Answer Questions"
                      icon={<Heart className="h-4 w-4" />}
                      tooltip="Complete compatibility questions to unlock high-accuracy match scores"
                    />
                    <QuickAction
                      href="/recommendations"
                      label="Discover"
                      icon={<Compass className="h-4 w-4" />}
                      tooltip="Browse nearby profiles matched to your preferences and scene tags"
                    />
                    <QuickAction
                      href="/messages"
                      label="Messages"
                      icon={<MessageSquare className="h-4 w-4" />}
                      tooltip="Open private real-time chats with mutual matches and accepted friends"
                    />
                    <QuickAction
                      href="/profile/edit"
                      label="Edit Profile"
                      icon={<User className="h-4 w-4" />}
                      accent="green"
                      tooltip="Update your bio, interests, lifestyle attributes, and privacy settings"
                    />
                    <QuickAction
                      href="/premium"
                      label="Go Premium"
                      icon={<Crown className="h-4 w-4" />}
                      accent="amber"
                      tooltip="View membership perks, unlimited likes, and Admirers visibility"
                    />
                    <QuickAction
                      href="/wingman"
                      label="AI Wingman"
                      icon={<Sparkles className="h-4 w-4" />}
                      accent="purple"
                      tooltip="Open the unified AI Coaching & Arcade Hub for bios, openers, and vibe checks"
                    />
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                <ProfileCompletenessWidget />

                {/* Streak & Account Card (Unified Live Socket Status) */}
                <div className="rounded-xl border border-border bg-card p-5 dark:border-border dark:bg-card">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground dark:text-foreground">
                        Account &amp; Live Status
                      </span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-xs text-muted-foreground dark:text-muted-foreground">
                          {stats?.days_active || 1}d member
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Days since your fwber account was created</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground dark:text-muted-foreground">Last active</span>
                      <span className="font-medium text-foreground dark:text-foreground">
                        {stats?.last_login
                          ? new Date(stats.last_login).toLocaleDateString()
                          : 'Today'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-muted-foreground dark:text-muted-foreground">
                        Realtime Socket
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label="Realtime socket info" className="text-muted-foreground hover:text-foreground">
                              <Info className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Live WebSocket presence &amp; instant messaging channel — unified with the header badge above.
                          </TooltipContent>
                        </Tooltip>
                      </span>
                      <ConnectionStatusBadge />
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <span className="text-muted-foreground dark:text-muted-foreground">FWB Balance</span>
                      <Link href="/wallet" prefetch={false} className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                        {stats?.token_balance ?? 0} FWB
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Who Liked You CTA */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/premium/who-likes-you" prefetch={false} className="block">
                      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 transition hover:shadow-md dark:border-amber-800 dark:from-amber-900/20 dark:to-orange-900/20">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                              Who Liked You
                            </span>
                          </div>
                          <Info className="h-3.5 w-3.5 text-amber-600/70 dark:text-amber-300/70" />
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          See members already interested in matching with you
                        </p>
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Reveal incoming likes immediately and match in a single tap</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* ── Feature Navigation (Consolidated Hubs + Search & Filter Controls) ── */}
            <DashboardFilterContext.Provider
              value={{ query: ecosystemQuery, showSubpages, activeCategory }}
            >
              <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">
                      Explore FWBer Ecosystem
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Grouped by workflow. Sub-tools already inside parent hubs are condensed by default—toggle <span className="font-medium text-foreground">All Sub-Tools</span> or search anytime.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="search"
                        value={ecosystemQuery}
                        onChange={(e) => setEcosystemQuery(e.target.value)}
                        placeholder="Filter hubs or sub-tools..."
                        aria-label="Filter ecosystem features"
                        className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {ecosystemQuery && (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => setEcosystemQuery('')}
                          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setShowSubpages((prev) => !prev)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                            showSubpages
                              ? 'border-purple-500 bg-purple-600 text-white'
                              : 'border-border bg-background text-foreground hover:bg-muted'
                          }`}
                        >
                          {showSubpages ? (
                            <>
                              <LayoutGrid className="h-3.5 w-3.5" />
                              Showing All Sub-Tools
                            </>
                          ) : (
                            <>
                              <Layers className="h-3.5 w-3.5" />
                              Consolidated Hubs
                            </>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {showSubpages
                          ? 'Click to condense nested subpages back into their parent hubs for a cleaner dashboard.'
                          : 'Click to expand every nested sub-tool (Wingman games, Gift subpages, Settings tabs, Merchant tools) directly onto the grid.'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-border/60">
                  {[
                    ...ECOSYSTEM_CATEGORIES,
                    ...((user as any)?.is_moderator ? [{ id: 'admin', label: 'Admin & Ops' }] : []),
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        activeCategory === cat.id
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

            {/* Discover & Connect */}
            <SectionBlock category="discover" icon={<Heart className="h-4 w-4" />} title="Discover & Connect" description="Find compatible singles, browse nearby scenes, and manage mutual connections.">
              <FeatureTile
                href="/recommendations"
                title="Recommendations"
                subtitle="Browse nearby people"
                icon={<Compass className="h-5 w-5" />}
                accent="purple"
                tooltip="Browse personalized nearby recommendations matched by location and preferences."
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
                href="/matches"
                title="Matches"
                subtitle="Your mutual likes"
                icon={<Star className="h-5 w-5" />}
                accent="amber"
                tooltip="View your confirmed mutual matches and start conversations."
              />
              <FeatureTile
                href="/matching"
                title="Compatibility Hub"
                subtitle="Algorithmic match center"
                icon={<Heart className="h-5 w-5" />}
                accent="pink"
                tooltip="Explore deep compatibility scores, personality alignment, and curated match picks."
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
                href="/scenes"
                title="Scenes & Vibe Hub"
                subtitle="Community clusters"
                icon={<Compass className="h-5 w-5" />}
                accent="purple"
                tooltip="Unified discovery layer grouping local scenes, vibe recommendations, and subcultures."
              />
              <FeatureTile
                href="/connections"
                title="Connections Hub"
                subtitle="Social graph view"
                icon={<Users className="h-5 w-5" />}
                accent="blue"
                tooltip="Unified directory of friends, followers, mutual likes, and active social ties."
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
                href="/settings/matching"
                title="Matching Preferences"
                subtitle="95 personality questions"
                icon={<Heart className="h-5 w-5" />}
                accent="pink"
                isSubpage
                tooltip="Fine-tune compatibility answers, lifestyle criteria, and matching filters."
              />
              <FeatureTile
                href="/matches/dashboard"
                title="Match Analytics"
                subtitle="Compatibility insights"
                icon={<BarChart3 className="h-5 w-5" />}
                accent="blue"
                isSubpage
                tooltip="Detailed analytics, acceptance ratios, and trends across your matches."
              />
              <FeatureTile
                href="/groups/matching"
                title="Group Matching"
                subtitle="Match by interests"
                icon={<Users className="h-5 w-5" />}
                accent="purple"
                isSubpage
                tooltip="Discover groups and shared communities aligned with your personality profile."
              />
              <FeatureTile
                href="/matching/nfc"
                title="NFC Tap Exchange"
                subtitle="Tap to connect"
                icon={<Phone className="h-5 w-5" />}
                accent="green"
                isSubpage
                tooltip="Instantly exchange contact cards and profiles using near-field physical tap."
              />
            </SectionBlock>

            {/* Real-Time Chat & Social Spaces */}
            <SectionBlock category="chat" icon={<MessageSquare className="h-4 w-4" />} title="Real-Time Chat & Social Spaces" description="Private DMs, friends, video calls, live voice stages, and community discussion spaces.">
              <FeatureTile
                href="/messages"
                title="Messages"
                subtitle="Private direct chats"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="blue"
                tooltip="Encrypted direct messaging with matches and friends, rich media, and instant notifications."
              />
              <FeatureTile
                href="/friends"
                title="Friends List"
                subtitle="Your inner circle"
                icon={<UserPlus className="h-5 w-5" />}
                accent="green"
                tooltip="Search members, manage friend requests, vouch for friends, and message directly."
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
                href="/burner-links"
                title="Burner Links Hub"
                subtitle="Disposable share links"
                icon={<Flame className="h-5 w-5" />}
                accent="red"
                tooltip="Create, monitor, and revoke self-destructing burner links and QR shares."
              />
              <FeatureTile
                href="/burner"
                title="Fast QR Burner"
                subtitle="Quick ephemeral QR"
                icon={<Lock className="h-5 w-5" />}
                accent="red"
                isSubpage
                tooltip="Generate instant QR codes for disposable ephemeral sharing that expires on read."
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
                isSubpage
                tooltip="Comprehensive timeline of your recent unlocks, logins, reactions, and check-ins."
              />
            </SectionBlock>

            {/* Local Pulse, Outings & Meetups */}
            <SectionBlock category="local" icon={<MapPin className="h-4 w-4" />} title="Local Pulse, Outings & Meetups" description="Real-time neighborhood vibes, date venues, proximity radar, and event meetups.">
              <FeatureTile
                href="/local-pulse"
                title="Local Pulse"
                subtitle="Real-time area vibes"
                icon={<MapPin className="h-5 w-5" />}
                accent="green"
                tooltip="Real-time geographic pulse with active check-ins, vibe ratings, and crowd density."
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
                href="/places"
                title="Places Directory"
                subtitle="Venues & hangouts"
                icon={<MapPin className="h-5 w-5" />}
                accent="green"
                tooltip="Curated catalog of local date-ready spots, bars, cafes, and scenic viewpoints."
              />
              <FeatureTile
                href="/venues"
                title="Partner Venues"
                subtitle="Bars, cafes & perks"
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
                href="/nearby"
                title="Nearby Radar"
                subtitle="People around you"
                icon={<MapPin className="h-5 w-5" />}
                accent="green"
                tooltip="View nearby opted-in users within your chosen radius with privacy geofencing."
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
                href="/date-planner"
                title="Date Planner"
                subtitle="Curated itineraries"
                icon={<Calendar className="h-5 w-5" />}
                accent="pink"
                isSubpage
                tooltip="Plan step-by-step romantic or casual itineraries with venue suggestions and timing."
              />
              <FeatureTile
                href="/date-ideas"
                title="Date Ideas"
                subtitle="Outing inspiration"
                icon={<Lightbulb className="h-5 w-5" />}
                accent="amber"
                isSubpage
                tooltip="Creative conversation starters and unconventional date ideas tested by the community."
              />
              <FeatureTile
                href="/proximity"
                title="Proximity Alerts"
                subtitle="Close encounter alerts"
                icon={<Radio className="h-5 w-5" />}
                accent="green"
                isSubpage
                tooltip="Configurable alerts when compatible matches or mutual friends enter your vicinity."
              />
              <FeatureTile
                href="/pulse"
                title="Activity Heatmap"
                subtitle="City-wide activity feed"
                icon={<Activity className="h-5 w-5" />}
                accent="red"
                isSubpage
                tooltip="Interactive spatial heatmap highlighting active social hubs and real-time foot traffic."
              />
              <FeatureTile
                href="/conference-pulse"
                title="Conference Mode"
                subtitle="Convention channels"
                icon={<Radio className="h-5 w-5" />}
                accent="blue"
                isSubpage
                tooltip="Dedicated event and summit channels designed for networking at high-density conferences."
              />
            </SectionBlock>

            {/* AI Wingman Studio & Coaching */}
            <SectionBlock category="wingman" icon={<Sparkles className="h-4 w-4" />} title="AI Wingman Studio & Coaching" description="All 12 AI coaching & viral arcade tools are unified inside the Wingman Command Hub.">
              <FeatureTile
                href="/wingman"
                title="Wingman Command Hub"
                subtitle="All 12 AI coaching & arcade tools"
                icon={<Sparkles className="h-5 w-5" />}
                accent="purple"
                tooltip="Unified hub for bio building, ice-breakers, draft analysis, compatibility deep-dives, and viral arcade roasts."
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
                href="/ice-breakers"
                title="Openers Library"
                subtitle="Community opener bank"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="blue"
                tooltip="Searchable repository of high-performing ice breakers submitted and upvoted by users."
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
                href="/content-generation"
                title="Content Generation"
                subtitle="AI writing assistant"
                icon={<Wand2 className="h-5 w-5" />}
                accent="purple"
                isSubpage
                tooltip="AI assistant for crafting ice breakers, profile introductions, and responses."
              />
              <FeatureTile
                href="/wingman/vibe-check"
                title="Vibe Check"
                subtitle="Tone & sentiment scan"
                icon={<Activity className="h-5 w-5" />}
                accent="blue"
                isSubpage
                tooltip="Analyze the tone, romantic warmth, and underlying sentiment of any conversation draft."
              />
              <FeatureTile
                href="/wingman/vibe"
                title="Room Vibe Radar"
                subtitle="Read red & green flags"
                icon={<Sparkles className="h-5 w-5" />}
                accent="blue"
                isSubpage
                tooltip="Instant profile green/red flag and quirk analysis."
              />
              <FeatureTile
                href="/wingman/compatibility"
                title="Compatibility Deep Dive"
                subtitle="Algorithmic match audit"
                icon={<Star className="h-5 w-5" />}
                accent="purple"
                isSubpage
                tooltip="In-depth multi-dimensional compatibility assessment comparing values, humor, and lifestyle."
              />
              <FeatureTile
                href="/wingman/ice-breaker"
                title="AI Ice-Breakers"
                subtitle="Contextual openers"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="pink"
                isSubpage
                tooltip="Generate witty, tailored conversation starters based on match bios and shared interests."
              />
              <FeatureTile
                href="/wingman/draft-analysis"
                title="Draft Analyzer"
                subtitle="Pre-flight message critique"
                icon={<ScrollText className="h-5 w-5" />}
                accent="slate"
                isSubpage
                tooltip="Constructive pre-flight critique of message drafts before hitting send."
              />
              <FeatureTile
                href="/wingman/date-ideas"
                title="AI Date Architect"
                subtitle="Tailored date ideas"
                icon={<Calendar className="h-5 w-5" />}
                accent="purple"
                isSubpage
                tooltip="AI-generated date concepts combining both match preferences, schedules, and local spots."
              />
              <FeatureTile
                href="/wingman/roast"
                title="Profile Roast"
                subtitle="Constructive critique"
                icon={<Flame className="h-5 w-5" />}
                accent="pink"
                isSubpage
                tooltip="Lighthearted, constructive profile critique pointing out clichés and photo red flags."
              />
              <FeatureTile
                href="/wingman/nemesis"
                title="Nemesis Mode"
                subtitle="Brutal honesty"
                icon={<Flame className="h-5 w-5" />}
                accent="red"
                isSubpage
                tooltip="Identify the clashing persona statistically guaranteed to drive you crazy."
              />
              <FeatureTile
                href="/wingman/cosmic"
                title="Cosmic Alignment"
                subtitle="Astrological chemistry"
                icon={<Star className="h-5 w-5" />}
                accent="amber"
                isSubpage
                tooltip="Astrological and cosmic synastry breakdown blending chart data with dating psychology."
              />
              <FeatureTile
                href="/wingman/fortune"
                title="Love Fortune"
                subtitle="Playful predictions"
                icon={<Sparkles className="h-5 w-5" />}
                accent="amber"
                isSubpage
                tooltip="Playful algorithmic fortunes and dating predictions for your upcoming week."
              />
              <FeatureTile
                href="/roast-date"
                title="Roast Date"
                subtitle="Post-date debrief"
                icon={<Flame className="h-5 w-5" />}
                accent="orange"
                isSubpage
                tooltip="Hilarious post-date debrief tool to catalog awkward moments and laugh off bad dates."
              />
            </SectionBlock>

            {/* Economy, Tokens & Premium Perks */}
            <SectionBlock category="economy" icon={<Wallet className="h-4 w-4" />} title="Economy, Tokens & Premium Perks" description="FWB token wallet, Solana transfers, virtual gifts hub, visibility boosts, and rewards.">
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
                href="/gifts"
                title="Virtual Gifts Hub"
                subtitle="Send & track gifts"
                icon={<Gift className="h-5 w-5" />}
                accent="pink"
                tooltip="Unified Gift Shop with quick-pick recipient selector and received/sent gift history tabs."
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
                href="/boosts"
                title="Visibility Boosts"
                subtitle="Top profile spotlight"
                icon={<Rocket className="h-5 w-5" />}
                accent="orange"
                tooltip="Spotlight your profile at the top of local feeds to increase view rates up to 10x."
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
                href="/referrals"
                title="Refer & Earn"
                subtitle="Invite friends for tokens"
                icon={<Share2 className="h-5 w-5" />}
                accent="green"
                tooltip="Share your unique referral link to earn token bounties and premium upgrade credits."
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
                href="/bounties"
                title="Community Bounties"
                subtitle="Earn tokens helping out"
                icon={<Rocket className="h-5 w-5" />}
                accent="purple"
                tooltip="Complete neighborhood verification and matchmaking bounties to earn token payouts."
              />
              <FeatureTile
                href="/leaderboard"
                title="Leaderboard"
                subtitle="Top community ranking"
                icon={<Award className="h-5 w-5" />}
                accent="amber"
                tooltip="Community rankings for token earnings, daily streaks, and verified reputation."
              />
              <FeatureTile
                href="/subscription"
                title="Subscription Plans"
                subtitle="Membership tiers"
                icon={<Crown className="h-5 w-5" />}
                accent="amber"
                isSubpage
                tooltip="Review membership tiers, recurring billing options, and benefits."
              />
              <FeatureTile
                href="/tier-demo"
                title="Tier Capabilities"
                subtitle="Relationship tier demo"
                icon={<Crown className="h-5 w-5" />}
                accent="purple"
                isSubpage
                tooltip="Interactive demonstration of progressive relationship tiers and photo reveal gates."
              />
              <FeatureTile
                href="/gifts/send"
                title="Direct Send Gift"
                subtitle="Standalone gift sender"
                icon={<Gift className="h-5 w-5" />}
                accent="pink"
                isSubpage
                tooltip="Send an immediate surprise gift or token tip directly to a recipient."
              />
              <FeatureTile
                href="/gifts/history"
                title="Gift History Ledger"
                subtitle="Full gift audit view"
                icon={<Clock className="h-5 w-5" />}
                accent="slate"
                isSubpage
                tooltip="Standalone ledger of all virtual gifts received, redeemed, or sent to date."
              />
              <FeatureTile
                href="/premium/unlocks"
                title="Unlock Ledger"
                subtitle="Audit past unlocks"
                icon={<Lock className="h-5 w-5" />}
                accent="yellow"
                isSubpage
                tooltip="Full permanent audit ledger of all content and features you have unlocked."
              />
            </SectionBlock>

            {/* Profile, Identity & Reputation */}
            <SectionBlock category="profile" icon={<Users className="h-4 w-4" />} title="Profile, Identity & Reputation" description="Public card preview, progressive photo reveals, vouches, journal notes, and personal analytics.">
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
                isSubpage
                tooltip="Complete photo, identity, and social verification to earn trusted verification badges."
              />
              <FeatureTile
                href="/journal"
                title="Field Notes & Journal"
                subtitle="Private reflections"
                icon={<ScrollText className="h-5 w-5" />}
                accent="green"
                tooltip="Write private or circle-shared field notes and reflections on dates and personal growth."
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
              <FeatureTile
                href="/settings/physical-profile"
                title="Physical Profile"
                subtitle="Height, lifestyle & stats"
                icon={<User className="h-5 w-5" />}
                accent="green"
                isSubpage
                tooltip="Configure optional physical attributes, gym habits, sleep schedule, and height."
              />
            </SectionBlock>

            {/* Safety, Privacy & Account Governance */}
            <SectionBlock category="safety" icon={<Shield className="h-4 w-4" />} title="Safety, Privacy & Account Governance" description="Safety Center, E2EE Vault, BLE beacons, blocked users, settings, help manual, and support.">
              <FeatureTile
                href="/safety"
                title="Safety Center"
                subtitle="Safe Walk & blocked list"
                icon={<Shield className="h-5 w-5" />}
                accent="red"
                tooltip="Access panic assistance, trusted contact check-ins, blocked users management, and meetup safety guides."
              />
              <FeatureTile
                href="/settings"
                title="All Settings Hub"
                subtitle="Platform configuration"
                icon={<Settings className="h-5 w-5" />}
                accent="slate"
                tooltip="Central settings dashboard covering account, privacy, notifications, security, and devices."
              />
              <FeatureTile
                href="/settings/vault"
                title="Encrypted Vault"
                subtitle="Zero-Knowledge storage"
                icon={<Lock className="h-5 w-5" />}
                accent="slate"
                tooltip="Client-side AES-256-GCM encrypted vault for sensitive media and master recovery keys."
              />
              <FeatureTile
                href="/settings/blocked"
                title="Blocked Users"
                subtitle="Blacklist management"
                icon={<Shield className="h-5 w-5" />}
                accent="red"
                tooltip="Manage your blocked user list and review bidirectional message/match shields."
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
                href="/settings/travel"
                title="Travel Mode"
                subtitle="Set destination city"
                icon={<Plane className="h-5 w-5" />}
                accent="blue"
                tooltip="Change your virtual location ahead of trips to match and meet people before arriving."
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
                href="/help"
                title="User Manual & Help"
                subtitle="Guides & FAQs"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="slate"
                tooltip="Searchable user manual covering Privacy Tiers, Friends & Messaging, Solana Wallet, and AI Wingman."
              />
              <FeatureTile
                href="/contact"
                title="Contact Support"
                subtitle="Reach our operators"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="blue"
                tooltip="Direct support channels for account recovery, billing, and safety assistance."
              />
              <FeatureTile
                href="/feedback"
                title="Submit Feedback"
                subtitle="Direct developer channel"
                icon={<MessageSquare className="h-5 w-5" />}
                accent="slate"
                tooltip="Send bugs, suggestions, and feature requests directly to the engineering triage queue."
              />
              <FeatureTile
                href="/support"
                title="Support & Policies"
                subtitle="Legal & knowledgebase"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="slate"
                isSubpage
                tooltip="Support overview linking tutorials, policies, and escalation procedures."
              />
              <FeatureTile
                href="/privacy"
                title="Privacy Policy"
                subtitle="Data protection terms"
                icon={<Lock className="h-5 w-5" />}
                accent="red"
                isSubpage
                tooltip="Review our strict privacy policy and cryptographic data handling commitments."
              />
              <FeatureTile
                href="/terms"
                title="Terms & Policies"
                subtitle="Platform legal agreements"
                icon={<ScrollText className="h-5 w-5" />}
                accent="slate"
                isSubpage
                tooltip="Read our complete Terms of Service, Community Standards, and safety guidelines."
              />
              <FeatureTile
                href="/settings/account"
                title="Account Settings"
                subtitle="Email, handle & login"
                icon={<User className="h-5 w-5" />}
                accent="blue"
                isSubpage
                tooltip="Update primary email address, registered handle, password, or request data export."
              />
              <FeatureTile
                href="/settings/privacy"
                title="Privacy Controls"
                subtitle="Stealth & visibility"
                icon={<Lock className="h-5 w-5" />}
                accent="red"
                isSubpage
                tooltip="Toggle incognito mode, location blurring, search indexing, and online presence."
              />
              <FeatureTile
                href="/settings/notifications"
                title="Notification Prefs"
                subtitle="Alerts & quiet hours"
                icon={<Bell className="h-5 w-5" />}
                accent="slate"
                isSubpage
                tooltip="Control push notifications, email summaries, sound effects, and quiet hours."
              />
              <FeatureTile
                href="/settings/security"
                title="Security Hub"
                subtitle="Sessions & credentials"
                icon={<Shield className="h-5 w-5" />}
                accent="red"
                isSubpage
                tooltip="Review active device sessions, security log events, and update authorization keys."
              />
              <FeatureTile
                href="/settings/two-factor"
                title="Two-Factor Auth"
                subtitle="TOTP authenticator app"
                icon={<Lock className="h-5 w-5" />}
                accent="blue"
                isSubpage
                tooltip="Set up TOTP authenticator app codes and download backup recovery codes."
              />
              <FeatureTile
                href="/settings/verification"
                title="Identity Verification"
                subtitle="Verify credentials"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="green"
                isSubpage
                tooltip="Complete identity verification flows and verify documents."
              />
              <FeatureTile
                href="/settings/identity"
                title="Identity & Handles"
                subtitle="Handles & aliases"
                icon={<User className="h-5 w-5" />}
                accent="blue"
                isSubpage
                tooltip="Manage linked identities, social handles, and primary display alias."
              />
              <FeatureTile
                href="/location-settings"
                title="Location Precision"
                subtitle="GPS radius & fuzzing"
                icon={<MapPin className="h-5 w-5" />}
                accent="green"
                isSubpage
                tooltip="Adjust GPS precision, randomize exact coordinates, and configure background pinging."
              />
              <FeatureTile
                href="/settings/subscription"
                title="Subscription Billing"
                subtitle="Invoices & membership"
                icon={<Crown className="h-5 w-5" />}
                accent="amber"
                isSubpage
                tooltip="View billing history, invoices, renew or cancel your premium subscription tier."
              />
            </SectionBlock>

            {/* Commerce & Merchant Portals */}
            <SectionBlock category="commerce" icon={<Store className="h-4 w-4" />} title="Commerce & Merchant Portals" description="Local marketplace, partner venue hosting, and business storefront operations.">
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
                href="/venue/dashboard"
                title="Venue Host Portal"
                subtitle="Live event hosting"
                icon={<Store className="h-5 w-5" />}
                accent="purple"
                tooltip="Dedicated operations portal for bars, lounges, and spaces hosting FWBer meetups."
              />
              <FeatureTile
                href="/merchant/register"
                title="Register as Merchant"
                subtitle="Onboard your business"
                icon={<Store className="h-5 w-5" />}
                accent="orange"
                isSubpage
                tooltip="Apply for verified merchant status to list promotional deals and accept FWB tokens."
              />
              <FeatureTile
                href="/merchant/inventory"
                title="Inventory Management"
                subtitle="Stock & menu items"
                icon={<Store className="h-5 w-5" />}
                accent="orange"
                isSubpage
                tooltip="Update item catalog, pricing in tokens and fiat, and adjust live product availability."
              />
              <FeatureTile
                href="/merchant/promotions"
                title="Promotions & Specials"
                subtitle="Launch campaigns"
                icon={<TrendingUp className="h-5 w-5" />}
                accent="amber"
                isSubpage
                tooltip="Create and schedule discount campaigns and happy hour promotions for singles."
              />
              <FeatureTile
                href="/merchant/loyalty"
                title="Loyalty Program"
                subtitle="Punchcards & customer perks"
                icon={<Gift className="h-5 w-5" />}
                accent="pink"
                isSubpage
                tooltip="Configure automated digital stamp cards and repeat reward tiers for patrons."
              />
              <FeatureTile
                href="/merchant/vibe"
                title="Merchant Vibe Intel"
                subtitle="Area crowd analytics"
                icon={<Radio className="h-5 w-5" />}
                accent="green"
                isSubpage
                tooltip="View neighborhood foot traffic trends, peak dating hours, and crowd sentiment."
              />
              <FeatureTile
                href="/merchant/profile"
                title="Storefront Profile"
                subtitle="Customer-facing branding"
                icon={<Store className="h-5 w-5" />}
                accent="orange"
                isSubpage
                tooltip="Customize your public business bio, photos, venue atmosphere, and website link."
              />
              <FeatureTile
                href="/merchant/analytics"
                title="Merchant Analytics"
                subtitle="Revenue & redemption stats"
                icon={<BarChart3 className="h-5 w-5" />}
                accent="blue"
                isSubpage
                tooltip="Track weekly revenue, FWB token settlement, and coupon redemption trends."
              />
            </SectionBlock>

            {/* Community Governance & Federation */}
            <SectionBlock category="governance" icon={<Globe className="h-4 w-4" />} title="Community Governance & Federation" description="Decentralized Community Council, ActivityPub / Fediverse gateway, and external app sync.">
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
                isSubpage
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
                title="Federation Gateway Hub"
                subtitle="Handles, Global Feed & Outbox"
                icon={<Globe className="h-5 w-5" />}
                accent="blue"
                tooltip="Unified ActivityPub hub with handle toggles, actor search, Global Feed, Followers, and Outbox."
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
                isSubpage
                tooltip="Sync contacts securely with client-side hashing to find friends and prevent awkward overlaps."
              />
            </SectionBlock>

            {/* Operations & System Administration */}
            {(user as any)?.is_moderator && (
              <SectionBlock category="admin" icon={<Rocket className="h-4 w-4" />} title="Operations & System Administration" description="Moderator queues, live node telemetry, peer federation controls, and system flags.">
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
                  href="/moderation"
                  title="Moderation Queue"
                  subtitle="Content & report review"
                  icon={<Gavel className="h-5 w-5" />}
                  accent="red"
                  tooltip="Review flagged photos, abusive messages, and user reports with AI assist recommendations."
                />
                <FeatureTile
                  href="/admin/monitoring"
                  title="Autonomous Monitor"
                  subtitle="Real-time health telemetry"
                  icon={<Rocket className="h-5 w-5" />}
                  accent="purple"
                  isSubpage
                  tooltip="Telemetry graphs displaying CPU load, memory utilization, WebSocket pings, and latency."
                />
                <FeatureTile
                  href="/admin/federation"
                  title="Federation Admin"
                  subtitle="Peers & domain controls"
                  icon={<Globe className="h-5 w-5" />}
                  accent="purple"
                  isSubpage
                  tooltip="Manage federated peer relays, domain defederation blocks, and activity queues."
                />
                <FeatureTile
                  href="/admin/system"
                  title="System Diagnostics"
                  subtitle="Worker jobs & caches"
                  icon={<Settings className="h-5 w-5" />}
                  accent="red"
                  isSubpage
                  tooltip="Inspect background BullMQ jobs, clear Redis caches, and run automated health checks."
                />
                <FeatureTile
                  href="/admin/settings"
                  title="System Configuration"
                  subtitle="Platform environment flags"
                  icon={<Settings className="h-5 w-5" />}
                  accent="red"
                  isSubpage
                  tooltip="Adjust live global platform toggles, rate limits, onboarding flags, and Stripe keys."
                />
                <FeatureTile
                  href="/admin/feedback"
                  title="User Feedback Triage"
                  subtitle="Inbound user tickets"
                  icon={<MessageSquare className="h-5 w-5" />}
                  accent="red"
                  isSubpage
                  tooltip="Triage, respond to, and categorize inbound user feedback and bug submissions."
                />
              </SectionBlock>
            )}
            </DashboardFilterContext.Provider>

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
  tooltip,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  detail: string
  accent: string
  href: string
  tooltip?: string
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
        <div className="mb-3 flex items-start justify-between">
          <div
            className={`h-10 w-10 rounded-lg ${
              accents[accent] || accents.purple
            } flex items-center justify-center`}
          >
            {icon}
          </div>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`More info about ${label}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={(e) => e.preventDefault()}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[230px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
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
  tooltip,
}: {
  href: string
  label: string
  icon: React.ReactNode
  accent?: string
  tooltip?: string
}) {
  const bg =
    accent === 'green'
      ? 'hover:bg-green-50 dark:hover:bg-green-900/20'
      : accent === 'amber'
        ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
        : accent === 'purple'
          ? 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
          : 'hover:bg-muted dark:hover:dark:bg-muted'

  const linkEl = (
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

  if (!tooltip) return linkEl

  return (
    <Tooltip>
      <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function SectionBlock({
  category,
  icon,
  title,
  description,
  children,
}: {
  category: string
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}) {
  const { activeCategory } = useContext(DashboardFilterContext)
  if (activeCategory !== 'all' && activeCategory !== category) {
    return null
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            {title}
          </h3>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {children}
      </div>
    </section>
  )
}

function FeatureTile({
  href,
  title,
  subtitle,
  icon,
  accent,
  tooltip,
  isSubpage = false,
}: {
  href: string
  title: string
  subtitle: string
  icon: React.ReactNode
  accent: string
  tooltip?: string
  isSubpage?: boolean
}) {
  const { query, showSubpages } = useContext(DashboardFilterContext)
  const trimmedQuery = query.trim().toLowerCase()

  if (trimmedQuery) {
    const haystack = `${title} ${subtitle} ${tooltip || ''} ${href}`.toLowerCase()
    if (!haystack.includes(trimmedQuery)) {
      return null
    }
  } else if (isSubpage && !showSubpages) {
    return null
  }

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
        <div className="mb-3 flex items-center justify-between">
          <div className={`inline-flex rounded-lg p-2 ${a.iconBg}`}>{icon}</div>
          {isSubpage && (
            <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
              Sub-tool
            </span>
          )}
        </div>
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
                  className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
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
