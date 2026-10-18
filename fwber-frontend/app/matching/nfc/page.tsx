'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { NFCProfileExchange } from '@/components/matches/NFCProfileExchange'
import { Smartphone } from 'lucide-react'

export default function NFCPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="NFC Flash Match" />
        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-4">
              <Smartphone className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-foreground dark:text-foreground uppercase italic tracking-tighter">NFC Flash Match</h1>
            <p className="text-muted-foreground dark:text-muted-foreground mt-2 max-w-lg mx-auto">
              Verify real-world meetups and exchange profiles instantly. Tap your phones together to prove presence and confirm the vibe.
            </p>
          </section>

          <NFCProfileExchange />
          
          <div className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:border-gray-800 dark:bg-background">
            <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-3">How it works</h2>
            <ul className="space-y-3 text-sm text-muted-foreground dark:text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-bold text-amber-500">1.</span>
                <span>Both users open this page while standing next to each other.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-500">2.</span>
                <span>Tap "Start Exchange" to begin broadcasting your profile signal.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-500">3.</span>
                <span>Touch the back of your phones together. The NFC chip will detect the peer and initiate a ZK-Proximity handshake.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-500">4.</span>
                <span>Once verified, both users receive a permanent "Flash Match" badge and immediate profile access.</span>
              </li>
            </ul>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
