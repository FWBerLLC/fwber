'use client';

import { useState, useEffect, useRef } from 'react';
import { calculateBearing, calculateDistance } from '@/lib/utils/geolocation';
import { marketplaceApi, InventoryItem } from '@/lib/api/marketplace';
import { 
  X, 
  ShoppingBag,
  Navigation, 
  MapPin, 
  Zap,
  ArrowUp,
  Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryARViewProps {
  onClose: () => void;
}

export default function InventoryARView({ onClose }: InventoryARViewProps) {
    const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
    const [heading, setHeading] = useState<number>(0);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // 1. Get location & orientation
    useEffect(() => {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => setUserLocation(pos.coords),
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );

        const handleOrientation = (e: DeviceOrientationEvent) => {
            if ((e as any).webkitCompassHeading) {
                setHeading((e as any).webkitCompassHeading);
            } else if (e.alpha) {
                setHeading(360 - e.alpha);
            }
        };

        window.addEventListener('deviceorientation', handleOrientation, true);
        
        return () => {
            navigator.geolocation.clearWatch(watchId);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, []);

    // 2. Fetch nearby items
    useEffect(() => {
        if (userLocation) {
            // In a real app, we'd call the /marketplace/nearby API
            // For now, we simulate finding the merchant's items
            marketplaceApi.getInventory(1) // Demo merchant
                .then(res => {
                    const enhancedItems = res.(items || []).map(item => ({
                        ...item,
                        // Mock location slightly north-east of user
                        lat: userLocation.latitude + 0.001,
                        lng: userLocation.longitude + 0.001
                    }));
                    setItems(enhancedItems);
                })
                .finally(() => setLoading(false));
        }
    }, [userLocation]);

    const renderARItems = () => {
        if (!userLocation) return null;

        return (items || []).map((item) => {
            const distance = calculateDistance(
                userLocation.latitude, userLocation.longitude,
                item.lat, item.lng
            );
            const bearing = calculateBearing(
                userLocation.latitude, userLocation.longitude,
                item.lat, item.lng
            );

            // Relative angle to user's heading
            let relativeAngle = bearing - heading;
            if (relativeAngle < -180) relativeAngle += 360;
            if (relativeAngle > 180) relativeAngle -= 360;

            // Only show if roughly in front (90deg field of view)
            const inView = Math.abs(relativeAngle) < 45;
            const xPos = (relativeAngle / 45) * 50; // -50% to 50%

            if (!inView) return null;

            return (
                <motion.div
                    key={item.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute top-1/2 left-1/2 flex flex-col items-center"
                    style={{
                        transform: `translate(-50%, -50%) translateX(${xPos}vw)`,
                        zIndex: Math.floor(1000 - distance)
                    }}
                >
                    <div className="bg-black/80 backdrop-blur-md border border-amber-500/50 p-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-black text-xs uppercase tracking-tighter">{item.name}</p>
                            <p className="text-amber-500 font-bold text-[10px] flex items-center justify-center gap-1">
                                <Coins className="w-2.5 h-2.5" />
                                {item.price_tokens}
                            </p>
                        </div>
                        <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest px-2 py-0.5 bg-zinc-800 rounded-full">
                            {Math.round(distance)}m away
                        </div>
                    </div>
                    <ArrowUp className="text-amber-500 w-4 h-4 mt-2 animate-bounce" />
                </motion.div>
            );
        });
    };

    return (
        <div className="fixed inset-0 bg-zinc-950 z-[100] flex flex-col">
            {/* Mock Camera View - in reality would use a video element */}
            <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-zinc-900 to-black">
                <div className="absolute inset-0 opacity-20 bg-[url('/grid.png')] bg-repeat" />
                
                {renderARItems()}

                {/* UI Overlays */}
                <div className="absolute top-6 left-6 flex items-center gap-3">
                    <div className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                        <Navigation className="w-5 h-5 text-blue-400 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-white font-black italic uppercase tracking-tighter text-lg">Inventory Radar</h2>
                        <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Scanning Local Hubs...</p>
                    </div>
                </div>

                <button type="button" 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-red-500 rounded-full text-white shadow-lg"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                    <div className="w-1 h-16 bg-gradient-to-t from-blue-500 to-transparent animate-pulse" />
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">Horizon Lock Active</p>
                </div>
            </div>
            
            <div className="h-24 bg-zinc-900 border-t border-white/5 p-4 flex items-center justify-center gap-4">
                 <div className="flex flex-col items-center">
                    <span className="text-[10px] text-zinc-500 font-black uppercase mb-1">Heading</span>
                    <span className="text-white font-mono font-bold text-sm">{Math.round(heading)}°</span>
                 </div>
                 <div className="w-px h-8 bg-card dark:dark:bg-card/10" />
                 <div className="flex flex-col items-center text-center">
                    <p className="text-xs text-zinc-400">Point your camera towards local venues to see available FWB Token inventory.</p>
                 </div>
            </div>
        </div>
    );
}
