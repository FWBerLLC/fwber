'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import CreateBountyModal from '@/components/CreateBountyModal';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Info,
  Target,
  Coins,
  ShieldAlert,
  ArrowLeft,
  Share2,
  Heart,
  Users,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface BountySuggestion {
  id: number;
  status: string;
  created_at: string;
  matchmaker: { id: number; name: string };
  candidate: { id: number; name: string; avatar_url: string | null };
}

interface BountyItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  reward_amount: number;
  rewardTokens?: number;
  status: string;
  share_url: string;
  assist_count?: number;
  expires_at?: string;
  created_at?: string;
  author?: string;
  is_owner?: boolean;
  creator?: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
  suggestions?: BountySuggestion[];
}

export default function BountiesPage() {
  const [activeTab, setActiveTab] = useState<'community' | 'mine'>('community');
  const [sortBy, setSortBy] = useState<'newest' | 'reward'>('newest');
  const [bounties, setBounties] = useState<BountyItem[]>([]);
  const [myBounties, setMyBounties] = useState<BountyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBounties = useCallback(async () => {
    setLoading(true);
    try {
      const [commRes, mineRes] = await Promise.all([
        api.get<{ data?: BountyItem[]; bounties?: BountyItem[] }>(`/bounties?sort=${sortBy}`),
        api
          .get<{ data?: BountyItem[]; bounties?: BountyItem[] }>('/bounties?mine=true')
          .catch(() => ({ data: [], bounties: [] })),
      ]);

      const commList = Array.isArray(commRes?.data)
        ? commRes.data
        : Array.isArray(commRes?.bounties)
        ? commRes.bounties
        : [];
      const mineList = Array.isArray(mineRes?.data)
        ? mineRes.data
        : Array.isArray(mineRes?.bounties)
        ? mineRes.bounties
        : [];

      setBounties(commList);
      setMyBounties(mineList);
    } catch (e: any) {
      toast.error(e?.message || 'Error loading matchmaker bounties');
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    loadBounties();
  }, [loadBounties]);

  const handleCopyShareLink = async (bounty: BountyItem) => {
    const url =
      bounty.share_url ||
      (typeof window !== 'undefined' ? `${window.location.origin}/bounty/${bounty.slug}` : '');
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Bounty link copied to clipboard!');
    } catch {
      toast.error('Unable to copy link');
    }
  };

  const displayed = activeTab === 'community' ? bounties : myBounties;

  return (
    <ProtectedRoute>
      <TooltipProvider delayDuration={200}>
        <div className="min-h-screen bg-background text-foreground">
          <AppHeader />

          <main className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <Target className="w-8 h-8 text-pink-500" />
                  Matchmaker Bounties Hub
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="How Matchmaker Bounties work" className="text-muted-foreground hover:text-foreground">
                        <Info className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Members escrow FWB tokens to reward trusted matchmakers who introduce compatible matches. Share any bounty link or suggest a candidate directly.
                    </TooltipContent>
                  </Tooltip>
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={loadBounties}
                      disabled={loading}
                      aria-label="Refresh bounties"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh active bounties and incoming introductions</TooltipContent>
                </Tooltip>

                <CreateBountyModal
                  triggerLabel="Post a Bounty"
                  triggerClassName="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white border-0 gap-2"
                  onCreated={loadBounties}
                />
              </div>
            </div>

            <Card className="bg-card shadow-sm border border-border">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Earn FWB by Playing Matchmaker
                    </CardTitle>
                    <CardDescription>
                      Introduce friends or community members to open bounties, or manage your own escrowed links and candidate suggestions.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('community')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'community'
                          ? 'bg-pink-600 text-white'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Community Bounties ({bounties.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('mine')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'mine'
                          ? 'bg-pink-600 text-white'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      My Bounties ({myBounties.length})
                    </button>
                  </div>
                </div>

                {activeTab === 'community' && (
                  <div className="flex items-center gap-2 pt-3 border-t border-border mt-3 text-xs">
                    <span className="text-muted-foreground font-medium">Sort by:</span>
                    <button
                      type="button"
                      onClick={() => setSortBy('newest')}
                      className={`px-2.5 py-1 rounded-md ${
                        sortBy === 'newest' ? 'bg-secondary text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Newest
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('reward')}
                      className={`px-2.5 py-1 rounded-md ${
                        sortBy === 'reward' ? 'bg-secondary text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Highest Reward
                    </button>
                  </div>
                )}
              </CardHeader>
            </Card>

            {loading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center p-12 bg-card rounded-xl border border-border space-y-3">
                <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold text-foreground">
                  {activeTab === 'community' ? 'No active community bounties yet' : 'You have not posted any bounties yet'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {activeTab === 'community'
                    ? 'Be the first to escrow an FWB reward and share your personal matchmaker link with friends.'
                    : 'Create a Matchmaker Bounty above to generate a shareable link and start receiving curated introductions.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayed.map((bounty) => {
                  const reward = bounty.reward_amount ?? bounty.rewardTokens ?? 0;
                  const authorName = bounty.creator?.name || bounty.author || 'Member';
                  const assistCount = bounty.assist_count ?? 0;

                  return (
                    <Card key={bounty.id} className="hover:shadow-md transition-shadow border-border bg-card flex flex-col justify-between">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <h3 className="font-bold text-lg text-foreground truncate">{bounty.title}</h3>
                            <p className="text-xs text-muted-foreground">
                              Posted by <span className="font-medium text-foreground">{authorName}</span>
                            </p>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg text-sm shrink-0">
                                <Coins className="w-4 h-4" /> {reward} FWB
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Escrowed reward paid upon successful match</TooltipContent>
                          </Tooltip>
                        </div>

                        <p className="text-muted-foreground text-sm line-clamp-3">{bounty.description}</p>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {assistCount} {assistCount === 1 ? 'introduction' : 'introductions'}
                          </span>
                          <Badge variant={bounty.status === 'active' ? 'default' : 'secondary'} className="uppercase text-[10px]">
                            {bounty.status}
                          </Badge>
                        </div>

                        {Array.isArray(bounty.suggestions) && bounty.suggestions.length > 0 && (
                          <div className="bg-muted/50 rounded-lg p-3 space-y-2 border border-border">
                            <p className="text-xs font-semibold text-foreground">Suggested Candidates:</p>
                            {bounty.suggestions.map((s) => (
                              <div key={s.id} className="flex items-center justify-between text-xs">
                                <span>
                                  <strong className="text-foreground">{s.candidate.name}</strong>{' '}
                                  <span className="text-muted-foreground">via {s.matchmaker.name}</span>
                                </span>
                                <Link
                                  href={`/profile/${s.candidate.id}`}
                                  className="text-pink-500 hover:underline inline-flex items-center gap-1 font-medium"
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <Link href={`/bounty/${bounty.slug}`} className="flex-1">
                            <Button type="button" size="sm" className="w-full gap-1.5 bg-pink-600 hover:bg-pink-700 text-white">
                              <Heart className="w-3.5 h-3.5" />
                              {bounty.is_owner ? 'Open Bounty Page' : 'Suggest a Match'}
                            </Button>
                          </Link>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyShareLink(bounty)}
                                aria-label="Copy shareable bounty link"
                              >
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy shareable matchmaker link</TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}
