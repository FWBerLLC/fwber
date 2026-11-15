'use client'

import { useState } from 'react'
import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react'

// This would typically come from a CMS or markdown files
// For MVP, we'll store content in a const map
const HELP_ARTICLES: Record<string, { title: string, content: React.ReactNode, category: string }> = {
  // Getting Started
  'create-account': {
    category: 'Getting Started',
    title: 'Creating your account',
    content: (
      <div className="space-y-4">
        <p>Creating an account on fwber is simple and privacy-focused.</p>
        <h3 className="text-lg font-semibold">Steps to Register</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Click the &quot;Sign Up&quot; button on the homepage.</li>
          <li>Enter your email address and create a strong password.</li>
          <li>Alternatively, you can use &quot;Sign in with Solana&quot; if you have a crypto wallet.</li>
          <li>Verify your email address via the link sent to your inbox.</li>
        </ol>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> You must be 18+ to create an account. We enforce strict age verification policies.
          </p>
        </div>
      </div>
    )
  },
  'profile-setup': {
    category: 'Getting Started',
    title: 'Setting up your profile',
    content: (
      <div className="space-y-4">
        <p>Your profile is your identity on fwber. Here is how to make it stand out.</p>
        <h3 className="text-lg font-semibold">Profile Essentials</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Bio:</strong> Write a short description of yourself and what you are looking for.</li>
          <li><strong>Interests:</strong> Select tags that match your hobbies and lifestyle.</li>
          <li><strong>Avatars:</strong> Use our AI tools to generate a privacy-preserving avatar.</li>
        </ul>
      </div>
    )
  },
  'avatars': {
    category: 'Getting Started',
    title: 'Understanding Avatars',
    content: (
      <div className="space-y-4">
        <p>fwber prioritizes privacy by encouraging the use of AI-generated avatars instead of real photos for initial interactions.</p>
        <h3 className="text-lg font-semibold">How it works</h3>
        <p>You upload a reference photo, and our AI generates a stylized avatar that maintains your likeness without revealing your exact identity. This allows you to browse and match with confidence.</p>
      </div>
    )
  },

  // Wallet & Crypto
  'fwb-tokens': {
    category: 'Wallet & Crypto',
    title: 'How FWB Tokens work',
    content: (
      <div className="space-y-4">
        <p>FWB Tokens are the internal currency of the platform. They are used for various premium features.</p>
        <h3 className="text-lg font-semibold">Uses for Tokens</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Unlocking private photos</li>
          <li>Joining paid groups</li>
          <li>Sending virtual gifts</li>
          <li>Boosting your profile visibility</li>
        </ul>
        <p>You can earn tokens by referring friends, logging in daily, or completing achievements.</p>
      </div>
    )
  },
  'deposits': {
    category: 'Wallet & Crypto',
    title: 'Depositing from Solana',
    content: (
      <div className="space-y-4">
        <p>You can top up your FWB balance by depositing tokens from the Solana blockchain.</p>
        <h3 className="text-lg font-semibold">How to Deposit</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Go to your <strong>Wallet</strong> page.</li>
          <li>Click &quot;Deposit&quot;.</li>
          <li>Copy your unique deposit address or scan the QR code.</li>
          <li>Send SOL or SPL tokens from your external wallet (Phantom, Solflare).</li>
          <li>The tokens will appear in your internal balance after a few confirmations.</li>
        </ol>
      </div>
    )
  },
  'withdrawals': {
    category: 'Wallet & Crypto',
    title: 'Withdrawing funds',
    content: (
      <div className="space-y-4">
        <p>You can withdraw your accumulated FWB tokens back to your Solana wallet.</p>
        <h3 className="text-lg font-semibold">Withdrawal Process</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Go to your <strong>Wallet</strong> page.</li>
          <li>Select &quot;Withdraw&quot;.</li>
          <li>Enter the amount and your destination wallet address.</li>
          <li>Confirm the transaction. Withdrawals are processed typically within 24 hours.</li>
        </ol>
      </div>
    )
  },
  'ledger-vs-chain': {
    category: 'Wallet & Crypto',
    title: 'Internal Ledger vs On-Chain',
    content: (
      <div className="space-y-4">
        <p>It is important to understand the difference between your Internal Ledger balance and On-Chain assets.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-bold">Internal Ledger</h4>
            <ul className="list-disc pl-5 text-sm mt-2">
              <li>Instant transactions</li>
              <li>Zero gas fees</li>
              <li>Used for all app interactions (tips, unlocks)</li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-bold">On-Chain (Solana)</h4>
            <ul className="list-disc pl-5 text-sm mt-2">
              <li>Self-custody in your wallet</li>
              <li>Requires gas fees (SOL)</li>
              <li>Used for deposits and withdrawals</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },

  // Safety
  'photo-privacy': {
    category: 'Safety & Privacy',
    title: 'Photo Privacy & Blurring',
    content: (
      <div className="space-y-4">
        <p>By default, real photos on fwber are blurred to protect user privacy.</p>
        <h3 className="text-lg font-semibold">Unlocking Photos</h3>
        <p>Photos can be revealed in two ways:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Mutual Match:</strong> Once you match with someone, basic photos may be revealed.</li>
          <li><strong>Token Unlock:</strong> You can pay a small token fee to unlock private galleries if the user allows it.</li>
        </ul>
      </div>
    )
  },
  'block-report': {
    category: 'Safety, Blocking & Hardware Beacons',
    title: 'Bidirectional Blocking & Reporting',
    content: (
      <div className="space-y-4">
        <p>We enforce zero tolerance for harassment, spam, or boundary violations.</p>
        <h3 className="text-lg font-semibold">What happens when you block someone?</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Immediate Connection Severing:</strong> Any active match, friendship, or pending friend request between you is automatically removed.</li>
          <li><strong>Bidirectional Message Shield:</strong> Neither side can send or read direct messages, and conversations disappear from both <strong>Messages</strong> lists.</li>
          <li><strong>Search &amp; Discovery Exclusion:</strong> Blocked accounts are excluded from Friends search, Match discovery, and Dashboard stats.</li>
        </ul>
        <p>You can review and unblock accounts anytime in <strong>Safety Center</strong> (<code>/safety</code>) or <strong>Settings &gt; Blocked Users</strong> (<code>/settings/blocked</code>).</p>
      </div>
    )
  },
  'dashboard-guide': {
    category: 'Getting Started & Dashboard',
    title: 'Navigating the Consolidated Dashboard',
    content: (
      <div className="space-y-4">
        <p>The FWBer Dashboard gives you an honest, real-time overview of your activity plus instant navigation across the platform.</p>
        <h3 className="text-lg font-semibold">Key Controls</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Live Network Badge:</strong> Both the top header and the Account card reflect the exact same live WebSocket connection status.</li>
          <li><strong>Ecosystem Search &amp; Category Pills:</strong> Type any keyword (e.g., <em>gifts</em>, <em>vault</em>, <em>roast</em>, <em>federation</em>) to filter tiles immediately across all categories.</li>
          <li><strong>Consolidated Hubs vs. All Sub-Tools:</strong> By default, sub-tools already embedded inside parent hubs (like AI Wingman games, Gift history, or Settings sub-tabs) are condensed to reduce clutter. Click <strong>Show All Sub-Tools</strong> whenever you want direct one-click tiles to every sub-route.</li>
          <li><strong>Info Tooltips:</strong> Hover or focus the <code>(i)</code> icon on any metric card or feature tile for a plain-language explanation.</li>
        </ul>
      </div>
    )
  },
  'friends-messaging': {
    category: 'Matches, Friends & Real-Time Chat',
    title: 'Friends & Direct Messaging',
    content: (
      <div className="space-y-4">
        <p>Private 1-on-1 messaging on fwber is open to both <strong>mutual matches</strong> and <strong>accepted friends</strong>.</p>
        <h3 className="text-lg font-semibold">How to start a conversation</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>From Matches:</strong> Mutual likes automatically unlock messaging in <strong>Messages</strong> (<code>/messages</code>).</li>
          <li><strong>From Friends:</strong> Visit <strong>Friends</strong> (<code>/friends</code>) to search members and send a friend request. Once accepted, click <strong>Message</strong> on their friend card.</li>
          <li><strong>From Any Public Profile:</strong> Open a member&apos;s profile card and click the <strong>Message</strong> button whenever you are matched or friends.</li>
        </ol>
      </div>
    )
  },
  'solana-signin': {
    category: 'Wallet, Tokens & Solana Sign-In',
    title: 'Sign-In with Solana Wallet',
    content: (
      <div className="space-y-4">
        <p>You can sign in or link a self-custody Solana wallet (Phantom or Solflare) using cryptographic nonce signatures—no seed phrases or gas fees required to authenticate.</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>On the Login screen (or Wallet settings), connect your Phantom or Solflare extension.</li>
          <li>Approve the one-time nonce signature challenge in your wallet popup.</li>
          <li>When linking a wallet to an existing email account, fwber verifies both your active session and wallet signature (dual-proof linking) so no one else can claim your address.</li>
        </ol>
      </div>
    )
  },
  'federation-guide': {
    category: 'Council Governance, Federation & Integrations',
    title: 'ActivityPub & Fediverse Connectivity',
    content: (
      <div className="space-y-4">
        <p>FWBer includes an optional ActivityPub / WebFinger gateway at <strong>Settings &gt; Global Federation</strong> (<code>/settings/federation</code>).</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Opt-In Broadcasting:</strong> Federation is off until you toggle <em>ActivityPub broadcasting</em> on.</li>
          <li><strong>Inbound Fediverse Discovery:</strong> Remote Mastodon, Pleroma, and Misskey users can look up your public handle (<code>@username@fwber.online</code>) via RFC 7033 WebFinger (<code>/.well-known/webfinger</code>), while instance catalogs read public server capabilities via NodeInfo 2.1 (<code>/nodeinfo/2.1</code>).</li>
          <li><strong>Unified Federation Hub:</strong> Search remote Mastodon/ActivityPub handles, browse the Global Feed, manage Followers/Following, and inspect your public Outbox from a single tabbed hub.</li>
          <li><strong>Strict Location &amp; Photo Isolation:</strong> Exact GPS coordinates and private Tiered Face Reveals never leave fwber&apos;s encrypted local layer.</li>
        </ul>
      </div>
    )
  },
  'council-governance': {
    category: 'Council Governance, Federation & Integrations',
    title: 'Community Council, Merkle Proofs & Appeals',
    content: (
      <div className="space-y-4">
        <p>The unified <strong>Community Council &amp; Appeals Hub</strong> (<code>/council</code>) gives members direct democratic control over platform policy, moderation appeals, technical upgrades, and treasury initiatives.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Token-Weighted Ballots:</strong> Every signed-in member has at least <code>1 FWB</code> base voting voice, scaling upward with your FWB token balance. Creating a new policy proposal requires <code>100 FWB</code> tokens.</li>
          <li><strong>Client-Side SHA-256 Merkle Verification:</strong> Every vote is hashed into a canonical SHA-256 Merkle tree. After casting a vote, click <em>Verify My Vote</em> on any ballot to verify your cryptographic inclusion proof directly in your browser using WebCrypto.</li>
          <li><strong>Peer-Reviewed Dispute Appeals:</strong> Restricted accounts or members contesting a moderation decision can file an appeal under the <em>Dispute Appeals</em> tab (or at <code>/council/appeals</code>), automatically opening a 7-day community moderation ballot.</li>
        </ul>
      </div>
    )
  },
  'connected-contacts': {
    category: 'Council Governance, Federation & Integrations',
    title: 'Connected Accounts & OAuth Contact Sync',
    content: (
      <div className="space-y-4">
        <p>Manage external OAuth 2.0 providers and imported contacts inside the unified <strong>Connected Accounts Hub</strong> (<code>/integrations</code>).</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Read-Only OAuth Scopes:</strong> Link Google Contacts, Microsoft 365 / Outlook, or Facebook Friends using industry-standard OAuth 2.0 without sharing your email password.</li>
          <li><strong>Inline Contact Sync &amp; Search:</strong> Switch to the <em>Synced Contacts</em> tab to trigger manual syncs and filter imported contacts by name, email, phone, or provider.</li>
          <li><strong>One-Click Revocation:</strong> Disconnect any provider at any time using the unplug icon — FWBer immediately deletes the stored OAuth token and all contacts imported from that provider.</li>
        </ul>
      </div>
    )
  },
  'ble-safety-tokens': {
    category: 'Safety, Blocking & Hardware Beacons',
    title: 'Hardware BLE Safety Beacons',
    content: (
      <div className="space-y-4">
        <p>Pair an optional Bluetooth Low Energy (BLE) wearable key or safety beacon at <strong>Settings &gt; Hardware BLE Token</strong> (<code>/settings/hardware</code>).</p>
        <p>When paired alongside <strong>Safe Walk</strong> in the Safety Center, a physical button trigger or unexpected beacon disconnect can alert your designated trusted contacts during in-person meetups.</p>
      </div>
    )
  },
  'location-privacy': {
    category: 'Safety & Privacy',
    title: 'Location Privacy',
    content: (
      <div className="space-y-4">
        <p>Your exact location is never shared with other users.</p>
        <p>We use &quot;fuzzy location&quot; logic to show approximate distance (e.g., &quot;Less than 1 mile away&quot;) without pinpointing your coordinates.</p>
      </div>
    )
  },

  // Features
  'matching': {
    category: 'Platform Features',
    title: 'How Matching works',
    content: (
      <div className="space-y-4">
        <p>Swipe right to Like, left to Pass. It is the classic mechanism you know, but improved.</p>
        <p>If you both Like each other, it is a Match! You can then start chatting for free.</p>
      </div>
    )
  },
  'chatrooms-guide': {
    category: 'Platform Features',
    title: 'Proximity Chatrooms',
    content: (
      <div className="space-y-4">
        <p>Connect with people in your immediate vicinity through Proximity Chatrooms.</p>
        <h3 className="text-lg font-semibold">How it works</h3>
        <p>These are geo-fenced chat groups (e.g., &quot;Downtown Bar Scene&quot;, &quot;Central Park&quot;). You must be physically located within the radius to join and chat.</p>
      </div>
    )
  },
  'audio-rooms-guide': {
    category: 'Matches, Friends & Real-Time Chat',
    title: 'Live Audio Rooms & Voice Chat',
    content: (
      <div className="space-y-4">
        <p>Drop into live, low-latency voice hangouts with members in your scene at <strong>Audio Rooms</strong> (<code>/audio-rooms</code>).</p>
        <h3 className="text-lg font-semibold">Roles &amp; Controls</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Speakers &amp; Hosts:</strong> Broadcast live encrypted WebRTC audio to everyone in the room and mute/unmute your microphone at any time.</li>
          <li><strong>Listeners &amp; Raise Hand:</strong> Join quietly to listen first. Tap <strong>Raise Hand</strong> whenever you want the host to invite you onto the stage as a speaker.</li>
          <li><strong>Live Presence:</strong> Participant rosters update in real time over WebSockets as members join, speak, or leave.</li>
          <li><strong>Connection Tips:</strong> Allow browser microphone permission when joining as a speaker. If you are on a strict corporate or mobile carrier NAT, switching between Wi-Fi and cellular can help peer-to-peer WebRTC audio establish cleanly.</li>
        </ul>
      </div>
    )
  },
  'events-guide': {
    category: 'Matches, Friends & Real-Time Chat',
    title: 'Local Events, Live Maps & RSVPs',
    content: (
      <div className="space-y-4">
        <p>Discover and host real-world meetups, speed-dating nights, workshops, and parties at <strong>Events</strong> (<code>/events</code>).</p>
        <h3 className="text-lg font-semibold">Key Event Features</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Trust-Aware Proximity Discovery:</strong> Filter upcoming events by category within your radius, ranked by distance, freshness, and social trust signals.</li>
          <li><strong>Flexible RSVPs:</strong> Mark yourself as <em>Attend</em>, <em>Maybe</em>, or <em>Decline</em>. Hosts can run free community gatherings or ticketed events using FWB Tokens or card checkout.</li>
          <li><strong>Live Event Map &amp; Discussion:</strong> Confirmed event pages include a dedicated discussion thread and an opt-in Live Map to coordinate arrivals without exposing permanent home coordinates.</li>
          <li><strong>Direct Invites &amp; Shareable Links:</strong> Invite matches or friends directly from any event page or copy an oEmbed-enabled link to share externally.</li>
        </ul>
      </div>
    )
  },
  'groups-guide': {
    category: 'Platform Features',
    title: 'Creating & Joining Groups',
    content: (
      <div className="space-y-4">
        <p>Groups allow communities to form around shared interests.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Public Groups:</strong> Open to everyone.</li>
          <li><strong>Private Groups:</strong> Invite-only.</li>
          <li><strong>Paid Groups:</strong> Require a token entry fee to join, ensuring high-quality exclusive communities.</li>
        </ul>
      </div>
    )
  },
  'achievements-guide': {
    category: 'Platform Features',
    title: 'Achievements & Rewards',
    content: (
      <div className="space-y-4">
        <p>Earn badges and token rewards by being active on the platform.</p>
        <p>Visit the <strong>Achievements</strong> page to track your progress on goals like &quot;Viral Star&quot;, &quot;Social Butterfly&quot;, and more.</p>
      </div>
    )
  },

  // AI Wingman & Tools
  'cosmic-fortune': {
    category: 'AI Wingman & Tools',
    title: 'Cosmic Matches & Fortune',
    content: (
      <div className="space-y-4">
        <p>The AI Wingman analyzes your profile against the stars to deliver fun, astrological insights into your dating life.</p>
        <h3 className="text-lg font-semibold">Features</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Cosmic Match:</strong> Discover the personality traits that are cosmically aligned with yours.</li>
          <li><strong>Dating Fortune:</strong> Get a humorous, randomized prediction about your upcoming dating adventures.</li>
          <li><strong>Scientific Nemesis:</strong> Find out exactly what type of person is your statistical opposite to avoid them at all costs.</li>
        </ul>
      </div>
    )
  },
  'roasts-hypes': {
    category: 'AI Wingman & Tools',
    title: 'Roasts & Hypes',
    content: (
      <div className="space-y-4">
        <p>Want honest feedback on your profile? Let the AI Wingman give it to you straight.</p>
        <h3 className="text-lg font-semibold">How it works</h3>
        <p>The AI scans your bio, interests, and public profile data to generate either a brutal <strong>Roast</strong> or a motivating <strong>Hype</strong>. It is a great way to see how you come across to potential matches.</p>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="text-sm">Found your roast hilarious? You can share it to your social feeds directly from the app to show off your sense of humor.</p>
        </div>
      </div>
    )
  },
  'conversation-coach': {
    category: 'AI Wingman & Tools',
    title: 'Conversation Coach',
    content: (
      <div className="space-y-4">
        <p>Never run out of things to say. The Conversation Coach is integrated right into your real-time chat.</p>
        <h3 className="text-lg font-semibold">Real-time Feedback</h3>
        <p>When you draft a message, you can tap the AI icon to analyze its tone and effectiveness. The Coach will give you a score out of 100, analyze the vibe (e.g., &quot;Flirty&quot;, &quot;Dry&quot;), and offer a rewritten suggestion to improve your response rate.</p>
      </div>
    )
  },
  'vibe-check': {
    category: 'AI Wingman & Tools',
    title: 'Red & Green Flags',
    content: (
      <div className="space-y-4">
        <p>The Vibe Check tool provides an objective look at both your profile and your quirks.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Profile Vibe:</strong> The AI identifies the subtle &quot;Green Flags&quot; and &quot;Red Flags&quot; hidden in your bio.</li>
          <li><strong>Quirk Checker:</strong> Got a weird habit? Submit a quirk (like &quot;I eat pizza with a fork&quot;) and the AI will judge whether it is a dealbreaker or endearing.</li>
        </ul>
      </div>
    )
  },

  // Tiered Privacy System
  'privacy-tiers-guide': {
    category: 'Tiered Privacy System',
    title: 'The 5 Privacy Tiers',
    content: (
      <div className="space-y-4">
        <p>fwber is built on the philosophy that attention should be earned, not freely given. We enforce this through our 5-Tier Face Reveal system.</p>
        <h3 className="text-lg font-semibold">The Tiers</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Tier 1 (Extreme Blur):</strong> The default state. Avatars or heavily obscured filters only.</li>
          <li><strong>Tier 2 (Moderate Blur):</strong> Initial match state. You can see general shapes and colors.</li>
          <li><strong>Tier 3 (Light Blur):</strong> Achieved after chatting. Facial features begin to emerge.</li>
          <li><strong>Tier 4 (Clear):</strong> Requires mutual consent or a &quot;Vault Unlock&quot;. Full, clear photos.</li>
          <li><strong>Tier 5 (Intimate/Vault):</strong> Highly sensitive, encrypted photos meant only for trusted connections.</li>
        </ul>
      </div>
    )
  },
  'sharing-unlocks': {
    category: 'Tiered Privacy System',
    title: 'Sharing Unlocks',
    content: (
      <div className="space-y-4">
        <p>You control exactly who sees what and when.</p>
        <h3 className="text-lg font-semibold">How to reveal yourself</h3>
        <p>Inside an active chatroom or direct message, you can tap the &quot;Reveal Photo&quot; button. You will be prompted to select which Tier to unlock for that specific user. You can also completely &quot;Revoke&quot; access at any time, instantly re-blurring your photos on their device.</p>
      </div>
    )
  },
  'managing-reveals': {
    category: 'Tiered Privacy System',
    title: 'Managing Face Reveals',
    content: (
      <div className="space-y-4">
        <p>Keep track of who has access to your photos in the <strong>Settings</strong> panel.</p>
        <p>Under the Privacy section, you can view a comprehensive list of every user who currently has an active face reveal unlock, the specific tier they are allowed to view, and the option to bulk-revoke access if necessary.</p>
      </div>
    )
  },

  // Security & Media Vault
  'on-device-encryption': {
    category: 'Security & Media Vault',
    title: 'On-Device Encryption',
    content: (
      <div className="space-y-4">
        <p>Your most sensitive media is truly yours. Fwber employs military-grade on-device encryption (E2EE) for your private Vault.</p>
        <h3 className="text-lg font-semibold">How our E2EE works</h3>
        <p>When you upload a photo to Tier 5 (The Vault), it is encrypted <em>before</em> it leaves your browser or phone using an AES-256-GCM key derived from your Vault Master Password. The fwber servers only store the encrypted ciphertext. We cannot see your photos, and we cannot hand them over to third parties because we do not have the decryption key.</p>
      </div>
    )
  },
  'local-vault': {
    category: 'Security & Media Vault',
    title: 'The Local Vault',
    content: (
      <div className="space-y-4">
        <p>The Local Vault is your personal secure space within the app.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Setup:</strong> You must create a Master Password to initialize the Vault.</li>
          <li><strong>Access:</strong> The Vault locks itself aggressively when you navigate away. You must re-enter your password to decrypt the local view.</li>
          <li><strong>Sharing:</strong> When you share a Vault photo with a match, your device securely encrypts a copy of the photo specifically for their public key, ensuring only they can decrypt it.</li>
        </ul>
      </div>
    )
  },
  'key-recovery': {
    category: 'Security & Media Vault',
    title: 'Recovering Master Keys',
    content: (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-bold text-red-800 dark:text-red-200">
            WARNING: Fwber cannot recover your Vault Password.
          </p>
        </div>
        <p className="mt-4">Because the Vault uses genuine End-to-End Encryption, we do not store your Master Password. If you lose your password, and you lose your Recovery Phrase, your Vault photos are permanently irrecoverable.</p>
        <h3 className="text-lg font-semibold">Recovery Phrase</h3>
        <p>When you create your Vault, you are provided a 12-word recovery phrase. <strong>Write this down and store it in a secure, physical location.</strong> It is the only way to restore access to your encrypted media if you forget your password.</p>
      </div>
    )
  },
  'wallet-and-bounties': {
    category: 'Wallet, Tokens & Solana Sign-In',
    title: 'Global Bridge Swaps & Matchmaker Bounties',
    content: (
      <div className="space-y-4">
        <p>
          Your internal <strong>FWB</strong> balance powers instant tipping, content unlocks, community governance voting, Global Bridge swaps, and Matchmaker Bounties.
        </p>
        <h3 className="text-lg font-semibold">Global Bridge Swaps (/wallet &rarr; Bridge)</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Live Reference Rates:</strong> Preview real-time conversion quotes from FWB into <code>SOL</code>, <code>USDC</code>, or instant <code>PEER_TOKEN</code> Federated Vouchers before confirming.</li>
          <li><strong>Atomic Settlement:</strong> Submitting a swap atomically debits your internal FWB balance (with a transparent 2% protocol bridge fee) and logs both a Bridge History record and a Wallet Transaction audit entry.</li>
        </ul>
        <h3 className="text-lg font-semibold">Matchmaker Bounties (/bounties)</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Post a Bounty:</strong> Escrow 10+ FWB tokens with an optional description of who you want to meet. You receive a public shareable link (<code>/bounty/&lt;slug&gt;</code>) to send to friends or surface in the Community Bounties feed.</li>
          <li><strong>Suggest a Match:</strong> Friends and community matchmakers can open any active bounty, pick a friend or search members, and submit a curated introduction while respecting bidirectional privacy blocks.</li>
          <li><strong>Track Introductions:</strong> Switch to the <em>My Bounties</em> tab on <code>/bounties</code> to review every candidate suggested for your active bounties.</li>
        </ul>
      </div>
    )
  },
  'ai-avatars-and-security': {
    category: 'Safety, Blocking & Hardware Beacons',
    title: 'AI Avatar Studio, Decoy Profiles & Safe Walk',
    content: (
      <div className="space-y-4">
        <p>
          FWBer pairs privacy-preserving identity synthesis with active real-world safety tools so you stay in full control of both your digital likeness and your in-person dates.
        </p>
        <h3 className="text-lg font-semibold">AI Avatar Studio (/photos &rarr; AI Avatar Studio)</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Trait-Driven or Photo-Anchored Portraits:</strong> Open <strong>Photos</strong> (<code>/photos?tab=avatar</code>) and choose either your saved physical traits or an existing photo to synthesize a stylized avatar in <em>Realistic</em>, <em>Glamour</em>, <em>Fantasy</em>, <em>Anime</em>, <em>Neon Cyberpunk</em>, or <em>Oil Painting</em> styles.</li>
          <li><strong>Always-Available Synthesis:</strong> When cloud Flux/DALL-E providers are configured they render photorealistic portraits; otherwise FWBer Studio immediately synthesizes a crisp vector portrait reflecting your skin tone, hair color, eye color, and style with zero external data sharing.</li>
        </ul>
        <h3 className="text-lg font-semibold">Emergency Duress Decoy Profiles (/settings/security)</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Plausible Deniability at Login:</strong> Set a separate 8+ character <em>Decoy Password</em> in <strong>Settings &gt; Security &amp; Privacy</strong> (<code>/settings/security</code>).</li>
          <li><strong>Seamless Session Switching:</strong> Signing in with your normal email and your Decoy Password opens an isolated, benign decoy account instead of your real matches, messages, or private photos.</li>
        </ul>
        <h3 className="text-lg font-semibold">Safe Walk &amp; Panic Escalation (/safety)</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Live Safe Walk Tracking:</strong> Share your destination and live coordinates while heading to or from a meetup, then mark your walk completed when you arrive safely.</li>
          <li><strong>One-Tap Panic Alert:</strong> Triggering the Panic Button escalates any active Safe Walk to emergency status, logs a high-priority audit alert, and notifies your saved emergency contacts.</li>
        </ul>
      </div>
    )
  },
  'zk-proximity-and-federated-login': {
    category: 'Council Governance, Federation & Integrations',
    title: 'Zero-Knowledge Proximity Proofs, NFC Meetups & Fediverse Login',
    content: (
      <div className="space-y-4">
        <p>
          FWBer lets you prove real-world presence, confirm in-person meetups, and sign in with an external Mastodon/ActivityPub identity without surrendering raw GPS history or centralized passwords.
        </p>
        <h3 className="text-lg font-semibold">Zero-Knowledge Proximity Proofs &amp; Token Drops (/pulse)</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Ephemeral Geohash Proofs:</strong> When checking in at a venue, event, or Proximity Chatroom, your browser encodes your coordinates into a precision-7 geohash, signs an HMAC against FWBer&apos;s rotating daily epoch key, and discards your raw GPS coordinates before sending the proof.</li>
          <li><strong>Local Pulse Token Drops:</strong> Spot a golden <em>Token Drop</em> artifact on <strong>Local Pulse</strong> (<code>/pulse</code>) and tap <strong>Claim</strong> to atomically credit the escrowed FWB tokens to your wallet.</li>
        </ul>
        <h3 className="text-lg font-semibold">Physical NFC Meetup Verification &amp; AR Aura</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>NFC Tap-to-Verify:</strong> On NFC-capable devices, tap phones together during an in-person date to exchange a cryptographic nonce + geohash proof and instantly upgrade your mutual connection.</li>
          <li><strong>AR Aura Finder:</strong> Accepted matches who opt into location sharing can use the AR Aura compass to locate each other at crowded venues while respecting bidirectional blocks and private mode.</li>
        </ul>
        <h3 className="text-lg font-semibold">Sign-In with Mastodon / ActivityPub (/login)</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Bio Challenge Verification:</strong> Choose <strong>Federated Login</strong> on <code>/login</code>, enter your <code>@user@instance</code> handle, paste the one-time <code>fwber-verify-...</code> token into your remote profile bio, and click <strong>Verify Identity</strong> to sign straight into your dashboard.</li>
        </ul>
      </div>
    )
  }
}

export default function HelpArticlePage() {
  const params = useParams()
  const slug = params?.slug as string
  const article = HELP_ARTICLES[slug]
  const [feedbackVote, setFeedbackVote] = useState<'yes' | 'no' | null>(null)

  if (!article) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/help"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Help Center
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium text-primary mb-2">
            {article.category}
          </div>
          <CardTitle className="text-3xl">{article.title}</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          {article.content}
        </CardContent>

        {/* Feedback Section */}
        <div className="border-t border-border mt-8 pt-6 pb-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            {feedbackVote ? (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Thanks for your feedback! {feedbackVote === 'no' && <Link href="/feedback" className="underline ml-1">Tell us what was missing</Link>}
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground font-medium">Was this article helpful?</p>
                <div className="flex gap-4">
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setFeedbackVote('yes')}>
                    <ThumbsUp className="w-4 h-4" />
                    Yes
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setFeedbackVote('no')}>
                    <ThumbsDown className="w-4 h-4" />
                    No
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
