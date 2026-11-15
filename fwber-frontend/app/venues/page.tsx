'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { useAuth } from '@/lib/auth-context'
import { useEffect, useState, useCallback } from 'react'
import {
  getVenues,
  checkInToVenue,
  checkOutFromVenue,
  getCurrentCheckin,
  Venue,
  VenueCheckin,
} from '@/lib/api/venues'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MapPin, LogIn, LogOut, BadgeCheck, Users, Compass, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const DETROIT_CENTER = { lat: 42.3314, lng: -83.0458 }

const QUICK_VIBE_MESSAGES = [
  'Grabbing drinks at the bar',
  'Open to saying hello IRL',
  'Here for live music tonight',
  'Coffee & conversation',
]

export default function VenuesPage() {
  const { token } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [currentCheckin, setCurrentCheckin] = useState<VenueCheckin | null>(null)
  const [rankingSummary, setRankingSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  // WebView-safe Check-In modal state (replaces window.prompt(), which returns null in mobile WebViews)
  const [checkinModalVenue, setCheckinModalVenue] = useState<Venue | null>(null)
  const [checkinMessage, setCheckinMessage] = useState('')
  const [submittingCheckin, setSubmittingCheckin] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  const requestBrowserLocation = useCallback(() => {
    setLocationError(null)
    setLoading(true)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        setLocationError('Location permission was declined or unavailable.')
        setLoading(false)
      },
      { timeout: 10000 }
    )
  }, [])

  useEffect(() => {
    requestBrowserLocation()
  }, [requestBrowserLocation])

  const loadVenuesAndCheckin = useCallback(async (coords: { lat: number; lng: number }, showSpinner = false) => {
    if (!token) return
    try {
      if (showSpinner) setLoading(true)
      const [venuesData, checkinData] = await Promise.all([
        getVenues(token, coords.lat, coords.lng, 'trust-aware'),
        getCurrentCheckin(token),
      ])
      const venuesList = venuesData.data ?? venuesData.venues ?? []
      setVenues(Array.isArray(venuesList) ? venuesList : [])
      setRankingSummary(venuesData.meta?.ranking_strategy?.summary ?? null)
      setCurrentCheckin(checkinData && typeof checkinData === 'object' && 'venue_id' in checkinData ? checkinData : null)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load nearby venues')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token && location) {
      loadVenuesAndCheckin(location, true)
    }
  }, [token, location, loadVenuesAndCheckin])

  const openCheckinDialog = (venue: Venue) => {
    setCheckinMessage('')
    setCheckinModalVenue(venue)
  }

  const submitCheckin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !location || !checkinModalVenue) return
    setSubmittingCheckin(true)
    try {
      await checkInToVenue(token, checkinModalVenue.id, location.lat, location.lng, checkinMessage.trim() || undefined)
      toast.success(`Checked in at ${checkinModalVenue.name}!`)
      setCheckinModalVenue(null)
      setCheckinMessage('')
      await loadVenuesAndCheckin(location, false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Check-in failed')
    } finally {
      setSubmittingCheckin(false)
    }
  }

  const handleCheckOut = async (venueId: number) => {
    if (!token || !location) return
    setCheckingOut(true)
    try {
      await checkOutFromVenue(token, venueId)
      toast.success('Checked out of venue')
      await loadVenuesAndCheckin(location, false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Check-out failed')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Venues Nearby" />

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Venues Nearby</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Discover partner lounges, cafes, and social spaces with live member check-ins.
              </p>
            </div>
            {location && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => loadVenuesAndCheckin(location, true)}
              >
                Refresh Venues
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
              <p>Scanning nearby partner venues...</p>
            </div>
          ) : locationError && !location ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
              <Compass className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-foreground font-medium">{locationError}</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Enable browser location permissions to rank venues around you, or browse from Downtown Detroit.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button type="button" onClick={requestBrowserLocation}>
                  Retry Location
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLocationError(null)
                    setLocation(DETROIT_CENTER)
                  }}
                >
                  Browse Downtown Detroit
                </Button>
              </div>
            </div>
          ) : (
            <>
              {rankingSummary && (
                <div className="mb-6 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 px-4 py-3 text-sm text-purple-900 dark:text-purple-200">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                    Trust-aware venue ranking
                  </div>
                  <p>{rankingSummary}</p>
                </div>
              )}

              {currentCheckin && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <strong className="font-bold">Checked in at: </strong>
                    <span>{currentCheckin.venue?.name || `Venue #${currentCheckin.venue_id}`}</span>
                    {currentCheckin.message && (
                      <p className="text-sm italic opacity-90 mt-0.5">&ldquo;{currentCheckin.message}&rdquo;</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    disabled={checkingOut}
                    onClick={() => handleCheckOut(currentCheckin.venue_id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {checkingOut ? 'Checking Out...' : 'Check Out'}
                  </Button>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {(venues || []).map((venue) => (
                  <div key={venue.id} className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <div>
                          <h2 className="text-xl font-semibold text-foreground">{venue.name}</h2>
                          <p className="text-muted-foreground text-sm flex items-center mt-1">
                            <MapPin className="h-4 w-4 mr-1 shrink-0" />
                            {[venue.city, venue.state].filter(Boolean).join(', ') || venue.address || 'Local Partner'}
                          </p>
                          {(venue.distance_meters ?? venue.distance) !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {Math.round(((venue.distance_meters ?? venue.distance ?? 0) / 100)) / 10} km away
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {venue.verification_status === 'verified' && (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                                <BadgeCheck className="mr-1 h-3 w-3" /> Verified venue
                              </span>
                            )}
                            {(venue.active_checkins ?? 0) > 0 && (
                              <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300">
                                <Users className="mr-1 h-3 w-3" /> {venue.active_checkins} active check-in{venue.active_checkins === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>
                          {venue.scene_signals?.headline && (
                            <p className="mt-2 text-sm text-purple-700 dark:text-purple-300 font-medium">
                              {venue.scene_signals.headline}
                            </p>
                          )}
                        </div>
                        {currentCheckin?.venue_id === venue.id ? (
                          <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">
                            Checked In
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openCheckinDialog(venue)}
                            className="shrink-0"
                          >
                            <LogIn className="mr-1.5 h-4 w-4" /> Check In
                          </Button>
                        )}
                      </div>
                      {venue.description && (
                        <p className="text-sm text-muted-foreground mb-2">{venue.description}</p>
                      )}
                    </div>
                  </div>
                ))}
                {venues.length === 0 && (
                  <div className="col-span-2 text-center text-muted-foreground py-12 bg-card rounded-xl border border-dashed border-border">
                    No active partner venues found within 50 km of this location.
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        <Dialog open={Boolean(checkinModalVenue)} onOpenChange={(open) => { if (!open) setCheckinModalVenue(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Check In at {checkinModalVenue?.name}</DialogTitle>
              <DialogDescription>
                Let nearby members at this venue know you&apos;re open to connecting IRL. You can check out anytime.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitCheckin} className="space-y-4">
              <div>
                <label htmlFor="checkin-note" className="block text-sm font-medium text-foreground mb-1.5">
                  Status Note (optional)
                </label>
                <input
                  id="checkin-note"
                  type="text"
                  maxLength={160}
                  value={checkinMessage}
                  onChange={(e) => setCheckinMessage(e.target.value)}
                  placeholder="e.g. Sitting near the patio, say hi!"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_VIBE_MESSAGES.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCheckinMessage(preset)}
                      className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setCheckinModalVenue(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingCheckin}>
                  {submittingCheckin ? 'Checking In...' : 'Confirm Check-In'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
