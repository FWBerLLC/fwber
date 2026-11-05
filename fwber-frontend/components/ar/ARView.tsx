'use client';

import { useState, useEffect, useRef } from 'react';
import { calculateBearing, calculateDistance } from '@/lib/utils/geolocation';
import type { ProximityArtifact, MatchCandidate } from '@/types/proximity';
import { 
  X, 
  MapPin, 
  MessageCircle, 
  Users, 
  Navigation,
  Smartphone
} from 'lucide-react';

interface ARViewProps {
  artifacts: ProximityArtifact[];
  candidates: MatchCandidate[];
  userLocation: {
    latitude: number;
    longitude: number;
  };
  onClose: () => void;
}

interface ARPoint {
  id: string;
  type: 'artifact' | 'candidate';
  title: string;
  distance: number; // in meters
  bearing: number; // 0-360
  data: ProximityArtifact | MatchCandidate;
}

function isArtifact(data: ProximityArtifact | MatchCandidate): data is ProximityArtifact {
  return (data as ProximityArtifact).type !== undefined;
}

export default function ARView({ artifacts, candidates, userLocation, onClose }: ARViewProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fov] = useState<number>(60); // Field of View (approximate for mobile phones)

  // Initialize Camera
  useEffect(() => {
    // Capture the ref value at the start of the effect for cleanup
    // This prevents the "ref value likely changed" warning in cleanup
    const videoElement = videoRef.current;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        // Use the current ref for initialization to ensure we attach to the mounted element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCameraPermission(true);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Could not access camera. Please allow camera permissions.');
      }
    };

    startCamera();

    return () => {
      // Cleanup stream using the captured variable
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle Device Orientation
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // alpha is the compass direction (0-360)
      // Note: This is simplified. True North vs Magnetic North and iOS webkitCompassHeading require more complex handling in production.
      // For iOS: event.webkitCompassHeading
      // For Android: event.alpha (if absolute)
      
      let heading = 0;
      
      if ((event as any).webkitCompassHeading) {
        // iOS
        heading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Android / Standard
        // Note: 'alpha' is counter-clockwise on some devices, might need inversion depending on browser
        // Typically alpha=0 is North.
        heading = 360 - event.alpha; 
      }
      
      setDeviceHeading(heading);
    };

    // iOS 13+ requires explicit permission for device orientation
    const requestOrientationPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permissionState = await (DeviceOrientationEvent as any).requestPermission();
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          } else {
            setError('Permission to access device orientation was denied.');
          }
        } catch (e) {
          setError('Error requesting orientation permission.');
        }
      } else {
        // Non-iOS or older devices
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    requestOrientationPermission();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Prepare Data Points
  const points: ARPoint[] = [
    ...artifacts.map(a => ({
      id: `art-${a.id}`,
      type: 'artifact' as const,
      title: a.type.replace('_', ' ').toUpperCase(),
      distance: calculateDistance(userLocation.latitude, userLocation.longitude, a.lat, a.lng),
      bearing: calculateBearing(userLocation.latitude, userLocation.longitude, a.lat, a.lng),
      data: a
    })),
    // Candidates skipped for now as they lack lat/lng in the current type definition
    ...candidates.flatMap(c => {
        // Placeholder: if we had lat/lng for candidates we would map them here.
        return [];
    })
  ];

  // Helper to determine if point is in view and calculate screen position
  const getScreenPosition = (bearing: number) => {
    // Normalize bearing difference to -180 to 180
    let diff = bearing - deviceHeading;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;

    // Check if within horizontal FOV
    const inView = Math.abs(diff) < (fov / 2);
    
    // Calculate percentage from left (50% is center)
    const leftPercent = 50 + (diff / (fov / 2)) * 50;

    return { inView, leftPercent };
  };

  const getIcon = (data: ProximityArtifact | MatchCandidate) => {
      if (isArtifact(data)) {
        if (data.type === 'chat') return <MessageCircle className="w-6 h-6" />;
        if (data.type === 'token_drop') return <MapPin className="w-6 h-6" />;
        if (data.type === 'announce') return <Users className="w-6 h-6" />;
        if (data.type === 'board_post') return <MapPin className="w-6 h-6" />;
      }
      return <Users className="w-6 h-6" />; // Default/Candidate
  };

  const getColor = (data: ProximityArtifact | MatchCandidate) => {
      if (isArtifact(data)) {
        if (data.type === 'token_drop') return 'bg-yellow-500';
        if (data.type === 'chat') return 'bg-blue-500';
        return 'bg-purple-500';
      }
      return 'bg-pink-500';
  };

  const getContent = (data: ProximityArtifact | MatchCandidate) => {
      if (isArtifact(data)) {
          return data.content;
      }
      return 'Match Candidate';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-hidden">
      {/* Camera Feed */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-start pointer-events-auto">
          <div>
            <div className="flex items-center space-x-2">
                <Navigation className="w-5 h-5 text-blue-400" style={{ transform: `rotate(${deviceHeading}deg)` }} />
                <span className="font-mono text-sm">{Math.round(deviceHeading)}°</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
                {points.length} points nearby
            </p>
          </div>
          <button type="button" 
            onClick={onClose}
            className="bg-black/50 p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-900/80 p-6 rounded-lg text-center max-w-xs pointer-events-auto">
                <Smartphone className="w-12 h-12 mx-auto mb-3 text-red-200" />
                <p className="mb-4">{error}</p>
                <button type="button" 
                    onClick={onClose}
                    className="bg-card dark:bg-card text-red-900 px-4 py-2 rounded font-semibold"
                >
                    Close AR View
                </button>
            </div>
        )}

        {/* AR Markers */}
        {hasCameraPermission && !error && points.map(point => {
            const { inView, leftPercent } = getScreenPosition(point.bearing);
            
            if (!inView) return null;

            return (
                <div 
                    key={point.id}
                    className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer pointer-events-auto transition-transform hover:scale-110"
                    style={{ left: `${leftPercent}%` }}
                    onClick={() => {
                        alert(`${point.title}: ${getContent(point.data)}`);
                    }}
                >
                    <div className={`p-3 rounded-full shadow-lg border-2 border-white ${getColor(point.data)}`}>
                        {getIcon(point.data)}
                    </div>
                    <div className="mt-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-center">
                        <div className="font-bold">{point.title}</div>
                        <div>{Math.round(point.distance)}m</div>
                    </div>
                </div>
            );
        })}
        
        {/* Radar / Compass Footer Hint */}
        {hasCameraPermission && !error && (
             <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                <div className="inline-block bg-black/30 backdrop-blur-md px-4 py-2 rounded-full text-xs border border-white/10">
                    Turn around to find points nearby
                </div>
             </div>
        )}
      </div>
    </div>
  );
}
