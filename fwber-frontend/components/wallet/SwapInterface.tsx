'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCcw, ArrowRightLeft, ShieldCheck, Loader2, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SwapInterfaceProps {
    onSwapSuccess?: () => void;
}

export function SwapInterface({ onSwapSuccess }: SwapInterfaceProps = {}) {
    const { toast } = useToast();
    const [amount, setAmount] = useState('');
    const [targetAsset, setTargetAsset] = useState('SOL');
    const [address, setAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [rates, setRates] = useState<any>(null);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await api.get<{ swaps?: any[] }>('/economy/swaps');
            setHistory(Array.isArray(res?.swaps) ? res.swaps : Array.isArray(res) ? res : []);
        } catch (err) {
            console.error('Failed to load swap history:', err);
            setHistory([]);
        }
    }, []);

    const fetchRates = useCallback(async () => {
        try {
            const res = await api.get<any>('/economy/rates');
            if (res && typeof res === 'object' && !Array.isArray(res)) {
                setRates(res);
            }
        } catch (err) {
            console.error('Failed to fetch rates', err);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
        fetchRates();
        const interval = setInterval(fetchRates, 30000);
        return () => clearInterval(interval);
    }, [fetchHistory, fetchRates]);

    const getEstimatedReceive = () => {
        const parsed = parseFloat(amount);
        if (!rates?.pairs || !Number.isFinite(parsed) || parsed <= 0) return 0;
        const pairRate = Number(rates.pairs[targetAsset] ?? 0);
        return parsed * pairRate * 0.98; // 2% protocol bridge fee
    };

    const currentFwbPrice = Number(rates?.fwb_usd ?? 0.5);
    const estimatedReceive = getEstimatedReceive();

    const handleSwap = async () => {
        if (!amount || !address) return;
        setIsSubmitting(true);
        try {
            await api.post('/economy/swaps/initiate', {
                amount: parseFloat(amount),
                target_asset: targetAsset,
                destination_address: address.trim(),
            });
            toast({
                title: 'Swap Initiated',
                description: `Bridging ${amount} FWB to ${targetAsset}...`,
            });
            setAmount('');
            setAddress('');
            await fetchHistory();
            onSwapSuccess?.();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Swap Failed',
                description: err?.error || err?.message || 'Unable to execute swap',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-6 rounded-2xl border border-indigo-500/30 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <ArrowRightLeft className="w-32 h-32" />
                    </div>

                    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4 flex items-center gap-2">
                        <RefreshCcw className="w-5 h-5 text-indigo-400" />
                        Global Bridge
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button type="button" aria-label="Global Bridge info" className="text-indigo-300 hover:text-white">
                                    <Info className="w-4 h-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                Swap internal FWB tokens to external Solana assets (SOL/USDC) or instant Federated Vouchers across partner instances.
                            </TooltipContent>
                        </Tooltip>
                    </h3>

                    <div className="space-y-4 relative z-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-indigo-300 text-[10px] font-black uppercase">Sell Amount</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder="0"
                                        className="bg-black/20 border-indigo-500/50 text-white font-bold h-12 pr-14"
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
                            <Label className="text-indigo-300 text-[10px] font-black uppercase flex items-center gap-1.5">
                                Destination Address
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="w-3.5 h-3.5 text-indigo-300 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        Enter a Solana wallet address for SOL/USDC settlements, or an @user@domain federated handle for Peer Vouchers.
                                    </TooltipContent>
                                </Tooltip>
                            </Label>
                            <Input
                                placeholder="Enter Solana Wallet Address or Federated Actor URI"
                                className="bg-black/20 border-indigo-500/50 text-white font-mono text-xs h-12"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </div>

                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-400">Reference Rate</span>
                                <span className="text-white font-mono">1 FWB ≈ ${currentFwbPrice.toFixed(4)} USD</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-400 flex items-center gap-1">
                                    Bridge Fee (2%)
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="w-3 h-3 text-zinc-400 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            2% protocol fee covers Solana network settlement and treasury liquidity reserves.
                                        </TooltipContent>
                                    </Tooltip>
                                </span>
                                <span className="text-red-400">${((parseFloat(amount || '0') || 0) * currentFwbPrice * 0.02).toFixed(4)} USD</span>
                            </div>
                            <div className="flex justify-between items-end pt-2 border-t border-white/5">
                                <span className="text-indigo-300 font-bold uppercase text-[10px]">You Receive (Est.)</span>
                                <span className="text-xl font-black text-green-400 font-mono">
                                    {targetAsset === 'USDC' ? '$' : ''}{estimatedReceive.toFixed(6)} {targetAsset}
                                </span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic text-lg shadow-xl"
                            disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || !address.trim()}
                            onClick={handleSwap}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                            Execute Secure Bridge
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <RefreshCcw className="w-3 h-3" />
                            Bridge History
                        </h4>
                        <Button type="button" variant="ghost" size="sm" onClick={fetchHistory} className="h-7 text-xs">
                            Refresh
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {history.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic py-4">No bridge swaps recorded yet.</p>
                        ) : (
                            history.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="p-4 border border-border rounded-xl flex items-center justify-between bg-card"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-foreground">
                                                {Number(tx.source_amount).toLocaleString()} FWB &rarr; {Number(tx.target_amount).toFixed(4)} {tx.target_asset}
                                            </div>
                                            <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[220px]">
                                                To: {tx.destination_address}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={tx.status === 'completed' ? 'default' : 'secondary'}
                                        className="uppercase text-[10px]"
                                    >
                                        {tx.status}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
