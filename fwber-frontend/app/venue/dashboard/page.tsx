'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VenueDashboard() {
  const [venue, setVenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('venue_token')
    if (!token) {
      router.push('/venue/login')
      return
    }

    const apiUrl = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'https://api.fwber.site/api');
    
    fetch(`${apiUrl}/venue/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Unauthorized')
      return res.json()
    })
    .then(data => {
      setVenue(data)
      setLoading(false)
    })
    .catch(() => {
      localStorage.removeItem('venue_token')
      router.push('/venue/login')
    })
  }, [router])

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-purple-400">fwber Partner</h1>
          <div className="flex items-center gap-4">
            <span className="font-medium">{venue?.name}</span>
            <button 
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

      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-gray-400">Welcome back to your partner portal.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Card */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Active Events</h3>
            <p className="text-3xl font-bold mt-2 text-purple-400">0</p>
            <p className="text-xs text-gray-500 mt-1">No active events</p>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Check-ins</h3>
            <p className="text-3xl font-bold mt-2 text-blue-400">0</p>
            <p className="text-xs text-gray-500 mt-1">Lifetime check-ins</p>
          </div>
          
          {/* Profile Card */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 md:col-span-3">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Venue Details</h3>
              <button className="text-sm text-purple-400 hover:text-purple-300">Edit Profile</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p><span className="text-gray-400 block text-xs uppercase">Address</span> {venue?.address}</p>
                <p><span className="text-gray-400 block text-xs uppercase">Type</span> <span className="capitalize">{venue?.business_type}</span></p>
              </div>
              <div className="space-y-2">
                <p><span className="text-gray-400 block text-xs uppercase">Capacity</span> {venue?.capacity || 'Not set'}</p>
                <p><span className="text-gray-400 block text-xs uppercase">Status</span> <span className="text-green-400">Active</span></p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
