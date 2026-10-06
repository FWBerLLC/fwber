'use client';

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/hooks/use-toast';
import { api } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import {
  Gift,
  Copy,
  Ticket,
  Users,
  Twitter,
  Mail,
  MessageCircle,
  Share2,
  Shield,
  Flame,
  PartyPopper,
  Loader2,
  Coins,
  DollarSign,
  Sparkles,
} from 'lucide-react';

interface ReferralModalProps {
  trigger?: React.ReactNode;
}

interface ReferralLevelSummary {
  level: number;
  count: number;
  cash_usd: number;
  token_amount: number;
}

interface ReferralSummary {
  referral_code: string;
  referral_link: string;
  vouch_link: string;
  golden_tickets_remaining: number;
  referrals_count: number;
  vouches_count: number;
  token_balance: number;
  pending_cash_usd: number;
  earned_token_rewards: number;
  levels: ReferralLevelSummary[];
  reward_rules: {
    level_1: { cash_usd: number; token_amount: number };
    level_2: { cash_usd: number; token_amount: number };
  };
}

export function ReferralModal({ trigger }: ReferralModalProps) {
  const { user } = useAuth();
  const { success } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'invite' | 'vouch'>('invite');

  const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://fwber.site');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['referral-summary'],
    enabled: isOpen && !!user,
    queryFn: () => api.get<ReferralSummary>('/referrals/summary'),
  });

  const fallbackCode = user?.referral_code ?? '';
  const referralLink = summary?.referral_link ?? (fallbackCode ? `${origin}/register?ref=${fallbackCode}` : '');
  const vouchLink = summary?.vouch_link ?? (fallbackCode ? `${origin}/vouch/${fallbackCode}` : '');

  const inviteCount = summary?.referrals_count ?? user?.referrals_count ?? 0;
  const vouchCount = summary?.vouches_count ?? user?.vouches_count ?? 0;
  const tokenBalance = summary?.token_balance ?? user?.token_balance ?? 0;
  const goldenTickets = summary?.golden_tickets_remaining ?? user?.golden_tickets_remaining ?? 0;

  const directPremium = useMemo(
    () => summary?.levels.find(level => level.level === 1),
    [summary]
  );

  const indirectPremium = useMemo(
    () => summary?.levels.find(level => level.level === 2),
    [summary]
  );

  if (!user) return null;

  const shareText = '🔥 Join me on fwber! Use my link to get 50 Tokens and 3 Days of Gold Premium instantly.';
  const vouchText = "Can you vouch for me? I'm building my reputation on fwber. Click to verify I'm legit!";

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    success('Link copied to clipboard.');
  };

  const openInviteTab = () => {
    setActiveTab('invite');
    setIsOpen(true);
  };

  const openVouchTab = () => {
    setActiveTab('vouch');
    setIsOpen(true);
  };

  const handleNativeShare = async (title: string, text: string, url: string) => {
    if (!url) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              onClick={openInviteTab}
              className="group relative gap-2 overflow-hidden border border-amber-300/70 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 px-5 text-sm font-extrabold text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.45)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(251,191,36,0.65)]"
            >
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_transparent_55%)] opacity-80" />
              <span className="absolute inset-y-0 left-[-35%] w-1/3 -skew-x-12 bg-white dark:bg-gray-800/40 blur-md transition-transform duration-500 group-hover:translate-x-[230%]" />
              <Sparkles className="relative h-4 w-4 animate-pulse" />
              <Gift className="relative h-4 w-4" />
              <span className="relative">Invite &amp; Earn</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={openVouchTab}
              className="gap-2 border-blue-300/70 bg-gradient-to-r from-sky-500/15 to-indigo-500/15 font-semibold text-blue-700 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-blue-400 hover:bg-blue-500/10 hover:text-blue-800 dark:text-blue-100 dark:hover:text-white"
            >
              <Shield className="h-4 w-4" />
              Get Vouched
            </Button>
          </div>
          <p className="max-w-[260px] text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500">
            Earn real money from referrals!
          </p>
        </div>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="w-6 h-6 text-primary" />
            Viral Rewards
          </DialogTitle>
          <DialogDescription>
            Invite friends, collect vouches, and earn two-level premium rewards.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Premium referral payouts</div>
          <div className="mt-1">
            Direct upgrades: <strong>${summary?.reward_rules.level_1.cash_usd ?? 2}</strong> + <strong>{summary?.reward_rules.level_1.token_amount ?? 50} FWBcoin</strong>
          </div>
          <div>
            Second level: <strong>${summary?.reward_rules.level_2.cash_usd ?? 0.5}</strong> + <strong>{summary?.reward_rules.level_2.token_amount ?? 15} FWBcoin</strong>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'invite' | 'vouch')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite Friends</TabsTrigger>
            <TabsTrigger value="vouch">Get Vouched</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 py-4">
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-500 rounded-full text-white">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-100">Golden Tickets</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <span className="font-bold">{goldenTickets}</span> tickets remaining.
                  </p>
                </div>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-2">
                Friends get <strong>3 Days of Gold Premium</strong> instantly, and premium upgrades pay your uplines automatically.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Invite Link</label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={referralLink || 'Generating your invite link...'}
                  className="font-mono text-sm bg-muted"
                />
                <Button size="icon" disabled={!referralLink} onClick={() => copyToClipboard(referralLink)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Refreshing your referral data...
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!referralLink}
                onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`, '_blank')}
              >
                <Twitter className="w-4 h-4" /> Post
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!referralLink}
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${referralLink}`)}`, '_blank')}
              >
                <MessageCircle className="w-4 h-4" /> Chat
              </Button>
              <Button variant="outline" size="sm" className="gap-2" disabled={!referralLink} onClick={() => handleNativeShare('Join fwber', shareText, referralLink)}>
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="vouch" className="space-y-4 py-4">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-100">Build Your Reputation</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Ask friends to vouch for you as <strong>Safe</strong>, <strong>Fun</strong>, or <strong>Hot</strong>.
                  </p>
                </div>
              </div>
              <div className="text-center my-2 bg-white dark:bg-gray-800/50 rounded-lg py-2">
                <span className="text-2xl font-bold text-blue-700">{vouchCount}</span>
                <span className="text-xs text-blue-600 uppercase tracking-wide ml-1">Vouches Received</span>
              </div>
              <div className="flex gap-2 mt-3 justify-center">
                <span className="flex items-center text-xs bg-white dark:bg-gray-800/50 px-2 py-1 rounded-full text-green-700 font-bold"><Shield className="w-3 h-3 mr-1" /> Safe</span>
                <span className="flex items-center text-xs bg-white dark:bg-gray-800/50 px-2 py-1 rounded-full text-purple-700 font-bold"><PartyPopper className="w-3 h-3 mr-1" /> Fun</span>
                <span className="flex items-center text-xs bg-white dark:bg-gray-800/50 px-2 py-1 rounded-full text-orange-700 font-bold"><Flame className="w-3 h-3 mr-1" /> Hot</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Vouch Link</label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={vouchLink || 'Generating your vouch link...'}
                  className="font-mono text-sm bg-muted"
                />
                <Button size="icon" disabled={!vouchLink} onClick={() => copyToClipboard(vouchLink)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!vouchLink}
                onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(vouchText)}&url=${encodeURIComponent(vouchLink)}`, '_blank')}
              >
                <Twitter className="w-4 h-4" /> Ask
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!vouchLink}
                onClick={() => window.open(`mailto:?subject=Vouch for me?&body=${encodeURIComponent(`${vouchText}\n\n${vouchLink}`)}`, '_blank')}
              >
                <Mail className="w-4 h-4" /> Email
              </Button>
              <Button variant="outline" size="sm" className="gap-2" disabled={!vouchLink} onClick={() => handleNativeShare('Vouch for Me', vouchText, vouchLink)}>
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="rounded bg-background p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-primary">
              <DollarSign className="w-4 h-4" />
              {(summary?.pending_cash_usd ?? 0).toFixed(2)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending Cash</div>
          </div>
          <div className="rounded bg-background p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-primary">
              <Coins className="w-4 h-4" />
              {(summary?.earned_token_rewards ?? 0).toFixed(0)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Earned FWBcoin</div>
          </div>
          <div className="rounded bg-background p-3 text-center">
            <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
              {inviteCount}
              <Users className="w-4 h-4" />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Invites</div>
          </div>
          <div className="rounded bg-background p-3 text-center">
            <div className="text-lg font-bold text-primary">{Number(tokenBalance).toFixed(0)}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Wallet Balance</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border p-3">
            <div className="font-medium text-foreground">Direct premium referrals</div>
            <div className="mt-1 text-muted-foreground">
              {directPremium?.count ?? 0} upgrades, ${(directPremium?.cash_usd ?? 0).toFixed(2)} cash, {(directPremium?.token_amount ?? 0).toFixed(0)} FWBcoin
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-medium text-foreground">Second-level premium referrals</div>
            <div className="mt-1 text-muted-foreground">
              {indirectPremium?.count ?? 0} upgrades, ${(indirectPremium?.cash_usd ?? 0).toFixed(2)} cash, {(indirectPremium?.token_amount ?? 0).toFixed(0)} FWBcoin
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
