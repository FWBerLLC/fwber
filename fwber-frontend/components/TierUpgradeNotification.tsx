'use client'

import { RelationshipTier, getTierInfo } from '@/lib/relationshipTiers'
import { CheckCircle, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface TierUpgradeNotificationProps {
  previousTier: RelationshipTier
  newTier: RelationshipTier
  onClose: () => void
  autoCloseMs?: number
}

export default function TierUpgradeNotification({
  previousTier,
  newTier,
  onClose,
  autoCloseMs = 10000
}: TierUpgradeNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const tierInfo = getTierInfo(newTier)
  const previousTierInfo = getTierInfo(previousTier)

  const shouldHide = previousTier === newTier

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for fade out animation
  }, [onClose])

  useEffect(() => {
    // Fade in animation
    const openTimer = setTimeout(() => setIsVisible(true), 100)

    // Auto close
    if (autoCloseMs > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, autoCloseMs)
      return () => { clearTimeout(timer); clearTimeout(openTimer) }
    }
  }, [autoCloseMs, handleClose])

  const colorClasses = {
    gray: 'from-gray-400 to-gray-600',
    blue: 'from-blue-400 to-blue-600',
    purple: 'from-purple-400 to-purple-600',
    pink: 'from-pink-400 to-pink-600',
    green: 'from-green-400 to-green-600'
  }

  if (shouldHide) {
    return null
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative bg-card dark:bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all duration-300 ${
        isVisible ? 'scale-100' : 'scale-95'
      }`}>
        {/* Close button */}
        <button type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-200"
          aria-label="Close notification"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Confetti effect */}
        <div className="absolute -top-8 -left-8 w-16 h-16 opacity-20">
          <Sparkles className="w-full h-full text-yellow-400 animate-pulse" />
        </div>
        <div className="absolute -top-4 -right-4 w-12 h-12 opacity-20">
          <Sparkles className="w-full h-full text-pink-400 animate-pulse" />
        </div>

        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${
            colorClasses[tierInfo.color as keyof typeof colorClasses]
          } mb-4`}>
            <span className="text-4xl">{tierInfo.icon}</span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-2 text-foreground dark:text-foreground">
            Relationship Upgraded!
          </h2>

          {/* Tier progression */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-lg opacity-60">{previousTierInfo.icon} {previousTierInfo.name}</span>
            <span className="text-2xl">→</span>
            <span className="text-lg font-bold">{tierInfo.icon} {tierInfo.name}</span>
          </div>

          {/* Description */}
          <p className="text-muted-foreground dark:text-muted-foreground mb-6">
            {tierInfo.description}
          </p>

          {/* New unlocks */}
          <div className="bg-muted dark:bg-background dark:bg-card rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-sm mb-3 text-foreground dark:text-muted-foreground">
              What&apos;s new:
            </h3>
            <ul className="space-y-2">
              {tierInfo.unlocks.map((unlock, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-left">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                  <span className="text-foreground dark:text-muted-foreground">{unlock}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <button type="button"
            onClick={handleClose}
            className={`w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r ${
              colorClasses[tierInfo.color as keyof typeof colorClasses]
            } hover:opacity-90 transition-opacity`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
