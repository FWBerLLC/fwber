/**
 * Safety API Client
 * 
 * Purpose: API client for user safety operations (blocking, reporting, panic button, safe walk)
 * Original Created: 2025-11-19
 * Updated for v1.0.5 (Panic Button & Safe Walk): 2026-02-28
 */

import { apiClient } from './client';

/* ── Types ──────────────────────────────────────────────────────────── */

const API_BASE_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api');

/* ── Legacy Types & Functions (Restored for Build Compatibility) ──────────────── */

export interface BlockResponse {
  data: {
    id: number;
    blocker_id: number;
    blocked_id: number;
    created_at: string;
    updated_at: string;
  };
}

export interface ReportResponse {
  data: {
    id: number;
    reporter_id: number;
    accused_id: number;
    message_id: number | null;
    reason: string;
    details: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Block a user (Legacy signature using fetch)
 */
export async function blockUser(token: string, blockedId: number): Promise<BlockResponse> {
  const res = await apiClient.post<BlockResponse>('/blocks', {
    blocked_id: blockedId,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/**
 * Unblock a user
 */
export async function unblockUser(token: string, blockedId: number): Promise<{ ok: boolean }> {
  const res = await apiClient.delete<{ ok: boolean }>(`/blocks/${blockedId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export interface BlockedUser {
  id: number;
  blocked_id: number;
  name: string;
  avatar_url: string | null;
  created_at?: string;
}

/**
 * List blocked users
 */
export async function getBlockedUsers(token: string): Promise<{ data: BlockedUser[]; total: number }> {
  const res = await apiClient.get<{ data: BlockedUser[]; total: number }>('/blocks', { headers: { Authorization: 'Bearer ' + token } });
  return res.data;
}

/**
 * Report a user
 */
export async function reportUser(
  token: string,
  accusedId: number,
  reason: string,
  details?: string,
  messageId?: number
): Promise<ReportResponse> {
  const res = await apiClient.post<ReportResponse>('/reports', {
    accused_id: accusedId,
    reason,
    details,
    message_id: messageId,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/* ── New Safety Features (v1.0.5 - Panic Button & Safe Walk) ──────────────────── */

export interface EmergencyContact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  is_primary: boolean;
}

export interface SafeWalk {
  id: number;
  user_id: number;
  status: 'active' | 'completed' | 'panic';
  destination: string | null;
  start_lat: number | null;
  start_lng: number | null;
  current_lat: number | null;
  current_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  started_at: string | null;
  ended_at: string | null;
}

export interface PanicResponse {
  status: string;
  alerts_sent: number;
  contacts_notified: string[];
  location: { latitude: number | null; longitude: number | null };
  timestamp: string;
}

// Emergency Contacts
export async function getContacts(): Promise<{ contacts: EmergencyContact[] }> {
  const res = await apiClient.get<{ contacts: EmergencyContact[] }>('/safety/contacts');
  return res.data;
}

export async function addContact(data: Partial<EmergencyContact>): Promise<{ contact: EmergencyContact }> {
  const res = await apiClient.post<{ contact: EmergencyContact }>('/safety/contacts', data);
  return res.data;
}

export async function deleteContact(id: number): Promise<void> {
  await apiClient.delete(`/safety/contacts/${id}`);
}

// Panic
export async function triggerPanic(lat?: number, lng?: number): Promise<PanicResponse> {
  const res = await apiClient.post<PanicResponse>('/safety/panic', { latitude: lat, longitude: lng });
  return res.data;
}

// Safe Walk
export async function startSafeWalk(data: {
  destination?: string;
  start_lat: number;
  start_lng: number;
  dest_lat?: number;
  dest_lng?: number;
}): Promise<{ walk: SafeWalk }> {
  const res = await apiClient.post<{ walk: SafeWalk }>('/safety/walk/start', data);
  return res.data;
}

export async function updateWalkLocation(walkId: number, lat: number, lng: number): Promise<{ walk: SafeWalk }> {
  const res = await apiClient.patch<{ walk: SafeWalk }>(`/safety/walk/${walkId}/location`, { latitude: lat, longitude: lng });
  return res.data;
}

export async function endSafeWalk(walkId: number): Promise<{ walk: SafeWalk }> {
  const res = await apiClient.post<{ walk: SafeWalk }>(`/safety/walk/${walkId}/end`);
  return res.data;
}

export async function getActiveWalk(): Promise<{ walk: SafeWalk | null }> {
  const res = await apiClient.get<{ walk: SafeWalk | null }>('/safety/walk/active');
  return res.data;
}
