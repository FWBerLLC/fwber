'use client'

import { useState, useEffect } from 'react'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import {
  Heart, Share2, Upload, Camera, Trophy,
  MessageCircle, Star, ArrowRight, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Cat {
  id: number
  user_name: string
  image_url: string
  cat_name: string
  rating: number
  vote_count: number
}

export default function RateMyPussyPage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchCats()
  }, [])

  async function fetchCats() {
    try {
      const response = await apiClient.get<Cat[]>('/cats')
      setCats(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Failed to fetch cats:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRate(catId: number, rating: number) {
    try {
      await apiClient.post(`/cats/${catId}/rate`, { rating })
      // Refresh local state or refetch
      fetchCats()
    } catch (err) {
      console.error('Failed to rate cat:', err)
      console.warn('Login required')
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile || !newCatName) return

    setUploading(true)
    const formData = new FormData()
    formData.append('image', selectedFile)
    formData.append('cat_name', newCatName)

    try {
      await apiClient.post('/cats', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setNewCatName('')
      setSelectedFile(null)
      setShowUpload(false)
      fetchCats()
    } catch (err) {
      console.error('Upload failed:', err)
      console.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const topCats = cats.slice(0, 3)
  const otherCats = cats.slice(3)

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-black italic tracking-tighter mb-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            RATE MY PUSSY
          </h1>
          <p className="text-xl text-gray-400 font-medium">
            The world&apos;s most provocative cat rating site.
          </p>
        </header>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <button type="button"
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-black font-bold rounded-full hover:scale-105 transition active:scale-95 shadow-xl shadow-white/10"
          >
            <Upload className="w-5 h-5" />
            Upload Your Pussy
          </button>
          <button type="button"
            onClick={fetchCats}
            className="flex items-center gap-2 px-8 py-4 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-full hover:bg-zinc-800 transition shadow-xl"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
        </div>

        {/* Upload Modal/Section */}
        {showUpload && (
          <div className="mb-12 p-8 bg-zinc-900 rounded-3xl border border-zinc-800 animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Camera className="w-6 h-6 text-pink-500" />
              Upload Your Cat
            </h2>
            <form onSubmit={handleUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">Cat&apos;s Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Mr. Whiskers, Princess Fluffy..."
                  className="w-full bg-black border-2 border-zinc-800 rounded-2xl p-4 focus:border-pink-500 transition outline-none text-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full bg-black border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center cursor-pointer hover:border-zinc-600 transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl font-black text-xl uppercase tracking-tighter disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Submit for Judgment'}
              </button>
            </form>
          </div>
        )}

        {/* Leaderboard */}
        <section className="mb-16">
          <h2 className="text-3xl font-black mb-8 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Top Rated Pussies
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {topCats.map((cat, i) => (
              <div key={cat.id} className="relative group">
                <div className={`absolute -inset-1 bg-gradient-to-r ${
                  i === 0 ? 'from-yellow-500 to-orange-500' : 
                  i === 1 ? 'from-zinc-300 to-zinc-500' : 
                  'from-orange-700 to-orange-900'
                } rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-500`} />
                <div className="relative bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden">
                  <div className="aspect-square relative">
                    <Image
                      src={cat.image_url}
                      alt={cat.cat_name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur px-4 py-1 rounded-full text-sm font-black border border-white/10">
                      #{i + 1}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold truncate">{cat.cat_name}</h3>
                      <div className="flex items-center gap-1 text-yellow-500 font-black">
                        <Star className="w-4 h-4 fill-current" />
                        {cat.rating}
                      </div>
                    </div>
                    <p className="text-zinc-500 text-sm mb-4">by {cat.user_name}</p>
                    <div className="grid grid-cols-5 gap-1">
                      {[2, 4, 6, 8, 10].map((r) => (
                        <button type="button"
                          key={r}
                          onClick={() => handleRate(cat.id, r)}
                          className="py-2 bg-zinc-900 rounded-lg hover:bg-pink-600 transition text-xs font-bold border border-zinc-800"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Grid Feed */}
        <section>
          <h2 className="text-2xl font-bold mb-8">Recent Entries</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {otherCats.map((cat) => (
              <div key={cat.id} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 group">
                <div className="aspect-square relative overflow-hidden">
                  <Image
                    src={cat.image_url}
                    alt={cat.cat_name}
                    fill
                    className="object-cover group-hover:scale-110 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button type="button" 
                      onClick={() => handleRate(cat.id, 10)}
                      className="p-2 bg-pink-600 rounded-full"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold truncate">{cat.cat_name}</span>
                    <span className="text-yellow-500 font-bold">{cat.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Funnel to Main App */}
        <section className="mt-24 p-12 bg-gradient-to-br from-zinc-900 to-black rounded-[3rem] border border-zinc-800 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Heart className="w-64 h-64 text-pink-500" />
          </div>
          <div className="relative z-10">
            <h2 className="text-4xl font-black mb-4">Looking for humans instead?</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto text-lg leading-relaxed">
              fwber is Detroit&apos;s privacy-first, open-source proximity dating app.
              Find real connections, keep your data.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-black text-xl rounded-full hover:scale-105 transition active:scale-95 shadow-2xl shadow-pink-500/20"
            >
              Join fwber Today
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-zinc-900 text-center text-zinc-600 text-sm">
        <p>&copy; 2026 fwber. All rights reserved. No pussies were harmed in the making of this site.</p>
      </footer>
    </div>
  )
}
