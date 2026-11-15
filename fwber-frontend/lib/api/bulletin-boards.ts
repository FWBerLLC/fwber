import { apiClient } from './client';
import { useAuth } from '../auth-context';
import { storeOfflineMessage } from '../offline-store';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4003/api');

export interface BulletinBoard {
  id: number;
  geohash: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  name: string;
  description?: string;
  is_active: boolean;
  message_count: number;
  active_users: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  recent_messages?: BulletinMessage[];
  distance_meters?: number;
  ranking_score?: number;
  scene_signals?: {
    headline: string | null;
    matched_topics: Array<{
      id: number;
      slug: string;
      label: string;
      emoji?: string | null;
    }>;
    matched_tags: string[];
    score_boost: number;
  } | null;
}

export interface BulletinMessage {
  id: number;
  bulletin_board_id: number;
  user_id: number;
  content: string;
  metadata?: any;
  is_anonymous: boolean;
  is_moderated: boolean;
  expires_at?: string;
  reaction_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    avatar_url?: string;
  };
  author_name?: string;
  author_avatar?: string;
}

export interface LocationCoords {
  lat: number;
  lng: number;
}

export interface BulletinBoardFilters {
  lat: number;
  lng: number;
  radius?: number;
  ranking_strategy?: 'trust-aware' | 'distance-only';
}

export interface BulletinBoardRankingStrategy {
  trusted_participants: boolean;
  scene_alignment: boolean;
  freshness: boolean;
  activity_health: boolean;
  distance: boolean;
  summary: string;
}

export class BulletinBoardAPI {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: any = {}) {
    const method = options.method || 'GET';
    const response: any = await (apiClient as any)[method.toLowerCase()](
      endpoint,
      options.body ? JSON.parse(options.body) : undefined,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...options.headers,
        },
        params: options.params,
    });

    return response.data;
  }

  /**
   * Get bulletin boards near a location
   */
  async getNearbyBoards(filters: BulletinBoardFilters): Promise<{
    data: BulletinBoard[];
    boards: BulletinBoard[];
    user_location: LocationCoords;
    search_radius: number;
    meta?: {
      ranking_strategy?: BulletinBoardRankingStrategy;
    };
  }> {
    const params = {
      lat: filters.lat,
      lng: filters.lng,
      radius: filters.radius,
      ranking_strategy: filters.ranking_strategy,
    };

    return this.request('/bulletin-boards', { params });
  }

  /**
   * Get a specific bulletin board
   */
  async getBoard(id: number, location?: LocationCoords): Promise<{
    board: BulletinBoard;
    messages: BulletinMessage[];
  }> {
    const params = location 
      ? {
          lat: location.lat,
          lng: location.lng,
        }
      : undefined;

    return this.request(`/bulletin-boards/${id}`, { params });
  }

  /**
   * Create or find a bulletin board for a location
   */
  async createOrFindBoard(location: LocationCoords, radius?: number): Promise<{
    board: BulletinBoard;
    created: boolean;
  }> {
    return this.request('/bulletin-boards', {
      method: 'POST',
      body: JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        ...(radius && { radius }),
      }),
    });
  }

  /**
   * Post a message to a bulletin board
   */
  async postMessage(
    boardId: number,
    content: string,
    location: LocationCoords,
    options: {
      is_anonymous?: boolean;
      expires_in_hours?: number;
    } = {}
  ): Promise<{
    message: BulletinMessage;
    board: BulletinBoard;
  }> {
    try {
      return await this.request(`/bulletin-boards/${boardId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          lat: location.lat,
          lng: location.lng,
          ...options,
        }),
      });
    } catch (error) {
      // Check if offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.debug('Offline, storing message for sync');
        await storeOfflineMessage({
          uuid: uuidv4(),
          boardId,
          content,
          type: 'text',
          is_encrypted: false,
          lat: location.lat,
          lng: location.lng,
          is_anonymous: options.is_anonymous,
          token: this.token, // Store token to replay request
          created_at: new Date().toISOString()
        });
        
        // Register sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          // @ts-ignore - SyncManager is not in all TS definitions
          await registration.sync.register('bulletin-message');
        }
        
        // Return a fake message so the UI updates optimistically
        return {
          message: {
            id: -Date.now(), // Negative ID for temp
            bulletin_board_id: boardId,
            user_id: 0, // Unknown
            content,
            is_anonymous: !!options.is_anonymous,
            is_moderated: false,
            reaction_count: 0,
            reply_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          board: {} as any // Partial board
        };
      }
      throw error;
    }
  }

  /**
   * Get messages for a bulletin board
   */
  async getMessages(
    boardId: number,
    options: {
      per_page?: number;
      since?: string;
    } = {}
  ): Promise<{
    messages: {
      data: BulletinMessage[];
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
    board: BulletinBoard;
  }> {
    const params = {
      per_page: options.per_page,
      since: options.since,
    };

    return this.request(`/bulletin-boards/${boardId}/messages`, { params });
  }


}

/**
 * Hook to use bulletin board API
 */
export function useBulletinBoardAPI() {
  const { token } = useAuth();
  
  if (!token) {
    throw new Error('Authentication required');
  }

  return new BulletinBoardAPI(token);
}
