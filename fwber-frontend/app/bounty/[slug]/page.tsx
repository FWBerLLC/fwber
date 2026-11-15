'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User, Coins, Heart, CheckCircle, Search, ArrowLeft, Share2, Info } from 'lucide-react';
import OptimizedImage from '@/components/OptimizedImage';
import { getAvatarUrl } from '@/lib/utils/avatar';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

interface Bounty {
  slug: string;
  token_reward: number;
  status: string;
  description?: string;
  share_url?: string;
  user: {
    id: number;
    name: string;
    avatar_url: string;
    profile: {
      display_name: string;
      age: number;
      bio: string;
      gender: string;
    } | null;
    photos: {
      id: number;
      url: string;
      is_primary: boolean;
    }[];
  };
}

interface CandidateUser {
  id: number;
  name: string;
  username?: string;
  avatar_url?: string;
}

export default function BountyPage() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Suggestion State
  const [showSuggestUI, setShowSuggestUI] = useState(false);
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateUser | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (currentUser && searchParams.get('action') === 'suggest') {
      setShowSuggestUI(true);
    }
  }, [currentUser, searchParams]);

  useEffect(() => {
    const fetchBounty = async () => {
      try {
        const response = await apiClient.get<{ bounty: Bounty }>(`/matchmaker/bounty/${slug}`);
        setBounty(response.data.bounty);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Bounty not found');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBounty();
    }
  }, [slug]);

  const fetchCandidates = useCallback(async (query: string) => {
    try {
      if (query.trim().length >= 2) {
        const res = await apiClient.get<any[]>(`/friends/search?q=${encodeURIComponent(query.trim())}`);
        const raw = Array.isArray(res.data) ? res.data : [];
        setCandidates(
          raw.map((u: any) => ({
            id: Number(u.id),
            name: u.display_name || u.name || `User #${u.id}`,
            username: u.username || '',
            avatar_url: u.avatar_url || '',
          }))
        );
        return;
      }

      const response = await apiClient.get<any>('/friends');
      const raw = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setCandidates(
        raw.map((f: any) => ({
          id: Number(f.id),
          name: f.display_name || f.name || `User #${f.id}`,
          username: f.username || '',
          avatar_url: f.avatar_url || '',
        }))
      );
    } catch (err) {
      console.error('Failed to fetch candidates', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser && showSuggestUI) {
      fetchCandidates(searchQuery);
    }
  }, [currentUser, showSuggestUI, searchQuery, fetchCandidates]);

  const handleSuggest = async () => {
    if (!selectedCandidate) return;

    setSuggesting(true);
    try {
      await apiClient.post(`/bounties/${slug}/suggest`, {
        candidate_id: selectedCandidate.id,
      });

      toast({
        title: 'Introduction Sent!',
        description: `You suggested ${selectedCandidate.name} for this bounty.`,
        duration: 5000,
      });

      setShowSuggestUI(false);
      setSelectedCandidate(null);
    } catch (err: any) {
      toast({
        title: 'Unable to Suggest',
        description: err?.response?.data?.message || err?.message || 'Failed to suggest candidate.',
        variant: 'destructive',
      });
    } finally {
      setSuggesting(false);
    }
  };

  const handleStartSuggestion = () => {
    if (!currentUser) {
      const returnUrl = encodeURIComponent(`/bounty/${slug}?action=suggest`);
      router.push(`/login?redirect=${returnUrl}`);
    } else {
      setShowSuggestUI(true);
    }
  };

  const handleCopyShare = async () => {
    const shareUrl = bounty?.share_url || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link Copied', description: 'Share this matchmaker bounty link with friends!' });
    } catch {
      // ignore clipboard errors
    }
  };

  if (loading || isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500" />
      </div>
    );
  }

  if (error || !bounty) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader />
        <div className="flex flex-col justify-center items-center py-24 p-4 space-y-4">
          <h1 className="text-2xl font-bold text-destructive">{error || 'Bounty not found'}</h1>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => router.push('/bounties')} variant="outline">
              Browse Active Bounties
            </Button>
            <Button type="button" onClick={() => router.push('/')} variant="ghost">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const photos = Array.isArray(bounty.user?.photos) ? bounty.user.photos : [];
  const primaryPhoto = photos.find((p) => p.is_primary) || photos[0];
  const q = searchQuery.toLowerCase();
  const filteredCandidates = candidates.filter(
    (c) =>
      c.id !== bounty.user.id &&
      ((c.name || '').toLowerCase().includes(q) || (c.username || '').toLowerCase().includes(q))
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <AppHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-8">
          <div className="max-w-md w-full space-y-6">
            <div className="flex items-center justify-between">
              <Link
                href="/bounties"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                All Bounties
              </Link>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyShare} className="gap-1.5">
                    <Share2 className="w-3.5 h-3.5" />
                    Share Link
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy this public matchmaker bounty URL</TooltipContent>
              </Tooltip>
            </div>

            <div className="text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-1">
                Matchmaker Bounty
              </h1>
              <p className="text-sm text-muted-foreground">
                Introduce a compatible match and earn escrowed FWB tokens!
              </p>
            </div>

            <Card className="bg-card border-border shadow-xl overflow-hidden">
              <div className="relative h-64 w-full bg-muted">
                {primaryPhoto?.url ? (
                  <OptimizedImage
                    src={primaryPhoto.url}
                    alt={bounty.user.profile?.display_name || bounty.user.name || 'Member'}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <User className="h-24 w-24 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                  <h2 className="text-2xl font-bold text-white">
                    {bounty.user.profile?.display_name || bounty.user.name}
                    {bounty.user.profile?.age ? `, ${bounty.user.profile.age}` : ''}
                  </h2>
                  {bounty.user.profile?.gender && (
                    <p className="text-zinc-300 text-sm">{bounty.user.profile.gender}</p>
                  )}
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {(bounty.description || bounty.user.profile?.bio) && (
                  <div className="bg-muted/50 p-4 rounded-lg border border-border">
                    <p className="italic text-sm text-foreground">
                      &ldquo;{bounty.description || bounty.user.profile?.bio}&rdquo;
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between bg-amber-500/10 p-4 rounded-xl border border-amber-500/30">
                  <div className="flex items-center space-x-3">
                    <div className="bg-amber-500/20 p-2 rounded-full">
                      <Coins className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-semibold flex items-center gap-1">
                        Escrowed Reward
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Tokens are locked in escrow and paid out to the matchmaker when the introduction leads to a match.
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {bounty.token_reward} FWB
                      </p>
                    </div>
                  </div>
                  <div className="bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/30">
                    <span className="text-pink-500 text-xs font-bold uppercase tracking-wider">
                      {bounty.status}
                    </span>
                  </div>
                </div>

                {!showSuggestUI ? (
                  <div className="space-y-3">
                    <Button
                      type="button"
                      className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl shadow-lg"
                      onClick={handleStartSuggestion}
                      disabled={bounty.status !== 'active'}
                    >
                      <Heart className="mr-2 h-5 w-5" />
                      Suggest a Match
                    </Button>

                    {!currentUser && (
                      <p className="text-xs text-center text-muted-foreground">
                        Sign in or register to suggest a friend for{' '}
                        {bounty.user.profile?.display_name || bounty.user.name}.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base">Select a Friend or Member</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSuggestUI(false)}
                      >
                        Cancel
                      </Button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Filter friends or type 2+ chars to search members..."
                        className="pl-9 bg-background border-border text-foreground"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {filteredCandidates.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          {searchQuery.trim().length < 2
                            ? 'No friends listed yet — type 2+ characters above to search members!'
                            : 'No matching members found.'}
                        </p>
                      ) : (
                        filteredCandidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            onClick={() => setSelectedCandidate(candidate)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${
                              selectedCandidate?.id === candidate.id
                                ? 'bg-pink-500/15 border-pink-500/50'
                                : 'bg-muted/40 border-transparent hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center relative">
                                {candidate.avatar_url ? (
                                  <Image
                                    src={getAvatarUrl(candidate.avatar_url, candidate.name)}
                                    alt={candidate.name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <span className="text-muted-foreground font-bold">
                                    {(candidate.name || 'U').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm text-foreground">{candidate.name}</p>
                                {candidate.username && (
                                  <p className="text-xs text-muted-foreground">@{candidate.username}</p>
                                )}
                              </div>
                            </div>
                            {selectedCandidate?.id === candidate.id && (
                              <CheckCircle className="h-5 w-5 text-pink-500" />
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <Button
                      type="button"
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                      disabled={!selectedCandidate || suggesting}
                      onClick={handleSuggest}
                    >
                      {suggesting ? 'Sending...' : 'Confirm Introduction'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
