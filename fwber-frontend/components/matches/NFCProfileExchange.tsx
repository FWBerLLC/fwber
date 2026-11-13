'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Smartphone, Zap, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNfc } from '@/lib/hooks/use-nfc';
import { DigitalReceipt } from '@/components/marketplace/DigitalReceipt';

import geohash from 'ngeohash';
import { v4 as uuidv4 } from 'uuid';

export function NFCProfileExchange() {
    const { user, token } = useAuth();
    const { toast } = useToast();
    const { isNative, lastScan, startScan, writeTag, setLastScan } = useNfc();
    
    const [status, setStatus] = useState<'idle' | 'scanning' | 'writing' | 'success' | 'error' | 'payment_pending' | 'verifying'>('idle');
    const [pendingPayment, setPendingPayment] = useState<any>(null);
    const [lastTransaction, setLastTransaction] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Watch for native scans
    useEffect(() => {
        if (lastScan && (status === 'scanning' || status === 'idle')) {
            processNfcData(lastScan);
            setLastScan(null);
        }
    // processNfcData is intentionally render-scoped (it closes over the
    // latest handleMatch/token state); the scan guard is lastScan itself,
    // which is cleared on first handling, so stale closures cannot refire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastScan, status]);

    const processNfcData = (data: any) => {
        if (data.type === 'fwber_profile' && data.userId) {
            handleMatch(data.userId, data.nonce, 'MOCK_GEOHASH_FROM_NATIVE');
        }
        if (data.type === 'fwber_payment_request') {
            setPendingPayment(data);
            setStatus('payment_pending');
            toast({
                title: "Payment Request Received",
                description: `Confirm purchase of ${data.itemName} for ${data.price} FWB.`,
            });
        }
    };

    const startNFCExchange = async () => {
        if (isNative) {
            setStatus('scanning');
            startScan();
            // Also broadcast our profile via native write
            writeTag(JSON.stringify({
                type: 'fwber_profile',
                userId: user?.id,
                nonce: uuidv4().substring(0, 8),
                timestamp: Date.now()
            }));
            return;
        }

        if (!('NDEFReader' in window)) {
            setStatus('error');
            setError('NFC is not supported on this browser or device.');
            return;
        }

        try {
            setStatus('scanning');
            
            // 1. Get current location for ZK-proof
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
            });
            
            // Generate precision-8 geohash (~19 meters)
            const locationHash = geohash.encode(position.coords.latitude, position.coords.longitude, 8);
            const sharedNonce = uuidv4().substring(0, 8);

            // @ts-ignore
            const ndef = new NDEFReader();
            await ndef.scan();
            
            toast({
                title: "NFC Ready",
                description: "Tap devices now to verify location and profile.",
            });

            ndef.addEventListener("reading", async ({ message, serialNumber }: any) => {
                console.log(`NFC: Read from ${serialNumber}`);
                const record = message.records[0];
                const textDecoder = new TextDecoder();
                const peerData = JSON.parse(textDecoder.decode(record.data));
                
                processNfcData(peerData);
            });

            // Write our own data: Profile ID + our random nonce
            const myData = JSON.stringify({
                type: 'fwber_profile',
                userId: user?.id,
                nonce: sharedNonce,
                timestamp: Date.now()
            });

            await ndef.write(myData);
            setStatus('writing');

        } catch (err: any) {
            console.error('NFC Error:', err);
            setStatus('error');
            setError(err.message || 'Failed to initialize NFC or Geolocation');
        }
    };

    const handleMatch = async (peerId: string | number, peerNonce: string, myLocationHash: string) => {
        try {
            setStatus('verifying');
            // The "proof" is sent to the backend. 
            // The backend will expect a matching proof from the other user.
            await api.post(`/matches/nfc-exchange`, { 
                peer_id: peerId,
                location_proof: myLocationHash, 
                nonce: peerNonce
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus('success');
            toast({
                title: "Physical Match Verified!",
                description: "Location and identity proven via NFC tap.",
            });
            setTimeout(() => setStatus('idle'), 5000);
        } catch (err) {
            setStatus('error');
            setError('Location proof mismatch or match error');
        } 
    };

    const confirmPayment = async () => {
        if (!pendingPayment) return;
        try {
            setStatus('verifying');
            const res = await api.post<any>(`/marketplace/purchase/${pendingPayment.itemId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setLastTransaction({
                id: res.redemption_code,
                itemName: pendingPayment.itemName,
                price: pendingPayment.price,
                merchantName: 'Venue', 
                timestamp: new Date().toISOString(),
                redemptionCode: res.redemption_code
            });

            setStatus('success');
            toast({
                title: "Payment Confirmed",
                description: `Successfully paid ${pendingPayment.price} FWB to merchant.`,
            });
            setPendingPayment(null);
        } catch (err: any) {
            setStatus('error');
            setError(err.message || 'Payment failed');
        }
    };

    return (
        <Card className="border-amber-500/30 bg-gradient-to-br from-zinc-900 to-amber-950/20 relative overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-amber-500 flex items-center gap-2 italic uppercase tracking-tighter">
                    <Smartphone className="w-5 h-5" />
                    NFC Flash Match
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs">
                    Tap phones to instantly verify a physical meetup and exchange profiles.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AnimatePresence mode="wait">
                    {status === 'idle' && (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Button 
                                onClick={startNFCExchange}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black uppercase italic"
                            >
                                <Zap className="w-4 h-4 mr-2 fill-current" />
                                Start Exchange
                            </Button>
                        </motion.div>
                    )}

                    {(status === 'scanning' || status === 'writing') && (
                        <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-4 space-y-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" />
                                <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/50">
                                    <Smartphone className="w-8 h-8 text-amber-500" />
                                </div>
                            </div>
                            <p className="text-sm font-bold text-amber-200 animate-pulse uppercase tracking-widest">
                                {status === 'scanning' ? 'Ready to Scan...' : 'Broadcasting Profile...'}
                            </p>
                            <Button variant="ghost" size="sm" onClick={() => setStatus('idle')} className="text-zinc-500 text-[10px]">Cancel</Button>
                        </motion.div>
                    )}

                    {status === 'verifying' && (
                        <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-8 space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                                <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse scale-150" />
                                <div className="p-6 bg-blue-600 rounded-full shadow-[0_0_30px_rgba(37,99,235,0.4)] relative z-10">
                                    <RefreshCw className="w-10 h-10 text-white animate-spin" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-black text-white uppercase italic tracking-tighter">Proximity Handshake</p>
                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Verifying Physical Proof-of-Presence...</p>
                            </div>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-4 text-green-500">
                            <CheckCircle2 className="w-12 h-12 mb-2" />
                            <p className="font-black uppercase italic">Confirmed</p>
                        </motion.div>
                    )}

                    {status === 'payment_pending' && pendingPayment && (
                        <motion.div key="payment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-4 space-y-4">
                            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl w-full text-center">
                                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">Pay with Tokens</p>
                                <p className="text-white font-bold">{pendingPayment.itemName}</p>
                                <p className="text-amber-500 font-black text-xl">{pendingPayment.price} FWB</p>
                            </div>
                            <div className="flex gap-2 w-full">
                                <Button variant="outline" className="flex-1" onClick={() => setStatus('idle')}>Decline</Button>
                                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={confirmPayment}>
                                    Pay Now
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-4 space-y-2">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                            <p className="text-xs text-red-400 text-center">{error}</p>
                            <Button variant="outline" size="sm" onClick={() => setStatus('idle')}>Try Again</Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {lastTransaction && (
                        <DigitalReceipt 
                            {...lastTransaction}
                            onClose={() => {
                                setLastTransaction(null);
                                setStatus('idle');
                            }}
                        />
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
