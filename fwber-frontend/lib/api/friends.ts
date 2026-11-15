import { apiClient } from './client';

const API_BASE_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4003/api');

export async function getFriends(token: string) {
  const response = await apiClient.get('/friends', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function getFriendRequests(token: string) {
  const response = await apiClient.get('/friends/requests', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function sendFriendRequest(token: string, friend_id: number) {
  const response = await apiClient.post('/friends/requests', { friend_id }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function respondToFriendRequest(token: string, userId: number, status: 'accepted' | 'declined') {
  const response = await apiClient.post(`/friends/requests/${userId}`, { status }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function removeFriend(token: string, friendId: number) {
  const response = await apiClient.delete(`/friends/${friendId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}
