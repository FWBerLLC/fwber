'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getActiveWalk, updateWalkLocation, endSafeWalk, SafeWalk } from '@/lib/api/safety';
import { ShieldAlert, MapPin, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiError } from '@/lib/api/client';

export default function SafeWalkTracker() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeWalk, setActiveWalk] = useState<SafeWalk | null>(null);
    const [isFinishing, setIsFinishing] = useState(false);
    const watchIdRef = useRef<number | null>(null);

    // Poll for active walk status (in case started from another device)
    useEffect(() => {
        if (!user) return;

        const checkWalk = async () => {
            try {
                const { walk } = await getActiveWalk();
                setActiveWalk(walk);
            } catch (e) {
                // Silently ignore network/server errors — no need to spam console
                if (e instanceof ApiError && e.isAuthError) {
                    setActiveWalk(null);
                }
            }
        };

        checkWalk();
        const interval = setInterval(checkWalk, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [user]);

    // Handle Geolocation Tracking
    useEffect(() => {
        if (!activeWalk || activeWalk.status !== 'active') {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

        if ('geolocation' in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                async (position) => {
                    try {
                        // Update location in background
                        await updateWalkLocation(activeWalk.id, position.coords.latitude, position.coords.longitude);
                    } catch (e) {
                        console.error('Failed to sync SafeWalk location', e);
                    }
                },
                (error) => {
                    console.error('SafeWalk Geolocation error:', error);
                    toast({
                        title: 'Location Error',
                        description: 'Please ensure location permissions are granted for SafeWalk.',
                        variant: 'destructive',
                    });
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [activeWalk, toast]);

    const handleEndWalk = async () => {
        if (!activeWalk) return;
        setIsFinishing(true);
        try {
            await endSafeWalk(activeWalk.id);
            setActiveWalk(null);
            toast({
                title: 'Safe Walk Ended',
                description: 'You have safely arrived.',
            });
        } catch (e) {
            toast({
                title: 'Error',
                description: 'Failed to end walk. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsFinishing(false);
        }
    };

    if (!activeWalk) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-16 left-0 right-0 z-[100] flex justify-center px-4"
            >
                <div className="bg-orange-500 text-white rounded-b-xl shadow-lg border-b border-x border-orange-600 p-3 sm:p-4 max-w-md w-full mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-4">

                    <div className="flex bg-orange-600 p-2 rounded-full animate-pulse">
                        <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0 text-center sm:text-left">
                        <h4 className="font-bold text-sm sm:text-base leading-tight">Safe Walk Active</h4>
                        <p className="text-xs sm:text-sm text-orange-100 flex items-center justify-center sm:justify-start gap-1 truncate mt-0.5">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            Tracking to: {activeWalk.destination || 'Unknown Destination'}
                        </p>
                    </div>

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleEndWalk}
                        disabled={isFinishing}
                        className="w-full sm:w-auto bg-card dark:bg-card text-orange-600 hover:bg-orange-50 font-semibold"
                    >
                        {isFinishing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <XCircle className="w-4 h-4 mr-1.5" />
                                End Walk
                            </>
                        )}
                    </Button>

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
