'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Gavel, Clock, Users, Zap, Loader2, ShieldCheck, TrendingUp, ExternalLink } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
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
    results: Array<{ option_index: number, total_weight: string }>;
}

export default function CouncilPage() {
    const { token, user } = useAuth();
    const { toast } = useToast();
    const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);
    const [finalizedProposals, setFinalizedProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [votingId, setVotingId] = useState<number | null>(null);

    const fetchProposals = async () => {
        try {
            const res = await api.get<{ proposals: Proposal[] }>('/governance/proposals');
            // Distinguish between active and finalized
            const all = res.proposals;
            setActiveProposals(all.filter(p => p.status === 'active'));
            setFinalizedProposals(all.filter(p => p.status !== 'active'));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, []);

    const handleVote = async (proposalId: number, optionIndex: number) => {
        if (!token) return;
        setVotingId(proposalId);
        try {
            await api.post(`/governance/proposals/${proposalId}/vote`, { option_index: optionIndex }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({
                title: "Vote Cast",
                description: `Your voting power of ${user?.token_balance} FWB has been recorded.`,
            });
            fetchProposals();
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Voting Failed",
                description: err.message,
            });
        } finally {
            setVotingId(null);
        }
    };

    const getWeightForOption = (proposal: Proposal, index: number) => {
        const result = proposal.results.find(r => r.option_index === index);
        return result ? parseFloat(result.total_weight) : 0;
    };

    const getTotalWeight = (proposal: Proposal) => {
        return proposal.results.reduce((sum, r) => sum + parseFloat(r.total_weight), 0);
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <AppHeader />
            <main className="max-w-5xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-foreground flex items-center gap-3">
                            <Gavel className="w-10 h-10 text-purple-600" />
                            The Council
                        </h1>
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm mt-1">Decentralized Governance & Community Power</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <CreateProposalModal onSuccess={fetchProposals} />
                        <div className="bg-purple-600/10 border border-purple-500/20 p-4 rounded-2xl flex items-center gap-4">
                            <div className="p-2 bg-purple-600 rounded-full text-white">
                                <Zap className="w-5 h-5 fill-current" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Your Voting Power</p>
                                <p className="text-xl font-black dark:text-foreground">{user?.token_balance || 0} FWB</p>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-purple-500" /></div>
                ) : (
                    <div className="space-y-16">
                        {/* Active Proposals */}
                        <div className="space-y-8">
                            <h2 className="text-xl font-black uppercase tracking-tighter italic border-l-4 border-purple-600 pl-4">Active Proposals</h2>
                            <div className="grid grid-cols-1 gap-8">
                                {activeProposals.length === 0 ? (
                                    <p className="text-sm text-zinc-500 italic">No active proposals. Create one to get started!</p>
                                ) : activeProposals.map(proposal => {
                                    const totalWeight = getTotalWeight(proposal);
                                    return (
                                        <ProposalCard 
                                            key={proposal.id} 
                                            proposal={proposal} 
                                            totalWeight={totalWeight}
                                            onVote={handleVote}
                                            votingId={votingId}
                                            getWeightForOption={getWeightForOption}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Finalized Proposals */}
                        {finalizedProposals.length > 0 && (
                            <div className="space-y-8">
                                <h2 className="text-xl font-black uppercase tracking-tighter italic border-l-4 border-zinc-500 pl-4 text-zinc-500">History & Audit</h2>
                                <div className="grid grid-cols-1 gap-8 opacity-80">
                                    {finalizedProposals.map(proposal => {
                                        const totalWeight = getTotalWeight(proposal);
                                        return (
                                            <div key={proposal.id} className="relative">
                                                <ProposalCard 
                                                    proposal={proposal} 
                                                    totalWeight={totalWeight}
                                                    onVote={() => {}}
                                                    votingId={null}
                                                    getWeightForOption={getWeightForOption}
                                                    isFinalized
                                                />
                                                <div className="absolute top-4 right-4 rotate-12">
                                                    <Badge className={proposal.status === 'passed' ? 'bg-green-600 font-black' : 'bg-red-600 font-black'}>
                                                        {proposal.status.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function ProposalCard({ 
    proposal, 
    totalWeight, 
    onVote, 
    votingId, 
    getWeightForOption,
    isFinalized = false
}: { 
    proposal: Proposal, 
    totalWeight: number, 
    onVote: (pid: number, idx: number) => void,
    votingId: number | null,
    getWeightForOption: (p: Proposal, i: number) => number,
    isFinalized?: boolean
}) {
    return (
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden bg-card dark:bg-card dark:bg-zinc-900">
            <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase font-black text-[10px] tracking-widest">
                            {proposal.category}
                        </Badge>
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {isFinalized ? 'Finalized' : `Ends ${formatDistanceToNow(new Date(proposal.expires_at), { addSuffix: true })}`}
                        </span>
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
                                {proposal.votes_count} users
                            </span>
                        </div>
                    </div>
                    
                    {isFinalized && (
                        <div className="space-y-4">
                            <VoteVerifier proposalId={proposal.id} />
                            
                            {proposal.on_chain_tx && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest italic">On-Chain Verified (Solana)</span>
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
                    {proposal.options.map((option, idx) => {
                        const weight = getWeightForOption(proposal, idx);
                        const percentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
                        return (
                            <div key={idx} className="space-y-2">
                                <Button 
                                    variant="outline" 
                                    className={`w-full justify-between h-12 border-zinc-200 dark:border-zinc-800 transition-all ${!isFinalized ? 'hover:border-purple-500 hover:bg-purple-500/5' : 'cursor-default'}`}
                                    onClick={() => !isFinalized && onVote(proposal.id, idx)}
                                    disabled={votingId === proposal.id || isFinalized}
                                >
                                    <span className="font-bold">{option}</span>
                                    <span className="text-[10px] opacity-40">{percentage.toFixed(0)}%</span>
                                </Button>
                                <Progress value={percentage} className="h-1 bg-zinc-200 dark:bg-zinc-800" indicatorClassName="bg-purple-500" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
