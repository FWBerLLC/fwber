'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Bluetooth, Radio, BatteryMedium, AlertCircle, RefreshCw, Vibrate } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

interface TokenStatus {
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

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/hardware-tokens/status', {
        headers: { Authorization: `Bearer ${token}` }
      }) as any;
      setTokenStatus(res.data.token);
    } catch (e: any) {
      if (e.response?.status !== 404) {
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
    
    // Simulate ping delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Token Pinged",
      description: "Your fwber token should now be vibrating and glowing.",
      duration: 3000
    });
    setIsPinging(false);
  };

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode) return;

    setIsPairing(true);
    try {
      // In reality, this might involve Web Bluetooth API to get the UUID directly.
      // For this prototype, the user enters a code printed on the token.
      const res = await api.post('/hardware-tokens/register', {
        token_uuid: `hw_${pairingCode}`,
        hardware_model: 'fwber_band_v1'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      }) as any;

      toast({ title: 'Success', description: 'Hardware token paired successfully!' });
      setTokenStatus(res.data.token);
      setPairingCode('');
    } catch (e: any) {
      toast({ 
        title: 'Pairing Failed', 
        description: e.response?.data?.message || 'Invalid code or token already registered.', 
        variant: 'destructive' 
      });
    } finally {
      setIsPairing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />
      
      <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <div className="mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-foreground uppercase flex items-center gap-3">
            <Bluetooth className="w-8 h-8 text-blue-500" />
            &quot;Anti-App&quot; Token
          </h1>
          <p className="text-zinc-500 mt-2">
            Pair your physical fwber bracelet or keychain. Leave your phone in your pocket. The token will glow and vibrate when a highly compatible match is within 50 feet.
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
                Token Active & Scanning
              </CardTitle>
              <CardDescription>
                Your device is paired and broadcasting.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Device ID</span>
                  <div className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    {tokenStatus.token_uuid.substring(0, 12)}...
                  </div>
                </div>
                
                <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Ping Test</span>
                  <Button 
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
                      {tokenStatus.battery_level !== null ? `${tokenStatus.battery_level}%` : 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                    <p className="font-bold text-sm text-zinc-900 dark:text-foreground">Last Sync</p>
                    <p className="text-xs text-zinc-500">
                      {tokenStatus.last_seen_at ? new Date(tokenStatus.last_seen_at).toLocaleTimeString() : 'Never'}
                    </p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 p-4">
              <Button 
                variant="outline" 
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={async () => {
                  if (true) {
                    // Quick unpair mock implementation for now
                    setTokenStatus(null);
                  }
                }}
              >
                Unpair Token
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
                    className="font-mono text-center tracking-widest text-lg"
                    maxLength={6}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isPairing || pairingCode.length < 6}
                >
                  {isPairing ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Pairing...</>
                  ) : (
                    <><Bluetooth className="w-4 h-4 mr-2" /> Connect Token</>
                  )}
                </Button>
              </form>
            </CardContent>
            
            <CardFooter className="bg-zinc-50 dark:bg-zinc-900 border-t p-4 text-xs text-zinc-500 text-center flex flex-col gap-2">
                <AlertCircle className="w-4 h-4 mx-auto text-zinc-400" />
                Make sure Bluetooth is enabled on your phone. The app uses your phone as a bridge to push notifications to the token.
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  );
}
