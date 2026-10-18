'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { Activity, TrendingUp, Zap, Users, Shield, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface VibeData {
    node_name: string;
    venue_name: string;
    analysis: {
        vibe: string;
        sentiment: number;
        trending_keywords: string[];
        activity_score: number;
        summary: string;
        post_count: number;
    };
    timestamp: string;
}

export default function LivePulseBoard() {
    const params = useParams();
    const uuid = params.uuid as string;
    const [data, setData] = useState<VibeData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await api.get<VibeData>(`/public/pulse/node/${uuid}`);
                setData(response);
            } catch (error) {
                console.error('Failed to fetch node data', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
        const interval = setInterval(fetchData, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [uuid]);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black animate-pulse">BOOTING DETROIT PULSE...</div>;
    if (!data) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-black">NODE CONNECTION ERROR</div>;

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-purple-500 overflow-hidden relative">
            {/* Scoping Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
                <div className="w-full h-full border border-white/10 grid grid-cols-8 grid-rows-8">
                    {Array.from({length: 64}).map((_, i) => <div key={i} className="border border-white/5" />)}
                </div>
            </div>

            {/* Header */}
            <header className="flex justify-between items-end mb-12 relative z-10 border-b-2 border-white/10 pb-8">
                <div>
                    <div className="flex items-center gap-2 text-purple-500 mb-2">
                        <Zap className="w-6 h-6 fill-current" />
                        <span className="font-black uppercase tracking-[0.3em] text-sm">Live Broadcast</span>
                    </div>
                    <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">
                        {data.venue_name}
                    </h1>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest mt-4">
                        Detroit Pulse Node: {data.node_name}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-mono font-black text-white/20">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2 justify-end mt-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-500/50">Node Online</span>
                    </div>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                {/* Main Vibe Column */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-zinc-900/50 backdrop-blur-md border-2 border-white/5 p-12 rounded-[2rem] relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <TrendingUp className="w-64 h-64 -rotate-12" />
                        </div>
                        
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 block">Current Atmosphere</span>
                        <motion.h2 
                            key={data.analysis.vibe}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-9xl font-black italic uppercase tracking-tighter text-purple-400 drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]"
                        >
                            {data.analysis.vibe}
                        </motion.h2>
                        
                        <div className="mt-12 flex items-start gap-6">
                            <div className="p-4 rounded-2xl bg-card dark:bg-gray-800/5 border border-white/10">
                                <Info className="w-6 h-6 text-zinc-400" />
                            </div>
                            <p className="text-2xl text-zinc-300 font-medium leading-tight max-w-2xl">
                                &quot;{data.analysis.summary}&quot;
                            </p>
                        </div>
                    </section>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="bg-zinc-900/50 backdrop-blur-md border-2 border-white/5 p-8 rounded-[2rem]">
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 block">Pulse Density</span>
                            <div className="flex items-end gap-4">
                                <div className="text-7xl font-black italic tracking-tighter text-blue-500">{data.analysis.activity_score}</div>
                                <Activity className="w-8 h-8 text-blue-500 mb-2 animate-bounce" />
                            </div>
                        </div>
                        <div className="bg-zinc-900/50 backdrop-blur-md border-2 border-white/5 p-8 rounded-[2rem]">
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 block">Neighborhood Sentiment</span>
                            <div className="text-7xl font-black italic tracking-tighter text-green-500">
                                {Math.round(data.analysis.sentiment * 100)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trends Column */}
                <div className="space-y-8">
                    <section className="bg-zinc-900/50 backdrop-blur-md border-2 border-white/5 p-8 rounded-[2rem] h-full&quot;">
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-8 block">Trending Topics Nearby</span>
                        <div className="space-y-4">
                            {data.analysis.trending_keywords.map((kw, i) => (
                                <motion.div 
                                    key={kw}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center justify-between p-6 bg-card dark:bg-gray-800/5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-colors group"
                                >
                                    <span className="text-2xl font-black uppercase italic tracking-tighter group-hover:text-purple-400 transition-colors">#{kw}</span>
                                    <TrendingUp className="w-5 h-5 text-zinc-600 group-hover:text-purple-500 transition-colors" />
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-12 pt-8 border-t border-white/5">
                            <div className="flex items-center gap-4 text-zinc-500 mb-4">
                                <Users className="w-5 h-5" />
                                <span className="font-black uppercase tracking-widest text-[10px]">{data.analysis.post_count} Voices Contributing</span>
                            </div>
                            <div className="flex items-center gap-4 text-zinc-500">
                                <Shield className="w-5 h-5" />
                                <span className="font-black uppercase tracking-widest text-[10px]">Fully Anonymized Data</span>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black to-transparent flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-card dark:bg-card rounded-full flex items-center justify-center">
                        <span className="text-black font-black text-xs">f.</span>
                    </div>
                    <div className="font-black uppercase italic tracking-tighter text-xl">fwber <span className="text-purple-500">Pulse Node</span></div>
                </div>
                <div className="bg-card dark:bg-gray-800/5 border border-white/10 px-6 py-2 rounded-full">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Join the pulse: </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white ml-2">fwber.app</span>
                </div>
            </footer>
        </div>
    );
}
