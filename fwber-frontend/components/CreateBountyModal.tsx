import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Sparkles, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/lib/hooks/use-toast";

interface CreateBountyModalProps {
  triggerClassName?: string;
  triggerLabel?: string;
}

export default function CreateBountyModal({
  triggerClassName,
  triggerLabel = "Create Match Bounty",
}: CreateBountyModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tokenAmount, setTokenAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [createdBountyUrl, setCreatedBountyUrl] = useState<string | null>(null);
  const { success, error } = useToast();

  const handleCreate = async () => {
    if (tokenAmount < 10) {
      error("Minimum bounty amount is 10 tokens.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post<{ share_url: string }>('/bounties', {
        token_reward: tokenAmount,
      });

      setCreatedBountyUrl(response.data.share_url);
      success("Bounty created! Share your link to get matches.");
    } catch (err: any) {
        // If it's a 402, it means insufficient funds
        if(err.status === 402) {
            error("Insufficient tokens. You don't have enough tokens to create this bounty.");
        } else {
            error(err.message || "Failed to create bounty.");
        }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdBountyUrl) {
      navigator.clipboard.writeText(createdBountyUrl);
      success("Bounty link copied to clipboard.");
    }
  };

  const reset = () => {
      setCreatedBountyUrl(null);
      setTokenAmount(100);
      setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && reset()}>
      <DialogTrigger asChild>
        <Button
            variant="outline"
            className={triggerClassName ?? "w-full gap-2 border-pink-500/50 text-pink-500 hover:bg-pink-500/10 hover:text-pink-400"}
            onClick={() => setIsOpen(true)}
        >
          <Sparkles className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md dark:bg-background dark:border-border text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
            Create Match Bounty
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Offer a token reward to friends who help you find a match!
          </DialogDescription>
        </DialogHeader>

        {!createdBountyUrl ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="dark:text-foreground">
                Token Reward Amount
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  min="10"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(parseInt(e.target.value) || 0)}
                  className="dark:bg-card dark:border-border text-white pl-4 pr-12"
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground uppercase font-bold">
                  Tokens
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                 Tokens move into escrow now and are only paid out when a successful match is made.
               </p>
            </div>
            <DialogFooter>
                <Button 
                    onClick={handleCreate} 
                    disabled={loading || tokenAmount < 10}
                    className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                >
                    {loading ? "Creating..." : "Create Bounty Link"}
                </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
             <div className="flex flex-col items-center justify-center space-y-2 text-center">
                 <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                     <CheckCircle2 className="h-6 w-6 text-green-500" />
                 </div>
                 <h3 className="font-semibold text-lg text-white">Bounty Active!</h3>
                 <p className="text-sm text-muted-foreground">Share this link with your friends or on social media.</p>
             </div>

            <div className="flex items-center space-x-2 bg-black/30 p-2 rounded-lg border dark:border-border">
              <code className="flex-1 text-sm font-mono text-muted-foreground truncate">
                {createdBountyUrl}
              </code>
              <Button size="sm" variant="ghost" onClick={copyToClipboard} className="hover:dark:bg-card text-muted-foreground">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
                <Button onClick={reset} variant="secondary" className="w-full">
                    Done
                </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
