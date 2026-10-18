'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, QrCode, Download, Share2, Coins, Calendar, Store } from 'lucide-react';
import { motion } from 'framer-motion';

interface DigitalReceiptProps {
    id: string;
    itemName: string;
    price: number | string;
    merchantName: string;
    timestamp: string;
    redemptionCode: string;
    onClose: () => void;
}

export function DigitalReceipt({ id, itemName, price, merchantName, timestamp, redemptionCode, onClose }: DigitalReceiptProps) {
    const handleDownload = () => {
        // Simple print-friendly view or image generation trigger
        window.print();
    };

    return (
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
        >
            <Card className="max-w-sm w-full bg-card dark:bg-card dark:bg-zinc-900 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)] overflow-hidden">
                <div className="bg-amber-500 h-2 w-full" />
                
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Transaction Verified</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Digital Receipt #{id.substring(0, 8)}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="space-y-4 border-y border-zinc-100 dark:border-zinc-800 py-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500 flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
                                <Store className="w-3.5 h-3.5" /> Venue
                            </span>
                            <span className="font-black dark:text-foreground uppercase italic">{merchantName}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500 flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
                                <Calendar className="w-3.5 h-3.5" /> Date
                            </span>
                            <span className="font-bold dark:text-zinc-300">{new Date(timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Total Paid</span>
                            <span className="text-2xl font-black text-amber-500 flex items-center gap-1">
                                <Coins className="w-5 h-5 fill-current" />
                                {price} FWB
                            </span>
                        </div>
                    </div>

                    <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-5">
                            <QrCode className="w-full h-full" />
                        </div>
                        <p className="text-[10px] font-black uppercase text-zinc-500 mb-2 relative z-10">Redemption Code</p>
                        <span className="text-3xl font-mono font-black tracking-[0.2em] text-amber-600 relative z-10">
                            {redemptionCode}
                        </span>
                    </div>

                    <div className="flex items-center justify-center gap-4 py-2 opacity-50">
                        <div className="w-3 h-3 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                        <div className="w-3 h-3 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                        <div className="w-3 h-3 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900/50 p-4">
                    <div className="grid grid-cols-2 gap-2 w-full">
                        <Button variant="outline" className="text-xs font-bold uppercase" onClick={handleDownload}>
                            <Download className="w-3.5 h-3.5 mr-2" /> Save
                        </Button>
                        <Button variant="outline" className="text-xs font-bold uppercase">
                            <Share2 className="w-3.5 h-3.5 mr-2" /> Share
                        </Button>
                    </div>
                    <Button className="w-full mt-2" onClick={onClose}>Close Receipt</Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
