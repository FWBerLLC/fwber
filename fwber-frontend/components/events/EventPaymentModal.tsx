import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Calendar, Coins, CreditCard, Ticket } from 'lucide-react';
import { useRsvpEvent } from '@/lib/hooks/use-events';
import { useWallet } from '@/lib/hooks/useWallet';
import { Event } from '@/lib/api/events';

interface EventPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
}

export default function EventPaymentModal({ isOpen, onClose, event }: EventPaymentModalProps) {
  const { mutate: rsvpEvent, isPending } = useRsvpEvent();
  const { data: wallet, refresh: refreshWallet } = useWallet();
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'token'>('token');

  React.useEffect(() => {
    if (isOpen) {
      refreshWallet();
    }
  }, [isOpen, refreshWallet]);

  const handlePurchase = () => {
    rsvpEvent({ 
      id: event.id, 
      status: 'attending',
      paymentMethod: paymentMethod 
    }, {
      onSuccess: () => {
        refreshWallet();
        onClose();
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || 'Failed to purchase ticket');
      },
    });
  };

  const tokenBalance = parseFloat(wallet?.balance || '0');
  const tokenPrice = event.token_cost ?? ((event.price || 0) * 10);
  const usdPrice = event.price || 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-card p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-50 dark:bg-background dark:text-foreground">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-bold flex items-center gap-2">
              <Ticket className="w-6 h-6 text-purple-600" />
              Purchase Ticket
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-muted-foreground dark:text-muted-foreground mb-6">
            Secure your spot for <strong>{event.title}</strong>.
          </Dialog.Description>

          {/* Payment Method Selector */}
          <div className="flex gap-2 mb-6 p-1 bg-muted dark:bg-card rounded-lg">
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
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                paymentMethod === 'stripe'
                  ? 'bg-card dark:dark:bg-muted shadow-sm text-purple-600 dark:text-purple-400'
                  : 'text-muted-foreground hover:text-foreground dark:text-muted-foreground'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Card
            </button>
          </div>

          <div className="space-y-4">
            {/* Ticket Info */}
            <div className="p-4 border-2 border-purple-100 bg-purple-50/50 dark:bg-purple-900/20 dark:border-purple-800 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground dark:text-foreground">General Admission</h3>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                        {new Date(event.starts_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {paymentMethod === 'token' ? `${tokenPrice} Tokens` : `$${usdPrice.toFixed(2)}`}
                </span>
              </div>
            </div>

            <button type="button"
              onClick={handlePurchase}
              disabled={isPending || (paymentMethod === 'token' && tokenBalance < tokenPrice)}
              className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all ${
                isPending || (paymentMethod === 'token' && tokenBalance < tokenPrice)
                  ? 'bg-muted cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isPending ? 'Processing...' : `Pay ${paymentMethod === 'token' ? `${tokenPrice} Tokens` : `$${usdPrice.toFixed(2)}`}`}
            </button>
            
            {paymentMethod === 'token' && tokenBalance < tokenPrice && (
                <div className="text-center space-y-2">
                    <p className="text-sm text-red-500 font-medium">
                        Insufficient token balance.
                    </p>
                    <a 
                        href="/wallet" 
                        className="text-sm text-purple-600 hover:text-purple-700 underline"
                        onClick={(e) => {
                             // Let navigation happen naturally
                        }}
                    >
                        Top up your wallet
                    </a>
                </div>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            By purchasing, you agree to our Terms of Service.
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
