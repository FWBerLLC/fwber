/**
 * Location API Client
 *
 * AI Model: Claude 4.5 - Multi-AI Orchestration
 * Phase: 5A - Location-Based Social Features
 * Purpose: Type-safe API client for location tracking and proximity discovery
 *
 * Created: 2025-01-19
 */

import { apiClient } from './client';

const API_BASE_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4003/api');

export interface LocationData {
  id: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  privacy_level: 'public' | 'friends' | 'private';
  privacy_level_display: string;
  last_updated: string;
  is_active: boolean;
  is_recent: boolean;
}

export interface NearbyUser {
  id: number;
  display_name: string;
  age?: number;
  gender?: string;
  distance_meters?: number | null;
  distance_miles?: number | null;
  ranking_score?: number | null;
  scene_signals?: {
    headline?: string;
    matched_topics: Array<{
      id: number;
      slug: string;
      label: string;
      emoji?: string | null;
    }>;
    matched_tags: string[];
    score_boost: number;
  } | null;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    distance: string;
    distance_meters?: number | null;
    distance_miles?: number | null;
    last_updated: string;
  };
  privacy_level: 'public' | 'friends' | 'private';
  is_recent: boolean;
}

export interface NearbyUsersResponse {
  success: boolean;
  data: NearbyUser[];
  meta: {
    total: number;
    radius: number;
    ranking_strategy?: {
      trust_connections: boolean;
      scene_alignment: boolean;
      activity_recency: boolean;
      distance: boolean;
      summary: string;
    } | null;
    center: {
      latitude: number;
      longitude: number;
    };
  };
}

/**
 * Get current user's location
 */
export async function getCurrentLocation(token: string): Promise<LocationData> {
  const response = await apiClient.get<{ data: LocationData }>('/location', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data.data;
}

/**
 * Update user's current location
 */
export async function updateLocation(
  token: string, 
  locationData: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    altitude?: number;
    privacy_level?: 'public' | 'friends' | 'private';
  }
): Promise<LocationData> {
  const response = await apiClient.post<{ data: LocationData }>('/location', locationData, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data.data;
}

/**
 * Get nearby users within radius
 */
export async function getNearbyUsers(
  token: string,
  params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
    ranking_strategy?: 'distance' | 'trust-aware';
  }
): Promise<NearbyUsersResponse> {
  const response = await apiClient.get<NearbyUsersResponse>('/location/nearby', {
    params,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data;
}

/**
 * Update location privacy settings
 */
export async function updateLocationPrivacy(
  token: string,
  privacyLevel: 'public' | 'friends' | 'private'
): Promise<{ privacy_level: string; privacy_level_display: string }> {
  const response = await apiClient.put<{ data: { privacy_level: string; privacy_level_display: string } }>('/location/privacy', { privacy_level: privacyLevel }, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data.data;
}

/**
 * Clear location history
 */
export async function clearLocationHistory(token: string): Promise<void> {
  await apiClient.delete('/location', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

/**
 * Get user's current geolocation from browser
 */
export function getCurrentGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Watch user's geolocation changes
 */
export function watchGeolocation(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    onError({
      code: 0,
      message: 'Geolocation is not supported by this browser',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    });
    return -1;
  }

  return navigator.geolocation.watchPosition(
    onSuccess,
    onError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
    }
  );
}

/**
 * Stop watching geolocation
 */
export function clearGeolocationWatch(watchId: number): void {
  if (navigator.geolocation && watchId !== -1) {
    navigator.geolocation.clearWatch(watchId);
  }
}
