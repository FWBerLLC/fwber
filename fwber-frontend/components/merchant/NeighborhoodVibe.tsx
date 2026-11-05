'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, MessageSquare, TrendingUp, Info, Zap } from 'lucide-react';
import { api } from '@/lib/api/client';

interface VibeAnalysis {
    vibe: string;
    sentiment: number;
    trending_keywords: string[];
    activity_score: number;
    summary: string;
    post_count: number;
    last_updated?: string;
}

interface VibeResponse {
    business_name: string;
    location: {
        lat: number;
        lng: number;
        radius: number;
    };
    location_source?: string;
    analysis: VibeAnalysis;
}

export default function NeighborhoodVibe({ token }: { token: string }) {
    const [analysis, setAnalysis] = useState<VibeAnalysis | null>(null);
    const [locationSource, setLocationSource] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchVibe() {
            try {
                const response = await api.get<VibeResponse>('/merchant/pulse/vibe', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAnalysis(response.analysis);
                setLocationSource(response.location_source ?? null);
                setErrorMessage(null);
            } catch (error) {
                console.error('Failed to fetch vibe:', error);
                const message = error instanceof Error ? error.message : 'Could not load local vibe data.';
                setErrorMessage(message);
                setAnalysis(null);
            } finally {
                setLoading(false);
            }
        }
        fetchVibe();
    }, [token]);

    if (loading) return <VibeSkeleton />;
    if (!analysis) {
        return (
            <Card className="border-dashed border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                        <Zap className="w-5 h-5 fill-current" />
                        Local Neighborhood Vibe
                    </CardTitle>
                    <CardDescription>
                        Vibe analysis needs a merchant promotion location before it can inspect the nearby pulse.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {errorMessage ?? 'Create or update a promotion with a map location to unlock live neighborhood sentiment.'}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const sentimentColor = analysis.sentiment > 0.7 ? 'text-green-500' : analysis.sentiment < 0.4 ? 'text-red-500' : 'text-amber-500';

    return (
        <Card className="border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-white to-amber-50/30 dark:from-zinc-950 dark:to-amber-900/5">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                            <Zap className="w-5 h-5 fill-current" />
                            Local Neighborhood Vibe
                        </CardTitle>
                        <CardDescription>Real-time sentiment from the fwber Local Pulse</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                        {locationSource === 'latest_promotion' ? 'PROMO-ANCHORED' : 'LIVE'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Atmospheric Vibe */}
                    <div className="p-4 bg-card dark:bg-card dark:bg-zinc-900 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Atmosphere</span>
                        <div className="text-2xl font-black text-zinc-900 dark:text-foreground uppercase italic tracking-tighter">
                            {analysis.vibe}
                        </div>
                    </div>

                    {/* Sentiment */}
                    <div className="p-4 bg-card dark:bg-card dark:bg-zinc-900 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Community Sentiment</span>
                        <div className={`text-2xl font-black ${sentimentColor} tracking-tighter`}>
                            {Math.round(analysis.sentiment * 100)}% Positive
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="p-4 bg-card dark:bg-card dark:bg-zinc-900 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Local Density</span>
                        <div className="text-2xl font-black text-blue-600 tracking-tighter flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            {analysis.activity_score}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Trending Near You</span>
                        <div className="flex flex-wrap gap-2">
                            {analysis.trending_keywords.map((kw, i) => (
                                <Badge key={i} variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold px-3 py-1">
                                    #{kw}
                                </Badge>
                            ))}
                            {analysis.trending_keywords.length === 0 && <span className="text-zinc-400 text-xs">No active trends.</span>}
                        </div>
                    </div>

                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-start gap-3">
                            <Info className="w-4 h-4 text-zinc-400 mt-0.5" />
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">
                                &quot;{analysis.summary}&quot;
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-amber-100 dark:border-amber-900/20 flex justify-between items-center text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                    <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {analysis.post_count} Recent Artifacts Analyzed
                    </span>
                    <span>Last Updated: Just Now</span>
                </div>
            </CardContent>
        </Card>
    );
}

function VibeSkeleton() {
    return (
        <Card className="animate-pulse">
            <CardHeader>
                <div className="h-6 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-1/2 bg-zinc-100 dark:bg-zinc-900 rounded mt-2" />
            </CardHeader>
            <CardContent className="h-48 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-xl" />
        </Card>
    );
}
