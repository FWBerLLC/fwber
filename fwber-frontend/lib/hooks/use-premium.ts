import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface PremiumStatus {
  is_premium: boolean;
  tier: 'free' | 'gold';
  expires_at: string | null;
  unlimited_swipes: boolean;
}

export interface PremiumInitiationResponse {
  client_secret: string;
  amount: number;
  currency: string;
  plan_id: string;
  plan: {
    id: string;
    name: string;
    display_name: string;
    price_usd: number;
    currency: string;
    interval: 'month' | 'year';
  };
}

export const usePremiumStatus = () => {
  return useQuery<PremiumStatus>({
    queryKey: ['premium-status'],
    queryFn: async () => {
      return await api.get<PremiumStatus>('/premium/status');
    },
  });
};

export const usePurchasePremium = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data?: { paymentMethod?: 'stripe' | 'token' }) => {
      // /premium/purchase is the token path; it reads planId/plan.
      return await api.post('/premium/purchase', { planId: 'monthly' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-status'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useInitiatePurchase = () => {
  return useMutation({
    mutationFn: async (planId: string = 'monthly') => {
      return await api.post<PremiumInitiationResponse & { checkoutUrl?: string }>('/premium/initiate', { planId });
    },
  });
};

export const useWhoLikesYou = () => {
  return useQuery({
    queryKey: ['who-likes-you'],
    queryFn: async () => {
      return await api.get<any[]>('/premium/who-likes-you');
    },
    retry: false,
  });
};
