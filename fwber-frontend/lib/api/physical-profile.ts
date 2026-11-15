import { apiClient } from './client';

import axios from 'axios';

const API_BASE_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4003/api');

export type PhysicalProfile = {
  height_cm?: number | null;
  body_type?: string;
  hair_color?: string;
  eye_color?: string;
  skin_tone?: string;
  ethnicity?: string;
  facial_hair?: string;
  tattoos?: boolean;
  piercings?: boolean;
  dominant_hand?: 'left' | 'right' | 'ambi';
  fitness_level?: 'low' | 'average' | 'fit' | 'athletic';
  clothing_style?: string;
  avatar_prompt?: string;
  avatar_status?: string;
};

export const physicalProfileApi = {
  get: async (token: string): Promise<{ data: PhysicalProfile }> => {
    const res = await apiClient.get<{ data: PhysicalProfile }>('/physical-profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  upsert: async (token: string, data: PhysicalProfile): Promise<{ data: PhysicalProfile }> => {
    const res = await apiClient.put<{ data: PhysicalProfile }>('/physical-profile', data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  requestAvatar: async (token: string, style: string): Promise<{ data: PhysicalProfile }> => {
    const res = await apiClient.post<{ data: PhysicalProfile }>('/physical-profile/avatar/request', { style }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
