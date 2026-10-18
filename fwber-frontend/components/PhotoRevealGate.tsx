'use client'

import { useState } from 'react'
import { RelationshipTier, getVisiblePhotoCount } from '@/lib/relationshipTiers'
import { Lock, Unlock, MessageCircle, Heart, X } from 'lucide-react'
import Image from 'next/image'
import FaceReveal from './FaceReveal'

interface Photo {
  id: string
  url: string
  isPrimary: boolean
  type: 'ai' | 'real'
  isPrivate?: boolean
  isUnlocked?: boolean
  unlockPrice?: number
}

interface PhotoRevealGateProps {
  photos: Photo[]
  currentTier: RelationshipTier
  messagesExchanged?: number
  daysConnected?: number
  onUnlockClick?: () => void
  onTokenUnlock?: (photoId: string) => void
  className?: string
  isUnlockedViaShare?: boolean
}

function UnlockButton({ photoId, price, onUnlock }: { photoId: string, price: number, onUnlock: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex gap-1 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onUnlock(photoId) }}
          className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1.5 px-3 rounded-full shadow-lg"
        >
          Confirm
        </button>
        <button type="button"
          onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 px-2 rounded-full shadow-lg"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <button type="button"
      onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
      className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold py-1.5 px-3 rounded-full transition-colors flex items-center gap-1 shadow-lg"
    >
      <Unlock className="w-3 h-3" /> Unlock ({price} 🪙)
    </button>
  )
}

export default function PhotoRevealGate({
  photos,
  currentTier,
  messagesExchanged = 0,
  daysConnected = 0,
  onUnlockClick,
  onTokenUnlock,
  className = '',
  isUnlockedViaShare = false
}: PhotoRevealGateProps) {
  // Filter out private photos first, they are handled separately
  const privatePhotos = photos.filter(p => p.isPrivate)
  const publicRealPhotos = photos.filter(p => p.type === 'real' && !p.isPrivate)
  const aiPhotos = photos.filter(p => p.type === 'ai')
  
  let visibility = getVisiblePhotoCount(currentTier, publicRealPhotos.length)
  
  // Override visibility if unlocked via share
  if (isUnlockedViaShare) {
    visibility = { real: publicRealPhotos.length, ai: 999, blurred: 0 }
  }
  
  // Separate public photos by visibility status
  const visibleRealPhotos = publicRealPhotos.slice(0, visibility.real)
  const blurredRealPhotos = publicRealPhotos.slice(visibility.real, visibility.real + visibility.blurred)
  const lockedRealPhotos = publicRealPhotos.slice(visibility.real + visibility.blurred)
  
  // Determine what's needed for next unlock
  const getUnlockMessage = () => {
    if (isUnlockedViaShare) {
      return 'Unlocked via Share!'
    }
    if (currentTier === RelationshipTier.DISCOVERY) {
      return 'Match to unlock real photos'
    }
    if (currentTier === RelationshipTier.MATCHED) {
      const messagesNeeded = Math.max(0, 10 - messagesExchanged)
      return messagesNeeded > 0 
        ? `Send ${messagesNeeded} more ${messagesNeeded === 1 ? 'message' : 'messages'} to unlock clear photos`
        : 'Unlocking more photos...'
    }
    if (currentTier === RelationshipTier.CONNECTED) {
      const messagesNeeded = Math.max(0, 50 - messagesExchanged)
      const daysNeeded = Math.max(0, 7 - daysConnected)
      if (messagesNeeded > 0 && daysNeeded > 0) {
        return `${messagesNeeded} more messages & ${daysNeeded} more days to unlock full gallery`
      }
      if (messagesNeeded > 0) {
        return `${messagesNeeded} more messages to unlock full gallery`
      }
      if (daysNeeded > 0) {
        return `${daysNeeded} more days to unlock full gallery`
      }
      return 'Unlocking full gallery...'
    }
    if (currentTier === RelationshipTier.ESTABLISHED) {
      return 'Meet in person to unlock verified access'
    }
    return 'All photos unlocked!'
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* AI Photos - Always visible */}
        {aiPhotos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted dark:bg-card">
            <Image
              src={photo.url}
              alt="AI generated photo"
              fill
              className="object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              AI
            </div>
          </div>
        ))}

        {/* Private Photos - Handled separately */}
        {privatePhotos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted dark:bg-card group">
            <Image
              src={photo.url}
              alt="Private Photo"
              fill
              className={`object-cover ${!photo.isUnlocked ? 'blur-xl' : ''}`}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {photo.isUnlocked ? (
              <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Unlock className="w-3 h-3" /> Unlocked
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                <Lock className="w-8 h-8 text-white mb-2" />
                <p className="text-white text-xs font-bold mb-2">Private Photo</p>
                {onTokenUnlock && (
                  <UnlockButton
                    photoId={photo.id}
                    price={photo.unlockPrice || 50}
                    onUnlock={onTokenUnlock}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Visible Real Photos */}
        {visibleRealPhotos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted dark:bg-card">
            <Image
              src={photo.url}
              alt="Photo"
              fill
              className="object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {photo.isPrimary && (
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                Primary
              </div>
            )}
          </div>
        ))}

        {/* Blurred Real Photos */}
        {blurredRealPhotos.map((photo, index) => (
          <div 
            key={photo.id} 
            className="relative w-full pb-[100%] rounded-lg overflow-hidden cursor-pointer group bg-muted dark:bg-card"
            onClick={onUnlockClick}
          >
            <FaceReveal
              src={photo.url}
              alt="Blurred photo"
              revealProgress={
                currentTier === RelationshipTier.MATCHED 
                  ? Math.min(95, (messagesExchanged / 10) * 100)
                  : 0
              }
              fill
              className="absolute inset-0 w-full h-full"
            />
          </div>
        ))}

        {/* Locked Real Photos */}
        {lockedRealPhotos.map((photo, index) => (
          <div 
            key={photo.id} 
            className="relative aspect-square rounded-lg bg-gray-800 flex items-center justify-center cursor-pointer group"
            onClick={onUnlockClick}
          >
            <div className="text-center text-muted-foreground">
              <Lock className="w-8 h-8 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold">Locked</p>
            </div>
          </div>
        ))}
      </div>

      {/* Unlock Progress Message */}
      {currentTier !== RelationshipTier.VERIFIED && (lockedRealPhotos.length > 0 || blurredRealPhotos.length > 0) && (
        <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {currentTier === RelationshipTier.DISCOVERY ? (
                <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              ) : (
                <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                {getUnlockMessage()}
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                {lockedRealPhotos.length + blurredRealPhotos.length} {lockedRealPhotos.length + blurredRealPhotos.length === 1 ? 'photo' : 'photos'} waiting to be unlocked
              </p>
            </div>
          </div>
        </div>
      )}

      {/* All Unlocked Message */}
      {(currentTier === RelationshipTier.VERIFIED || isUnlockedViaShare) && (
        <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3">
            <Unlock className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="font-semibold text-sm text-green-900 dark:text-green-100">
              {isUnlockedViaShare ? 'Photos unlocked via sharing!' : 'All photos unlocked! You have complete access.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
