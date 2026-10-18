'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Heart,
    AlertTriangle,
    Sprout,
    ArrowLeft,
    Share2,
    Loader2,
    Sparkles,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface AlignmentArea {
    area: string;
    strength: number;
    detail: string;
}

interface FrictionPoint {
    area: string;
    severity: number;
    detail: string;
}

interface GrowthPotential {
    area: string;
    detail: string;
}

interface AuditResult {
    overall_score: number;
    alignment_areas: AlignmentArea[];
    friction_points: FrictionPoint[];
    growth_potential: GrowthPotential[];
    narrative: string;
    share_id: string;
}

export default function CompatibilityAuditPage() {
    const params = useParams();
    const router = useRouter();
    const targetId = params.id as string;

    const [audit, setAudit] = useState<AuditResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [revealed, setRevealed] = useState(false);

    const requestAudit = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.post(`/wingman/compatibility-audit/${targetId}`);
            setAudit(response.data as AuditResult);
            // Delay reveal for dramatic effect
            setTimeout(() => setRevealed(true), 500);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to generate audit. Try again later.');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'from-emerald-400 to-teal-500';
        if (score >= 60) return 'from-amber-400 to-orange-500';
        if (score >= 40) return 'from-orange-400 to-red-500';
        return 'from-red-500 to-rose-600';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 90) return 'Soulmate Potential';
        if (score >= 75) return 'Strong Alignment';
        if (score >= 60) return 'Promising Match';
        if (score >= 40) return 'Worth Exploring';
        return 'Proceed with Curiosity';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <button type="button"
                        onClick={() => router.back()}
                        className="p-2 rounded-lg bg-card dark:bg-gray-800/5 hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Shield className="w-6 h-6 text-purple-400" />
                            Compatibility Audit
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            AI-powered deep compatibility analysis
                        </p>
                    </div>
                </div>

                {/* Pre-audit CTA */}
                {!audit && !loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-xl p-8 text-center"
                    >
                        <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Discover Your True Compatibility
                        </h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Go beyond surface-level matching. Our AI analyzes shared life goals,
                            values, communication styles, and long-term potential.
                        </p>
                        <button type="button"
                            onClick={requestAudit}
                            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                        >
                            Generate Audit
                        </button>
                        {error && (
                            <p className="text-red-400 text-sm mt-4">{error}</p>
                        )}
                    </motion.div>
                )}

                {/* Loading */}
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-2xl border border-purple-500/20 bg-purple-900/10 backdrop-blur-xl p-12 text-center"
                    >
                        <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg">Analyzing deep compatibility...</p>
                        <p className="text-muted-foreground text-sm mt-2">
                            Evaluating life goals, values, and long-term alignment
                        </p>
                    </motion.div>
                )}

                {/* Audit Results */}
                <AnimatePresence>
                    {audit && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            {/* Score Card */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: 'spring' }}
                                className="rounded-2xl border border-white/10 bg-card dark:bg-gray-800/5 backdrop-blur-xl p-8 text-center"
                            >
                                <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br ${getScoreColor(audit.overall_score)} mb-4`}>
                                    <span className="text-4xl font-bold text-white">{audit.overall_score}</span>
                                </div>
                                <h2 className="text-xl font-bold text-white">
                                    {getScoreLabel(audit.overall_score)}
                                </h2>
                                <p className="text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
                                    {audit.narrative}
                                </p>
                            </motion.div>

                            {/* Alignment Areas */}
                            <motion.div
                                initial={{ x: -30, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="rounded-2xl border border-emerald-500/20 bg-emerald-900/10 backdrop-blur-xl p-6"
                            >
                                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2 mb-4">
                                    <Heart className="w-5 h-5" />
                                    Alignment Areas
                                </h3>
                                <div className="space-y-3">
                                    {(audit.alignment_areas || []).map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 + i * 0.1 }}
                                            className="bg-card dark:bg-gray-800/5 rounded-lg p-4"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-white">{item.area}</span>
                                                <span className="text-emerald-400 text-sm font-mono">{item.strength}/10</span>
                                            </div>
                                            <div className="w-full bg-card dark:bg-gray-800/10 rounded-full h-1.5 mb-2">
                                                <div
                                                    className="bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full h-1.5 transition-all duration-1000"
                                                    style={{ width: `${item.strength * 10}%` }}
                                                />
                                            </div>
                                            <p className="text-muted-foreground text-sm">{item.detail}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Friction Points */}
                            <motion.div
                                initial={{ x: 30, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="rounded-2xl border border-amber-500/20 bg-amber-900/10 backdrop-blur-xl p-6"
                            >
                                <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2 mb-4">
                                    <AlertTriangle className="w-5 h-5" />
                                    Friction Points
                                </h3>
                                <div className="space-y-3">
                                    {(audit.friction_points || []).map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.7 + i * 0.1 }}
                                            className="bg-card dark:bg-gray-800/5 rounded-lg p-4"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-white">{item.area}</span>
                                                <span className="text-amber-400 text-sm font-mono">{item.severity}/10</span>
                                            </div>
                                            <div className="w-full bg-card dark:bg-gray-800/10 rounded-full h-1.5 mb-2">
                                                <div
                                                    className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-full h-1.5 transition-all duration-1000"
                                                    style={{ width: `${item.severity * 10}%` }}
                                                />
                                            </div>
                                            <p className="text-muted-foreground text-sm">{item.detail}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Growth Potential */}
                            <motion.div
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="rounded-2xl border border-purple-500/20 bg-purple-900/10 backdrop-blur-xl p-6"
                            >
                                <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2 mb-4">
                                    <Sprout className="w-5 h-5" />
                                    Growth Potential
                                </h3>
                                <div className="space-y-3">
                                    {(audit.growth_potential || []).map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.9 + i * 0.1 }}
                                            className="bg-card dark:bg-gray-800/5 rounded-lg p-4"
                                        >
                                            <span className="font-medium text-white block mb-1">{item.area}</span>
                                            <p className="text-muted-foreground text-sm">{item.detail}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Share Button */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.0 }}
                                className="flex justify-center pt-4"
                            >
                                <button type="button"
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: 'Our Compatibility Audit',
                                                url: `/share/${audit.share_id}`,
                                            });
                                        }
                                    }}
                                    className="px-6 py-3 bg-card dark:bg-gray-800/10 hover:bg-white/15 text-muted-foreground rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share Results
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
