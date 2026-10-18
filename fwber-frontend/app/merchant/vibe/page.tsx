'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Radio, Zap, Shield, Send, ArrowLeft, Target } from 'lucide-react';
import Link from 'next/link';
import NeighborhoodVibe from '@/components/merchant/NeighborhoodVibe';

export default function VibeBroadcastPage() {
    const { token, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        content: searchParams?.get('content') || '',
        discount_code: searchParams?.get('code') || '',
        vibe_target: searchParams?.get('target') || 'any'
    });
    const [currentVibe, setCurrentVibe] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        try {
            setIsSubmitting(true);
            const response = await api.post<{
                current_vibe?: string;
                token_cost: number;
                status: string;
            }>('/merchant/pulse/broadcast', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setCurrentVibe(response.current_vibe ?? null);

            toast({
                title: "Broadcast Sent",
                description: `Your pulse is live now and cost ${response.token_cost} FWB Tokens.`,
            });

            router.push('/merchant/dashboard');
        } catch (error) {
            console.error('Broadcast failed:', error);

            let description = "Ensure you have enough FWB Tokens and an active promotion location before sending a pulse.";
            if (error instanceof ApiError) {
                description = error.message;
                const vibe = typeof error.data?.current_vibe === 'string' ? error.data.current_vibe : null;
                setCurrentVibe(vibe);
            }

            toast({
                variant: "destructive",
                title: "Broadcast Failed",
                description,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/merchant/dashboard">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-foreground">
                            Vibe Broadcast Deck
                        </h1>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                            <Radio className="w-3 h-3" /> Live Transmission Controller
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="border-amber-500/50 text-amber-600 px-3 py-1">
                    <Zap className="w-3 h-3 mr-1 fill-current" /> Priority: High
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-lg">Compose Vibe</CardTitle>
                                <CardDescription>Broadcast a high-priority notification to all users within a 1-mile radius when the live neighborhood vibe already matches your trigger.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="content">Message Content</Label>
                                    <Textarea 
                                        id="content"
                                        placeholder="e.g. Happy Hour is popping! Flash your fwber badge for 2-for-1 cocktails until 8pm."
                                        className="min-h-[120px] bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 resize-none"
                                        value={formData.content}
                                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                                        maxLength={280}
                                        required
                                    />
                                    <div className="flex justify-end">
                                        <span className="text-[10px] font-bold text-zinc-400">{formData.content.length}/280</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="discount">Discount Code (Optional)</Label>
                                    <Input 
                                        id="discount"
                                        placeholder="DETROIT_VIBE_20"
                                        className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 uppercase font-mono"
                                        value={formData.discount_code}
                                        onChange={(e) => setFormData({...formData, discount_code: e.target.value.toUpperCase()})}
                                    />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-2">
                                        <Target className="w-4 h-4 text-amber-600" />
                                        <Label className="font-black uppercase tracking-tighter italic">Vibe Match Trigger</Label>
                                    </div>
                                    <RadioGroup 
                                        defaultValue="any" 
                                        className="grid grid-cols-2 gap-4"
                                        onValueChange={(v) => setFormData({...formData, vibe_target: v})}
                                    >
                                        <div className="flex items-center space-x-2 border rounded-xl p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                            <RadioGroupItem value="any" id="any" />
                                            <Label htmlFor="any" className="flex flex-col">
                                                <span className="font-bold">Instant</span>
                                                <span className="text-[10px] text-zinc-500">Send immediately with no vibe gate</span>
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 border rounded-xl p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                            <RadioGroupItem value="energetic" id="energetic" />
                                            <Label htmlFor="energetic" className="flex flex-col">
                                                <span className="font-bold">Energetic</span>
                                                <span className="text-[10px] text-zinc-500">Only when vibe is high</span>
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 border rounded-xl p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                            <RadioGroupItem value="chill" id="chill" />
                                            <Label htmlFor="chill" className="flex flex-col">
                                                <span className="font-bold">Chill</span>
                                                <span className="text-[10px] text-zinc-500">Only when vibe is calm</span>
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 border rounded-xl p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                            <RadioGroupItem value="romantic" id="romantic" />
                                            <Label htmlFor="romantic" className="flex flex-col">
                                                <span className="font-bold">Romantic</span>
                                                <span className="text-[10px] text-zinc-500">Target date-ready moods</span>
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex flex-col items-center gap-4">
                            <Button 
                                type="submit" 
                                size="lg"
                                disabled={isSubmitting}
                                className="w-full bg-zinc-900 dark:bg-card dark:bg-card text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-2xl h-16 text-lg font-black italic uppercase tracking-tighter"
                            >
                                {isSubmitting ? 'Transmitting...' : (
                                    <>
                                        <Send className="w-5 h-5 mr-3" />
                                        Launch Pulse Broadcast
                                    </>
                                )}
                            </Button>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Costs 50 FWB Tokens per transmission
                            </p>
                            {currentVibe && (
                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                                    Live vibe detected: {currentVibe}
                                </p>
                            )}
                        </div>
                    </form>
                </div>

                {/* Right Column: Real-time Context */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Current Intelligence</h3>
                    {token && <NeighborhoodVibe token={token} />}
                    
                    <Card className="bg-zinc-900 border-zinc-800 text-white">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-widest">Broadcast Radius</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative aspect-square w-full rounded-full border-2 border-dashed border-amber-500/30 flex items-center justify-center">
                                <div className="absolute w-3/4 h-3/4 rounded-full border border-amber-500/20 animate-ping" />
                                <div className="absolute w-1/2 h-1/2 rounded-full border border-amber-500/40" />
                                <div className="w-4 h-4 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                                <span className="absolute bottom-4 text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">1 Mile Range</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
