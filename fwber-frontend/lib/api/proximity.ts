import { apiClient } from './client';
import type {
  LocalPulseResponse,
  ProximityArtifact,
  CreateArtifactRequest,
  LocalPulseParams,
  ProximityChatroom,
} from '@/types/proximity';

const API_BASE_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4003/api');


export const proximityApi = {
  /**
   * Get Local Pulse merged feed (artifacts + match candidates)
   */
  getLocalPulse: async (params: LocalPulseParams, token: string): Promise<LocalPulseResponse> => {
    const { lat, lng, radius = 1000, topic_slug } = params;
    const response: any = await apiClient.get<LocalPulseResponse>(
      `/proximity/local-pulse`,
      {
        params: { lat, lng, radius, topic_slug },
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  /**
   * Get proximity artifacts feed only
   */
  getArtifactsFeed: async (
    lat: number,
    lng: number,
    radius: number = 1000,
    type?: string,
    topic_slug?: string,
    token?: string
  ): Promise<{ artifacts: ProximityArtifact[] }> => {
    const response: any = await apiClient.get<any>(`/proximity/feed`, {
      params: { lat, lng, radius, type, topic_slug },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Create a new proximity artifact
   */
  createArtifact: async (data: CreateArtifactRequest, token: string): Promise<{ artifact: ProximityArtifact }> => {
    const response: any = await apiClient.post(
      `/proximity/artifacts`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  /**
   * Get single artifact by ID
   */
  getArtifact: async (id: number, token?: string): Promise<{ artifact: ProximityArtifact }> => {
    const response: any = await apiClient.get<any>(`/proximity/artifacts/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Flag an artifact for moderation
   */
  flagArtifact: async (id: number, token: string): Promise<{ message: string }> => {
    const response: any = await apiClient.post(
      `/proximity/artifacts/${id}/flag`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  /**
   * Delete (remove) an artifact (owner only)
   */
  deleteArtifact: async (id: number, token: string): Promise<{ message: string }> => {
    const response: any = await apiClient.delete(`/proximity/artifacts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Find nearby proximity chatrooms
   */
  findNearbyChatrooms: async (
    lat: number,
    lng: number,
    radius: number = 1000,
    token: string
  ): Promise<{ chatrooms: ProximityChatroom[] }> => {
    const response: any = await apiClient.get<any>(`/proximity-chatrooms/nearby`, {
      params: { lat, lng, radius },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Join a proximity chatroom
   */
  joinChatroom: async (id: number, lat: number, lng: number, token: string): Promise<{ message: string }> => {
    const response: any = await apiClient.post(
      `/proximity-chatrooms/${id}/join`,
      { latitude: lat, longitude: lng },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  /**
   * Leave a proximity chatroom
   */
  leaveChatroom: async (id: number, token: string): Promise<{ message: string }> => {
    const response: any = await apiClient.post(
      `/proximity-chatrooms/${id}/leave`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  /**
   * Add a comment to an artifact
   */
  commentArtifact: async (id: number, content: string, parent_id?: string, token?: string): Promise<{ message: string; comment: any }> => {
    const response: any = await apiClient.post(
      `/proximity/artifacts/${id}/comments`,
      { content, parent_id },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  /**
   * Get comments for an artifact
   */
  getComments: async (id: number, token?: string): Promise<{ data: any[] }> => {
    const response: any = await apiClient.get(
      `/proximity/artifacts/${id}/comments`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data;
  },

  /**
   * Vote on an artifact
   */
  voteArtifact: async (id: number, value: number, token: string): Promise<{ message: string; vote: any }> => {
    const response: any = await apiClient.post(
      `/proximity/artifacts/${id}/vote`,
      { value },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },
};
