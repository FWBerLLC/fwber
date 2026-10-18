'use client'

import { useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import GiftShopModal from '@/components/gifts/GiftShopModal'
import { useReceivedGifts } from '@/lib/hooks/use-gifts'
import { Gift, Inbox, Send } from 'lucide-react'

export default function GiftsPage() {
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [receiverId, setReceiverId] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const { data: receivedGifts, isLoading } = useReceivedGifts()

  const parsedReceiverId = useMemo(() => Number(receiverId), [receiverId])
  const canOpenShop = Number.isFinite(parsedReceiverId) && parsedReceiverId > 0 && receiverName.trim().length > 0

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Gifts" />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Gift Shop</h1>
                <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                  A dedicated gifts surface so token-based gifts are reachable outside chat/profile-only entry points.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={receiverId}
                  onChange={(event) => setReceiverId(event.target.value)}
                  placeholder="Recipient user ID"
                  className="rounded-xl border border-border px-4 py-3 text-sm dark:border-border dark:bg-background dark:text-foreground"
                />
                <input
                  value={receiverName}
                  onChange={(event) => setReceiverName(event.target.value)}
                  placeholder="Recipient name"
                  className="rounded-xl border border-border px-4 py-3 text-sm dark:border-border dark:bg-background dark:text-foreground"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button"
                onClick={() => setIsShopOpen(true)}
                disabled={!canOpenShop}
                className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Send a Gift
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border dark:border-border bg-card p-6 shadow-sm dark:dark:border-border dark:bg-background">
            <div className="mb-4 flex items-center gap-2 text-foreground dark:text-muted-foreground dark:text-foreground">
              <Inbox className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Received Gifts</h2>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading gifts…</p>
            ) : !receivedGifts || receivedGifts.length === 0 ? (
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">No gifts received yet.</p>
            ) : (
              <div className="space-y-3">
                {receivedGifts.map((gift) => (
                  <div key={gift.id} className="rounded-xl border border-border dark:border-border p-4 dark:dark:border-border">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-pink-100 p-2 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground dark:text-foreground">{gift.gift.name}</div>
                        <div className="text-sm text-muted-foreground dark:text-muted-foreground">From {gift.sender?.name ?? 'Someone'} · {gift.cost_at_time} tokens</div>
                        {gift.message ? <div className="mt-1 text-sm text-muted-foreground">“{gift.message}”</div> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(gift.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        {canOpenShop ? (
          <GiftShopModal
            isOpen={isShopOpen}
            onClose={() => setIsShopOpen(false)}
            receiverId={parsedReceiverId}
            receiverName={receiverName.trim()}
          />
        ) : null}
      </div>
    </ProtectedRoute>
  )
}
