import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Gift as GiftIcon, Coins, Send } from 'lucide-react';
import { useGifts, useSendGift } from '@/lib/hooks/use-gifts';
import { useWallet } from '@/lib/hooks/useWallet';
import Image from 'next/image';

interface GiftShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: number;
  receiverName: string;
}

export default function GiftShopModal({ isOpen, onClose, receiverId, receiverName }: GiftShopModalProps) {
  const { data: gifts, isLoading } = useGifts();
  const { mutate: sendGift, isPending } = useSendGift();
  const { data: wallet } = useWallet();
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!selectedGiftId) return;

    sendGift({ receiverId, giftId: selectedGiftId, message }, {
      onSuccess: () => {
        alert('Gift sent successfully!');
        onClose();
        setSelectedGiftId(null);
        setMessage('');
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || 'Failed to send gift');
      },
    });
  };

  const tokenBalance = parseFloat(wallet?.balance || '0');
  const selectedGift = gifts?.find(g => g.id === selectedGiftId);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-50 dark:bg-gray-900 dark:text-white overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-bold flex items-center gap-2">
              <GiftIcon className="w-6 h-6 text-pink-500" />
              Send a Gift to {receiverName}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex items-center gap-2 mb-6 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="font-medium">Your Balance: {tokenBalance} Tokens</span>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading gifts...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {gifts?.map((gift) => (
                <button type="button"
                  key={gift.id}
                  onClick={() => setSelectedGiftId(gift.id)}
                  className={`p-4 border-2 rounded-xl transition-all flex flex-col items-center gap-2 relative ${
                    selectedGiftId === gift.id
                      ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                      : 'border-gray-200 hover:border-pink-300 dark:border-gray-700'
                  }`}
                >
                  <div className="relative w-16 h-16">
                    {/* Placeholder for actual icons, using emoji for now if url fails or just text */}
                    <div className="text-4xl flex items-center justify-center w-full h-full">
                        {/* Map category/name to emoji for fallback visual */}
                        {gift.name === 'Rose' ? '🌹' : 
                         gift.name === 'Coffee' ? '☕' :
                         gift.name === 'Cocktail' ? '🍸' :
                         gift.name === 'Teddy Bear' ? '🧸' :
                         gift.name === 'Diamond' ? '💎' :
                         gift.name === 'Rocket' ? '🚀' : '🎁'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm">{gift.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{gift.cost} Tokens</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Message (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                placeholder="Add a personal note..."
                rows={3}
              />
            </div>

            <button type="button"
              onClick={handleSend}
              disabled={!selectedGiftId || isPending || (selectedGift && tokenBalance < selectedGift.cost)}
              className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${
                !selectedGiftId || isPending || (selectedGift && tokenBalance < selectedGift.cost)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-pink-600 hover:bg-pink-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isPending ? 'Sending...' : (
                <>
                  <Send className="w-4 h-4" />
                  Send Gift {selectedGift ? `(${selectedGift.cost} Tokens)` : ''}
                </>
              )}
            </button>
            
            {selectedGift && tokenBalance < selectedGift.cost && (
                <p className="text-center text-sm text-red-500">
                    Insufficient token balance.
                </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
