'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { VideoCallModal } from '@/components/VideoCall/VideoCallModal'
import { CallHistory } from '@/components/VideoCall/CallHistory'
import { Phone, Video } from 'lucide-react'

export default function VideoPage() {
  const [recipientId, setRecipientId] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const canStart = recipientId.trim().length > 0

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppHeader title="Video Chat" />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Video Calls</h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  A dedicated video-call surface so call history and call initiation are reachable without depending only on inline chat triggers.
                </p>
              </div>
              <div className="flex w-full max-w-md gap-3">
                <input
                  value={recipientId}
                  onChange={(event) => setRecipientId(event.target.value)}
                  placeholder="Recipient user ID"
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
                <button type="button"
                  onClick={() => setIsOpen(true)}
                  disabled={!canStart}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Video className="h-4 w-4" />
                  Start
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-300 dark:text-gray-200">
              <Phone className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Call History</h2>
            </div>
            <CallHistory />
          </section>
        </main>

        {canStart ? (
          <VideoCallModal recipientId={recipientId.trim()} isOpen={isOpen} onClose={() => setIsOpen(false)} />
        ) : null}
      </div>
    </ProtectedRoute>
  )
}
