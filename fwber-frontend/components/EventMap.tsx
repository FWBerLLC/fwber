'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocketLogic } from '@/lib/hooks/use-socket-logic';

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
  iconUrl: '/images/leaflet/marker-icon.png',
  shadowUrl: '/images/leaflet/marker-shadow.png',
});

// Fallback icon definition if assets are missing - SELF-HOSTED (no unpkg dependency)
const defaultIcon = new L.Icon({
  iconUrl: '/images/leaflet/marker-icon.png',
  iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
  shadowUrl: '/images/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


interface EventMapProps {
  eventId: number | string;
  centerLat: number;
  centerLng: number;
}

export function EventMap({ eventId, centerLat, centerLng }: EventMapProps) {
  const { eventAttendeesLocations, joinEventRoom, leaveEventRoom, broadcastLocation } = useSocketLogic();

  useEffect(() => {
    const id = Number(eventId);
    if (!isNaN(id)) {
      joinEventRoom(id);
    }
    return () => {
      if (!isNaN(id)) {
        leaveEventRoom(id);
      }
    };
  }, [eventId, joinEventRoom, leaveEventRoom]);

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const id = Number(eventId);
          if (!isNaN(id)) {
            broadcastLocation(id, position.coords.latitude, position.coords.longitude);
          }
        },
        (error) => {
          console.error("Error watching position", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );
    }
    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [eventId, broadcastLocation]);

  const attendees = Object.values(eventAttendeesLocations || {});

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border dark:border-border shadow-sm z-0 relative">
      {typeof window !== 'undefined' && (
        <MapContainer center={[centerLat, centerLng]} zoom={15} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Event Center Marker */}
          <Marker position={[centerLat, centerLng]} icon={defaultIcon}>
            <Popup>
              <div className="font-semibold">Event Location</div>
            </Popup>
          </Marker>

          {/* Attendee Markers */}
          {attendees.map((attendee) => (
            <Marker
              key={attendee.userId}
              position={[attendee.lat, attendee.lng]}
              icon={defaultIcon}
            >
              <Popup>
                <div className="text-sm">User ID: {attendee.userId}</div>
                <div className="text-xs text-muted-foreground">Updated: {new Date(attendee.timestamp).toLocaleTimeString()}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
