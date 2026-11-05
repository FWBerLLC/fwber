'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api } from '@/lib/api/client';
import { useToast } from "@/components/ui/use-toast";
import {
  ShieldCheck,
  Settings,
  RefreshCw,
  Zap,
  Trophy,
  ExternalLink
} from 'lucide-react';

export default function MerchantLoyaltyPage() {
    const [settings, setSettings] = useState({
        enabled: true,
        checkin_threshold: 5,
        nft_collection_name: 'Merchant Vibe Gold'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.get('/merchant-portal/loyalty/settings');
                if (data && (data as any).checkin_threshold) {
                    setSettings(data as any);
                }
            } catch (error) {
                console.error('Failed to fetch loyalty settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.post('/merchant-portal/loyalty/settings', settings);
            toast({
                title: "Settings Saved",
                description: "Your NFT loyalty program has been updated."
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save loyalty settings."
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Solana Loyalty Bridge</h1>
                    <p className="text-muted-foreground mt-1">Manage your NFT-based customer loyalty rewards.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="px-3 py-1 gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Phase 7 Active
                    </Badge>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Program Configuration</CardTitle>
                            <CardDescription>Define how users unlock their 'Merchant Vibe' NFTs.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-semibold">Enable NFT Rewards</Label>
                                    <p className="text-sm text-muted-foreground">Automatically trigger NFT minting signals on Solana.</p>
                                </div>
                                <Switch
                                    checked={settings.enabled}
                                    onCheckedChange={(val) => setSettings({...settings, enabled: val})}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="threshold">Check-in Threshold</Label>
                                    <input
                                        id="threshold"
                                        type="number"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={settings.checkin_threshold}
                                        onChange={(e) => setSettings({...settings, checkin_threshold: parseInt(e.target.value)})}
                                    />
                                    <p className="text-xs text-muted-foreground">Number of unique visits required to trigger a reward.</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="collection">Collection Name</Label>
                                    <input
                                        id="collection"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={settings.nft_collection_name}
                                        onChange={(e) => setSettings({...settings, nft_collection_name: e.target.value})}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Autonomous Monitor Signals</CardTitle>
                            <CardDescription>Live execution logs for your loyalty bridge.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border bg-black text-green-500 font-mono text-xs p-4 h-48 overflow-y-auto">
                                <p>[2026-05-24 04:50:12] Monitoring threshold for User 492...</p>
                                <p>[2026-05-24 04:52:44] Threshold REACHED for User 102. Triggering Solana mint signal...</p>
                                <p>[2026-05-24 04:52:45] SolanaBridgeService: Anchor SUCCESS. Tx: 4zP9...qXy1</p>
                                <p>[2026-05-24 04:55:00] System Heartbeat: Optimal performance.</p>
                            </div>
                            <Button variant="link" className="mt-2 h-auto p-0 text-xs" asChild>
                                <a href="/admin/monitoring" className="flex items-center gap-1">
                                    View Full Protocol Monitor <ExternalLink className="w-3 h-3" />
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Zap className="w-5 h-5 text-primary" />
                                Quick Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-primary/10">
                                <span className="text-sm">Active Loyalty Users</span>
                                <span className="font-bold">124</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-primary/10">
                                <span className="text-sm">NFTs Minted (Total)</span>
                                <span className="font-bold text-primary">82</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm">Avg. Visits per User</span>
                                <span className="font-bold">4.2</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                Reward Preview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center text-center">
                            <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 mb-4 shadow-lg animate-pulse" />
                            <h4 className="font-bold text-sm">Vibe NFT #492</h4>
                            <p className="text-xs text-muted-foreground">Certified Loyal Customer</p>
                            <div className="mt-4 w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div className="w-4/5 h-full bg-primary" />
                            </div>
                            <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">80% to next mint</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
