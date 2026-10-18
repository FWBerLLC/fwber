'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Zap, MapPin, CheckCircle2, Coins, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';

interface Quest {
    id: number;
    title: string;
    description: string;
    token_reward: number;
    expires_at: string;
    user_quests: Array<{ status: string; progress: any }>;
}

export default function QuestBoard() {
    const { token } = useAuth();
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQuests = async () => {
        if (!token) return;
        try {
            const data = await api.get<Quest[]>('/quests/active', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuests(data);
        } catch (err) {
            console.error('Failed to fetch quests:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuests();
    }, [token]);

    const handleAccept = async (id: number) => {
        try {
            await api.post(`/quests/${id}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchQuests();
        } catch (err) {
            alert('Failed to join quest.');
        }
    };

    const handleComplete = async (id: number) => {
        try {
            const res = await api.post<{ success: boolean; reward: number }>(`/quests/${id}/complete`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Quest Complete! You earned ${res.reward} FWB tokens.`);
            fetchQuests();
        } catch (err) {
            alert('Condition not met yet. Keep going!');
        }
    };

    if (loading) return <div className="h-48 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> Active Community Quests
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-200">LIVE</Badge>
            </div>

            {quests.length === 0 ? (
                <Card className="border-dashed bg-zinc-50/50 dark:bg-zinc-900/20 py-8 text-center">
                    <p className="text-sm text-zinc-500 italic">No quests active in this area. Check back when the vibe shifts!</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quests.map((quest) => {
                        const userQuest = quest.user_quests[0];
                        const isActive = userQuest?.status === 'active';
                        const isClaimed = userQuest?.status === 'claimed';

                        return (
                            <Card key={quest.id} className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-card dark:bg-zinc-950">
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                            <Coins className="w-3 h-3 mr-1" /> {quest.token_reward} FWB
                                        </Badge>
                                        <div className="flex items-center text-[10px] text-zinc-400 font-bold uppercase">
                                            <Zap className="w-3 h-3 mr-1 text-purple-500" /> Vibe-Triggered
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-black italic uppercase tracking-tight text-zinc-900 dark:text-foreground leading-tight">
                                            {quest.title}
                                        </h4>
                                        <p className="text-xs text-zinc-500 mt-1">{quest.description}</p>
                                    </div>

                                    {!userQuest ? (
                                        <Button onClick={() => handleAccept(quest.id)} className="w-full bg-zinc-900 text-white dark:bg-card dark:text-zinc-900 hover:opacity-90 h-9 text-xs font-bold uppercase tracking-widest rounded-xl">
                                            Join Quest <ArrowRight className="w-3 h-3 ml-2" />
                                        </Button>
                                    ) : isActive ? (
                                        <div className="space-y-3">
                                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-amber-500 h-full w-1/3 animate-pulse" />
                                            </div>
                                            <Button onClick={() => handleComplete(quest.id)} className="w-full bg-amber-500 text-white hover:bg-amber-600 h-9 text-xs font-bold uppercase tracking-widest rounded-xl">
                                                Complete Task
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 py-2 text-green-600 text-xs font-black uppercase tracking-widest">
                                            <CheckCircle2 className="w-4 h-4" /> Quest Claimed
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
