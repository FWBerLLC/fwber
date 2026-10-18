'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { X, Clock, CheckCircle, UserCheck, Share2, Brain, Lock, Crown, UserPlus } from 'lucide-react'
import PhotoRevealGate from './PhotoRevealGate'
import SecurePhotoReveal from './SecurePhotoReveal'
import { RelationshipTier } from '@/lib/relationshipTiers'
import { useFeatureFlag } from '@/lib/hooks/use-feature-flags'
import { PresenceIndicator, usePresenceContext } from './realtime/PresenceComponents'
import { useRelationshipTier } from '@/lib/hooks/useRelationshipTier'
import { apiClient } from '@/lib/api/client'
import { photoAPI } from '@/lib/api/photos'
import { useToast } from '@/components/ToastProvider'
import { useAuth } from '@/lib/auth-context'

interface ProfileViewModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: number
    profile?: {
      display_name: string | null
      age: number | null
      bio?: string
      subscription_price?: number
      photos?: Array<{
        id: number
        url: string
        is_private: boolean
        is_primary: boolean
        is_unlocked?: boolean
      }>
    }
  }
  messagesExchanged: number
  matchId?: number;
  onAction?: (action: 'like' | 'pass' | 'super_like') => void;
}

export default function ProfileViewModal({ isOpen, onClose, user, messagesExchanged, matchId, onAction }: ProfileViewModalProps) {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [isUnlockedViaShare, setIsUnlockedViaShare] = useState(false)
  const [locallyUnlockedPhotos, setLocallyUnlockedPhotos] = useState<Set<number>>(new Set())
  const { isEnabled: faceRevealEnabled } = useFeatureFlag('face_reveal')
  const { onlineUsers } = usePresenceContext()
  const { showSuccess, showError, addToast } = useToast()
  
  const [insights, setInsights] = useState<any>(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const { 
    tierData,
    isLoading: tierLoading,
    incrementMessages,
    markAsMetInPerson
  } = useRelationshipTier(user.id, matchId || null)

  const currentTier = tierData?.tier
  const userConfirmedMeeting = tierData?.userConfirmedMeeting
  const otherUserConfirmedMeeting = tierData?.otherUserConfirmedMeeting
  
  // Check if user is online
  const isUserOnline = onlineUsers?.some(u => u.user_id === user.id.toString() && u.status === 'online')

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      // Check if unlocked via share
      apiClient.get<{ unlocked: boolean }>(`/share-unlock/${user.id}`)
        .then(res => setIsUnlockedViaShare(res.data.unlocked))
        .catch(() => setIsUnlockedViaShare(false))

      // Fetch insights
      setInsightLoading(true)
      apiClient.get<{ data: any }>(`/matches/${user.id}/insights`)
        .then(res => setInsights(res.data.data))
        .catch(err => console.error('Failed to load insights', err))
        .finally(() => setInsightLoading(false))

      // Check subscription
      if (user.profile?.subscription_price && user.profile.subscription_price > 0 && currentUser?.id !== user.id) {
          apiClient.get(`/subscriptions/creator/${user.id}`)
            .then(res => {
                const data = res.data as { is_subscribed: boolean };
                setIsSubscribed(data.is_subscribed);
            })
            .catch(console.error)
      }

    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, user.id, currentUser?.id, user.profile?.subscription_price])

  const handleShare = async () => {
    try {
      // Generate link (mock for now, or use real wingman link)
      const link = `${window.location.origin}/profile/${user.id}?ref=${user.id}` // In real app, use current user ID as ref
      await navigator.clipboard.writeText(link)
      
      // Record share
      await apiClient.post('/share-unlock', {
        target_profile_id: user.id,
        platform: 'copy_link'
      })
      
      setIsUnlockedViaShare(true)
      
      showSuccess(
        "Link copied!",
        "Profile unlocked! Share this link with a friend."
      )
    } catch (error) {
      console.error('Share failed', error)
      showError(
        "Share failed",
        "Could not copy link."
      )
    }
  }

  const handleSubscribe = async () => {
    if (!confirm(`Subscribe to ${user.profile?.display_name} for ${(user.profile as any)?.subscription_price} FWB?`)) return
    try {
        await apiClient.post(`/subscriptions/creator/${user.id}`)
        setIsSubscribed(true)
        showSuccess('Subscribed!', 'You now have full access to this profile.')
    } catch (e: any) {
        showError('Subscription failed', e.response?.data?.error || 'Insufficient funds')
    }
  }

  const handleInsightUnlock = async () => {
    try {
      await apiClient.post(`/matches/${user.id}/insights/unlock`)
      showSuccess("Unlocked!", "AI Insights revealed.")
      // Refresh
      const res = await apiClient.get<{ data: any }>(`/matches/${user.id}/insights`)
      setInsights(res.data.data)
    } catch (error: any) {
      if (error.response?.status === 402) {
        addToast({
            type: 'error',
            title: 'Insufficient Tokens',
            message: 'You need 10 tokens to unlock this report.',
            action: {
              label: 'Buy Tokens',
              onClick: () => {
                onClose()
                router.push('/wallet')
              }
            }
          })
      } else {
        showError("Unlock Failed", "Could not unlock report.")
      }
    }
  }

  const handleTokenUnlock = async (photoId: string) => {
    try {
      const result = await photoAPI.unlockPhoto(photoId)
      if (result.success) {
        setLocallyUnlockedPhotos(prev => new Set(prev).add(parseInt(photoId)))
        showSuccess(
          "Photo Unlocked!",
          `You spent 50 tokens. Remaining balance: ${result.balance}`
        )
      } else {
        showError("Unlock Failed", result.message)
      }
    } catch (error) {
      console.error('Unlock failed', error)
      const errorMessage = error instanceof Error ? error.message : "Could not unlock photo"
      
      if (errorMessage.includes('Insufficient tokens')) {
        addToast({
          type: 'error',
          title: 'Insufficient Tokens',
          message: 'You need more tokens to unlock this photo.',
          action: {
            label: 'Buy Tokens',
            onClick: () => {
              onClose()
              router.push('/wallet')
            }
          }
        })
      } else {
        showError("Unlock Failed", errorMessage)
      }
    }
  }

  if (!isVisible && !isOpen) return null

  // Map API photos to PhotoRevealGate format
  const photos = user.profile?.photos?.map(p => ({
    id: p.id.toString(),
    url: p.url,
    isPrimary: p.is_primary,
    // Assume private photos are 'real' and public are 'ai' for now, 
    // or just treat all as 'real' if we want to test the blur logic on everything.
    // In a real app, we'd have a clear distinction.
    // For testing Face Reveal, we want 'real' photos to be blurred.
    type: 'real' as const,
    isPrivate: p.is_private,
    isUnlocked: p.is_unlocked || locallyUnlockedPhotos.has(p.id) || isSubscribed
  })) || []

  // Simple photo grid for when Face Reveal is disabled
  const SimplePhotoGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {user.profile?.photos?.map((photo) => (
        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted dark:bg-card">
          <Image
            src={photo.url}
            alt="Photo"
            fill
            className="object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {photo.is_primary && (
            <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
              Primary
            </div>
          )}
        </div>
      ))}
      {(!user.profile?.photos || user.profile.photos.length === 0) && (
        <div className="col-span-full text-center py-8 text-muted-foreground">
          No photos available
        </div>
      )}
    </div>
  )

  return (
    <div data-testid="profile-modal" className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full max-w-2xl bg-card dark:bg-background rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-border dark:border-border dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Presence Indicator */}
            <PresenceIndicator 
              userId={user.id.toString()} 
              size="md" 
              showLabel 
              className="flex-shrink-0"
            />
            <div>
              <h2 className="text-xl font-bold text-foreground dark:text-foreground">
                {user.profile?.display_name || 'User'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {user.profile?.age && (
                  <span>{user.profile.age} years old</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" 
              onClick={handleShare}
              className="p-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/20"
              aria-label="Share to unlock"
              title="Share to unlock photos"
            >
              <Share2 className="w-6 h-6" />
            </button>
            <button type="button" 
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-muted-foreground rounded-full hover:bg-muted dark:bg-card dark:hover:bg-gray-800"
              aria-label="Close profile view"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {/* Subscription Banner */}
          {user.profile?.subscription_price && user.profile.subscription_price > 0 && !isSubscribed && currentUser?.id !== user.id && (
            <div className="mb-6 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                    <h3 className="text-amber-900 dark:text-amber-100 font-bold flex items-center gap-2">
                        <Crown className="w-5 h-5" />
                        Creator Subscription
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        Unlock all private photos and insights.
                    </p>
                </div>
                <button type="button"
                    onClick={handleSubscribe}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors flex flex-col items-center leading-tight"
                >
                    <span>Subscribe</span>
                    <span className="text-xs opacity-90">{user.profile.subscription_price} FWB/mo</span>
                </button>
            </div>
          )}

          {user.profile?.bio && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</h3>
              <p className="text-foreground dark:text-foreground dark:text-foreground">{user.profile.bio}</p>
            </div>
          )}

          {/* AI Insights Section */}
          <div className="mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800">
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Compatibility Report
            </h3>

            {insightLoading ? (
               <div className="animate-pulse h-20 bg-muted dark:bg-gray-700 rounded-lg"></div>
            ) : insights ? (
               <div className="space-y-4">
                  {/* Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground text-sm">Overall Match Score</span>
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{insights.total_score}%</span>
                  </div>

                  {insights.is_locked && !isSubscribed ? (
                    <div className="bg-card dark:bg-gray-800/50 dark:bg-black/20 p-4 rounded-lg backdrop-blur-sm border border-white/20 text-center">
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-3 filter blur-[3px]">
                           Based on your lifestyle and preferences, we found that you are highly compatible in...
                        </p>
                        <button type="button"
                          onClick={handleInsightUnlock}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-4 rounded-full flex items-center gap-2 mx-auto transition-colors"
                        >
                          <Lock className="w-3 h-3" />
                          Unlock Analysis (10 Tokens)
                        </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                        <div className="text-sm text-foreground dark:text-foreground dark:text-foreground italic">
                           &ldquo;{insights.ai_explanation}&rdquo;
                        </div>
                        {insights.breakdown && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-card dark:bg-card p-2 rounded">
                                   <span className="text-muted-foreground block">Base</span>
                                   <span className="font-bold">{insights.breakdown.base}%</span>
                                </div>
                                <div className="bg-card dark:bg-card p-2 rounded">
                                   <span className="text-muted-foreground block">Lifestyle</span>
                                   <span className="font-bold">{insights.breakdown.preferences}%</span>
                                </div>
                                <div className="bg-card dark:bg-card p-2 rounded">
                                   <span className="text-muted-foreground block">Communication</span>
                                   <span className="font-bold">{insights.breakdown.communication}%</span>
                                </div>
                                <div className="bg-card dark:bg-card p-2 rounded">
                                   <span className="text-muted-foreground block">Mutual</span>
                                   <span className="font-bold">{insights.breakdown.mutual}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                  )}
               </div>
            ) : (
                <p className="text-xs text-muted-foreground">Analysis unavailable.</p>
            )}
          </div>

          {/* Meeting Confirmation Section */}
          {currentTier === RelationshipTier.ESTABLISHED && (
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Verify Relationship
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
                To unlock the final tier and see all photos, both of you need to confirm that you&apos;ve met in person.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button type="button"
                  onClick={() => markAsMetInPerson()}
                  disabled={userConfirmedMeeting}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    userConfirmedMeeting
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 cursor-default'
                      : 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500'
                  }`}
                >
                  {userConfirmedMeeting ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      You confirmed meeting
                    </>
                  ) : (
                    'I met this person'
                  )}
                </button>
                
                <div className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${
                  otherUserConfirmedMeeting
                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
                    : 'bg-muted text-muted-foreground border-border dark:bg-card dark:border-border dark:text-muted-foreground'
                }`}>
                  {otherUserConfirmedMeeting ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      They confirmed meeting
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      Waiting for them...
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Photos</h3>
            {faceRevealEnabled ? (
              <PhotoRevealGate
                photos={photos}
                currentTier={currentTier || RelationshipTier.MATCHED} 
                messagesExchanged={messagesExchanged}
                daysConnected={1} // Mock
                isUnlockedViaShare={isUnlockedViaShare}
                onTokenUnlock={handleTokenUnlock}
              />
            ) : (
              <SimplePhotoGrid />
            )}
          </div>

          {/* Floating Action Buttons */}
          {onAction && (
            <div className="sticky bottom-0 left-0 right-0 py-4 bg-gradient-to-t from-white dark:from-gray-900 via-white dark:via-gray-900 flex justify-center gap-6 z-30">
              <button type="button"
                className="h-14 w-14 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 bg-card dark:bg-card"
                onClick={() => {
                  onAction('pass');
                  onClose();
                }}
              >
                <X className="h-8 w-8" />
              </button>

              <button type="button"
                className="h-10 w-10 rounded-full border-2 border-blue-400 text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center mt-2 shadow-lg transition-transform hover:scale-110 active:scale-95 bg-card dark:bg-card"
                onClick={() => {
                  onAction('super_like');
                  onClose();
                }}
              >
                <Star className="h-5 w-5" />
              </button>

              <button type="button"
                className="h-14 w-14 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 bg-card dark:bg-card"
                onClick={() => {
                  onAction('like');
                  onClose();
                }}
              >
                <Heart className="h-8 w-8" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function Star(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function Heart(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}
