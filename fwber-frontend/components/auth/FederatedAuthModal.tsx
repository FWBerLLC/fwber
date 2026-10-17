'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Globe, Loader2, ShieldCheck, Copy, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';

export function FederatedAuthModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const { updateUser } = useAuth();
    const [step, setStep] = useState<'handle' | 'verify' | 'success'>('handle');
    const [handle, setHandle] = useState('');
    const [challengeData, setChallengeData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleStartChallenge = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/federated/challenge', { handle });
            setChallengeData(res);
            setStep('verify');
        } catch (err: any) {
            toast({ variant: "destructive", title: "Resolution Failed", description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setLoading(true);
        try {
            const res = await api.post<any>('/auth/federated/verify', { 
                actor_uri: challengeData.actor_uri 
            });
            
            // Store token and redirect
            localStorage.setItem('fwber_token', res.token);
            localStorage.setItem('fwber_user', JSON.stringify(res.user));
            
            setStep('success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Verification Failed", description: "Challenge token not detected. Please update your profile and try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white dark:bg-gray-800 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                        <Globe className="w-6 h-6 text-purple-500" />
                        Federated Login
                    </DialogTitle>
                    <DialogDescription>
                        Use your Mastodon or ActivityPub identity to sign in.
                    </DialogDescription>
                </DialogHeader>

                {step === 'handle' && (
                    <form onSubmit={handleStartChallenge} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="handle">ActivityPub Handle</Label>
                            <Input 
                                id="handle" 
                                placeholder="@user@mastodon.social" 
                                required
                                value={handle}
                                onChange={(e) => setHandle(e.target.value)}
                                className="h-12"
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : 'Continue'}
                        </Button>
                    </form>
                )}

                {step === 'verify' && challengeData && (
                    <div className="space-y-6 pt-4 text-center">
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                            <p className="text-[10px] font-black uppercase text-zinc-500 mb-2">Your Challenge Token</p>
                            <div className="flex items-center justify-center gap-2">
                                <code className="text-sm font-mono text-purple-600 dark:text-purple-400 break-all">{challengeData.challenge}</code>
                                <button type="button" onClick={() => navigator.clipboard.writeText(challengeData.challenge)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded">
                                    <Copy className="w-4 h-4 text-zinc-500" />
                                </button>
                            </div>
                        </div>
                        <div className="text-xs text-zinc-500 leading-relaxed text-left">
                            <p className="font-bold text-zinc-900 dark:text-zinc-200 mb-1 italic">How to verify:</p>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Copy the token above.</li>
                                <li>Paste it anywhere in your <strong>Profile Summary / Bio</strong> on your home server ({parse_url_host(challengeData.actor_uri)}).</li>
                                <li>Save your profile and click <strong>Verify Identity</strong> below.</li>
                            </ol>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button onClick={handleVerify} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                                Verify Identity
                            </Button>
                            <Button variant="ghost" onClick={() => setStep('handle')} className="text-zinc-500">Back</Button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="py-10 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold">Identity Confirmed</h2>
                        <p className="text-zinc-500 text-sm">Redirecting to your dashboard...</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function parse_url_host(url: string) {
    try {
        return new URL(url).host;
    } catch {
        return 'server';
    }
}
