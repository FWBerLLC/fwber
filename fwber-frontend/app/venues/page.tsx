'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import { getVenues, checkInToVenue, checkOutFromVenue, getCurrentCheckin, Venue, VenueCheckin } from '@/lib/api/venues'
import { MapPin, LogIn, LogOut, BadgeCheck, Users } from 'lucide-react'

export default function VenuesPage() {
  const { token } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [currentCheckin, setCurrentCheckin] = useState<VenueCheckin | null>(null)
  const [rankingSummary, setRankingSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        setLocationError('Unable to retrieve your location')
        setLoading(false)
        console.error(error)
      }
    )
  }, [])

  useEffect(() => {
    const fetchData = async () => {
        if (!token || !location) return
        try {
          setLoading(true)
          const [venuesData, checkinData] = await Promise.all([
            getVenues(token, location.lat, location.lng, 'trust-aware'),
            getCurrentCheckin(token)
          ])
          const venuesList = venuesData.data ?? venuesData.venues ?? []
          setVenues(Array.isArray(venuesList) ? venuesList : [])
          setRankingSummary(venuesData.meta?.ranking_strategy?.summary ?? null)
          setCurrentCheckin(checkinData as any)
        } catch (error) {
          console.error('Failed to fetch venues', error)
        } finally {
          setLoading(false)
        }
      }
    fetchData()
  }, [token, location])

  const refreshData = async () => {
      if (!token || !location) return
      try {
        const [venuesData, checkinData] = await Promise.all([
          getVenues(token, location.lat, location.lng, 'trust-aware'),
          getCurrentCheckin(token)
        ])
        const venuesList = venuesData.data ?? venuesData.venues ?? []
        setVenues(Array.isArray(venuesList) ? venuesList : [])
        setRankingSummary(venuesData.meta?.ranking_strategy?.summary ?? null)
        setCurrentCheckin(checkinData as any)
      } catch (error) {
        console.error('Failed to refresh data', error)
      }
  }

  const handleCheckIn = async (venueId: number) => {
    if (!token || !location) {
      console.warn('Location required for check-in')
      return
    }
    const message = prompt("Enter a check-in message (optional):") || ""
    try {
      await checkInToVenue(token, venueId, location.lat, location.lng, message)
      refreshData()
    } catch (error: any) {
      console.error('Check-in failed', error)
      const errorMsg = error.response?.data?.message || 'Check-in failed'
      console.error(errorMsg)
    }
  }

  const handleCheckOut = async (venueId: number) => {
    if (!token) return
    try {
      await checkOutFromVenue(token, venueId)
      refreshData()
    } catch (error) {
      console.error('Check-out failed', error)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading venues...</div>
  if (locationError) return <div className="p-8 text-center text-red-600">{locationError}</div>

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Venues Nearby</h1>

          {rankingSummary && (
            <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                Trust-aware venue ranking
              </div>
              <p>{rankingSummary}</p>
            </div>
          )}

          {currentCheckin && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6 flex justify-between items-center">
              <div>
                <strong className="font-bold">Checked in at: </strong>
                <span className="block sm:inline">{currentCheckin.venue?.name}</span>
                {currentCheckin.message && <p className="text-sm italic">&quot;{currentCheckin.message}&quot;</p>}
              </div>
              <button type="button" 
                onClick={() => handleCheckOut(currentCheckin.venue_id)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
              >
                <LogOut className="mr-2 h-4 w-4" /> Check Out
              </button>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {venues.map(venue => (
              <div key={venue.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{venue.name}</h2>
                    <p className="text-gray-600 flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" /> {venue.city}, {venue.state}
                    </p>
                    {(venue.distance_meters ?? venue.distance) && (
                       <p className="text-xs text-gray-500 mt-1">
                          {Math.round(((venue.distance_meters ?? venue.distance ?? 0) / 100)) / 10} km away
                        </p>
                     )}
                     <div className="mt-2 flex flex-wrap gap-2">
                        {venue.verification_status === 'verified' && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            <BadgeCheck className="mr-1 h-3 w-3" /> Verified venue
                          </span>
                        )}
                        {(venue.active_checkins ?? 0) > 0 && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                            <Users className="mr-1 h-3 w-3" /> {venue.active_checkins} active check-ins
                          </span>
                        )}
                     </div>
                     {venue.scene_signals?.headline && (
                        <p className="mt-2 text-sm text-purple-800">
                          {venue.scene_signals.headline}
                        </p>
                     )}
                  </div>
                  {currentCheckin?.venue_id === venue.id ? (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Checked In</span>
                  ) : (
                    <button type="button"
                      onClick={() => handleCheckIn(venue.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded inline-flex items-center"
                    >
                      <LogIn className="mr-2 h-4 w-4" /> Check In
                    </button>
                  )}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">{venue.description}</p>
              </div>
            ))}
            {venues.length === 0 && (
                <div className="col-span-2 text-center text-gray-500 py-8">
                    No venues found nearby.
                </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
