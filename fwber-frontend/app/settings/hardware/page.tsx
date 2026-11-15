'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Bluetooth, Radio, BatteryMedium, RefreshCw, Vibrate, Trash2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

interface TokenStatus {
  id?: number;
  token_uuid: string;
  hardware_model: string;
  is_active: boolean;
  battery_level: number | null;
  last_seen_at: string | null;
}

export default function HardwareTokenPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPairing, setIsPairing] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [isPinging, setIsPinging] = useState(false);
  const [isUnpairing, setIsUnpairing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/hardware-tokens/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resolved = res?.token ?? res?.data?.token ?? (Array.isArray(res?.tokens) ? res.tokens[0] : null) ?? null;
      setTokenStatus(resolved);
    } catch (e: any) {
      if (e?.response?.status !== 404) {
        console.error('Failed to fetch token status', e);
      }
      setTokenStatus(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchStatus();
  }, [token, fetchStatus]);

  const handlePing = async () => {
    if (!tokenStatus) return;
    setIsPinging(true);
    try {
      const res = await api.post<any>('/hardware-tokens/ping', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res?.token) {
        setTokenStatus(res.token);
      }
      toast({
        title: 'Token Pinged',
        description: 'Your fwber token sync timestamp was updated and vibration signal sent.',
        duration: 3000,
      });
    } catch (e: any) {
      toast({
        title: 'Ping Failed',
        description: e?.response?.data?.message || 'Could not reach paired hardware token.',
        variant: 'destructive',
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pairingCode.trim().toUpperCase();
    if (!cleaned) return;

    setIsPairing(true);
    try {
      const res = await api.post<any>('/hardware-tokens/register', {
        token_uuid: `hw_${cleaned}`,
        hardware_model: 'fwber_band_v1',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const paired = res?.token ?? res?.data?.token ?? null;
      setTokenStatus(paired);
      setPairingCode('');
      toast({ title: 'Success', description: 'Hardware token paired successfully!' });
    } catch (e: any) {
      toast({
        title: 'Pairing Failed',
        description: e?.response?.data?.message || 'Invalid code or token already registered.',
        variant: 'destructive',
      });
    } finally {
      setIsPairing(false);
    }
  };

  const handleUnpair = async () => {
    if (!tokenStatus) return;
    setIsUnpairing(true);
    try {
      const idOrUuid = encodeURIComponent(tokenStatus.token_uuid || String(tokenStatus.id || ''));
      await api.delete(`/hardware-tokens/${idOrUuid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTokenStatus(null);
      toast({ title: 'Token Unpaired', description: 'Your hardware token has been disconnected.' });
    } catch (e: any) {
      toast({
        title: 'Unpair Failed',
        description: e?.response?.data?.message || 'Failed to unpair hardware token.',
        variant: 'destructive',
      });
    } finally {
      setIsUnpairing(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <AppHeader title="Hardware Token" />

        <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
          <div className="mb-8">
            <h1 className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-foreground uppercase flex items-center gap-3">
              <Bluetooth className="w-8 h-8 text-blue-500" />
              &quot;Anti-App&quot; Token
            </h1>
            <p className="text-zinc-500 mt-2">
              Pair your physical fwber bracelet or keychain. Leave your phone in your pocket — your token glows and vibrates when a high-affinity match is within 50 feet.
            </p>
          </div>

          {loading ? (
            <Card className="animate-pulse h-64 bg-zinc-100 dark:bg-zinc-900 border-none" />
          ) : tokenStatus ? (
            <Card className="border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.1)] overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Radio className="w-32 h-32" />
              </div>

              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-500">
                  <Radio className="w-5 h-5 animate-pulse" />
                  Token Active &amp; Scanning
                </CardTitle>
                <CardDescription>
                  Model: {tokenStatus.hardware_model} — paired and broadcasting proximity beacons.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Device ID</span>
                    <div className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200 break-all">
                      {tokenStatus.token_uuid}
                    </div>
                  </div>

                  <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Ping Test</span>
                    <Button
                      type="button"
                      onClick={handlePing}
                      disabled={isPinging}
                      size="sm"
                      className={`w-full font-bold transition-all ${isPinging ? 'bg-blue-600/50 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                    >
                      {isPinging ? <Radio className="w-4 h-4 mr-2 animate-ping" /> : <Vibrate className="w-4 h-4 mr-2" />}
                      {isPinging ? 'Pinging...' : 'Send Ping'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center gap-3">
                    <BatteryMedium className={`w-5 h-5 ${tokenStatus.battery_level && tokenStatus.battery_level < 20 ? 'text-red-500' : 'text-green-500'}`} />
                    <div>
                      <p className="font-bold text-sm text-zinc-900 dark:text-foreground">Battery Level</p>
                      <p className="text-xs text-zinc-500">
                        {tokenStatus.battery_level !== null ? `${tokenStatus.battery_level}%` : '100%'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-sm text-zinc-900 dark:text-foreground">Last Sync</p>
                    <p className="text-xs text-zinc-500">
                      {tokenStatus.last_seen_at ? new Date(tokenStatus.last_seen_at).toLocaleTimeString() : 'Just now'}
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 p-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUnpairing}
                  className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={handleUnpair}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isUnpairing ? 'Unpairing...' : 'Unpair Token'}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Pair New Token</CardTitle>
                <CardDescription>
                  Enter the 6-character pairing code printed on the inside of your fwber hardware token.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePair} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pairing-code">Pairing Code</Label>
                    <Input
                      id="pairing-code"
                      placeholder="e.g. A7X9B2"
                      value={pairingCode}
                      onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                      className="font-mono text-center tracking-widest text-lg bg-background text-foreground"
                      maxLength={12}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isPairing || pairingCode.trim().length < 4}
                  >
                    {isPairing ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Pairing...</>
                    ) : (
                      <><Bluetooth className="w-4 h-4 mr-2" /> Connect Token</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
