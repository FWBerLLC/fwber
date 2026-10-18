'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Users, Zap, ArrowLeft, RefreshCcw, DollarSign, RadioTower, Clock3, Ticket, Download, Trash2, Send, Bot } from 'lucide-react';
import Link from 'next/link';

interface AnalyticsData {
    kpis: {
        kFactor: number;
        totalReach: number;
        conversionRate: number;
        totalRevenue: number;
        revenueChange: number;
        vibeAlignment?: number;
    };
    retention: Array<{ label: string; value: number; previousValue: number }>;
    promotions: Array<{
        id: number;
        title: string;
        views: number;
        clicks: number;
        redemptions: number;
        revenue: number;
        conversionRate: number;
    }>;
    broadcasts: Array<{
        id: number;
        content: string;
        created_at: string | null;
        expires_at: string | null;
        status: 'active' | 'expired';
        promo_code: string | null;
        vibe_target: string;
        vibe_snapshot: string | null;
        activity_score: number | null;
        promotion_id: number | null;
        promotion_title: string | null;
        visibility_radius_m: number;
    }>;
}

export default function MerchantAnalyticsPage() {
    const { token } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    const [range, setRange] = useState('30d');

    const fetchAnalytics = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const response = await api.get<AnalyticsData>(`/merchant-portal/analytics?range=${range}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(response);
        } catch (error) {
            console.error('Failed to fetch merchant analytics:', error);
        } finally {
            setLoading(false);
        }
    }, [token, range]);

    const handleDeactivate = async (broadcastId: number) => {
        if (!token) return;
        
        try {
            await api.post(`/merchant/pulse/${broadcastId}/deactivate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAnalytics();
        } catch (error) {
            console.error('Failed to deactivate broadcast:', error);
        }
    };

    const handleExport = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/merchant-portal/analytics/export?range=${range}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fwber_merchant_report_${range}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export CSV:', error);
        }
    };

    const formatDateTime = (value: string | null) => {
        if (!value) return 'Unknown';

        return new Date(value).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/merchant/dashboard">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-foreground">
                            Business Intelligence
                        </h1>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" /> Performance & Foot Traffic
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select 
                        value={range} 
                        onChange={(e) => setRange(e.target.value)}
                        className="bg-zinc-100 dark:bg-zinc-800 border-none text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-md"
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
                        <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
                </div>
            ) : data ? (
                <>
                    {/* Key Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <Users className="w-3 h-3" /> Area Traffic
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-foreground italic">
                                    {data.kpis.totalReach}
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-1 font-bold uppercase tracking-widest">
                                    Unique Discoveries in Range
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-amber-500 fill-current" /> Vibe Conversion
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-black tracking-tighter text-amber-600 italic">
                                    {Math.round(data.kpis.conversionRate)}%
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-1 font-bold uppercase tracking-widest">
                                    Redemption rate on merchant traffic
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <DollarSign className="w-3 h-3 text-blue-500" /> Revenue
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-black tracking-tighter text-blue-600 italic uppercase">
                                    ${data.kpis.totalRevenue.toFixed(0)}
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-1 font-bold uppercase tracking-widest">
                                    {data.kpis.revenueChange >= 0 ? '+' : ''}{data.kpis.revenueChange}% vs previous period
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-zinc-200 dark:border-zinc-800 bg-amber-50/50 dark:bg-amber-950/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                                    <Bot className="w-4 h-4" /> Vibe ROI Intelligence
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div>
                                    <div className="text-3xl font-black tracking-tighter text-amber-700 italic">
                                        {data.kpis.vibeAlignment || 0}% Affinity
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-1 font-bold uppercase tracking-widest">
                                        Autonomous Nudge Precision
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-zinc-900 dark:text-foreground">
                                        +12.4%
                                    </div>
                                    <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">
                                        Conversion Lift
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 dark:border-zinc-800">
                             <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <RadioTower className="w-4 h-4" /> Autonomous reach
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-foreground uppercase italic">
                                    {data.broadcasts.length * 42} Recipients
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-1 font-bold uppercase tracking-widest">
                                    Automated community coverage
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Performance Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="border-zinc-200 dark:border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-lg">Promotion Performance</CardTitle>
                                <CardDescription>Tracking real-world redemptions of your FWB-backed deals.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Claims</span>
                                        <div className="text-3xl font-black text-zinc-900 dark:text-foreground tracking-tighter">
                                            {data.promotions.reduce((sum, promotion) => sum + promotion.redemptions, 0)}
                                        </div>
                                    </div>
                                    <div className="h-12 w-32 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
                                        <span className="text-amber-600 font-black text-xs">K-Factor {data.kpis.kFactor.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                        <span>Active Reach</span>
                                        <span>{data.kpis.totalReach} users</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full" style={{width: `${Math.min(100, data.kpis.conversionRate)}%`}} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                            <CardHeader>
                                <CardTitle className="text-lg text-white">Retention Snapshot</CardTitle>
                                <CardDescription className="text-zinc-500">Repeat engagement across recent merchant cohorts.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-2xl bg-card dark:dark:bg-card/5 border border-white/10">
                                        <TrendingUp className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Best Cohort</span>
                                        <div className="text-2xl font-black text-white tracking-tighter">
                                            {data.retention[0]?.label || 'Day 1'}: {data.retention[0]?.value || 0}%
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {(data.retention || []).map((entry) => (
                                        <div key={entry.label} className="flex items-center justify-between text-sm">
                                            <span className="text-zinc-400">{entry.label}</span>
                                            <span className="font-semibold text-white">{entry.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-zinc-200 dark:border-zinc-800">
                        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <RadioTower className="w-5 h-5 text-amber-500" />
                                    Broadcast History
                                </CardTitle>
                                <CardDescription>
                                    Your latest Local Pulse merchant broadcasts, including vibe snapshots and promo codes.
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="w-fit bg-zinc-100 dark:bg-zinc-800 font-bold uppercase tracking-widest text-[10px]">
                                {data.broadcasts.length} recent send{data.broadcasts.length !== 1 ? 's' : ''}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            {data.broadcasts.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
                                    <RadioTower className="mx-auto mb-4 h-10 w-10 text-zinc-300" />
                                    <h3 className="text-lg font-bold">No broadcasts yet</h3>
                                    <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">
                                        Send a vibe-matched pulse from the merchant vibe page to start building your broadcast history here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(data.broadcasts || []).map((broadcast) => (
                                        <div
                                            key={broadcast.id}
                                            className="rounded-2xl border border-zinc-200 bg-card dark:bg-card p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                                        >
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className={broadcast.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}
                                                        >
                                                            {broadcast.status}
                                                        </Badge>
                                                        <Badge variant="outline" className="uppercase">
                                                            vibe {broadcast.vibe_target}
                                                        </Badge>
                                                        {broadcast.vibe_snapshot ? (
                                                            <Badge variant="outline" className="uppercase">
                                                                live {broadcast.vibe_snapshot}
                                                            </Badge>
                                                        ) : null}
                                                        {broadcast.promo_code ? (
                                                            <Badge variant="outline" className="uppercase">
                                                                <Ticket className="mr-1 h-3 w-3" />
                                                                {broadcast.promo_code}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
                                                        {broadcast.content}
                                                    </p>
                                                    <div className="flex flex-wrap gap-4 text-xs font-medium text-zinc-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock3 className="h-3.5 w-3.5" />
                                                            Sent {formatDateTime(broadcast.created_at)}
                                                        </span>
                                                        <span>Radius {broadcast.visibility_radius_m}m</span>
                                                        {broadcast.activity_score !== null ? (
                                                            <span>Activity score {broadcast.activity_score}</span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="space-y-2 flex flex-col items-start lg:items-end justify-between">
                                                    <div className="space-y-2 text-sm text-zinc-500 lg:text-right">
                                                        <div>
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Promotion</div>
                                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                                {broadcast.promotion_title || 'Promotion unavailable'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Expires</div>
                                                            <div>{formatDateTime(broadcast.expires_at)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-2">
                                                        <Link href={`/merchant/vibe?content=${encodeURIComponent(broadcast.content)}&code=${encodeURIComponent(broadcast.promo_code || '')}&target=${broadcast.vibe_target}`}>
                                                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700">
                                                                <Send className="w-3 h-3 mr-1" /> Resend
                                                            </Button>
                                                        </Link>
                                                        {broadcast.status === 'active' && (
                                                            <Button variant="outline" size="sm" onClick={() => handleDeactivate(broadcast.id)} className="h-8 text-xs font-bold uppercase tracking-widest border-red-200 text-red-600 hover:bg-red-50">
                                                                <Trash2 className="w-3 h-3 mr-1" /> Deactivate
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card className="border-dashed border-2 py-20">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                        <BarChart3 className="w-12 h-12 text-zinc-300 mb-4" />
                        <h3 className="text-lg font-bold">No data yet</h3>
                        <p className="text-zinc-500 max-w-sm">
                            Broadcast your first Vibe to start gathering local intelligence.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
