'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import GiftShopModal from '@/components/gifts/GiftShopModal'
import { useReceivedGifts } from '@/lib/hooks/use-gifts'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { Gift, Inbox, Send, Sparkles, Info, History, Users } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RecipientOption {
  id: number
  name: string
  relationship: 'match' | 'friend'
}

export default function GiftsPage() {
  const { token } = useAuth()
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [receiverId, setReceiverId] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [historyTab, setHistoryTab] = useState<'received' | 'sent'>('received')
  const [recipients, setRecipients] = useState<RecipientOption[]>([])
  const [sentGifts, setSentGifts] = useState<any[]>([])
  const [sentLoading, setSentLoading] = useState(false)
  const { data: receivedGifts, isLoading } = useReceivedGifts()

  useEffect(() => {
    if (!token) return
    let cancelled = false

    Promise.all([
      api.get<any>('/matches/established').catch(() => ({ data: [] })),
      api.get<any>('/gifts/sent').catch(() => []),
    ]).then(([matchesRes, sentRes]) => {
      if (cancelled) return
      const established = Array.isArray(matchesRes)
        ? matchesRes
        : Array.isArray(matchesRes?.data)
          ? matchesRes.data
          : []
      const mapped: RecipientOption[] = established
        .filter((item: any) => item?.other_user?.id)
        .map((item: any) => ({
          id: Number(item.other_user.id),
          name:
            item.other_user?.profile?.display_name ||
            item.other_user?.name ||
            `User #${item.other_user.id}`,
          relationship: item.relationship_type === 'friend' ? 'friend' : 'match',
        }))
      setRecipients(mapped)
      setSentGifts(Array.isArray(sentRes) ? sentRes : Array.isArray(sentRes?.data) ? sentRes.data : [])
      setSentLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [token, isShopOpen])

  const parsedReceiverId = useMemo(() => Number(receiverId), [receiverId])
  const canOpenShop =
    Number.isFinite(parsedReceiverId) &&
    parsedReceiverId > 0 &&
    receiverName.trim().length > 0

  const receivedList = Array.isArray(receivedGifts) ? receivedGifts : []

  return (
    <ProtectedRoute>
      <TooltipProvider delayDuration={200}>
        <div className="min-h-screen bg-muted dark:bg-background">
          <AppHeader title="Gifts Hub" />
          <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            {/* Consolidated Send + Quick-Pick Section */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-foreground">Virtual Gifts Hub</h1>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="About Virtual Gifts"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Send token-backed virtual gifts (roses, drinks, rockets, diamonds) to any match or friend, and review your full received &amp; sent gift ledger in one place.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pick a match or friend below—or enter a recipient ID—to open the Gift Shop catalog with a custom note.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <Link
                    href="/wallet"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Token Wallet
                  </Link>
                  <Link
                    href="/gifts/history"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <History className="h-3.5 w-3.5" />
                    Full Ledger View
                  </Link>
                </div>
              </div>

              {recipients.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Quick-Select Match or Friend
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recipients.slice(0, 12).map((r) => {
                      const active = Number(receiverId) === r.id
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setReceiverId(String(r.id))
                            setReceiverName(r.name)
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            active
                              ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-300'
                              : 'border-border bg-background text-foreground hover:bg-muted'
                          }`}
                        >
                          <span>{r.name}</span>
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                            {r.relationship}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <input
                  value={receiverId}
                  onChange={(event) => setReceiverId(event.target.value)}
                  placeholder="Recipient user ID"
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                />
                <input
                  value={receiverName}
                  onChange={(event) => setReceiverName(event.target.value)}
                  placeholder="Recipient display name"
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex w-full">
                      <button
                        type="button"
                        onClick={() => setIsShopOpen(true)}
                        disabled={!canOpenShop}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send className="h-4 w-4" />
                        Browse &amp; Send Gift
                      </button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {canOpenShop
                      ? `Open the Gift Shop for ${receiverName.trim()}`
                      : 'Select a connection above or fill in recipient ID & name first'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </section>

            {/* Consolidated Received / Sent History Tabs */}
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryTab('received')}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                      historyTab === 'received'
                        ? 'bg-pink-600 text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Inbox className="h-4 w-4" />
                    Received ({receivedList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('sent')}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                      historyTab === 'sent'
                        ? 'bg-pink-600 text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    Sent ({sentGifts.length})
                  </button>
                </div>
              </div>

              {historyTab === 'received' ? (
                isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading received gifts…</p>
                ) : receivedList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No gifts received yet.</p>
                ) : (
                  <div className="space-y-3">
                    {receivedList.map((gift: any) => {
                      const giftTitle = gift?.gift?.name || gift?.gift_name || 'Virtual Gift'
                      const giftEmoji = gift?.gift_emoji || null
                      const senderName = gift?.sender?.name || gift?.from_name || 'Someone'
                      return (
                        <div key={gift.id} className="rounded-xl border border-border p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-lg text-pink-600 dark:bg-pink-900/30 dark:text-pink-300">
                              {giftEmoji ? <span>{giftEmoji}</span> : <Gift className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-foreground">{giftTitle}</div>
                              <div className="text-sm text-muted-foreground">
                                From {senderName} · {gift.cost_at_time ?? 0} tokens
                              </div>
                              {gift.message ? (
                                <div className="mt-1 text-sm text-muted-foreground">
                                  &ldquo;{gift.message}&rdquo;
                                </div>
                              ) : null}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {gift.created_at ? new Date(gift.created_at).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : sentLoading ? (
                <p className="text-sm text-muted-foreground">Loading sent gifts…</p>
              ) : sentGifts.length === 0 ? (
                <p className="text-sm text-muted-foreground">You haven&apos;t sent any gifts yet.</p>
              ) : (
                <div className="space-y-3">
                  {sentGifts.map((gift: any) => {
                    const giftTitle = gift?.gift?.name || gift?.gift_name || 'Virtual Gift'
                    const giftEmoji = gift?.gift_emoji || null
                    const recipientLabel = gift?.receiver?.name || gift?.to_name || gift?.to || 'Connection'
                    return (
                      <div key={gift.id} className="rounded-xl border border-border p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-lg text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                            {giftEmoji ? <span>{giftEmoji}</span> : <Send className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-foreground">{giftTitle}</div>
                            <div className="text-sm text-muted-foreground">
                              Sent to {recipientLabel} · {gift.cost_at_time ?? 0} tokens
                            </div>
                            {gift.message ? (
                              <div className="mt-1 text-sm text-muted-foreground">
                                &ldquo;{gift.message}&rdquo;
                              </div>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {gift.created_at ? new Date(gift.created_at).toLocaleDateString() : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
      </TooltipProvider>
    </ProtectedRoute>
  )
}
