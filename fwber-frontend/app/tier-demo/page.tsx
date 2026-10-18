'use client'

import { useState } from 'react'
import { RelationshipTier } from '@/lib/relationshipTiers'
import RelationshipTierBadge from '@/components/RelationshipTierBadge'
import PhotoRevealGate from '@/components/PhotoRevealGate'
import TierUpgradeNotification from '@/components/TierUpgradeNotification'

// Mock data - using data URLs to avoid broken images
const mockPhotos = [
  { id: '1', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%234f46e5"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="white"%3EAI Photo 1%3C/text%3E%3C/svg%3E', isPrimary: true, type: 'ai' as const },
  { id: '2', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%236366f1"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="white"%3EAI Photo 2%3C/text%3E%3C/svg%3E', isPrimary: false, type: 'ai' as const },
  { id: '3', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%2310b981"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="white"%3EReal Photo 1%3C/text%3E%3C/svg%3E', isPrimary: false, type: 'real' as const },
  { id: '4', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%2314b8a6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="white"%3EReal Photo 2%3C/text%3E%3C/svg%3E', isPrimary: false, type: 'real' as const },
  { id: '5', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%2306b6d4"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="white"%3EReal Photo 3%3C/text%3E%3C/svg%3E', isPrimary: false, type: 'real' as const },
  { id: '6', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%233b82f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="white"%3EReal Photo 4%3C/text%3E%3C/svg%3E', isPrimary: false, type: 'real' as const },
  { id: '7', url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%238b5cf6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48" fill="white"%3EReal Photo 5%3C/text%3E%3C/svg%3E', isPrimary: false, type: 'real' as const },
]

export default function TierDemoPage() {
  const [currentTier, setCurrentTier] = useState<RelationshipTier>(RelationshipTier.DISCOVERY)
  const [messagesExchanged, setMessagesExchanged] = useState(0)
  const [daysConnected, setDaysConnected] = useState(0)
  const [hasMetInPerson, setHasMetInPerson] = useState(false)
  const [showUpgradeNotification, setShowUpgradeNotification] = useState(false)
  const [previousTier, setPreviousTier] = useState<RelationshipTier>(RelationshipTier.DISCOVERY)

  const tierOrder = [
    RelationshipTier.DISCOVERY,
    RelationshipTier.MATCHED,
    RelationshipTier.CONNECTED,
    RelationshipTier.ESTABLISHED,
    RelationshipTier.VERIFIED
  ]

  const handleTierChange = (newTier: RelationshipTier) => {

    const currentIndex = tierOrder.indexOf(currentTier)
    const newIndex = tierOrder.indexOf(newTier)

    if (newIndex > currentIndex) {
      setPreviousTier(currentTier)
      setCurrentTier(newTier)
      setShowUpgradeNotification(true)
    } else {
      setCurrentTier(newTier)
    }
  }

  const tierLabels = {
    [RelationshipTier.DISCOVERY]: 'Discovery',
    [RelationshipTier.MATCHED]: 'Matched',
    [RelationshipTier.CONNECTED]: 'Connected',
    [RelationshipTier.ESTABLISHED]: 'Established',
    [RelationshipTier.VERIFIED]: 'Verified'
  }

  return (
    <div className="min-h-screen bg-muted dark:bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-foreground dark:text-foreground">Relationship Tier System Demo</h1>
        <p className="text-muted-foreground dark:text-muted-foreground mb-8">
          Test the progressive photo reveal system
        </p>

        {/* Controls */}
        <div className="bg-card dark:bg-background rounded-lg border border-border dark:border-border dark:dark:border-border p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-foreground dark:text-foreground">Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tier selector */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground dark:text-muted-foreground">
                Relationship Tier
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(tierLabels).map(([tier, label]) => (
                  <button type="button"
                    key={tier}
                    onClick={() => handleTierChange(tier as RelationshipTier)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentTier === tier
                        ? 'bg-purple-600 text-white'
                        : 'bg-muted dark:bg-card text-foreground dark:text-muted-foreground hover:bg-muted dark:hover:dark:bg-muted'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground dark:text-muted-foreground">
                  Messages Exchanged: {messagesExchanged}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={messagesExchanged}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setMessagesExchanged(val)
                  }}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground dark:text-muted-foreground">
                  Days Connected: {daysConnected}
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={daysConnected}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setDaysConnected(val)
                  }}
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="metInPerson"
                  checked={hasMetInPerson}
                  onChange={(e) => {

                    setHasMetInPerson(e.target.checked)
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="metInPerson" className="text-sm font-medium text-foreground dark:text-muted-foreground">
                  Met in person
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tier Badges */}
          <div className="lg:col-span-1 space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-4 text-foreground dark:text-foreground">Current Status</h2>
              <RelationshipTierBadge
                tier={currentTier}
                messagesExchanged={messagesExchanged}
                daysConnected={daysConnected}
                hasMetInPerson={hasMetInPerson}
                showProgress={true}
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground dark:text-muted-foreground">Compact View:</h3>
              <RelationshipTierBadge
                tier={currentTier}
                compact={true}
              />
            </div>
          </div>

          {/* Photo Gallery */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-foreground dark:text-foreground">Photo Gallery</h2>
            <PhotoRevealGate
              photos={mockPhotos}
              currentTier={currentTier}
              messagesExchanged={messagesExchanged}
              daysConnected={daysConnected}
              onUnlockClick={() => {
                alert('In the real app, this would open a chat or prompt to send a message!')
              }}
            />
          </div>
        </div>

        {/* All Tiers Overview */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 text-foreground dark:text-foreground">All Tiers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tierLabels).map(([tier]) => (
              <RelationshipTierBadge
                key={tier}
                tier={Number(tier) as unknown as RelationshipTier}
                messagesExchanged={messagesExchanged}
                daysConnected={daysConnected}
                hasMetInPerson={hasMetInPerson}
                showProgress={false}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Upgrade Notification */}
      {showUpgradeNotification && (
        <TierUpgradeNotification
          previousTier={previousTier}
          newTier={currentTier}
          onClose={() => setShowUpgradeNotification(false)}
        />
      )}
    </div>
  )
}
