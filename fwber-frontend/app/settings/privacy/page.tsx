'use client'

import AppHeader from '@/components/AppHeader'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useJournalPrivacySettings, useUpdateJournalPrivacySettings } from '@/lib/hooks/use-journals'
import type { JournalVisibility } from '@/lib/api/journals'
import { useToast } from '@/lib/hooks/use-toast'
import { BookHeart, Lock, Shield, Users, Globe } from 'lucide-react'
import { useEffect, useState } from 'react'

const options: Array<{
  value: JournalVisibility
  label: string
  description: string
  icon: typeof Globe
}> = [
  { value: 'public', label: 'Public', description: 'Shown on your public profile to anyone who can open it.', icon: Globe },
  { value: 'friends', label: 'Friends', description: 'Reserved for accepted friends and trusted connections.', icon: Users },
  { value: 'circle', label: 'Circle', description: 'Shared with members of a selected group that acts as your circle.', icon: Shield },
  { value: 'private', label: 'Private', description: 'Only you can read these by default.', icon: Lock },
]

export default function JournalPrivacyPage() {
  const { data, isLoading } = useJournalPrivacySettings()
  const updateSettings = useUpdateJournalPrivacySettings()
  const { success, error, ToastContainer } = useToast()
  const [defaultVisibility, setDefaultVisibility] = useState<JournalVisibility>('friends')
  const [circleGroupId, setCircleGroupId] = useState('')

  useEffect(() => {
    if (!data) {
      return
    }

    setDefaultVisibility(data.default_visibility)
    setCircleGroupId(data.circle_group_id ? String(data.circle_group_id) : '')
  }, [data])

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        default_visibility: defaultVisibility,
        circle_group_id: defaultVisibility === 'circle' && circleGroupId ? Number(circleGroupId) : null,
      })

      success('Journal privacy defaults updated.')
    } catch (err: any) {
      error(err?.message || 'Failed to update journal privacy defaults.')
    }
  }

  return (
    <ProtectedRoute>
      <AppHeader title="Journal Privacy" />
      <ToastContainer />
      <main className="min-h-screen bg-muted dark:bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border dark:border-border bg-card dark:bg-card p-6 shadow-sm">
          <div className="mb-8 flex items-start gap-4">
            <div className="rounded-2xl bg-purple-100 p-3 text-purple-600">
              <BookHeart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Journal privacy defaults</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose the default audience for new field notes. You can still override the visibility on each note.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading privacy defaults...</div>
          ) : (
            <>
              <div className="space-y-4">
                {options.map((option) => {
                  const Icon = option.icon
                  const active = defaultVisibility === option.value

                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-4 rounded-2xl border px-4 py-4 transition ${
                        active ? 'border-purple-400 bg-purple-50' : 'border-border bg-card hover:border-border'
                      }`}
                    >
                      <input
                        type="radio"
                        name="journal-privacy"
                        value={option.value}
                        checked={active}
                        onChange={() => setDefaultVisibility(option.value)}
                        className="mt-1"
                      />
                      <div className={`rounded-xl p-2 ${active ? 'bg-card dark:bg-card text-purple-600' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground dark:text-foreground">{option.label}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </label>
                  )
                })}
              </div>

              {defaultVisibility === 'circle' && (
                <div className="mt-6">
                  <label className="mb-2 block text-sm font-medium text-foreground dark:text-muted-foreground">Default circle group</label>
                  <select
                    value={circleGroupId}
                    onChange={(event) => setCircleGroupId(event.target.value)}
                    className="w-full rounded-2xl border border-border dark:border-border px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="">Select one of your groups</option>
                    {data?.available_groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateSettings.isPending}
                  className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateSettings.isPending ? 'Saving...' : 'Save privacy defaults'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}
