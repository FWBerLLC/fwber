import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../auth-context';

export function useActiveQuests() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['active-quests'],
    queryFn: async () => {
      // Typed explicitly — without the generic, `data` is `unknown` and every
      // consumer (e.g. LocalPulse's activeQuests) fails to type-check (v2.3.41).
      const { data } = await apiClient.get<any[]>('/quests/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    enabled: !!token
  });
}

export function useAcceptQuest() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questId: number) => {
      const { data } = await apiClient.post(`/quests/${questId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-quests'] });
    }
  });
}

export function useCompleteQuest() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questId, proof }: { questId: number, proof?: string }) => {
      const { data } = await apiClient.post(`/quests/${questId}/complete`, { proof }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-quests'] });
    }
  });
}
