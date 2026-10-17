'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { marketplaceApi, InventoryItem } from '@/lib/api/marketplace'
import { useAuth } from '@/lib/auth-context'
import { 
  ShoppingBag, Plus, RefreshCw, 
  Trash2, Package, Tag, ArrowLeft,
  AlertCircle, CheckCircle2, Store
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'

export default function MerchantInventoryPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  
  // New Item Form
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price_tokens: 10,
    stock_count: 100
  })

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const response = await marketplaceApi.getOwnedInventory()
      setItems(response.items || [])
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      await marketplaceApi.createItem(newItem)
      toast({ title: 'Item Created', description: `${newItem.name} is now live in the marketplace.` })
      setNewItem({ name: '', description: '', price_tokens: 10, stock_count: 100 })
      fetchInventory()
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create item.', variant: 'destructive' })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppHeader title="Inventory" />
        
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link 
                href="/commerce" 
                className="p-2 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <h1 className="text-3xl font-black italic tracking-tighter text-gray-900 dark:text-white uppercase">
                Inventory Management
              </h1>
            </div>
            <button type="button" 
              onClick={fetchInventory}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Sidebar: Add Item */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 sticky top-24">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-500" />
                  List New Item
                </h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Item Name</label>
                    <input 
                      required
                      value={newItem.name}
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                      placeholder="e.g. Craft Beer"
                      className="w-full bg-gray-50 dark:bg-gray-900 dark:bg-black border border-gray-200 dark:border-gray-700 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-amber-500 transition outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Description</label>
                    <textarea 
                      required
                      value={newItem.description}
                      onChange={e => setNewItem({...newItem, description: e.target.value})}
                      placeholder="One pint of local IPA..."
                      className="w-full bg-gray-50 dark:bg-gray-900 dark:bg-black border border-gray-200 dark:border-gray-700 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-amber-500 transition outline-none min-h-[100px] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Price (FWB)</label>
                      <input 
                        type="number"
                        required
                        value={newItem.price_tokens}
                        onChange={e => setNewItem({...newItem, price_tokens: parseInt(e.target.value)})}
                        className="w-full bg-gray-50 dark:bg-gray-900 dark:bg-black border border-gray-200 dark:border-gray-700 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-amber-500 transition outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Stock</label>
                      <input 
                        type="number"
                        required
                        value={newItem.stock_count}
                        onChange={e => setNewItem({...newItem, stock_count: parseInt(e.target.value)})}
                        className="w-full bg-gray-50 dark:bg-gray-900 dark:bg-black border border-gray-200 dark:border-gray-700 dark:border-zinc-800 rounded-xl p-3 text-sm focus:border-amber-500 transition outline-none"
                      />
                    </div>
                  </div>
                  <button 
                    disabled={isAdding}
                    type="submit"
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase italic rounded-2xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {isAdding ? 'Adding...' : 'List Item'}
                  </button>
                </form>
              </div>
            </div>

            {/* Main: List Items */}
            <div className="lg:col-span-2">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-white dark:bg-gray-800 dark:bg-zinc-900 rounded-3xl animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 dark:bg-zinc-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-700 dark:border-zinc-800">
                  <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-400">No items listed yet</h3>
                  <p className="text-gray-500 text-sm mt-2">Start by adding your first redeemable item.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map(item => (
                    <div 
                      key={item.id}
                      className="bg-white dark:bg-gray-800 dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{item.name}</h3>
                          <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{item.price_tokens} FWB</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.stock_count} IN STOCK</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 text-gray-400 hover:text-red-500 transition">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/20">
                <div className="flex gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-100">Redemption Flow</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">
                      When a user purchases an item, they receive a unique 6-character code. 
                      Use the <strong>Merchant POS</strong> on your dashboard to verify and redeem these codes instantly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
