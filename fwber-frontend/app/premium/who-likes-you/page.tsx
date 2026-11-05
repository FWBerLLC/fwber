'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/utils/avatar';
import { useWhoLikesYou, usePremiumStatus } from '@/lib/hooks/use-premium';
import { PremiumUpgradeModal } from '@/components/PremiumUpgradeModal';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { ShareToUnlock } from '@/components/viral/ShareToUnlock';
import { useAuth } from '@/lib/auth-context';

export default function WhoLikesYouPage() {
  const { user } = useAuth();
  const { data: premiumStatus, isLoading: isLoadingStatus } = usePremiumStatus();
  const { data: likers, isLoading: isLoadingLikers, refetch: refreshLikers } = useWhoLikesYou();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (isLoadingStatus) return <div className="p-8 text-center">Loading...</div>;

  // We handle "premium" logic differently now - we show everyone the list, but gate the details
  // const isPremium = premiumStatus?.is_premium;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Who Likes You ({likers?.length || 0})</h1>
      
      {isLoadingLikers ? (
        <div className="text-center py-12">Loading your admirers...</div>
      ) : likers?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No new likes yet. Keep your profile updated!
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {likers?.map((liker: any) => {
            const isLocked = liker.is_locked;

            const content = (
              <div className="relative h-full">
                 <div className="aspect-[3/4] relative">
                   {isLocked ? (
                      // Blurred/Locked State
                      <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center p-4">
                        <Lock className="w-8 h-8 text-muted-foreground mb-2" />
                        <div className="text-center">
                            <p className="text-sm font-bold text-muted-foreground">Someone</p>
                            <p className="text-xs text-muted-foreground">{liker.age} years old</p>
                        </div>
                        <div className="absolute inset-0 backdrop-blur-md bg-card dark:dark:bg-card/30" />
                      </div>
                   ) : (
                      // Unlocked State
                      <>
                        <Image 
                          src={getAvatarUrl(liker.photos?.[0]?.url || liker.avatar_url, liker.name)} 
                          alt={liker.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                          <p className="font-bold">{liker.name}, {liker.age}</p>
                        </div>
                      </>
                   )}
                 </div>
                 
                 {isLocked && (
                    <div className="absolute bottom-2 left-2 right-2">
                        <Button 
                            size="sm" 
                            className="w-full text-xs bg-pink-600 hover:bg-pink-700"
                            onClick={(e) => {
                                // Prevent bubbling if needed, though ShareToUnlock handles the click
                                // e.stopPropagation(); 
                            }}
                        >
                            Unlock
                        </Button>
                    </div>
                 )}
              </div>
            );

            return (
              <div key={liker.id} className="relative group overflow-hidden rounded-xl shadow-md bg-card dark:bg-card border border-border">
                {isLocked ? (
                   <ShareToUnlock
                     targetId={liker.id}
                     title="Reveal Admirer"
                     description="Share this app with a friend to reveal who this admirer is!"
                     onUnlock={() => {
                        // Refresh the list to get the unlocked data
                        refreshLikers();
                     }}
                   >
                      {content}
                   </ShareToUnlock>
                ) : (
                   <div onClick={() => {/* Navigate to profile */}}>
                      {content}
                   </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl text-center">
        <h3 className="font-bold text-lg mb-2">Want to see everyone instantly?</h3>
        <p className="text-muted-foreground mb-4">Upgrade to Gold to unlock all your admirers at once.</p>
        <Button 
            onClick={() => setShowUpgradeModal(true)}
            className="bg-gradient-to-r from-yellow-500 to-yellow-700 text-white font-bold"
        >
            Get Gold
        </Button>
      </div>

      <PremiumUpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </div>
  );
}
