'use client';

import { useState, useEffect } from 'react';
import { useE2EEncryption } from '@/lib/hooks/use-e2e-encryption';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Lock, RefreshCw, Key, ShieldCheck, AlertTriangle, Globe, UserX, Mic2, Zap, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { updateUserProfile } from '@/lib/api/profile';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { runEncryptionBenchmark, BenchmarkResult } from '@/lib/wasm/benchmark';

export default function SecuritySettingsPage() {
  const { isReady, regenerateKeys } = useE2EEncryption();
  const { token, user, updateUser } = useAuth();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFederated, setIsFederated] = useState(false);
  const [isConfessional, setIsConfessional] = useState(false);
  const [decoyPassword, setDecoyPassword] = useState('');
  const [hasDecoyProfile, setHasDecoyProfile] = useState(false);
  const [isDecoyLoading, setIsDecoyLoading] = useState(false);
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.profile?.is_federated !== undefined) {
      setIsFederated(user.profile.is_federated);
    }
    if (user?.profile?.is_confessional_mode !== undefined) {
      setIsConfessional(user.profile.is_confessional_mode);
    }
  }, [user]);

  useEffect(() => {
    if (!token) return;
    api.get<{ has_decoy_profile?: boolean }>('/settings/security')
      .then((res: any) => {
        setHasDecoyProfile(Boolean(res?.has_decoy_profile ?? res?.data?.has_decoy_profile));
      })
      .catch(() => {});
  }, [token]);

  const federatedHandle = user?.email ? `@${user.email.split('@')[0]}@fwber.online` : '@member@fwber.online';

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    try {
        const result = await runEncryptionBenchmark();
        setBenchmark(result);
    } catch (e) {
        console.error(e);
    } finally {
        setIsBenchmarking(false);
    }
  };

  const handleCreateDecoy = async () => {
    if (decoyPassword.length < 8) {
      toast({ title: 'Error', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    setIsDecoyLoading(true);
    try {
      await api.post('/settings/decoy-profile', { decoy_password: decoyPassword });
      setHasDecoyProfile(true);
      toast({ title: 'Success', description: 'Decoy Profile linked to this password.' });
      setDecoyPassword('');
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.response?.data?.error || 'Failed to create decoy profile.',
        variant: 'destructive',
      });
    } finally {
      setIsDecoyLoading(false);
    }
  };

  const handleRemoveDecoy = async () => {
    setIsDecoyLoading(true);
    try {
      await api.delete('/settings/decoy-profile');
      setHasDecoyProfile(false);
      toast({ title: 'Removed', description: 'Decoy Profile detached.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to remove', variant: 'destructive' });
    } finally {
      setIsDecoyLoading(false);
    }
  };

  const handleRegenerateKeys = async () => {
    setIsRegenerating(true);
    try {
      await regenerateKeys();
      toast({
        title: "Keys Regenerated",
        description: "Your encryption keys have been successfully rotated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate keys.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleFederationToggle = async (checked: boolean) => {
    setIsFederated(checked);
    if (!token) return;
    try {
      await updateUserProfile(token, { is_federated: checked });
      if (user) {
        updateUser({
          ...user,
          profile: {
            ...user.profile,
            is_federated: checked,
          },
        });
      }
      toast({
        title: "Federation Updated",
        description: checked ? "You mapped your profile to the Fediverse!" : "You have isolated your profile locally.",
      });
    } catch (error) {
      setIsFederated(!checked); // revert on failure
      toast({
        title: "Error",
        description: "Failed to update federation settings.",
        variant: "destructive",
      });
    }
  };

  const handleConfessionalToggle = async (checked: boolean) => {
    setIsConfessional(checked);
    if (!token) return;
    try {
      await updateUserProfile(token, { is_confessional_mode: checked });
      toast({
        title: checked ? "Confessional Mode Active" : "Confessional Mode Disabled",
        description: checked 
          ? "Profiles and photos are now hidden. Matches are based purely on voice." 
          : "Standard profile and photo visibility restored.",
      });
    } catch (error) {
      setIsConfessional(!checked); // revert on failure
      toast({
        title: "Error",
        description: "Failed to update privacy settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen bg-muted dark:bg-background">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-8 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-green-500" />
            Security &amp; Privacy
          </h1>
          <Link href="/help/ai-avatars-and-security" className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline">
            Security Guide &rarr;
          </Link>
        </div>

        <div className="space-y-6">
          <Card className="border-purple-200 dark:border-purple-900/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <Mic2 className="w-24 h-24 rotate-12" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Mic2 className="w-5 h-5" />
                Voice-Only Mode
              </CardTitle>
              <CardDescription>
                Disable photos and bios entirely. Force matches to be made based on your voice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/30">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isConfessional ? 'bg-purple-500' : 'bg-muted'}`} />
                  <div>
                    <Label htmlFor="confessional-toggle" className="font-medium text-sm text-foreground dark:text-foreground cursor-pointer">
                      Enable Confessional Mode
                    </Label>
                  </div>
                </div>
                <Switch id="confessional-toggle" checked={isConfessional} onCheckedChange={handleConfessionalToggle} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-500" />
                Fediverse &amp; ActivityPub Discovery
              </CardTitle>
              <CardDescription>
                Public handle: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{federatedHandle}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                <Label htmlFor="federation-toggle" className="text-sm font-medium cursor-pointer">
                  Broadcast public profile to Mastodon / ActivityPub
                </Label>
                <Switch id="federation-toggle" checked={isFederated} onCheckedChange={handleFederationToggle} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-500" />
                  End-to-End Encryption
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${isReady ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700'}`}>
                  {isReady ? 'Keys Active' : 'Initializing'}
                </span>
              </CardTitle>
              <CardDescription>
                Rotate your on-device E2EE keypair used for encrypted direct messages and private media.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="destructive" onClick={handleRegenerateKeys} disabled={isRegenerating}>
                {isRegenerating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                Regenerate Keys
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap className="w-24 h-24 text-amber-500" />
            </div>
            <CardHeader>
                <CardTitle className="text-amber-500 flex items-center gap-2 italic uppercase tracking-tighter">
                    <Zap className="w-5 h-5 fill-current" />
                    Cryptographic Performance
                </CardTitle>
                <CardDescription className="text-zinc-400">
                    Benchmark the Rust (WASM) vs. JavaScript (WebCrypto) encryption engines.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {benchmark ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">WASM (Rust)</span>
                            <span className="text-lg font-bold">{benchmark.wasmTime > 0 ? `${benchmark.wasmTime.toFixed(2)}ms` : 'Unavailable'}</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                            <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1">JS (WebCrypto)</span>
                            <span className="text-lg font-bold">{benchmark.jsTime.toFixed(2)}ms</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-zinc-500 text-sm italic">Run benchmark to verify hardware acceleration.</p>
                )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full border-zinc-700 text-white" onClick={handleRunBenchmark} disabled={isBenchmarking}>
                    {isBenchmarking ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Test Hardware Acceleration
                </Button>
            </CardFooter>
          </Card>

          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-red-600 dark:text-red-400">
                <span className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-red-500" />
                  Emergency Decoy Profile
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="About Emergency Decoy Profile" className="text-muted-foreground hover:text-foreground">
                        <Info className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Duress login protection: signing in with your email and this separate Decoy Password opens an isolated benign account instead of your real profile.
                    </TooltipContent>
                  </Tooltip>
                </span>
                {hasDecoyProfile && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Decoy Active
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Configure a separate 8+ character duress password that opens a benign cover account at login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input type="password" value={decoyPassword} onChange={e => setDecoyPassword(e.target.value)} placeholder={hasDecoyProfile ? "Enter new password to rotate decoy..." : "Decoy Password (min 8 chars)"} />
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="default" onClick={handleCreateDecoy} disabled={isDecoyLoading || !decoyPassword}>
                {hasDecoyProfile ? 'Update Decoy' : 'Set Decoy'}
              </Button>
              <Button variant="outline" onClick={handleRemoveDecoy} disabled={isDecoyLoading || !hasDecoyProfile}>Remove Decoy</Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
    </TooltipProvider>
  );
}
