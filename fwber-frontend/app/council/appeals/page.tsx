'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Gavel, AlertOctagon, Send, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function AppealsPage() {
    const { token, user, logout } = useAuth();
    const { toast } = useToast();
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (reason.length < 50) {
            toast({ variant: "destructive", title: "Rationale too short", description: "Please provide a more detailed reason (min 50 chars)." });
            return;
        }

        setLoading(true);
        try {
            await api.post('/governance/appeals', { reason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubmitted(true);
            toast({
                title: "Appeal Submitted",
                description: "The Council will vote on your unban proposal over the next 7 days.",
            });
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                        <AlertOctagon className="w-10 h-10 text-red-600" />
                    </div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-foreground">Account Restricted</h1>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-2">Global Ban enforced by the community council</p>
                </div>

                {!submitted ? (
                    <Card className="border-red-200 dark:border-red-900/50 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Gavel className="w-5 h-5 text-red-600" />
                                Submit Appeal
                            </CardTitle>
                            <CardDescription>
                                You have the right to request an unban. Your appeal will be turned into a community proposal for FWB holders to vote on.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reason">Your Rationale</Label>
                                    <Textarea 
                                        id="reason"
                                        placeholder="Explain why the Council should reconsider your ban..."
                                        rows={6}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="resize-none"
                                        required
                                    />
                                    <p className="text-[10px] text-zinc-400 text-right">{reason.length}/2000 characters (min 50)</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3">
                                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                    Launch Unban Proposal
                                </Button>
                                <Button variant="ghost" className="w-full text-zinc-500" onClick={logout}>
                                    Logout
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                ) : (
                    <Card className="border-green-200 dark:border-green-900/50 shadow-2xl text-center p-8">
                        <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                            <ShieldAlert className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Appeal Transmitted</h2>
                        <p className="text-zinc-500 text-sm mb-8">
                            Your case is now in the hands of the community. Check back in 7 days to see the result of the council vote.
                        </p>
                        <Button variant="outline" className="w-full" onClick={logout}>Logout</Button>
                    </Card>
                )}

                <p className="text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed px-8">
                    Note: Submitting false or repetitive appeals will result in a permanent ban that cannot be appealed.
                </p>
            </div>
        </div>
    );
}
