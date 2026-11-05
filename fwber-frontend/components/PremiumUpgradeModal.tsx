import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Star, Coins, CreditCard } from 'lucide-react';
import { useInitiatePurchase, usePurchasePremium } from '@/lib/hooks/use-premium';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { StripePaymentForm } from './StripePaymentForm';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/lib/hooks/useWallet';
import type { PremiumInitiationResponse } from '@/lib/hooks/use-premium';

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumUpgradeModal = ({ isOpen, onClose }: PremiumUpgradeModalProps) => {
  const { mutate: initiate, isPending: isInitiating } = useInitiatePurchase();
  const { mutate: purchaseWithToken, isPending: isPurchasingToken } = usePurchasePremium();
  const { data: wallet } = useWallet();
  const [paymentIntent, setPaymentIntent] = useState<PremiumInitiationResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'token'>('token');
  const queryClient = useQueryClient();

  const handleUpgrade = () => {
    if (paymentMethod === 'token') {
      purchaseWithToken({ paymentMethod: 'token' }, {
        onSuccess: () => {
          handleSuccess();
        },
        onError: (error: any) => {
           alert(error.response?.data?.error || 'Failed to purchase premium');
        }
      });
    } else {
      initiate('gold_monthly', {
        onSuccess: (data) => {
          // Only proceed if we got a valid client_secret from Stripe
          if (data?.client_secret) {
            setPaymentIntent(data);
          } else {
            alert('Card payments are not yet available. Please use tokens to upgrade.');
          }
        },
        onError: (error: any) => {
          alert(error?.response?.data?.error || 'Card payments are not yet available. Please use tokens to upgrade.');
        }
      });
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['premium-status'] });
    queryClient.invalidateQueries({ queryKey: ['user'] });
    onClose();
    setPaymentIntent(null);
  };

  const handleCancel = () => {
    setPaymentIntent(null);
  };

  const tokenBalance = parseFloat(wallet?.balance || '0');
  const tokenPrice = 200;
  const stripeEnabled = !!stripePromise;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setPaymentIntent(null);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-yellow-600">
            <Star className="fill-yellow-600" /> Upgrade to Gold
          </DialogTitle>
          <DialogDescription>
            Unlock exclusive features and supercharge your dating experience.
          </DialogDescription>
        </DialogHeader>
        
        {!paymentIntent ? (
          <>
            <div className="space-y-4 py-4">
              {/* Features List */}
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold">See Who Likes You</h4>
                  <p className="text-sm text-muted-foreground">Reveal your secret admirers instantly.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Unlimited Swipes</h4>
                  <p className="text-sm text-muted-foreground">No more daily limits. Swipe as much as you want.</p>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="flex gap-2 p-1 bg-muted dark:bg-card rounded-lg mt-4">
                <button type="button"
                  onClick={() => setPaymentMethod('token')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                    paymentMethod === 'token'
                      ? 'bg-card dark:dark:bg-muted shadow-sm text-purple-600 dark:text-purple-400'
                      : 'text-muted-foreground hover:text-foreground dark:text-muted-foreground'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  Tokens ({tokenBalance})
                </button>
                <button type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  disabled={!stripeEnabled}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                    paymentMethod === 'stripe'
                      ? 'bg-card dark:dark:bg-muted shadow-sm text-purple-600 dark:text-purple-400'
                      : 'text-muted-foreground hover:text-foreground dark:text-muted-foreground'
                  } ${!stripeEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <CreditCard className="w-4 h-4" />
                  Card
                </button>
              </div>
              {!stripeEnabled && (
                <p className="text-xs text-amber-600 text-center">
                  Card payments are unavailable until `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is configured in production.
                </p>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-col gap-2">
              <Button 
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-700 hover:from-yellow-600 hover:to-yellow-800 text-white font-bold py-6 text-lg"
                onClick={handleUpgrade}
                disabled={isInitiating || isPurchasingToken || (paymentMethod === 'token' && tokenBalance < tokenPrice)}
              >
                {isInitiating || isPurchasingToken ? 'Processing...' : (
                  paymentMethod === 'token' ? `Upgrade for ${tokenPrice} Tokens` : 'Continue to card payment'
                )}
              </Button>
              {paymentMethod === 'token' && tokenBalance < tokenPrice && (
                <p className="text-xs text-red-500 text-center">Insufficient tokens. Earn more by inviting friends!</p>
              )}
              <Button variant="ghost" onClick={onClose} className="w-full">
                Maybe Later
              </Button>
            </DialogFooter>
          </>
        ) : stripeEnabled ? (
          <Elements stripe={stripePromise} options={{ clientSecret: paymentIntent.client_secret }}>
            <StripePaymentForm 
              onSuccess={handleSuccess} 
              onCancel={handleCancel}
              amount={paymentIntent.amount}
            />
          </Elements>
        ) : (
          <div className="py-4 text-sm text-amber-600">
            Card payments are currently unavailable because Stripe is not configured.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
