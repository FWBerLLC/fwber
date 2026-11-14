'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import {
    Gavel,
    Clock,
    Users,
    Zap,
    Loader2,
    ShieldCheck,
    TrendingUp,
    ExternalLink,
    Info,
    Send,
    Scale,
    History,
    CheckCircle2,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { formatDistanceToNow } from 'date-fns';
import { CreateProposalModal } from '@/components/council/CreateProposalModal';
import { VoteVerifier } from '@/components/council/VoteVerifier';

interface Proposal {
    id: number;
    title: string;
    description: string;
    category: 'mod' | 'policy' | 'tech' | 'treasury';
    options: string[];
    expires_at: string;
    votes_count: number;
    status: string;
    merkle_root: string;
    on_chain_tx: string;
    results: Array<{ option_index: number; total_weight: string }>;
    user_vote?: { option_index: number; token_weight: number } | null;
}

interface AppealRecord {
    id: number;
    reason: string;
    status: string;
    proposal_id: number | null;
    created_at: string | null;
    proposal?: Proposal | null;
}

function CouncilHubInner() {
    const searchParams = useSearchParams();
    const initialTab =
        searchParams?.get('tab') === 'appeals'
            ? 'appeals'
            : searchParams?.get('tab') === 'history'
              ? 'history'
              : 'active';

    const { token, user } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'active' | 'history' | 'appeals'>(initialTab);
    const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);
    const [finalizedProposals, setFinalizedProposals] = useState<Proposal[]>([]);
    const [appeals, setAppeals] = useState<AppealRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [votingId, setVotingId] = useState<number | null>(null);

    const [appealReason, setAppealReason] = useState('');
    const [appealSubmitting, setAppealSubmitting] = useState(false);

    const fetchProposals = useCallback(async () => {
        try {
            const res = await api.get<{ proposals?: Proposal[] }>('/governance/proposals');
            const all = Array.isArray(res?.proposals) ? res.proposals : [];
            setActiveProposals(all.filter((p) => p.status === 'active'));
            setFinalizedProposals(all.filter((p) => p.status !== 'active'));
        } catch (err) {
            console.error('Failed to load proposals:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAppeals = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api.get<{ appeals?: AppealRecord[] }>('/governance/appeals');
            setAppeals(Array.isArray(res?.appeals) ? res.appeals : []);
        } catch {
            // Optional when unauthenticated
        }
    }, [token]);

    useEffect(() => {
        void fetchProposals();
        void fetchAppeals();
    }, [fetchProposals, fetchAppeals]);

    const handleVote = async (proposalId: number, optionIndex: number) => {
        if (!token) {
            toast({
                variant: 'destructive',
                title: 'Sign-In Required',
                description: 'Sign in to cast your token-weighted Council vote.',
            });
            return;
        }
        setVotingId(proposalId);
        try {
            const res = await api.post<{ vote?: { token_weight?: number; option_voted?: string } }>(
                `/governance/proposals/${proposalId}/vote`,
                { option_index: optionIndex }
            );
            const recordedWeight = res?.vote?.token_weight ?? Math.max(1, Number(user?.token_balance || 0));
            toast({
                title: 'Vote Recorded & Hashed',
                description: `Recorded ${recordedWeight} FWB voting weight (${res?.vote?.option_voted || 'Option selected'}).`,
            });
            await fetchProposals();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Voting Failed',
                description: err?.message || 'Could not record vote.',
            });
        } finally {
            setVotingId(null);
        }
    };

    const handleAppealSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            toast({
                variant: 'destructive',
                title: 'Sign-In Required',
                description: 'Please sign in before submitting a moderation appeal.',
            });
            return;
        }
        if (appealReason.trim().length < 50) {
            toast({
                variant: 'destructive',
                title: 'Rationale Too Short',
                description: 'Please provide at least 50 characters of context for community jurors.',
            });
            return;
        }

        setAppealSubmitting(true);
        try {
            await api.post('/governance/appeals', { reason: appealReason.trim() });
            setAppealReason('');
            toast({
                title: 'Appeal Opened for Community Review',
                description: 'A 7-day Council moderation proposal has been created for community voting.',
            });
            await Promise.all([fetchProposals(), fetchAppeals()]);
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Appeal Submission Failed',
                description: err?.message || 'Unable to submit appeal.',
            });
        } finally {
            setAppealSubmitting(false);
        }
    };

    const getWeightForOption = (proposal: Proposal, index: number) => {
        const list = Array.isArray(proposal.results) ? proposal.results : [];
        const result = list.find((r) => r.option_index === index);
        return result ? parseFloat(result.total_weight) || 0 : 0;
    };

    const getTotalWeight = (proposal: Proposal) => {
        const list = Array.isArray(proposal.results) ? proposal.results : [];
        return list.reduce((sum, r) => sum + (parseFloat(r.total_weight) || 0), 0);
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <AppHeader />
                <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-foreground flex items-center gap-3">
                                <Gavel className="w-10 h-10 text-purple-600" />
                                The Council
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button type="button" aria-label="About The Council" className="text-zinc-400 hover:text-purple-500">
                                            <Info className="w-5 h-5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs font-normal not-italic normal-case tracking-normal">
                                        Decentralized community governance hub combining active policy proposals, SHA-256 Merkle vote verification, and peer-reviewed moderation appeals.
                                    </TooltipContent>
                                </Tooltip>
                            </h1>
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-1">
                                Proposals • Cryptographic Audit Proofs • Peer Moderation Appeals
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <CreateProposalModal onSuccess={fetchProposals} />
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="bg-purple-600/10 border border-purple-500/20 px-4 py-3 rounded-2xl flex items-center gap-3 cursor-help">
                                        <div className="p-2 bg-purple-600 rounded-full text-white">
                                            <Zap className="w-4 h-4 fill-current" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest">
                                                Your Voting Power
                                            </p>
                                            <p className="text-lg font-black dark:text-foreground">
                                                {Math.max(1, Number(user?.token_balance || 0))} FWB
                                            </p>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">
                                    Votes scale with your FWB token balance (minimum 1 FWB base voice for signed-in members). Creating a new policy proposal requires 100 FWB tokens.
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Unified 3-Tab Switcher */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('active')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
                                activeTab === 'active'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-foreground'
                            }`}
                        >
                            <Gavel className="w-3.5 h-3.5" />
                            Active Proposals ({activeProposals.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
                                activeTab === 'history'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-foreground'
                            }`}
                        >
                            <History className="w-3.5 h-3.5" />
                            History &amp; Merkle Audit ({finalizedProposals.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('appeals')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 ${
                                activeTab === 'appeals'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-foreground'
                            }`}
                        >
                            <Scale className="w-3.5 h-3.5" />
                            Dispute Appeals ({appeals.length})
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin w-10 h-10 text-purple-500" />
                        </div>
                    ) : activeTab === 'active' ? (
                        <div className="space-y-6">
                            {activeProposals.length === 0 ? (
                                <Card className="border-zinc-200 dark:border-zinc-800 bg-card p-10 text-center">
                                    <Gavel className="w-12 h-12 text-purple-500/40 mx-auto mb-3" />
                                    <h3 className="text-lg font-bold text-foreground mb-1">No Active Proposals Right Now</h3>
                                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                        Launch a community policy, technical, moderation, or treasury proposal above to open a 7-day token-weighted ballot.
                                    </p>
                                </Card>
                            ) : (
                                activeProposals.map((proposal) => (
                                    <ProposalCard
                                        key={proposal.id}
                                        proposal={proposal}
                                        totalWeight={getTotalWeight(proposal)}
                                        onVote={handleVote}
                                        votingId={votingId}
                                        getWeightForOption={getWeightForOption}
                                    />
                                ))
                            )}
                        </div>
                    ) : activeTab === 'history' ? (
                        <div className="space-y-6">
                            {finalizedProposals.length === 0 ? (
                                <Card className="border-zinc-200 dark:border-zinc-800 bg-card p-10 text-center">
                                    <History className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                                    <h3 className="text-lg font-bold text-foreground mb-1">No Finalized Proposals Yet</h3>
                                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                        Completed ballots appear here permanently with client-verifiable SHA-256 Merkle inclusion proofs.
                                    </p>
                                </Card>
                            ) : (
                                finalizedProposals.map((proposal) => (
                                    <div key={proposal.id} className="relative">
                                        <ProposalCard
                                            proposal={proposal}
                                            totalWeight={getTotalWeight(proposal)}
                                            onVote={() => {}}
                                            votingId={null}
                                            getWeightForOption={getWeightForOption}
                                            isFinalized
                                        />
                                        <div className="absolute top-4 right-4">
                                            <Badge className={proposal.status === 'passed' ? 'bg-green-600 font-black text-white' : 'bg-red-600 font-black text-white'}>
                                                {String(proposal.status || '').toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg bg-card">
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Scale className="w-5 h-5 text-purple-600" />
                                        Submit Moderation / Dispute Appeal
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs text-xs">
                                                Submitting an appeal automatically creates a 7-day peer-reviewed Council proposal in the Moderation category so community jurors can vote transparently.
                                            </TooltipContent>
                                        </Tooltip>
                                    </CardTitle>
                                    <CardDescription>
                                        Request community review of an account restriction or moderation decision. Restricted accounts can also access the standalone{' '}
                                        <Link href="/council/appeals" className="text-purple-600 underline">
                                            /council/appeals
                                        </Link>{' '}
                                        portal.
                                    </CardDescription>
                                </CardHeader>
                                <form onSubmit={handleAppealSubmit}>
                                    <CardContent className="space-y-3">
                                        <Label htmlFor="council-appeal-reason">Detailed Rationale (50–2,000 characters)</Label>
                                        <Textarea
                                            id="council-appeal-reason"
                                            placeholder="Provide context, relevant timeline details, and why the Council should uphold your appeal..."
                                            rows={6}
                                            value={appealReason}
                                            onChange={(e) => setAppealReason(e.target.value)}
                                            maxLength={2000}
                                            required
                                        />
                                        <p className="text-[11px] text-muted-foreground text-right">
                                            {appealReason.length}/2000 characters (min 50)
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            type="submit"
                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                                            disabled={appealSubmitting}
                                        >
                                            {appealSubmitting ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Send className="w-4 h-4 mr-2" />
                                            )}
                                            Open 7-Day Appeal Proposal
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>

                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                                    Your Submitted Appeals
                                </h3>
                                {appeals.length === 0 ? (
                                    <Card className="border-zinc-200 dark:border-zinc-800 bg-card p-8 text-center">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                                        <p className="font-semibold text-foreground">Account in Good Standing</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            You have no pending or historical moderation appeals on file.
                                        </p>
                                    </Card>
                                ) : (
                                    appeals.map((a) => (
                                        <Card key={a.id} className="border-zinc-200 dark:border-zinc-800 bg-card">
                                            <CardContent className="p-5 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="outline" className="uppercase text-[10px]">
                                                        {a.status}
                                                    </Badge>
                                                    {a.proposal_id && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Proposal #{a.proposal_id} ({a.proposal?.votes_count ?? 0} votes)
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-foreground line-clamp-3">{a.reason}</p>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </TooltipProvider>
    );
}

export default function CouncilPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
                </div>
            }
        >
            <CouncilHubInner />
        </Suspense>
    );
}

function ProposalCard({
    proposal,
    totalWeight,
    onVote,
    votingId,
    getWeightForOption,
    isFinalized = false,
}: {
    proposal: Proposal;
    totalWeight: number;
    onVote: (pid: number, idx: number) => void;
    votingId: number | null;
    getWeightForOption: (p: Proposal, i: number) => number;
    isFinalized?: boolean;
}) {
    const options = Array.isArray(proposal.options) ? proposal.options : ['Yes', 'No', 'Abstain'];
    return (
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden bg-card dark:bg-zinc-900">
            <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 uppercase font-black text-[10px] tracking-widest">
                            {proposal.category}
                        </Badge>
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {isFinalized
                                ? 'Finalized'
                                : proposal.expires_at
                                  ? `Ends ${formatDistanceToNow(new Date(proposal.expires_at), { addSuffix: true })}`
                                  : 'Open'}
                        </span>
                        {proposal.merkle_root && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-[10px] font-mono text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded cursor-help">
                                        Merkle: {proposal.merkle_root.slice(0, 10)}…
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">
                                    Live SHA-256 Merkle root over all recorded votes ({proposal.merkle_root.slice(0, 24)}…). Click &quot;Verify My Vote&quot; after voting to validate your inclusion path in-browser via WebCrypto.
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                    <CardTitle className="text-2xl font-bold mb-3">{proposal.title}</CardTitle>
                    <CardDescription className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed mb-6">
                        {proposal.description}
                    </CardDescription>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <span className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Total Participation</span>
                            <span className="text-lg font-bold flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                {totalWeight.toFixed(0)} FWB
                            </span>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <span className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Total Voters</span>
                            <span className="text-lg font-bold flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                {proposal.votes_count || 0} users
                            </span>
                        </div>
                    </div>

                    {(isFinalized || proposal.user_vote) && (
                        <div className="space-y-4">
                            <VoteVerifier proposalId={proposal.id} />

                            {proposal.on_chain_tx && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest italic">
                                            On-Chain Verified (Solana)
                                        </span>
                                    </div>
                                    <a
                                        href={`https://explorer.solana.com/tx/${proposal.on_chain_tx}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-zinc-400 hover:text-blue-400 transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="w-full md:w-80 bg-zinc-50 dark:bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 p-6 flex flex-col gap-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        {isFinalized ? 'Final Tally' : 'Cast Your Vote'}
                    </h4>
                    {options.map((option, idx) => {
                        const weight = getWeightForOption(proposal, idx);
                        const percentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
                        const isMySelection = proposal.user_vote?.option_index === idx;
                        return (
                            <div key={idx} className="space-y-2">
                                <Button
                                    variant="outline"
                                    className={`w-full justify-between h-12 transition-all ${
                                        isMySelection
                                            ? 'border-purple-600 bg-purple-600/10 text-purple-700 dark:text-purple-300'
                                            : 'border-zinc-200 dark:border-zinc-800'
                                    } ${!isFinalized ? 'hover:border-purple-500 hover:bg-purple-500/5' : 'cursor-default'}`}
                                    onClick={() => !isFinalized && onVote(proposal.id, idx)}
                                    disabled={votingId === proposal.id || isFinalized}
                                >
                                    <span className="font-bold truncate">{option}</span>
                                    <span className="text-[10px] opacity-60 shrink-0 ml-2">{percentage.toFixed(0)}%</span>
                                </Button>
                                <Progress
                                    value={percentage}
                                    className="h-1 bg-zinc-200 dark:bg-zinc-800"
                                    indicatorClassName="bg-purple-500"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
