'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar, Zap, Bot } from 'lucide-react';
import { api } from '@/lib/api/client';

interface VibeHistoryEntry {
    timestamp: string;
    vibe: string;
    sentiment: number;
}

export default function VibeIntelligence({ token }: { token: string }) {
    const [history, setHistory] = useState<VibeHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const data = await api.get<VibeHistoryEntry[]>('/merchant-portal/vibe-history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHistory(data);
            } catch (err) {
                console.error('Failed to fetch vibe history:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, [token]);

    if (loading) return <div className="h-64 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl" />;

    return (
        <Card className="border-amber-200 dark:border-amber-900/50 bg-card dark:bg-zinc-950">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                            <Bot className="w-5 h-5" />
                            Vibe Intelligence
                        </CardTitle>
                        <CardDescription>Autonomous sentiment trends in your neighborhood</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-purple-100 text-purple-700">AI-DRIVEN</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                        <TrendingUp className="w-3 h-3" /> Recent Transitions
                    </h4>
                    <div className="space-y-2">
                        {history.slice(-5).reverse().map((entry, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-sm font-bold uppercase tracking-tight">{entry.vibe}</span>
                                </div>
                                <div className="text-[10px] text-zinc-400 font-medium">
                                    {new Date(entry.timestamp).toLocaleString()}
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && <p className="text-sm text-zinc-500 italic text-center py-4">No historical transitions recorded yet.</p>}
                    </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-start gap-3">
                        <Zap className="w-4 h-4 text-amber-600 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                            <span className="font-bold">Autonomous Nudging is ACTIVE.</span> Our AI is monitoring these transitions and will automatically broadcast your promotions when they align with these local moods.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
