'use client';

import { useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { ReferralModal } from '@/components/viral/ReferralModal';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { Copy, DollarSign, Coins, Users, Shield } from 'lucide-react';

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
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://fwber.site');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['referrals-page-summary'],
    enabled: !!user,
    queryFn: () => api.get<ReferralSummary>('/referrals/summary'),
  });

  const referralLink = useMemo(() => {
    if (summary?.referral_link) return summary.referral_link;
    if (summary?.referral_code) return `${origin}/register?ref=${summary.referral_code}`;
    if (user?.referral_code) return `${origin}/register?ref=${user.referral_code}`;
    return '';
  }, [summary, user, origin]);

  const copy = async (value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppHeader title="Referrals" />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border-2 border-yellow-400/80 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-6 shadow-[0_0_40px_rgba(234,179,8,0.25)] relative overflow-hidden dark:from-gray-900 dark:via-yellow-950/30 dark:to-gray-900 dark:border-yellow-500/50">
            <div className="absolute top-3 right-4 text-4xl animate-bounce" style={{animationDuration:'2s'}}>🪙</div>
            <div className="absolute bottom-3 left-5 text-3xl animate-bounce" style={{animationDuration:'2.5s', animationDelay:'0.5s'}}>💰</div>
            <div className="absolute top-1/2 right-20 text-2xl animate-bounce" style={{animationDuration:'3s', animationDelay:'1s'}}>🪙</div>

            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white">EARN GOLD COINS & REAL MONEY 💸</h1>
                  <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-sm animate-pulse">🪙 Rewards</span>
                  <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-white animate-pulse">💵 Real Cash</span>
                </div>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 font-medium">
                  Share your link, stack <span className="text-yellow-600 dark:text-yellow-400 font-bold">FWBcoin</span>, and unlock <span className="text-green-600 dark:text-green-400 font-bold">real-money bonuses</span> as your network grows. Your referrals literally pay off.
                </p>
              </div>
              <ReferralModal />
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Users className="h-5 w-5" />} label="Referrals" value={summary?.referrals_count ?? (user as any)?.referrals_count ?? 0} color="blue" />
            <MetricCard icon={<Shield className="h-5 w-5" />} label="Vouches" value={summary?.vouches_count ?? (user as any)?.vouches_count ?? 0} color="purple" />
            <MetricCard icon={<Coins className="h-5 w-5" />} label="🪙 Token Rewards" value={summary?.earned_token_rewards ?? 0} color="yellow" />
            <MetricCard icon={<DollarSign className="h-5 w-5" />} label="💵 Pending Cash" value={`$${Number(summary?.pending_cash_usd ?? 0).toFixed(2)}`} color="green" />
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Link</h2>
            {isLoading ? (
              <p className="mt-3 text-sm text-gray-500">Loading referral summary…</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  readOnly
                  value={referralLink}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
                <button
                  onClick={() => copy(referralLink)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function MetricCard({ icon, label, value, color = 'emerald' }: { icon: React.ReactNode; label: string; value: React.ReactNode; color?: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-300', border: 'border-gray-200 dark:border-gray-700' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
    green:   { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  };
  const c = colorMap[color] || colorMap.emerald;
  return (
    <div className={`rounded-2xl border ${c.border} bg-white p-5 shadow-sm dark:bg-gray-900`}>
      <div className={`mb-3 inline-flex rounded-xl ${c.bg} p-3 ${c.text}`}>{icon}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
