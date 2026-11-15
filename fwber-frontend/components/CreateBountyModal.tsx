'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Sparkles, CheckCircle2, Info } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/use-toast';

interface CreateBountyModalProps {
  triggerClassName?: string;
  triggerLabel?: string;
  onCreated?: () => void;
}

export default function CreateBountyModal({
  triggerClassName,
  triggerLabel = 'Create Match Bounty',
  onCreated,
}: CreateBountyModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tokenAmount, setTokenAmount] = useState(100);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdBountyUrl, setCreatedBountyUrl] = useState<string | null>(null);
  const { success, error } = useToast();

  const handleCreate = async () => {
    if (tokenAmount < 10) {
      error('Minimum bounty amount is 10 tokens.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post<{ share_url: string; slug?: string }>('/bounties', {
        token_reward: tokenAmount,
        description: description.trim() || undefined,
      });

      const fallbackUrl =
        typeof window !== 'undefined' && response.data?.slug
          ? `${window.location.origin}/bounty/${response.data.slug}`
          : '';
      setCreatedBountyUrl(response.data?.share_url || fallbackUrl);
      success('Bounty created! Share your link to receive match introductions.');
      onCreated?.();
    } catch (err: any) {
      if (err?.status === 402 || err?.response?.status === 402) {
        error("Insufficient FWB tokens. Top up your wallet or choose a smaller bounty reward.");
      } else {
        error(err?.response?.data?.error || err?.message || 'Failed to create bounty.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdBountyUrl) {
      navigator.clipboard.writeText(createdBountyUrl);
      success('Bounty link copied to clipboard.');
    }
  };

  const reset = () => {
    setCreatedBountyUrl(null);
    setTokenAmount(100);
    setDescription('');
    setIsOpen(false);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : reset())}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={
              triggerClassName ??
              'gap-2 border-pink-500/50 text-pink-500 hover:bg-pink-500/10 hover:text-pink-400'
            }
          >
            <Sparkles className="h-4 w-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
              Create Match Bounty
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Escrow FWB tokens to reward friends or community matchmakers who introduce a great match.
            </DialogDescription>
          </DialogHeader>

          {!createdBountyUrl ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bounty-amount" className="text-foreground flex items-center gap-1.5">
                  Token Reward Amount
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Minimum 10 FWB. Tokens are held in escrow immediately and released when an introduction becomes an established match.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="relative">
                  <Input
                    id="bounty-amount"
                    type="number"
                    min="10"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(parseInt(e.target.value, 10) || 0)}
                    className="bg-background border-border text-foreground pl-4 pr-16"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground uppercase font-bold">
                    FWB
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bounty-desc" className="text-foreground">
                  What are you looking for? <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="bounty-desc"
                  type="text"
                  maxLength={240}
                  placeholder="e.g., Creative night owl for live jazz, coffee dates, or weekend hikes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading || tokenAmount < 10}
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
                >
                  {loading ? 'Creating...' : `Escrow ${tokenAmount} FWB & Create Link`}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Bounty Active!</h3>
                <p className="text-sm text-muted-foreground">
                  Share this link with friends or let community matchmakers suggest introductions.
                </p>
              </div>

              <div className="flex items-center space-x-2 bg-muted p-2 rounded-lg border border-border">
                <code className="flex-1 text-xs font-mono text-foreground truncate">
                  {createdBountyUrl}
                </code>
                <Button type="button" size="sm" variant="ghost" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button type="button" onClick={reset} variant="secondary" className="w-full">
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
