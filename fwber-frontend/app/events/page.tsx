'use client';

import React, { useState, useEffect } from 'react';
import { useNearbyEvents } from '@/lib/hooks/use-events';
import AppHeader from '@/components/AppHeader';
import { EventCard } from '@/components/EventCard';
import Link from 'next/link';
import { Plus, MapPin, Sparkles } from 'lucide-react';
import EventInvitationsList from '@/components/events/EventInvitationsList';
import { useAuth } from '@/lib/auth-context';

export default function EventsPage() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useState<{ latitude: number | null; longitude: number | null; error: string | null }>({
    latitude: null,
    longitude: null,
    error: null,
  });
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation is not supported' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocation(prev => ({ ...prev, error: 'Could not get location' }));
      }
    );
  }, []);

  const { data, isLoading } = useNearbyEvents(
    location.latitude || undefined,
    location.longitude || undefined,
    50,
    selectedType
  );
  const rankingStrategy = data?.meta?.ranking_strategy ?? null;

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      {isAuthenticated && <AppHeader title="Events" />}

      <div className="container mx-auto px-4 py-8">
        <EventInvitationsList />
        
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">Nearby Events</h1>
              {location.latitude && (
                  <span className="flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs text-green-800 dark:text-green-300">
                      <MapPin className="mr-1 h-3 w-3" />
                      Located
                  </span>
              )}
          </div>
          <Link href="/events/create" className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </div>

        <div className="mb-6 flex space-x-2 overflow-x-auto pb-2">
          <button type="button"
            onClick={() => setSelectedType(undefined)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${!selectedType ? 'bg-blue-600 text-white' : 'bg-muted dark:bg-gray-700 text-foreground dark:text-muted-foreground'}`}
          >
            All Events
          </button>
          {['standard', 'speed_dating', 'party', 'meetup', 'workshop'].map((type) => (
            <button type="button"
              key={type}
              onClick={() => setSelectedType(type)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm capitalize ${selectedType === type ? 'bg-blue-600 text-white' : 'bg-muted dark:bg-gray-700 text-foreground dark:text-muted-foreground'}`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>

        {location.error && (
          <div className="mb-4 rounded border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-yellow-800 dark:text-yellow-300">
              Location access denied or unavailable. Showing all events.
          </div>
        )}

        {rankingStrategy && (
          <div className="mb-6 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-4 py-4 text-sm text-purple-900 dark:text-purple-200">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
              <Sparkles className="h-4 w-4" />
              <span>Trust-aware event ranking</span>
            </div>
            <p>{rankingStrategy.summary}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data?.data?.map((event: any) => (
              <EventCard key={event.id} event={event} />
            ))}
            {data?.data?.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                No upcoming events found nearby.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
