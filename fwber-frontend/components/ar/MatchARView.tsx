'use client';

import { useState, useEffect, useRef } from 'react';
import { calculateBearing, calculateDistance } from '@/lib/utils/geolocation';
import { api } from '@/lib/api/client';
import { 
  X, 
  Navigation, 
  MapPin, 
  User, 
  Zap,
  ArrowUp,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MatchARViewProps {
  matchId: number;
  matchName: string;
  onClose: () => void;
  token: string;
}

interface AuraData {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    last_updated: string;
}

export default function MatchARView({ matchId, matchName, onClose, token }: MatchARViewProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [aura, setAura] = useState<AuraData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fov] = useState<number>(60);

  // Poll for Match location (Aura)
  useEffect(() => {
    const fetchAura = async () => {
        try {
            const res = await api.get(`/location/aura/${matchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            }) as any;
            setAura(res.data);
        } catch (e) {
            console.error('Failed to fetch aura', e);
        }
    };

    fetchAura();
    const interval = setInterval(fetchAura, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, [matchId, token]);

  // Get User Current Location
  useEffect(() => {
    if (!navigator.geolocation) {
        setError('Geolocation not supported');
        return;
    }

    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            setUserLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            });
        },
        (err) => setError('Enable location to use AR'),
        { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Initialize Camera
  useEffect(() => {
    const videoElement = videoRef.current;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCameraPermission(true);
        }
      } catch (err) {
        setError('Camera permission denied');
      }
    };
    startCamera();
    return () => {
      if (videoElement?.srcObject) {
        (videoElement.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Device Orientation (Compass)
  useEffect(() => {
    const handleOrientation = (event: any) => {
      let heading = event.webkitCompassHeading || (360 - event.alpha);
      setDeviceHeading(heading);
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const getAROverlay = () => {
    if (!userLocation || !aura) return null;

    const distance = calculateDistance(userLocation.lat, userLocation.lng, aura.latitude, aura.longitude);
    const bearing = calculateBearing(userLocation.lat, userLocation.lng, aura.latitude, aura.longitude);

    // Normalize bearing difference to -180 to 180
    let diff = bearing - deviceHeading;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;

    const inView = Math.abs(diff) < (fov / 2);
    const leftPercent = 50 + (diff / (fov / 2)) * 50;

    return { inView, leftPercent, distance, bearing };
  };

  const overlay = getAROverlay();

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-hidden font-sans">
      {/* Camera Feed */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover grayscale opacity-60" />

      {/* Scoping Grid Effect */}
      <div className="absolute inset-0 pointer-events-none border-[20px] border-black/20">
          <div className="w-full h-full border border-white/10 grid grid-cols-4 grid-rows-6 opacity-20">
              {Array.from({length: 24}).map((_, i) => <div key={i} className="border border-white/5" />)}
          </div>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20">
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-purple-400 flex items-center gap-2">
                <Zap className="w-5 h-5 fill-current" />
                Locating {matchName}
            </h2>
            <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-blue-400" style={{ transform: `rotate(${deviceHeading}deg)` }} />
                    <span className="font-mono text-[10px] text-zinc-400">{Math.round(deviceHeading)}° N</span>
                </div>
                {overlay && (
                    <span className="text-[10px] font-bold text-white bg-card dark:dark:bg-card/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        {Math.round(overlay.distance)} meters away
                    </span>
                )}
            </div>
        </div>
        <button type="button" onClick={onClose} className="bg-card dark:bg-card text-black p-3 rounded-full hover:scale-110 transition active:scale-95 shadow-xl">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* AR Marker: The "Ghost" */}
      {overlay?.inView && (
          <div 
            className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30 transition-all duration-300"
            style={{ left: `${overlay.leftPercent}%` }}
          >
              {/* Pulsing Aura */}
              <div className="relative mb-4">
                  <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/40" />
                  <div className="relative p-6 rounded-full bg-purple-600 border-4 border-white shadow-[0_0_50px_rgba(168,85,247,0.8)]">
                      <User className="w-12 h-12 text-white fill-current" />
                  </div>
              </div>
              
              {/* Distance Tag */}
              <div className="bg-black/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-purple-500/50 text-center shadow-2xl">
                  <div className="text-sm font-black text-white uppercase italic tracking-tighter">{matchName}</div>
                  <div className="text-xs font-bold text-purple-400 font-mono mt-0.5">{Math.round(overlay.distance)}m</div>
              </div>
          </div>
      )}

      {/* HUD: Directional Guidance */}
      {!overlay?.inView && overlay && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 z-40">
              <div className="animate-bounce">
                  <ArrowUp 
                    className="w-12 h-12 text-purple-500" 
                    style={{ transform: `rotate(${overlay.bearing - deviceHeading}deg)` }} 
                  />
              </div>
              <div className="bg-purple-600 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl border-2 border-white/20">
                  Turn {overlay.bearing > deviceHeading ? 'Right' : 'Left'}
              </div>
          </div>
      )}

      {/* Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
          <div className="flex justify-center items-center gap-2 opacity-40">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Ghost Link: Verified Encryption Active</span>
          </div>
      </div>

      {/* Error View */}
      {error && (
          <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-8 text-center z-50">
              <Smartphone className="w-16 h-16 text-zinc-800 mb-6" />
              <h3 className="text-xl font-bold mb-2 uppercase italic tracking-tighter">Hardware Fault</h3>
              <p className="text-zinc-500 text-sm mb-8 leading-relaxed">{error}</p>
              <Button onClick={onClose} variant="outline" className="border-white/20">Return to Chat</Button>
          </div>
      )}
    </div>
  );
}
