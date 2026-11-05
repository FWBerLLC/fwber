'use client';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Coins, X, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useWallet } from '@/lib/hooks/useWallet';

interface TipButtonProps {
  recipientId: number;
  recipientName: string;
  compact?: boolean;
}

export default function TipButton({ recipientId, recipientName, compact = false }: TipButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const { refresh } = useWallet();

  const handleTip = async () => {
    setLoading(true);
    try {
      await apiClient.post('/wallet/transfer', {
        recipient_id: recipientId,
        amount: parseFloat(amount)
      });
      refresh();
      setIsOpen(false);
      alert(`Sent ${amount} FWB to ${recipientName}!`);
    } catch (e: any) {
      alert('Tip failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        {compact ? (
          <button
            className="p-2 hover:dark:bg-muted rounded-full text-muted-foreground hover:text-yellow-400 transition-colors"
            title={`Tip ${recipientName}`}
          >
            <Coins className="w-5 h-5" />
          </button>
        ) : (
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors font-medium dark:bg-purple-900/40 dark:text-purple-300">
            <Coins className="w-4 h-4" />
            Tip
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-card p-[25px] shadow-lg focus:outline-none z-50 dark:bg-card dark:text-foreground">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-bold">Tip {recipientName}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {['10', '50', '100'].map((amt) => (
                <button type="button"
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`p-2 rounded border transition-colors ${
                    amount === amt
                      ? 'bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                      : 'border-border hover:border-purple-300 dark:border-border'
                  }`}
                >
                  {amt} FWB
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 p-2 border rounded dark:dark:bg-muted dark:border-border"
                placeholder="Custom Amount"
              />
            </div>

            <button type="button"
              onClick={handleTip}
              disabled={loading || !amount}
              className="w-full bg-purple-600 text-white p-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Tip
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
