'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { marketplaceApi, InventoryItem } from '@/lib/api/marketplace'
import { useAuth } from '@/lib/auth-context'
import { 
  ShoppingBag, MapPin, Search, RefreshCw, 
  Tag, ArrowLeft, Store, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useToast } from '@/components/ui/use-toast'

export default function MarketplacePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const fetchItems = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // Get location first
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      })
      
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setLocation(loc)

      const response = await marketplaceApi.getNearbyItems({
        lat: loc.lat,
        lng: loc.lng,
        radius_m: 5000
      })
      
      setItems(response.items || [])
    } catch (err) {
      console.error('Failed to fetch marketplace items:', err)
      toast({
        title: 'Location Error',
        description: 'Could not get your location to find nearby items.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppHeader title="Marketplace" />
        
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <ShoppingBag className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-3xl font-black italic tracking-tighter text-gray-900 dark:text-white uppercase">
                Nearby Marketplace
              </h1>
            </div>
            <button type="button" 
              onClick={() => fetchItems(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 dark:border-zinc-800 rounded-full font-bold hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-zinc-800 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 dark:bg-zinc-900 rounded-3xl h-64 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 dark:bg-zinc-900 rounded-[3rem] border border-gray-100 dark:border-zinc-800">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No items found nearby</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8">
                Local merchants haven&apos;t listed any items in your immediate area yet.
              </p>
              <Link 
                href="/commerce"
                className="text-amber-600 font-bold hover:underline"
              >
                Become a merchant and be the first →
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Link 
                  key={item.id} 
                  href={`/marketplace/${item.merchant_profile_id}`}
                  className="bg-white dark:bg-gray-800 dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition group border border-gray-100 dark:border-zinc-800"
                >
                  <div className="relative h-48 bg-gray-100 dark:bg-gray-800 dark:bg-zinc-800">
                    {item.image_url ? (
                      <Image 
                        src={item.image_url} 
                        alt={item.name} 
                        fill 
                        className="object-cover group-hover:scale-105 transition duration-500" 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ShoppingBag className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white font-black text-sm border border-white/10">
                      {item.price_tokens} FWB
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-widest">
                        <Store className="w-3.5 h-3.5" />
                        Visit Store
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transition" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <section className="mt-16 p-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-amber-500/20">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShoppingBag className="w-64 h-64" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-4xl font-black mb-4 uppercase italic tracking-tighter">Physical Items, Digital Tokens</h2>
              <p className="text-amber-50 font-medium mb-8 text-lg leading-relaxed">
                The fwber marketplace lets you spend tokens on real items at local venues. 
                Buy a drink, a ticket, or a gift, and redeem it instantly with a code.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/economy"
                  className="px-8 py-4 bg-white dark:bg-gray-800 text-orange-600 font-black rounded-2xl hover:scale-105 transition active:scale-95 shadow-xl"
                >
                  Get Tokens
                </Link>
                <Link
                  href="/commerce"
                  className="px-8 py-4 bg-black/20 backdrop-blur-md border border-white/20 text-white font-black rounded-2xl hover:bg-black/30 transition"
                >
                  Sell Items
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}
