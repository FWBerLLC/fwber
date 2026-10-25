import { api } from '@/lib/api/client'

export interface FederationActor {
  id: string
  type: string
  preferredUsername: string
  name?: string
  summary?: string
  icon?: { url: string } | null
  server: string
  url?: string | null
  inbox?: string | null
  outbox?: string | null
  isVerified?: boolean
  gender?: string | null
  orientation?: string | null
  relationshipStatus?: string | null
  cachedPostsCount?: number
  lastCachedPostAt?: string | null
  followingStatus?: string | null
  followerStatus?: string | null
}

export interface FederationConnection {
  id: number
  actor_uri: string
  username?: string | null
  domain?: string | null
  status?: string | null
  created_at?: string
  updated_at?: string
}

export interface FederatedPost {
  id: number
  actor_uri: string
  actor_username?: string | null
  actor_domain?: string | null
  actor_avatar?: string | null
  content: string
  published_at: string
  url?: string | null
  // Raw ActivityPub object envelope (federation feed resolves the canonical
  // object URI from payload.object.id).
  payload?: {
    object?: { id?: string | number; [key: string]: unknown }
    [key: string]: unknown
  }
  metadata?: {
    name?: string
    preferredUsername?: string
    summary?: string
  }
}

export interface FederationOutboxNote {
  id: string
  type: string
  content: string
  attributedTo: string
  published?: string
  to?: string[]
}

export interface FederationOutboxActivity {
  id: string
  type: string
  actor: string
  published?: string
  to?: string[]
  object: FederationOutboxNote
}

export interface FederationOutboxPage {
  '@context'?: string | string[]
  id: string
  type: string
  partOf?: string
  totalItems?: number
  orderedItems: FederationOutboxActivity[]
}

export interface UnifiedActivityItem {
  id: number
  type: string
  actor_uri: string
  actor_username: string
  actor_domain: string
  content: string
  timestamp: string
  payload: any
}

export interface UnifiedActivityResponse {
  activity: UnifiedActivityItem[]
}

interface FederationActorDetailResponse {
  actor: FederationActor
}

interface FederationPostsResponse {
  posts?: FederatedPost[]
}

export function buildFederationActorExplorerHref(actorUri: string): string {
  return `/settings/federation/actors?uri=${encodeURIComponent(actorUri)}`
}

export function formatFederationHandle(
  username?: string | null,
  domain?: string | null,
  fallback?: string
): string {
  if (username && domain) {
    return `@${username}@${domain}`
  }

  return fallback || 'Unknown federated actor'
}

export async function getFederationActorDetail(actorUri: string): Promise<FederationActor> {
  const response = await api.get<FederationActorDetailResponse>('/federation/actors/detail', {
    params: { uri: actorUri },
  })

  return response.actor
}

export async function getFederatedPosts(params?: {
  actorUri?: string
  limit?: number
}): Promise<FederatedPost[]> {
  const response = await api.get<FederationPostsResponse>('/federation/posts', {
    params: {
      actor_uri: params?.actorUri,
      limit: params?.limit,
    },
  })

  return Array.isArray(response.posts) ? response.posts : []
}

export function buildFederationOutboxHref(userId: number, limit = 20): string {
  return `/api/federation/users/${userId}/outbox?page=true&limit=${limit}`
}

export async function getFederationOutbox(
  userId: number,
  params?: { limit?: number }
): Promise<FederationOutboxPage> {
  const response = await api.get<FederationOutboxPage>(`/federation/users/${userId}/outbox`, {
    params: {
      page: 'true',
      limit: params?.limit ?? 20,
    },
    headers: {
      Accept: 'application/activity+json',
    },
  })

  const data = response as Partial<FederationOutboxPage>

  return {
    id: data.id || buildFederationOutboxHref(userId, params?.limit ?? 20),
    type: data.type || 'OrderedCollectionPage',
    partOf: data.partOf,
    totalItems: data.totalItems,
    orderedItems: Array.isArray(data.orderedItems) ? data.orderedItems : [],
    '@context': data['@context'],
  }
}
