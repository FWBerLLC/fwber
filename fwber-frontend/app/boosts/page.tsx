'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import BoostPurchaseModal from '@/components/BoostPurchaseModal'
import { useActiveBoost, useBoostHistory } from '@/lib/hooks/use-boosts'
import { Rocket, Zap, Clock, History } from 'lucide-react'

export default function BoostsPage() {
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)
  const { data: activeBoost } = useActiveBoost()
  const { data: boostHistory, isLoading } = useBoostHistory()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppHeader title="Boosts" />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Boosts</h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Recovered the dedicated boost surface so token and card-based profile boosts are reachable outside buried modals.
                </p>
              </div>
              <button type="button"
                onClick={() => setIsPurchaseOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700"
              >
                <Rocket className="h-4 w-4" />
                Buy a Boost
              </button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2 text-purple-600 dark:text-purple-300">
                <Zap className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Boost</h2>
              </div>
              {activeBoost ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-900/20">
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-purple-600 dark:text-purple-300">
                      {activeBoost.boost_type ?? 'standard'} boost
                    </div>
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      Status: <span className="font-medium">{activeBoost.status ?? 'active'}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      Expires: <span className="font-medium">{new Date(activeBoost.expires_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    While active, your profile is prioritized more aggressively in discovery surfaces.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No active boost right now.</p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-300">
                <Clock className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Why boosts matter</h2>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <li>• Raise your visibility in nearby discovery and match feeds.</li>
                <li>• Use token balance when you want a fast in-app spend path.</li>
                <li>• Use card checkout when you want to preserve your token balance for gifts or unlocks.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-300 dark:text-gray-200">
              <History className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Boost History</h2>
            </div>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading boost history…</p>
            ) : !boostHistory || !Array.isArray(boostHistory) || boostHistory.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No boosts purchased yet.</p>
            ) : (
              <div className="space-y-3">
                {boostHistory.map((boost: any) => (
                  <div key={boost.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 dark:border-gray-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-gray-900 dark:text-white">{boost.boost_type} boost</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-gray-500">{boost.status}</div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Started: {new Date(boost.started_at).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Expires: {new Date(boost.expires_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
        <BoostPurchaseModal isOpen={isPurchaseOpen} onClose={() => setIsPurchaseOpen(false)} />
      </div>
    </ProtectedRoute>
  )
}
