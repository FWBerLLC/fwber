'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Target, Coins, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function BountiesPage() {
    const [bounties, setBounties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBounties = async () => {
            try {
                const res = await fetch('/api/bounties');
                if (!res.ok) throw new Error('Failed to fetch bounties');
                const data = await res.json();
                setBounties(data.bounties || []);
            } catch (e: any) {
                toast.error(e.message || 'Error loading bounties');
            } finally {
                setLoading(false);
            }
        };
        fetchBounties();
    }, []);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <Target className="w-8 h-8 text-primary" />
                    Community Bounties
                </h1>
                <Button>Post a Bounty</Button>
            </div>

            <Card className="bg-card shadow-sm border border-gray-100 mb-8">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        Earn Tokens
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Complete requests from other users or merchants to earn tokens.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <CardDescription>
                        Help out the community and get rewarded.
                    </CardDescription>
                </CardHeader>
            </Card>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : bounties.length === 0 ? (
                <div className="text-center p-12 bg-muted rounded-lg border border-border">
                    <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No active bounties</h3>
                    <p className="text-muted-foreground">Check back later or post your own request to the community!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bounties.map((bounty) => (
                        <Card key={bounty.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-lg">{bounty.title}</h3>
                                    <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-sm">
                                        <Coins className="w-4 h-4" /> {bounty.rewardTokens}
                                    </span>
                                </div>
                                <p className="text-muted-foreground text-sm mb-4">{bounty.description}</p>
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>Posted by {bounty.author}</span>
                                    <Button size="sm" variant="outline">Claim Bounty</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
