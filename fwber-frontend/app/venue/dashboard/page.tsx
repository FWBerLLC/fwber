'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface VenueStats {
  active_events: number
  active_checkins: number
  total_checkins: number
}

interface RecentVenueCheckin {
  id: number
  user_id: number
  user_name: string
  message: string | null
  active: boolean
  created_at: string
}

export default function VenueDashboard() {
  const [venue, setVenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    business_type: 'bar',
    address: '',
    city: '',
    state: '',
    phone: '',
    website: '',
    description: '',
    capacity: '100',
  })
  const router = useRouter()

  const getApiUrl = () =>
    typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'https://api.fwber.online/api')

  const loadVenueMe = useCallback(async () => {
    const token = localStorage.getItem('venue_token')
    if (!token || token === 'undefined' || token === 'null') {
      localStorage.removeItem('venue_token')
      router.push('/venue/login')
      return
    }

    try {
      const res = await fetch(`${getApiUrl()}/venue/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      if (!res.ok) throw new Error('Unauthorized')
      const data = await res.json()
      if (!data || Array.isArray(data) || !data.id) {
        throw new Error('Invalid venue session')
      }
      setVenue(data)
      setEditForm({
        name: data.name || '',
        business_type: data.business_type || 'bar',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        phone: data.phone || '',
        website: data.website || '',
        description: data.description || '',
        capacity: String(data.capacity ?? data.max_capacity ?? 100),
      })
      setLoading(false)
    } catch {
      localStorage.removeItem('venue_token')
      router.push('/venue/login')
    }
  }, [router])

  useEffect(() => {
    loadVenueMe()
  }, [loadVenueMe])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('venue_token')
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch(`${getApiUrl()}/venue/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          capacity: Number(editForm.capacity) || 100,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.message || 'Failed to update venue profile')
      }
      toast.success('Venue profile updated')
      setEditOpen(false)
      await loadVenueMe()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update venue profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        Loading partner portal...
      </div>
    )
  }

  const stats: VenueStats = venue?.stats || {
    active_events: venue?.active_events ?? 0,
    active_checkins: venue?.active_checkins ?? 0,
    total_checkins: venue?.total_checkins ?? 0,
  }
  const recentCheckins: RecentVenueCheckin[] = Array.isArray(venue?.recent_checkins) ? venue.recent_checkins : []

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-purple-400">fwber Partner</h1>
          <div className="flex items-center gap-4">
            <span className="font-medium">{venue?.name}</span>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('venue_token')
                router.push('/venue/login')
              }}
              className="text-sm text-red-400 hover:text-red-300 border border-red-900/50 px-3 py-1 rounded bg-red-900/20"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Partner Dashboard</h2>
            <p className="text-slate-400 text-sm">Real-time foot-traffic check-ins and venue details.</p>
          </div>
          <button
            type="button"
            onClick={loadVenueMe}
            className="self-start sm:self-auto text-xs uppercase tracking-wider px-3 py-1.5 rounded bg-slate-800 border border-slate-700 hover:border-purple-500 text-slate-200 transition"
          >
            Refresh Stats
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Active Events</h3>
            <p className="text-3xl font-bold mt-2 text-purple-400">{stats.active_events}</p>
            <p className="text-xs text-slate-400 mt-1">
              {stats.active_events > 0 ? 'Upcoming or live events at your venue' : 'No active events'}
            </p>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Live Check-ins</h3>
            <p className="text-3xl font-bold mt-2 text-emerald-400">{stats.active_checkins}</p>
            <p className="text-xs text-slate-400 mt-1">Members currently checked in on-site</p>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Check-ins</h3>
            <p className="text-3xl font-bold mt-2 text-blue-400">{stats.total_checkins}</p>
            <p className="text-xs text-slate-400 mt-1">Lifetime verified check-ins</p>
          </div>

          {/* Profile Card */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 md:col-span-3">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">Venue Details</h3>
                {venue?.description && (
                  <p className="text-sm text-slate-300 mt-1">{venue.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="text-sm font-medium text-purple-300 hover:text-white border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 rounded-md transition"
              >
                Edit Profile
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p>
                  <span className="text-slate-400 block text-xs uppercase">Address</span>
                  {[venue?.address, venue?.city, venue?.state].filter(Boolean).join(', ') || 'Not set'}
                </p>
                <p>
                  <span className="text-slate-400 block text-xs uppercase">Type</span>
                  <span className="capitalize">{venue?.business_type || 'bar'}</span>
                </p>
                {venue?.website && (
                  <p>
                    <span className="text-slate-400 block text-xs uppercase">Website</span>
                    <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                      {venue.website}
                    </a>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p>
                  <span className="text-slate-400 block text-xs uppercase">Capacity</span>
                  {venue?.capacity || venue?.max_capacity || 100} guests
                </p>
                <p>
                  <span className="text-slate-400 block text-xs uppercase">Verification Status</span>
                  <span className="capitalize text-emerald-400">{venue?.verification_status || 'pending'}</span>
                </p>
                {venue?.phone && (
                  <p>
                    <span className="text-slate-400 block text-xs uppercase">Phone</span>
                    {venue.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Check-ins */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 md:col-span-3">
            <h3 className="text-lg font-bold mb-4">Recent Guest Check-ins</h3>
            {recentCheckins.length === 0 ? (
              <p className="text-sm text-slate-400">No guest check-ins recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-700">
                {recentCheckins.map((c) => (
                  <div key={c.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold text-white">{c.user_name}</span>
                      {c.message && <span className="text-slate-300 ml-2">&ldquo;{c.message}&rdquo;</span>}
                      <div className="text-xs text-slate-400 mt-0.5">
                        {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {c.active ? 'On-site' : 'Checked out'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>Edit Venue Profile</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update how your venue appears to nearby FWBer members.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase text-slate-400 mb-1">Venue Name</label>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-400 mb-1">Business Type</label>
                <select
                  value={editForm.business_type}
                  onChange={(e) => setEditForm({ ...editForm, business_type: e.target.value })}
                  className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white"
                >
                  <option value="bar">Bar</option>
                  <option value="club">Club</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Cafe</option>
                  <option value="lounge">Lounge</option>
                  <option value="event_space">Event Space</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-400 mb-1">Street Address</label>
              <input
                required
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs uppercase text-slate-400 mb-1">City</label>
                <input
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-400 mb-1">State</label>
                <input
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-400 mb-1">Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={editForm.capacity}
                  onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                  className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase text-slate-400 mb-1">Phone</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="(313) 555-0199"
                  className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-400 mb-1">Website</label>
                <input
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  placeholder="https://"
                  className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-400 mb-1">Description</label>
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Atmosphere, music, drink specials..."
                className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white resize-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
