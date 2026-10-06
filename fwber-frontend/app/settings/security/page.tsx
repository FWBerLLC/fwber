'use client';

import { useState, useEffect } from 'react';
import { useE2EEncryption } from '@/lib/hooks/use-e2e-encryption';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Lock, RefreshCw, Key, ShieldCheck, AlertTriangle, Globe, UserX, Mic2, Zap, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { updateUserProfile } from '@/lib/api/profile';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { runEncryptionBenchmark, BenchmarkResult } from '@/lib/wasm/benchmark';

export default function SecuritySettingsPage() {
  const { isReady, regenerateKeys } = useE2EEncryption();
  const { token, user, updateUser } = useAuth();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isFederated, setIsFederated] = useState(false);
  const [isConfessional, setIsConfessional] = useState(false);
  const [decoyPassword, setDecoyPassword] = useState('');
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

  const federatedHandle = user?.email ? `@${user.email.split('@')[0]}@api.fwber.site` : '@loading@api.fwber.site';

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
      toast({ title: 'Success', description: 'Decoy Profile linked to this password.' });
      setDecoyPassword('');
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to create decoy profile.', variant: 'destructive' });
    } finally {
      setIsDecoyLoading(false);
    }
  };

  const handleRemoveDecoy = async () => {
    setIsDecoyLoading(true);
    try {
      await api.delete('/settings/decoy-profile');
      toast({ title: 'Removed', description: 'Decoy Profile detached.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to remove', variant: 'destructive' });
    } finally {
      setIsDecoyLoading(false);
    }
  };

  const handleRegenerateKeys = async () => {
    if (true) { // Proceeds with key reset
      return;
    }

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-8 pb-20">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-green-500" />
          Security & Privacy
        </h1>

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
                  <div className={`w-3 h-3 rounded-full ${isConfessional ? 'bg-purple-500' : 'bg-gray-500'}`} />
                  <div>
                    <Label htmlFor="confessional-toggle" className="font-medium text-sm text-gray-900 dark:text-white cursor-pointer">
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
                <Lock className="w-5 h-5 text-blue-500" />
                End-to-End Encryption
              </CardTitle>
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
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <UserX className="w-5 h-5 text-red-500" />
                Emergency Decoy Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input type="password" value={decoyPassword} onChange={e => setDecoyPassword(e.target.value)} placeholder="Decoy Password" />
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="default" onClick={handleCreateDecoy} disabled={isDecoyLoading || !decoyPassword}>Set Decoy</Button>
              <Button variant="outline" onClick={handleRemoveDecoy} disabled={isDecoyLoading}>Remove Decoy</Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
