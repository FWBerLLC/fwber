import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Rocket, Zap, Coins, CreditCard } from 'lucide-react';
import { usePurchaseBoost } from '@/lib/hooks/use-boosts';
import { useWallet } from '@/lib/hooks/useWallet';

interface BoostPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BoostPurchaseModal({ isOpen, onClose }: BoostPurchaseModalProps) {
  const { mutate: purchaseBoost, isPending } = usePurchaseBoost();
  const { data: wallet } = useWallet();
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'token'>('token');

  const handlePurchase = (type: 'standard' | 'super') => {
    purchaseBoost({ type, paymentMethod }, {
      onSuccess: (data: any) => {
        if (data.checkoutUrl) {
          // If Stripe checkout URL is provided, redirect to Stripe
          window.location.href = data.checkoutUrl;
        } else {
          // Token purchase or immediate success
          onClose();
        }
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || 'Failed to purchase boost');
      },
    });
  };

  const tokenBalance = parseFloat(wallet?.balance || '0');

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-50 dark:bg-gray-900 dark:text-white">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-bold flex items-center gap-2">
              <Rocket className="w-6 h-6 text-purple-600" />
              Boost Your Profile
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-gray-600 dark:text-gray-300 mb-6">
            Get up to 10x more profile views by being a top profile in your area.
          </Dialog.Description>

          {/* Payment Method Selector */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button type="button"
              onClick={() => setPaymentMethod('token')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                paymentMethod === 'token'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600 dark:text-purple-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Coins className="w-4 h-4" />
              Tokens ({tokenBalance})
            </button>
            <button type="button"
              onClick={() => setPaymentMethod('stripe')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                paymentMethod === 'stripe'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600 dark:text-purple-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Card
            </button>
          </div>

          <div className="space-y-4">
            {/* Standard Boost */}
            <button type="button"
              onClick={() => handlePurchase('standard')}
              disabled={isPending || (paymentMethod === 'token' && tokenBalance < 50)}
              className={`w-full p-4 border-2 rounded-xl transition-all group text-left relative overflow-hidden ${
                paymentMethod === 'token' && tokenBalance < 50
                  ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'
                  : 'border-purple-100 hover:border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 dark:border-purple-800'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Standard Boost</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">30 Minutes</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {paymentMethod === 'token' ? '50 Tokens' : '$4.99'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 pl-[52px]">
                Be the top profile in your area for 30 minutes.
              </p>
            </button>

            {/* Super Boost */}
            <button type="button"
              onClick={() => handlePurchase('super')}
              disabled={isPending || (paymentMethod === 'token' && tokenBalance < 100)}
              className={`w-full p-4 border-2 rounded-xl transition-all group text-left relative overflow-hidden ${
                paymentMethod === 'token' && tokenBalance < 100
                  ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'
                  : 'border-amber-100 hover:border-amber-500 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800'
              }`}
            >
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs px-2 py-1 rounded-bl-lg font-medium">
                BEST VALUE
              </div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600 dark:bg-amber-900 dark:text-amber-300">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Super Boost</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">2 Hours</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {paymentMethod === 'token' ? '100 Tokens' : '$9.99'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 pl-[52px]">
                Maximize your visibility for 2 full hours.
              </p>
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-gray-400">
            By purchasing, you agree to our Terms of Service.
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
