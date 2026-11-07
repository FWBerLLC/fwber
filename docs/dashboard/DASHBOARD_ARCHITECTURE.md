# FWBer Dashboard Architecture & FeatureTile Guidance Reference

> **Version:** 2.3.53
> **Last Updated:** 2026-11-04
> **File:** `fwber-frontend/app/dashboard/page.tsx`

---

## 🏛️ 1. Architecture Overview

The FWBer User Dashboard serves as the unified, single-pane ecosystem directory for the entire platform. To prevent navigational fragmentation and eliminate disjointed subpages, the dashboard consolidates **131 total FeatureTiles** across **10 high-value priority categories**, each wired with 100% explicit tooltip guidance using Radix UI primitives.

### UI Principles
1. **High-Value Hierarchical Ordering**: Highest-utility daily consumer interactions (Matching, Chat, Outings) are prominent at the top; governance, settings, merchant portals, and administrative operations are structured sequentially below.
2. **Accessible Guidance Tooltips**: Every tile includes an interactive `<Info className="h-3.5 w-3.5" />` button with accessible `aria-label` markup and `e.preventDefault()`, allowing mobile and desktop users to inspect feature descriptions without accidentally triggering page navigation.
3. **No Dead Ends / Zero Orphaned Hubs**: All previously standalone hubs (`/scenes`, `/connections`, `/plans`, `/places`, `/economy`, `/commerce`, `/operations`, `/support`, etc.) are directly linked within their relevant operational category.

---

## 🧭 2. High-Value Category Breakdown & Tooltip Directory

### Category 1: Discover & Connect
*Focus: Personal discovery, matching heuristics, mutual connections, and social exploration.*
- **Recommendations** (`/recommendations`): *Browse personalized nearby recommendations matched by location and preferences.*
- **Matches** (`/matches`): *View your confirmed mutual matches and start conversations.*
- **Admirers** (`/who-likes-you`): *See members who have liked your profile and want to connect.*
- **Matching Preferences** (`/settings/matching`): *Fine-tune compatibility answers, lifestyle criteria, and matching filters.*
- **Match Analytics** (`/matches/dashboard`): *Detailed analytics, acceptance ratios, and trends across your matches.*
- **Group Matching** (`/groups/matching`): *Discover groups and shared communities aligned with your personality profile.*
- **NFC Tap Exchange** (`/matching/nfc`): *Instantly exchange contact cards and profiles using near-field physical tap.*
- **Search** (`/search`): *Search users across the network by name, handle, or shared interests.*
- **Scenes & Vibe Hub** (`/scenes`): *Unified discovery layer grouping local scenes, vibe recommendations, and subcultures.*
- **Discover Feed** (`/discover`): *Infinite discovery stream of verified profiles, fresh newcomers, and active singles.*
- **Rate My Cat** (`/rate-my-pussy`): *Community pet showcase and rating arena for beloved feline and pet companions.*
- **Connections Hub** (`/connections`): *Unified directory of friends, followers, mutual likes, and active social ties.*

### Category 2: Real-Time Chat & Social Spaces
*Focus: Encrypted communication, live rooms, audio spaces, and ephemeral sharing.*
- **Messages** (`/messages`): *Encrypted direct messaging with rich media, audio notes, and instant notifications.*
- **Friends List** (`/friends`): *Manage trusted friendships, favorites, and mutual connection status.*
- **Chatrooms** (`/chatrooms`): *Join open topical chatrooms and community channels with live participants.*
- **Audio Rooms** (`/audio-rooms`): *Drop into interactive real-time voice lounges and group audio stages.*
- **Live Spaces** (`/spaces`): *Ephemeral group conversations, stage panels, and scheduled live spaces.*
- **Groups** (`/groups`): *Browse and participate in member-led groups and special interest guilds.*
- **Topics & Threads** (`/topics`): *Participate in threaded discussions, open debates, and local topic threads.*
- **Bulletins** (`/bulletin-boards`): *Local community bulletin board for announcements, classifieds, and flyers.*
- **Ephemeral QR Burner** (`/burner`): *Generate instant QR codes for disposable ephemeral sharing that expires on read.*
- **Burner Links Hub** (`/burner-links`): *Manage, monitor, and revoke your active self-destructing burner links.*
- **Notifications** (`/notifications`): *Real-time feed of match requests, message pings, and platform notifications.*
- **Activity Stream** (`/activity`): *Comprehensive timeline of your recent unlocks, logins, reactions, and check-ins.*

### Category 3: Local Pulse, Outings & Meetups
*Focus: Real-world geography, venue partnerships, dating itineraries, and area density.*
- **Local Pulse** (`/local-pulse`): *Real-time geographic pulse with active check-ins, vibe ratings, and crowd density.*
- **Places Directory** (`/places`): *Curated catalog of local date-ready spots, bars, cafes, and scenic viewpoints.*
- **Plans & Dates Hub** (`/plans`): *Centralized planner combining events, date invites, nearby suggestions, and bookings.*
- **Events & Meetups** (`/events`): *Browse upcoming community meetups, social mixers, parties, and speed-dating events.*
- **Venues** (`/venues`): *Partner venues offering verified vibes, perks, and check-in rewards for members.*
- **Deals & Offers** (`/deals`): *Exclusive local venue discounts and 2-for-1 specials for FWBer date planners.*
- **Date Planner** (`/date-planner`): *Plan step-by-step romantic or casual itineraries with venue suggestions and timing.*
- **Nearby Radar** (`/nearby`): *View nearby opted-in users within your chosen radius with privacy geofencing.*
- **Date Ideas** (`/date-ideas`): *Creative conversation starters and unconventional date ideas tested by the community.*
- **Proximity Alerts** (`/proximity`): *Configurable alerts when compatible matches or mutual friends enter your vicinity.*
- **Proximity Chatrooms** (`/proximity-chatrooms`): *Chatrooms unlocked only when you are physically within range of a specific neighborhood.*
- **Activity Heatmap** (`/pulse`): *Interactive spatial heatmap highlighting active social hubs and real-time foot traffic.*
- **Conference Mode** (`/conference-pulse`): *Dedicated event and summit channels designed for networking at high-density conferences.*

### Category 4: AI Wingman Studio & Coaching
*Focus: Autonomous dating assistance, sentiment detection, bio generation, and humor analysis.*
- **Wingman Command Hub** (`/wingman`): *Central suite of AI-driven wingman tools, personality analyzers, and conversation aids.*
- **Creative Studio** (`/studio`): *Generate punchy bios, engaging photo captions, and personalized opening hooks.*
- **Content Generation** (`/content-generation`): *AI assistant for crafting ice breakers, profile introductions, and responses.*
- **Vibe Check** (`/wingman/vibe-check`): *Analyze the tone, romantic warmth, and underlying sentiment of any conversation draft.*
- **Room Vibe Radar** (`/wingman/vibe`): *Instant room vibe and tone analysis to calibrate your next response.*
- **Compatibility Deep Dive** (`/wingman/compatibility`): *In-depth multi-dimensional compatibility assessment comparing values, humor, and lifestyle.*
- **Ice-Breakers** (`/wingman/ice-breaker`): *Generate witty, tailored conversation starters based on match bios and shared interests.*
- **Draft Analyzer** (`/wingman/draft-analysis`): *Constructive pre-flight critique of message drafts before hitting send.*
- **AI Date Architect** (`/wingman/date-ideas`): *AI-generated date concepts combining both match preferences, schedules, and local spots.*
- **Profile Roast** (`/wingman/roast`): *Lighthearted, constructive profile critique pointing out clichés and photo red flags.*
- **Community Roast** (`/roast`): *Community-rated profile roasts and witty constructive feedback.*
- **Nemesis Mode** (`/wingman/nemesis`): *No-holds-barred brutal feedback on dating strategy, profile choices, and conversation habits.*
- **Cosmic Alignment** (`/wingman/cosmic`): *Astrological and cosmic synastry breakdown blending chart data with dating psychology.*
- **Love Fortune** (`/wingman/fortune`): *Playful algorithmic fortunes and dating predictions for your upcoming week.*
- **Roast Date** (`/roast-date`): *Hilarious post-date debrief tool to catalog awkward moments and laugh off bad dates.*
- **Field Notes & Journal** (`/journals`): *Private dating journal to log thoughts, memorable date details, and personal growth.*
- **Openers Library** (`/ice-breakers`): *Searchable repository of high-performing ice breakers submitted and upvoted by users.*

### Category 5: Economy, Tokens & Premium Perks
*Focus: Platform economics, FWB tokens, tiered membership, and tipping.*
- **Token Wallet** (`/wallet`): *Manage your native FWB token balance, transactions, wallet address, and on-chain claims.*
- **Economy Hub** (`/economy`): *Overview of platform economic mechanisms, token mints, rewards, and staking tiers.*
- **Premium Membership** (`/premium`): *Unlock unlimited swipes, incognito browsing, advanced filters, and priority boosts.*
- **Subscription Plans** (`/subscription`): *Review membership tiers, recurring billing options, and benefits.*
- **Tier Capabilities** (`/tier-demo`): *Interactive demonstration of progressive relationship tiers and photo reveal gates.*
- **Visibility Boosts** (`/boosts`): *Spotlight your profile at the top of local feeds to increase view rates up to 10x.*
- **Virtual Gifts** (`/gifts`): *Browse tokenized virtual gifts, digital drinks, and roses to send to your matches.*
- **Send a Gift** (`/gifts/send`): *Send an immediate surprise gift or token tip directly to an open conversation.*
- **Gift History** (`/gifts/history`): *Track history of all virtual gifts received, redeemed, or sent to date.*
- **Refer & Earn** (`/referrals`): *Share your unique referral link to earn token bounties and premium upgrade credits.*
- **Community Bounties** (`/bounties`): *Complete neighborhood verification and matchmaking bounties to earn token payouts.*
- **Feature Unlocks** (`/unlocks`): *View your active paid and earned perks, unblurred photos, and special permissions.*
- **Unlock Ledger** (`/premium/unlocks`): *Full permanent audit ledger of all content and features you have unlocked.*
- **Leaderboard** (`/leaderboard`): *Community rankings for token earnings, daily streaks, and verified reputation.*

### Category 6: Profile, Identity & Reputation
*Focus: Self-presentation, Zero-Knowledge verification, trust endorsements, and milestones.*
- **My Public Profile** (`/profile`): *View exactly how your public card, photos, bio, and vibe badges look to others.*
- **Edit Profile** (`/profile/edit`): *Edit your bio, occupation, passions, lifestyle tags, and orientation settings.*
- **Photo Gallery** (`/photos`): *Upload, reorder, crop, and set visibility gates on your primary profile photos.*
- **Photo Reveals** (`/photos/reveals`): *Monitor mutual tier-gated photo reveals unlocked with your active matches.*
- **Profile Views** (`/profile-views`): *See real-time notifications and lists of visitors who viewed your profile.*
- **Identity Hub** (`/identity`): *Manage cryptographic Zero-Knowledge identity credentials, passports, and age checks.*
- **Verification Portal** (`/verify`): *Complete photo, identity, and social verification to earn trusted verification badges.*
- **Reputation & Trust** (`/reputation`): *Inspect your trust score, community standing, positive reviews, and vouch badges.*
- **Vouch for Friends** (`/vouch`): *Submit cryptographic trust endorsements for friends to boost their verification level.*
- **Physical Profile** (`/settings/physical-profile`): *Configure optional physical attributes, gym habits, sleep schedule, and height.*
- **Scrapbook** (`/scrapbook`): *Save favorite match moments, date milestones, and memorable photos to your private book.*
- **Achievements** (`/achievements`): *Earn collectible gamification badges, streak milestones, and token rewards.*
- **Personal Analytics** (`/analytics`): *Engagement charts, response timing, profile impressions, and swipe statistics.*

### Category 7: Safety, Privacy & Account Governance
*Focus: Personal defense, encryption, credential security, and location controls.*
- **Safety Center** (`/safety`): *Access panic assistance, trusted contact check-ins, and safety guidelines for meetups.*
- **All Settings** (`/settings`): *Comprehensive settings dashboard covering all account, device, and network options.*
- **Account Settings** (`/settings/account`): *Update primary email address, registered handle, password, or request data export.*
- **Privacy Controls** (`/settings/privacy`): *Toggle incognito mode, location blurring, search indexing, and online presence.*
- **Notification Prefs** (`/settings/notifications`): *Control push notifications, email summaries, sound effects, and quiet hours.*
- **Security Hub** (`/settings/security`): *Review active device sessions, security log events, and update authorization keys.*
- **Two-Factor Auth** (`/settings/two-factor`): *Set up TOTP authenticator app codes and download backup recovery codes.*
- **Encrypted Vault** (`/settings/vault`): *Private client-side encrypted vault for sensitive notes, passwords, and photos.*
- **Identity Verification** (`/settings/verification`): *Complete identity verification flows and verify documents.*
- **Identity & Handles** (`/settings/identity`): *Manage linked identities, social handles, and primary display alias.*
- **Blocked Users** (`/settings/blocked`): *Manage your blocked user list and adjust harassment defense filters.*
- **Travel Mode** (`/settings/travel`): *Change your virtual location ahead of trips to match and meet people before arriving.*
- **Location Precision** (`/location-settings`): *Adjust GPS precision, randomize exact coordinates, and configure background pinging.*
- **Hardware BLE Token** (`/settings/hardware`): *Pair a Bluetooth LE physical safety beacon or distress bracelet to your account.*
- **Subscription Billing** (`/settings/subscription`): *View billing history, invoices, renew or cancel your premium subscription tier.*
- **Safety Reports** (`/reports`): *Track real-time resolution status of incident and abuse reports you submitted.*
- **Support & Policies** (`/support`): *Central support hub containing tutorials, knowledgebase articles, and contact forms.*
- **Help Center** (`/help`): *Browse guides, knowledge base articles, and common questions.*
- **Privacy Policy** (`/privacy`): *Review our strict privacy policy and cryptographic data handling commitments.*

### Category 8: Commerce & Merchant Portals
*Focus: Local business enablement, inventory management, offers, and venue hosting.*
- **Local Marketplace** (`/marketplace`): *Shop local offerings, date packages, flowers, venue tickets, and partner goods.*
- **Commerce Hub** (`/commerce`): *Master commerce dashboard aggregating merchant tools, storefronts, and sales.*
- **Merchant Dashboard** (`/merchant/dashboard`): *Manage store profile, track redemptions, update hours, and manage staff access.*
- **Register as Merchant** (`/merchant/register`): *Apply for verified merchant status to list promotional deals and accept FWB tokens.*
- **Inventory Management** (`/merchant/inventory`): *Update item catalog, pricing in tokens and fiat, and adjust live product availability.*
- **Promotions & Specials** (`/merchant/promotions`): *Create and schedule discount campaigns and happy hour promotions for singles.*
- **Loyalty Program** (`/merchant/loyalty`): *Configure automated digital stamp cards and repeat reward tiers for patrons.*
- **Merchant Vibe Intel** (`/merchant/vibe`): *View neighborhood foot traffic trends, peak dating hours, and crowd sentiment.*
- **Storefront Profile** (`/merchant/profile`): *Customize your public business bio, photos, venue atmosphere, and website link.*
- **Merchant Analytics** (`/merchant/analytics`): *Track weekly revenue, FWB token settlement, and coupon redemption trends.*
- **Venue Host Portal** (`/venue/dashboard`): *Dedicated operations portal for bars, lounges, and spaces hosting FWBer meetups.*

### Category 9: Community Governance & Federation
*Focus: Decentralized governance, ActivityPub Fediverse networking, and external integrations.*
- **Community Council** (`/council`): *Vote on community proposals, feature prioritization, and platform governance changes.*
- **Dispute Appeals** (`/council/appeals`): *Submit moderation appeals and participate as a juror in peer-reviewed dispute claims.*
- **ActivityPub Federation** (`/federation`): *Connect and cross-interact with Mastodon and ActivityPub instances across the Fediverse.*
- **Federation Settings** (`/settings/federation`): *Configure federated actors, relay addresses, signature keys, and outbox visibility.*
- **Third-Party Integrations** (`/integrations`): *Link Spotify, Instagram, calendars, and OAuth providers to your FWBer profile.*
- **Synced Contacts** (`/integrations/contacts`): *Sync contacts securely with client-side hashing to find friends and prevent awkward overlaps.*
- **Private Journal** (`/journal`): *Write private journal reflections about dates and personal growth, encrypted for your eyes only.*
- **Video Calling** (`/video`): *High-definition encrypted one-on-one video dates and call history directly in the browser.*
- **Share to Unlock** (`/share-unlock`): *Unlock premium features and badges by sharing anonymous links with external friends.*
- **Submit Feedback** (`/feedback`): *Send bugs, suggestions, and feature requests directly to the core engineering team.*
- **Contact Support** (`/contact`): *Direct support ticket channel for account recovery, billing, and operator assistance.*
- **Terms & Policies** (`/terms`): *Read our complete Terms of Service, Community Standards, and safety guidelines.*

### Category 10: Operations & System Administration (Moderator Gated)
*Focus: Telemetry, trust & safety enforcement, system diagnostics, and peer blocking.*
- **Operations Command Hub** (`/operations`): *Unified operational command center providing real-time platform metrics and node status.*
- **Admin Dashboard** (`/admin/dashboard`): *Administrative control center for user bans, dispute resolution, and system status.*
- **Autonomous Monitor** (`/admin/monitoring`): *Telemetry graphs displaying CPU load, memory utilization, WebSocket pings, and latency.*
- **Moderation Queue** (`/moderation`): *Review flagged photos, abusive messages, and user reports with AI assist recommendations.*
- **Federation Admin** (`/admin/federation`): *Manage federated peer relays, domain defederation blocks, and activity queues.*
- **System Diagnostics** (`/admin/system`): *Inspect background BullMQ jobs, clear Redis caches, and run automated health checks.*
- **System Configuration** (`/admin/settings`): *Adjust live global platform toggles, rate limits, onboarding flags, and Stripe keys.*
- **User Feedback Triage** (`/admin/feedback`): *Triage, respond to, and categorize inbound user feedback and bug submissions.*
