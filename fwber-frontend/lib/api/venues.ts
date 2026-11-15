import { apiClient as client } from './client'

export interface VenueSceneSignals {
  headline: string | null
  matched_topics: Array<{
    id: number
    slug: string
    label: string
    emoji?: string | null
  }>
  matched_tags: string[]
  score_boost: number
}

export interface VenueRankingStrategy {
  trusted_visitors: boolean
  scene_alignment: boolean
  venue_health: boolean
  freshness: boolean
  distance: boolean
  summary: string
}

export interface Venue {
  id: number
  name: string
  description: string
  address: string
  city: string
  state: string
  country: string
  latitude: number
  longitude: number
  features: string[]
  operating_hours: any
  is_active: boolean
  business_type?: string
  verification_status?: string
  max_capacity?: number
  active_checkins?: number
  distance?: number
  distance_meters?: number
  scene_signals?: VenueSceneSignals | null
  ranking_score?: number
}

export interface VenueCheckin {
  id: number
  user_id: number
  venue_id: number
  message: string | null
  checked_out_at: string | null
  created_at: string
  user?: {
    id: number
    name: string
    avatar?: string
  }
  venue?: Venue
}

export interface VenuesResponse {
  data: Venue[]
  venues: Venue[]
  meta?: {
    ranking_strategy?: VenueRankingStrategy
  }
}

export const getVenues = async (token: string, lat?: number, lng?: number, ranking_strategy: 'trust-aware' | 'distance-only' = 'trust-aware'): Promise<VenuesResponse> => {
  const params: any = {}
  if (lat !== undefined) params.lat = lat
  if (lng !== undefined) params.lng = lng
  params.ranking_strategy = ranking_strategy
  
  const response = await client.get<VenuesResponse>('/venues', {
    headers: { Authorization: `Bearer ${token}` },
    params
  })
  return {
    data: response.data.data ?? response.data.venues ?? [],
    venues: response.data.venues ?? response.data.data ?? [],
    meta: response.data.meta,
  }
}

export const getVenue = async (token: string, id: number) => {
  const response = await client.get(`/venues/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const checkInToVenue = async (
  token: string, 
  venueId: number, 
  latitude: number, 
  longitude: number, 
  message?: string
) => {
  const response = await client.post(
    `/venues/${venueId}/checkin`,
    { 
      message,
      latitude,
      longitude
    },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return response.data
}

export const checkOutFromVenue = async (token: string, venueId: number) => {
  const response = await client.post(
    `/venues/${venueId}/checkout`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return response.data
}

export const getVenueCheckins = async (token: string, venueId: number) => {
  const response = await client.get(`/venues/${venueId}/checkins`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const getCurrentCheckin = async (token: string): Promise<VenueCheckin | null> => {
  const response = await client.get<{ checkin: VenueCheckin | null }>('/venues/current-checkin', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data?.checkin ?? null
}
