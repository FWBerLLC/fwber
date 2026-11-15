import { apiClient } from './client';

export interface VerificationStatus {
  status: string;
  is_verified: boolean;
  is_id_verified: boolean;
  verified_at: string | null;
  verification_photo_path: string | null;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  similarity?: number;
  message: string;
}

export const verificationApi = {
  getStatus: async (): Promise<VerificationStatus> => {
    const res: any = await apiClient.get('/verification/status');
    return res.data || res;
  },

  verify: async (photo: File): Promise<VerificationResult> => {
    const formData = new FormData();
    formData.append('photo', photo);

    const res: any = await apiClient.post('/verification/verify', formData);
    return res.data || res;

    const token = typeof window !== 'undefined' ? localStorage.getItem('fwber_token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use fetch directly to avoid JSON.stringify in apiClient
    const baseUrl = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4003/api');
    const url = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
    
    const response = await fetch(`${url}/verification/verify`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { response: { data: errorData } }; // Mimic axios/apiClient error structure for the UI
    }

    return response.json();
  },
};
