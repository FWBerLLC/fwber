'use client';

import React, { useState, useEffect } from 'react';
import { marketplaceApi, InventoryItem } from '@/lib/api/marketplace';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Zap, Loader2, CheckCircle2, AlertTriangle, Coins, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export function MerchantPOS() {
    const { toast } = useToast();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [status, setStatus] = useState<'idle' | 'broadcasting' | 'success' | 'error'>('idle');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        marketplaceApi.getOwnedInventory()
            .then(res => setItems(res.items))
            .finally(() => setLoading(false));
    }, []);

    const startPaymentBroadcast = async (item: InventoryItem) => {
        if (!('NDEFReader' in window)) {
            toast({
                variant: "destructive",
                title: "NFC Unsupported",
                description: "This device does not support Web NFC.",
            });
            return;
        }

        try {
            setSelectedItem(item);
            setStatus('broadcasting');

            // @ts-ignore
            const ndef = new NDEFReader();
            
            // The message to send via NFC tap
            const payLoad = JSON.stringify({
                type: 'fwber_payment_request',
                itemId: item.id,
                itemName: item.name,
                price: item.price_tokens,
                merchantId: item.merchant_profile_id,
                timestamp: Date.now()
            });

            await ndef.write(payLoad);
            
            toast({
                title: "POS Active",
                description: `Broadcasting payment request for ${item.name}. Tap user's phone.`,
            });

        } catch (err: any) {
            console.error('NFC POS Error:', err);
            setStatus('error');
        }
    };

    return (
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-900 text-white">
                <CardTitle className="flex items-center gap-2 italic uppercase tracking-tighter">
                    <Smartphone className="w-5 h-5 text-amber-500" />
                    Quick POS (Tap-to-Pay)
                </CardTitle>
                <CardDescription className="text-zinc-400">
                    Select an item and tap the user's phone to initiate an instant FWB Token transaction.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                    {loading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-sm text-zinc-500 italic">No inventory items found. Add them in the Marketplace tab.</div>
                    ) : items.map(item => (
                        <button type="button" 
                            key={item.id} 
                            onClick={() => startPaymentBroadcast(item)}
                            disabled={status === 'broadcasting'}
                            className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left"
                        >
                            <div>
                                <p className="font-bold text-sm">{item.name}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{item.stock_count} in stock</p>
                            </div>
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                <Coins className="w-3 h-3 mr-1" />
                                {item.price_tokens}
                            </Badge>
                        </button>
                    ))}
                </div>
            </CardContent>

            <AnimatePresence>
                {status === 'broadcasting' && selectedItem && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center"
                    >
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" />
                            <div className="p-8 bg-amber-500/10 rounded-full border border-amber-500/50">
                                <Smartphone className="w-12 h-12 text-amber-500" />
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Ready for Tap</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            Ask the user to unlock their phone and tap the back of your device.
                        </p>
                        <div className="bg-zinc-800 p-4 rounded-xl w-full mb-8">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Charging</p>
                            <p className="text-white font-bold">{selectedItem.name}</p>
                            <p className="text-amber-500 font-black text-lg">{selectedItem.price_tokens} FWB</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            className="text-zinc-500 hover:text-white"
                            onClick={() => setStatus('idle')}
                        >
                            Cancel Transaction
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
