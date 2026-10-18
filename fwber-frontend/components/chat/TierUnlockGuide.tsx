"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRelationshipTier } from '@/lib/hooks/useRelationshipTier';
import { getTierProgress, getTierInfo, RelationshipTier } from '@/lib/relationshipTiers';
import { ChevronDown, ChevronUp, Lock, Unlock, Sparkles, Share2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface TierUnlockGuideProps {
    matchId: string;
}

export function TierUnlockGuide({ matchId }: TierUnlockGuideProps) {
    const { tierData, isLoading } = useRelationshipTier(null, parseInt(matchId));
    const [isExpanded, setIsExpanded] = useState(false);

    if (isLoading || !tierData) return null;

    // Assuming currentTier and progressed metrics are accessible directly from tierData
    const currentTier = tierData.tier;
    const progress = getTierProgress(
        currentTier,
        tierData.messagesExchanged,
        tierData.daysConnected,
        tierData.hasMetInPerson
    );

    const currentTierInfo = getTierInfo(currentTier);
    const nextTierInfo = progress.nextTier ? getTierInfo(progress.nextTier) : null;

    // We are at max tier
    if (!nextTierInfo) return null;

    // Manual fallback parsing because the relationshipTiers structure is generic 
    const targetMessages = nextTierInfo.tier === RelationshipTier.CONNECTED ? 10 : (nextTierInfo.tier === RelationshipTier.ESTABLISHED ? 50 : 0);
    const targetDays = nextTierInfo.tier === RelationshipTier.CONNECTED ? 1 : (nextTierInfo.tier === RelationshipTier.ESTABLISHED ? 7 : 0);

    const msgsNeeded = Math.max(0, targetMessages - progress.messagesExchanged);
    const daysNeeded = Math.max(0, targetDays - progress.daysConnected);

    const msgProgressPct = targetMessages > 0 ? Math.min(100, (progress.messagesExchanged / targetMessages) * 100) : 100;

    // Highlighting the next big unlock
    const highlightUnlock = nextTierInfo.unlocks[0];

    const handleShareMilestone = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareText = `💘 Just reached a new connection milestone on fwber! We just unlocked ${highlightUnlock}. #fwber #dating`
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Relationship Milestone!',
                    text: shareText,
                    url: window.location.origin
                })
            } catch (err) {
                console.error('Error sharing:', err)
            }
        } else {
            await navigator.clipboard.writeText(shareText)
            alert('Milestone details copied to clipboard!')
        }
    }

    const isReadyToUnlock = msgsNeeded === 0 && daysNeeded === 0;

    const handleVerifyMeeting = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Did you actually meet this person in the real world? This cannot be undone.")) return;
        
        try {
            await apiClient.put(`/matches/${matchId}/tier`, { mark_met_in_person: true });
            window.location.reload(); 
        } catch (err) {
            console.error("Verification failed", err);
        }
    };

    return (
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 w-full">
            <div
                className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-card dark:bg-gray-800/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3 w-1/2">
                    <div className="flex items-center justify-center min-w-[32px] min-h-[32px] rounded-full bg-blue-500/20 text-blue-400">
                        <span>{nextTierInfo.icon}</span>
                    </div>
                    <div className="truncate">
                        <div className="text-[10px] text-muted-foreground font-bold tracking-wide uppercase flex items-center gap-2">
                            Next: {nextTierInfo.name}
                            {isReadyToUnlock && (
                                <motion.button 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    onClick={handleShareMilestone}
                                    className="p-1 hover:bg-card dark:bg-gray-800/10 rounded-full transition-colors text-pink-400"
                                    title="Share Milestone"
                                >
                                    <Share2 className="w-3 h-3" />
                                </motion.button>
                            )}
                        </div>
                        <div className="text-sm text-white font-medium flex items-center gap-1 truncate">
                            <Sparkles className="w-3 h-3 text-yellow-400 shrink-0" />
                            <span className="text-muted-foreground ml-1 truncate">{highlightUnlock}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {currentTier === 'established' && (
                        <button type="button"
                            onClick={handleVerifyMeeting}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black rounded-full transition uppercase tracking-tighter shadow-lg shadow-green-500/20 whitespace-nowrap"
                        >
                            Verify Meeting
                        </button>
                    )}
                    <div className="hidden sm:block text-right">
                        <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3" />
                            {msgsNeeded > 0 ? `${msgsNeeded} msgs to go` : (daysNeeded > 0 ? `${daysNeeded} days to go` : 'Ready to unlock!')}
                        </div>
                        <div className="w-24 h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
                            <motion.div
                                className="h-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${msgProgressPct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                    <button className="text-muted-foreground hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-gray-900/80 border-t border-gray-700/50"
                    >
                        <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Requirements Progress */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-pink-400" /> Requirements for {nextTierInfo.name}
                                </h4>

                                {targetMessages > 0 && (
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-muted-foreground font-medium">Messages Exchanged</span>
                                            <span className={progress.messagesExchanged >= targetMessages ? "text-green-400 font-bold" : "text-muted-foreground"}>
                                                {progress.messagesExchanged} / {targetMessages}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-blue-500"
                                                animate={{ width: `${Math.min(100, (progress.messagesExchanged / targetMessages) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {targetDays > 0 && (
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-muted-foreground font-medium">Days Connected</span>
                                            <span className={progress.daysConnected >= targetDays ? "text-green-400 font-bold" : "text-muted-foreground"}>
                                                {progress.daysConnected} / {targetDays}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-purple-500"
                                                animate={{ width: `${Math.min(100, (progress.daysConnected / targetDays) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {nextTierInfo.tier === RelationshipTier.VERIFIED && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-800/50 p-2 rounded">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${progress.hasMetInPerson ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                                        <span>Meet in person and mutually confirm safely</span>
                                    </div>
                                )}
                            </div>

                            {/* What Unlocks */}
                            <div className="space-y-3">
                                <h4 className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1">
                                    <Unlock className="w-3 h-3 text-green-400" /> It Will Unlock
                                </h4>
                                <ul className="text-sm space-y-2">
                                    {nextTierInfo.unlocks.map((u, i) => (
                                        <li key={i} className="flex items-start gap-2 text-muted-foreground bg-gray-800/30 px-2 py-1.5 rounded border border-gray-700/50">
                                            <span className="text-green-400 pt-0.5">•</span>
                                            <span className="text-xs">{u}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
