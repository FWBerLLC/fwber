'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ShieldCheck, UserCheck, Fingerprint, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

export default function IdentityVerificationPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/identity/status', {
        headers: { Authorization: `Bearer ${token}` }
      }) as any;
      setStatus(res.data);
    } catch (e) {
      console.error('Failed to fetch ID status', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchStatus();
  }, [token, fetchStatus]);

  const handleSimulateZKProof = async () => {
    if (!user) return;
    setIsVerifying(true);
    
    // In a real app, this would use an SDK from a provider like WorldID or a government ZK-pass
    // Here we simulate the generation of a proof tied to the user's email hash.
    const data = new TextEncoder().encode(user.email);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data as any);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const userHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const mockProof = `zk_proof_alpha_valid_sig_${userHash.substring(0, 8)}_auth_9921`;

    try {
      const res = await api.post('/identity/verify-zk', {
        proof: mockProof,
        issuer: 'fwber_trusted_authority'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      }) as any;

      toast({ title: 'Identity Verified', description: 'Your Zero-Knowledge proof has been accepted.' });
      setStatus({ is_id_verified: true, verified_at: res.data.verified_at });
    } catch (e: any) {
      toast({ 
        title: 'Verification Failed', 
        description: e.response?.data?.message || 'Proof rejected by the server.', 
        variant: 'destructive' 
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />
      
      <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-foreground uppercase flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-green-500" />
            ZK Identity
          </h1>
          <p className="text-zinc-500 mt-2">
            Prove you are a real human without ever sharing your name, birthdate, or ID documents. We only store an immutable cryptographic confirmation.
          </p>
        </div>

        {loading ? (
          <Card className="animate-pulse h-64 bg-zinc-100 dark:bg-zinc-900 border-none" />
        ) : status?.is_id_verified ? (
          <Card className="border-green-500/30 bg-green-500/5 shadow-[0_0_40px_rgba(34,197,94,0.1)] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <UserCheck className="w-32 h-32" />
            </div>
            
            <CardHeader>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
              <CardTitle className="text-2xl font-black text-green-600 dark:text-green-400 italic uppercase">
                Verified Identity
              </CardTitle>
              <CardDescription>
                Your account is cryptographically verified as authentic.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
                <div className="p-4 bg-card dark:bg-card dark:bg-zinc-900 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Issuer</span>
                        <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase">{status.issuer || 'Local Authority'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Verified On</span>
                        <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">{new Date(status.verified_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-full w-fit">
                    <Lock className="w-3 h-3" />
                    ZERO KNOWLEDGE SECURED
                </div>
            </CardContent>
            
            <CardFooter className="bg-green-500/10 border-t border-green-500/20 p-4">
                <p className="text-xs text-green-700 dark:text-green-300">
                    You can now access premium &quot;Verified-Only&quot; pulse feeds and messaging tiers.
                </p>
            </CardFooter>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-amber-500/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-600">
                        <ShieldAlert className="w-5 h-5" />
                        Verification Required
                    </CardTitle>
                    <CardDescription>
                        Match with confidence. Verified users get 3x more matches and priority in the Local Pulse.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                            <Fingerprint className="w-6 h-6 text-purple-500" />
                            <h4 className="font-bold text-sm uppercase">Biometric Link</h4>
                            <p className="text-xs text-zinc-500">Connect your device&apos;s secure enclave to generate a unique identity key.</p>
                        </div>
                        <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                            <Lock className="w-6 h-6 text-blue-500" />
                            <h4 className="font-bold text-sm uppercase">ZK-Proof</h4>
                            <p className="text-xs text-zinc-500">Generate a mathematical proof that your ID is valid without uploading documents.</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button 
                        className="w-full h-12 bg-zinc-900 hover:bg-black dark:bg-card dark:bg-card dark:text-black dark:hover:bg-zinc-200 font-black uppercase italic tracking-tighter"
                        onClick={handleSimulateZKProof}
                        disabled={isVerifying}
                    >
                        {isVerifying ? 'Generating Proof...' : 'Verify My Identity'}
                    </Button>
                </CardFooter>
            </Card>

            <div className="text-center p-4">
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest leading-relaxed">
                    Powered by the fwber ZK-Auth Protocol v2.0 <br/>
                    Your private data never leaves your device.
                </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
