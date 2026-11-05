/**
 * Profile API Client
 * 
 * AI Model: Gemini 2.5 Flash - Simulated (Parallel Implementation)
 * Phase: 3A - Next.js to Laravel Integration
 * Purpose: Type-safe API client for profile operations
 * 
 * Created: 2025-10-18
 */

import { apiClient } from './client';

interface ProfileInterestTopic {
  id: number;
  slug: string;
  label: string;
  description: string | null;
  emoji: string | null;
  category: string;
  aliases: string[];
  is_featured: boolean;
  sort_order: number;
  follower_count: number;
  group_count: number;
  journal_count: number;
  artifact_count: number;
  is_followed: boolean;
  match_source?: 'profile' | 'followed' | 'both';
}
const API_BASE_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api');


export interface UserProfile {
  id: number;
  email: string;
  // Top-level display name as returned by the public-profile endpoint
  // (profile/[id]/page.tsx renders `profile.name` for federated handles).
  name?: string | null;
  email_verified: boolean;
  created_at: string;
  last_online: string;
  profile: {
    display_name: string | null;
    bio: string | null;
    date_of_birth?: string | null;
    age: number | null;
    gender: string | null;
    relationship_style: string | null;
    looking_for: string[];
    interests?: string[];
    location: {
      latitude: number | null;
      longitude: number | null;
      max_distance: number;
      city: string | null;
      state: string | null;
      match_scope?: string;
      search_country?: string;
      search_city?: string;
    };
    interest_topics?: ProfileInterestTopic[];
    // Travel Mode
    is_travel_mode?: boolean;
    travel_latitude?: number | null;
    travel_longitude?: number | null;
    travel_location_name?: string | null;

    // New Optional Attributes
    love_language?: string;
    personality_type?: string;
    chronotype?: string;
    social_media?: Record<string, string>;
    communication_style?: string;
    blood_type?: string;
    sti_status?: Record<string, any>;
    family_plans?: string;
    relationship_goals?: string;
    languages?: string[];
    zodiac_sign?: string;
    pronouns?: string;
    sexual_orientation?: string;
    drinking_status?: string;
    smoking_status?: string;
    cannabis_status?: string;
    dietary_preferences?: string;
    exercise_habits?: string;
    sleep_habits?: string;
    pets?: string[];
    children?: string;
    religion?: string;
    political_views?: string;

    preferences: {
      // Lifestyle preferences
      smoking?: string;
      drinking?: string;
      exercise?: string;
      diet?: string;
      pets?: string;
      children?: string;
      education?: string;
      occupation?: string;
      income?: string;
      // Dating preferences
      age_range_min?: number;
      age_range_max?: number;
      height_min?: string;
      height_max?: string;
      body_type?: string;
      ethnicity?: string[];
      religion?: string;
      politics?: string;
      // Interests
      hobbies?: string[];
      music?: string[];
      movies?: string[];
      books?: string[];
      sports?: string[];
      travel?: string;
      // Communication
      communication_style?: string;
      response_time?: string;
      meeting_preference?: string;
      cannabis?: string;
      psychedelics?: string;
      stimulants?: string;
      opiates?: string;
      [key: string]: any;
    };
    photos?: Array<{
      id: number;
      url: string;
      is_private: boolean;
      is_primary: boolean;
      is_unlocked?: boolean;
      unlock_price?: number;
    }>;
    vouches?: Array<{
      type: 'safe' | 'fun' | 'hot';
      relationship_type: string;
      comment: string;
      voucher_name: string;
      created_at: string;
    }>;
    profile_complete: boolean;
    completion_percentage: number;
    current_emotion?: string;
    is_federated?: boolean;
    voice_intro_url?: string | null;
    journal_visibility_default?: 'public' | 'friends' | 'circle' | 'private' | null;
    journal_circle_group_id?: number | null;
    journals?: Array<{
      id: number;
      title: string | null;
      content: string;
      visibility: 'public' | 'friends' | 'circle' | 'private';
      visibility_label: string;
      circle_group_id: number | null;
      circle_group?: {
        id: number;
        name: string;
        privacy: 'public' | 'private';
      } | null;
      tags: string[];
      mood_emoji?: string | null;
      accent_color?: string | null;
      created_at: string;
      updated_at: string;
    }>;
    relationship_links?: Array<{
      id: number;
      relationship_type: 'dating' | 'partner' | 'spouse' | 'other';
      relationship_type_label: string;
      visibility: 'public' | 'friends' | 'private';
      visibility_label: string;
      note?: string | null;
      requested_at?: string | null;
      confirmed_at?: string | null;
      is_confirmed: boolean;
      requested_by_user_id: number;
      related_user: {
        id: number;
        name: string;
        display_name?: string | null;
        avatar_url?: string | null;
      } | null;
    }>;
    scene_summary?: {
      headline: string | null;
      followed_topics: Array<{
        id: number;
        slug: string;
        label: string;
        emoji?: string | null;
      }>;
      scene_tags: string[];
      stats: {
        followed_topic_count: number;
        visible_journal_count: number;
        public_group_count: number;
      };
    } | null;
  };
}

export interface ProfileUpdateData {
  display_name?: string;
  bio?: string;
  date_of_birth?: string;
  gender?: string;
  relationship_style?: string;
  looking_for?: string[];
  location?: {
    latitude?: number;
    longitude?: number;
    max_distance?: number;
    match_scope?: string;
    search_country?: string;
    search_city?: string;
    city?: string;
    state?: string;
  };
  is_travel_mode?: boolean;
  is_confessional_mode?: boolean;
  travel_location?: {
    latitude?: number;
    longitude?: number;
    name?: string;
  };
  height_cm?: number | null;
  body_type?: string;
  hair_color?: string;
  eye_color?: string;
  skin_tone?: string;
  ethnicity?: string;
  facial_hair?: string;
  fitness_level?: string;
  tattoos?: boolean;
  piercings?: boolean;
  clothing_style?: string;
  dominant_hand?: string;
  breast_size?: string;
  penis_length_cm?: number | null;
  penis_girth_cm?: number | null;
  sti_status?: string[] | Record<string, any>;
  fetishes?: string[];
  occupation?: string;
  education?: string;
  has_children?: string;
  wants_children?: string;
  has_pets?: string;
  love_language?: string;
  personality_type?: string;
  chronotype?: string;
  social_media?: Record<string, string>;
  communication_style?: string;
  blood_type?: string;
  family_plans?: string;
  relationship_goals?: string;
  languages?: string[];
  zodiac_sign?: string;
  pronouns?: string;
  sexual_orientation?: string;
  drinking_status?: string;
  smoking_status?: string;
  cannabis_status?: string;
  dietary_preferences?: string;
  exercise_habits?: string;
  sleep_habits?: string;
  sleep_schedule?: string;
  pets?: string[];
  children?: string;
  religion?: string;
  political_views?: string;
  interests?: string[];
  voice_intro?: File | null;
  is_federated?: boolean;

  preferences?: {
    smoking?: string;
    drinking?: string;
    exercise?: string;
    diet?: string;
    pets?: string;
    children?: string;
    education?: string;
    occupation?: string;
    income?: string;
    age_range_min?: number;
    age_range_max?: number;
    height_min?: string;
    height_max?: string;
    body_type?: string;
    ethnicity?: string[];
    religion?: string;
    politics?: string;
    hobbies?: string[];
    music?: string[];
    movies?: string[];
    books?: string[];
    sports?: string[];
    travel?: string;
    communication_style?: string;
    response_time?: string;
    meeting_preference?: string;
    cannabis?: string;
    psychedelics?: string;
    stimulants?: string;
    opiates?: string;
    [key: string]: any;
  };
}

export interface ProfileCompletenessResponse {
  percentage: number;
  completed_fields: number;
  total_fields: number;
  missing_fields: string[];
  is_complete: boolean;
}

function sanitizeProfileUpdatePayload<T>(value: T): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof File !== 'undefined' && value instanceof File) {
    return value;
  }

  if (Array.isArray(value)) {
    const sanitizedArray = value
      .map((item) => sanitizeProfileUpdatePayload(item))
      .filter((item): item is Exclude<typeof item, undefined> => item !== undefined);

    return sanitizedArray.length > 0 ? (sanitizedArray as T) : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? (trimmed as T) : undefined;
  }

  if (typeof value === 'object') {
    const sanitizedEntries = Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => [key, sanitizeProfileUpdatePayload(entryValue)] as const)
      .filter(([, entryValue]) => entryValue !== undefined);

    if (sanitizedEntries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(sanitizedEntries) as T;
  }

  return value;
}

/**
 * Fetch a public user profile by ID
 */
export async function getPublicProfile(token: string, userId: number): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>(`/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data;
}

/**
 * Fetch authenticated user's profile
 */
export async function getUserProfile(token: string): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>('/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  token: string,
  updates: ProfileUpdateData
): Promise<UserProfile> {
  // Map frontend fields to backend expected fields
  const payload: any = { ...updates };

  if (updates.date_of_birth) {
    payload.date_of_birth = updates.date_of_birth;
    // Also set birthdate column since DB has both
    payload.birthdate = updates.date_of_birth;
  }

  const sanitizedPayload = sanitizeProfileUpdatePayload(payload) ?? {};

  let response;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  if (updates.voice_intro) {
    const formData = new FormData();
    Object.keys(sanitizedPayload).forEach(key => {
      if (key === 'preferences' || key === 'location' || key === 'travel_location' || key === 'looking_for' || key === 'interests' || key === 'languages' || key === 'sti_status' || key === 'fetishes' || key === 'social_media') {
        formData.append(key, JSON.stringify(sanitizedPayload[key]));
      } else if (sanitizedPayload[key] !== undefined && sanitizedPayload[key] !== null) {
        formData.append(key, sanitizedPayload[key]);
      }
    });
    // Add spoof _method to handle PUT with multipart
    formData.append('_method', 'PUT');
    
    response = await apiClient.post<UserProfile>('/profile', formData);
  } else {
    response = await apiClient.put<UserProfile>('/profile', sanitizedPayload, {
      headers,
    });
  }

  return response.data;
}

/**
 * Get profile completeness status
 */
export async function getProfileCompleteness(token: string): Promise<ProfileCompletenessResponse> {
  const response = await apiClient.get<ProfileCompletenessResponse>('/profile/completeness', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data;
}

/**
 * Search for users by name or email
 */
export async function searchUsers(token: string, searchTerm: string): Promise<UserProfile[]> {
  const response = await apiClient.get<UserProfile[]>('/users/search', {
    params: { q: searchTerm },
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data;
}

export interface OnboardingStatus {
  completed: boolean;
  completed_at: string | null;
}

export async function getOnboardingStatus(token: string): Promise<OnboardingStatus> {
  const response = await apiClient.get<OnboardingStatus>('/onboarding/status', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function completeOnboarding(token: string): Promise<void> {
  await apiClient.post('/onboarding/complete', {}, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}
