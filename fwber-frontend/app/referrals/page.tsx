'use client';

import React, { useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { ReferralModal } from '@/components/viral/ReferralModal';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, DollarSign, Coins, Users, Shield, Gift, CheckCircle2, Info, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  level_2_referrals_count?: number;
  vouches_count: number;
  token_balance: number;
  pending_cash_usd: number;
  earned_token_rewards: number;
  has_applied_referral?: boolean;
  levels: ReferralLevelSummary[];
  reward_rules?: {
    level_1: { cash_usd: number; token_amount: number };
    level_2: { cash_usd: number; token_amount: number };
  };
}

interface ReferredMember {
  id: number;
  name: string;
  joined_at: string | null;
  token_reward: number;
}

interface ReceivedVouch {
  id: number;
  voucher_name: string;
  type: string;
  relationship_type: string | null;
  comment: string | null;
  is_verified: boolean;
  created_at: string | null;
}

interface ReferralsFeedResponse {
  summary: ReferralSummary;
  referrals: ReferredMember[];
  vouches: ReceivedVouch[];
  referred_by: { id: number; name: string } | null;
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [applyCode, setApplyCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://fwber.online');

  const { data: feed, isLoading } = useQuery({
    queryKey: ['referrals-page-feed'],
    enabled: !!user,
    queryFn: () => api.get<ReferralsFeedResponse>('/referrals'),
  });

  const summary = feed?.summary;
  const referredMembers = Array.isArray(feed?.referrals) ? feed.referrals : [];
  const vouches = Array.isArray(feed?.vouches) ? feed.vouches : [];
  const hasApplied = Boolean(summary?.has_applied_referral || feed?.referred_by);

  const referralLink = useMemo(() => {
    if (summary?.referral_link) return summary.referral_link;
    if (summary?.referral_code) return `${origin}/register?ref=${summary.referral_code}`;
    if ((user as any)?.referral_code) return `${origin}/register?ref=${(user as any).referral_code}`;
    return '';
  }, [summary, user, origin]);

  const vouchLink = useMemo(() => {
    if (summary?.vouch_link) return summary.vouch_link;
    if (summary?.referral_code) return `${origin}/vouch/${summary.referral_code}`;
    if ((user as any)?.referral_code) return `${origin}/vouch/${(user as any).referral_code}`;
    return '';
  }, [summary, user, origin]);

  const copyToClipboard = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Clipboard access unavailable');
    }
  };

  const handleShareLink = async (title: string, text: string, url: string, label: string) => {
    if (!url) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // User cancelled or share unavailable; fall back to copy
      }
    }
    await copyToClipboard(url, label);
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = applyCode.trim().toUpperCase();
    if (!trimmed) {
      toast.error('Enter a referral code first');
      return;
    }
    setIsApplying(true);
    try {
      const res = await api.post<{ message: string }>('/referrals/apply', { code: trimmed });
      toast.success(res?.message || 'Referral code applied!');
      setApplyCode('');
      queryClient.invalidateQueries({ queryKey: ['referrals-page-feed'] });
      queryClient.invalidateQueries({ queryKey: ['referral-summary'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to apply referral code');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <ProtectedRoute>
      <TooltipProvider delayDuration={200}>
        <div className="min-h-screen bg-muted dark:bg-background">
          <AppHeader title="Referrals & Vouches" />
          <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            <section className="rounded-2xl border-2 border-yellow-400/80 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-6 shadow-[0_0_40px_rgba(234,179,8,0.20)] relative overflow-hidden dark:from-gray-900 dark:via-yellow-950/30 dark:to-gray-900 dark:border-yellow-500/50">
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-foreground">Invite Friends &amp; Collect Vouches</h1>
                    <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-sm">
                      +50 FWB / Invite
                    </span>
                    <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                      2-Tier Rewards
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground/90 font-medium max-w-2xl">
                    Share your personal invite link to stack <span className="text-yellow-700 dark:text-yellow-400 font-bold">FWB tokens</span>, collect verified friend vouches (<span className="font-semibold">Safe, Fun, Hot</span>), or redeem a friend&apos;s invite code for an instant welcome bonus.
                  </p>
                </div>
                <ReferralModal />
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<Users className="h-5 w-5" />}
                label="Direct Referrals"
                tooltip="Members who signed up or redeemed your personal referral code."
                value={summary?.referrals_count ?? (user as any)?.referrals_count ?? 0}
                color="blue"
              />
              <MetricCard
                icon={<Shield className="h-5 w-5" />}
                label="Trust Vouches"
                tooltip="Verified Safe, Fun, or Hot vouches submitted via your public Vouch link."
                value={summary?.vouches_count ?? (user as any)?.vouches_count ?? 0}
                color="purple"
              />
              <MetricCard
                icon={<Coins className="h-5 w-5" />}
                label="Earned FWB Rewards"
                tooltip="Cumulative FWB tokens earned across Level-1 (50 FWB) and Level-2 (15 FWB) referrals."
                value={summary?.earned_token_rewards ?? 0}
                color="yellow"
              />
              <MetricCard
                icon={<DollarSign className="h-5 w-5" />}
                label="Partner Bonus Pool"
                tooltip="Estimated two-tier revenue share accrued across direct and second-level network growth."
                value={`$${Number(summary?.pending_cash_usd ?? 0).toFixed(2)}`}
                color="green"
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Invite Link Card */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Gift className="h-5 w-5 text-emerald-500" />
                    Your Invite Link
                  </h2>
                  {summary?.referral_code && (
                    <Badge variant="outline" className="font-mono">Code: {summary.referral_code}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Friends receive a 25 FWB welcome bonus and you earn 50 FWB immediately when they join.
                </p>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading your invite link…</p>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      readOnly
                      value={referralLink}
                      aria-label="Your referral invite link"
                      className="flex-1 font-mono text-xs bg-background text-foreground"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => copyToClipboard(referralLink, 'Invite link')}
                        disabled={!referralLink}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleShareLink('Join me on fwber', 'Use my link to get bonus FWB tokens!', referralLink, 'Invite link')}
                        disabled={!referralLink}
                        aria-label="Share invite link"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* Vouch Link Card */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-500" />
                    Your Reputation Vouch Link
                  </h2>
                  <Badge variant="secondary">{vouches.length} received</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Friends don&apos;t even need an account to vouch for you as <strong>Safe</strong>, <strong>Fun</strong>, or <strong>Hot</strong>.
                </p>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading your vouch link…</p>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      readOnly
                      value={vouchLink}
                      aria-label="Your public vouch link"
                      className="flex-1 font-mono text-xs bg-background text-foreground"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => copyToClipboard(vouchLink, 'Vouch link')}
                        disabled={!vouchLink}
                        className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleShareLink('Vouch for me on fwber', 'Click to vouch for my reputation on fwber!', vouchLink, 'Vouch link')}
                        disabled={!vouchLink}
                        aria-label="Share vouch link"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Redeem a Friend's Referral Code */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    Have a Friend&apos;s Referral Code?
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Each account can redeem one referral code. You receive 25 FWB and your friend earns 50 FWB.
                      </TooltipContent>
                    </Tooltip>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasApplied
                      ? `Referral code already redeemed${feed?.referred_by?.name ? ` (invited by ${feed.referred_by.name})` : ''}.`
                      : 'Forgot to use an invite link at signup? Enter their code here to unlock +25 FWB for yourself and +50 FWB for them.'}
                  </p>
                </div>

                {hasApplied ? (
                  <Badge className="bg-emerald-600 text-white gap-1.5 py-1.5 px-3 self-start sm:self-center">
                    <CheckCircle2 className="h-4 w-4" />
                    Referral Applied
                  </Badge>
                ) : (
                  <form onSubmit={handleApplyCode} className="flex w-full sm:w-auto gap-2">
                    <Input
                      value={applyCode}
                      onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g. A1B2C3D4)"
                      maxLength={24}
                      className="font-mono uppercase sm:w-52 bg-background text-foreground"
                    />
                    <Button type="submit" disabled={isApplying || !applyCode.trim()}>
                      {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redeem'}
                    </Button>
                  </form>
                )}
              </div>
            </section>

            {/* Referred Friends & Received Vouches */}
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Invited Members ({referredMembers.length})</h2>
                {referredMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No direct referrals yet. Share your invite link above to earn 50 FWB per friend!
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {referredMembers.map((member) => (
                      <div key={member.id} className="py-3 flex items-center justify-between text-sm">
                        <div>
                          <div className="font-semibold text-foreground">{member.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Joined {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'recently'}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-amber-600 dark:text-amber-300">
                          +{member.token_reward} FWB
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Recent Vouches ({vouches.length})</h2>
                {vouches.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No vouches yet. Send your Vouch link to trusted friends to boost your trust rank in Nearby &amp; Venues.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {vouches.map((vouch) => (
                      <div key={vouch.id} className="rounded-xl border border-border bg-background/60 p-3 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{vouch.voucher_name}</span>
                          <Badge variant="outline" className="capitalize">{vouch.type}</Badge>
                        </div>
                        {vouch.comment && (
                          <p className="text-xs text-muted-foreground italic">&ldquo;{vouch.comment}&rdquo;</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}

function MetricCard({
  icon,
  label,
  tooltip,
  value,
  color = 'emerald',
}: {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  value: React.ReactNode;
  color?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-border' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
    green:   { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  };
  const c = colorMap[color] || colorMap.emerald;
  return (
    <div className={`rounded-2xl border ${c.border} bg-card p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`inline-flex rounded-xl ${c.bg} p-3 ${c.text}`}>{icon}</div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-black text-foreground">{value}</div>
    </div>
  );
}
