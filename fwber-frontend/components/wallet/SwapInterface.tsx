'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCcw, ArrowRightLeft, ShieldCheck, ExternalLink, Loader2, Coins } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export function SwapInterface() {
    const { toast } = useToast();
    const [amount, setAmount] = useState('');
    const [targetAsset, setTargetAsset] = useState('SOL');
    const [address, setAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [rates, setRates] = useState<any>(null);

    const fetchHistory = async () => {
        try {
            const res = await api.get<{ swaps: any[] }>('/economy/swaps');
            setHistory(res.swaps);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRates = async () => {
        try {
            const res = await api.get<any>('/economy/rates');
            setRates(res);
        } catch (err) {
            console.error('Failed to fetch rates', err);
        }
    };

    useEffect(() => {
        fetchHistory();
        fetchRates();
        const interval = setInterval(fetchRates, 30000);
        return () => clearInterval(interval);
    }, []);

    const getEstimatedReceive = () => {
        if (!rates || !amount) return 0;
        const pairRate = rates.pairs[targetAsset] || 0;
        return parseFloat(amount) * pairRate * 0.98; // 2% fee
    };

    const currentFwbPrice = rates?.fwb_usd || 0.50;
    const estimatedReceive = getEstimatedReceive();

    const handleSwap = async () => {
        if (!amount || !address) return;
        setIsSubmitting(true);
        try {
            await api.post('/economy/swaps/initiate', {
                amount: parseFloat(amount),
                target_asset: targetAsset,
                destination_address: address
            });
            toast({
                title: "Swap Initiated",
                description: `Bridging ${amount} FWB to ${targetAsset}...`,
            });
            setAmount('');
            setAddress('');
            fetchHistory();
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Swap Failed",
                description: err.message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-6 rounded-2xl border border-indigo-500/30 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ArrowRightLeft className="w-32 h-32" />
                </div>
                
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4 flex items-center gap-2">
                    <RefreshCcw className="w-5 h-5 text-indigo-400 animate-spin-slow" />
                    Global Bridge
                </h3>

                <div className="space-y-4 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-indigo-300 text-[10px] font-black uppercase">Sell Amount</Label>
                            <div className="relative">
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    className="bg-black/20 border-indigo-500/50 text-white font-bold h-12"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-400">FWB</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-indigo-300 text-[10px] font-black uppercase">Receive Asset</Label>
                            <Select value={targetAsset} onValueChange={setTargetAsset}>
                                <SelectTrigger className="bg-black/20 border-indigo-500/50 text-white font-bold h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SOL">Solana (SOL)</SelectItem>
                                    <SelectItem value="USDC">Circle (USDC)</SelectItem>
                                    <SelectItem value="PEER_TOKEN">Federated Voucher</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-indigo-300 text-[10px] font-black uppercase">Destination Address</Label>
                        <Input 
                            placeholder="Enter Wallet or Actor URI" 
                            className="bg-black/20 border-indigo-500/50 text-white font-mono text-xs h-12"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>

                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-zinc-400">Rate</span>
                            <span className="text-white font-mono">1 FWB ≈ ${currentFwbPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-zinc-400">Bridge Fee (2%)</span>
                            <span className="text-red-400">{(parseFloat(amount || '0') * currentFwbPrice * 0.02).toFixed(4)} USD</span>
                        </div>
                        <div className="flex justify-between items-end pt-2 border-t border-white/5">
                            <span className="text-indigo-300 font-bold uppercase text-[10px]">You Receive (Est.)</span>
                            <span className="text-xl font-black text-green-400 font-mono">
                                {targetAsset === 'USDC' ? '$' : ''}{estimatedReceive.toFixed(6)} {targetAsset}
                            </span>
                        </div>
                    </div>

                    <Button 
                        className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic text-lg shadow-xl"
                        disabled={isSubmitting || !amount || !address}
                        onClick={handleSwap}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                        Execute Secure Bridge
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <RefreshCcw className="w-3 h-3" />
                    Bridge History
                </h4>
                <div className="space-y-2">
                    {history.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic py-4">No swap history found.</p>
                    ) : (
                        (history || []).map(tx => (
                            <div key={tx.id} className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl flex items-center justify-between bg-card dark:bg-card dark:bg-zinc-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                        <ArrowRightLeft className="w-4 h-4 text-zinc-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">
                                            {tx.source_amount} FWB <span className="text-zinc-400">→</span> {tx.target_amount} {tx.target_asset}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="outline" className={`text-[8px] uppercase px-1 py-0 ${tx.status === 'pending' ? 'text-amber-500' : 'text-green-500'}`}>
                                                {tx.status}
                                            </Badge>
                                            <span className="text-[10px] text-zinc-400 font-mono">{tx.tx_hash.substring(0, 12)}...</span>
                                        </div>
                                    </div>
                                </div>
                                <a href="#" className="text-zinc-400 hover:text-indigo-500"><ExternalLink className="w-4 h-4" /></a>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
