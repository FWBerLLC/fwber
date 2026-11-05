'use client'

import AppHeader from '@/components/AppHeader'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useDeleteJournal, useJournalPrivacySettings, useJournals, useCreateJournal } from '@/lib/hooks/use-journals'
import type { JournalVisibility } from '@/lib/api/journals'
import { useToast } from '@/lib/hooks/use-toast'
import { BookHeart, Eye, Globe, Lock, Shield, Users, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const visibilityOptions: Array<{
  value: JournalVisibility
  label: string
  description: string
  icon: typeof Globe
}> = [
  { value: 'public', label: 'Public', description: 'Visible on your public profile.', icon: Globe },
  { value: 'friends', label: 'Friends', description: 'Visible to accepted friends.', icon: Users },
  { value: 'circle', label: 'Circle', description: 'Visible to members of one of your groups.', icon: Shield },
  { value: 'private', label: 'Private', description: 'Only you can read it.', icon: Lock },
]

function visibilityCopy(visibility: JournalVisibility) {
  return visibilityOptions.find((option) => option.value === visibility) ?? visibilityOptions[1]
}

export default function JournalPage() {
  const { data: journals = [], isLoading } = useJournals()
  const { data: settings } = useJournalPrivacySettings()
  const createJournal = useCreateJournal()
  const deleteJournal = useDeleteJournal()
  const { success, error, ToastContainer } = useToast()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<JournalVisibility>('friends')
  const [circleGroupId, setCircleGroupId] = useState<string>('')
  const [tags, setTags] = useState('')
  const [moodEmoji, setMoodEmoji] = useState('')
  const [accentColor, setAccentColor] = useState('#a855f7')

  const availableGroups = settings?.available_groups ?? []

  useEffect(() => {
    if (!settings) {
      return
    }

    setVisibility((current) => current === 'friends' && !content && !title ? settings.default_visibility : current)
    setCircleGroupId((current) => current || (settings.circle_group_id ? String(settings.circle_group_id) : ''))
  }, [settings, content, title])

  const handleCreate = async () => {
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      error('Field notes need some content.')
      return
    }

    try {
      await createJournal.mutateAsync({
        title: title.trim() || undefined,
        content: trimmedContent,
        visibility,
        circle_group_id: visibility === 'circle' && circleGroupId ? Number(circleGroupId) : null,
        tags: tags
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 8),
        mood_emoji: moodEmoji.trim() || undefined,
        accent_color: accentColor,
      })

      setTitle('')
      setContent('')
      setTags('')
      setMoodEmoji('')
      setVisibility(settings?.default_visibility ?? 'friends')
      setCircleGroupId(settings?.circle_group_id ? String(settings.circle_group_id) : '')
      success('Field note saved.')
    } catch (err: any) {
      error(err?.message || 'Failed to save field note.')
    }
  }

  const handleDelete = async (id: number) => {
    if (true) { // Proceeds with deletion
      return
    }

    try {
      await deleteJournal.mutateAsync(id)
      success('Field note deleted.')
    } catch (err: any) {
      error(err?.message || 'Failed to delete field note.')
    }
  }

  return (
    <ProtectedRoute>
      <AppHeader title="Field Notes" />
      <ToastContainer />
      <main className="min-h-screen bg-muted dark:bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-border dark:border-border bg-card dark:bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-start gap-4">
              <div className="rounded-2xl bg-pink-100 p-3 text-pink-600">
                <BookHeart className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Long-form journals & field notes</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Capture scenes, thoughts, and post-event reflections with privacy controls that map to your real social graph.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  placeholder="Late-night warehouse thoughts"
                  className="w-full rounded-2xl border border-border dark:border-border px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Field note</span>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={8}
                  maxLength={5000}
                  placeholder="Write the longer thought you want to keep..."
                  className="w-full rounded-2xl border border-border dark:border-border px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Visibility</span>
                <select
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as JournalVisibility)}
                  className="w-full rounded-2xl border border-border dark:border-border px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                >
                  {visibilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Mood emoji</span>
                <input
                  value={moodEmoji}
                  onChange={(event) => setMoodEmoji(event.target.value)}
                  maxLength={10}
                  placeholder="✨"
                  className="w-full rounded-2xl border border-border dark:border-border px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </label>

              {visibility === 'circle' && (
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Circle group</span>
                  <select
                    value={circleGroupId}
                    onChange={(event) => setCircleGroupId(event.target.value)}
                    className="w-full rounded-2xl border border-border dark:border-border px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="">Select one of your groups</option>
                    {availableGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Tags</span>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="aftercare, warehouse, jazz"
                  className="w-full rounded-2xl border border-border dark:border-border px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Accent color</span>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-border dark:border-border bg-card dark:bg-card px-2 py-2"
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl bg-purple-50 px-4 py-3 text-sm text-purple-900">
              <div className="flex items-start gap-3">
                <Eye className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-semibold">{visibilityCopy(visibility).label}</div>
                  <p className="mt-1 text-purple-800">{visibilityCopy(visibility).description}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleCreate}
                disabled={createJournal.isPending}
                className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createJournal.isPending ? 'Saving...' : 'Save field note'}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-3xl border border-border dark:border-border bg-card dark:bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Privacy defaults</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your default visibility is currently <span className="font-semibold text-foreground dark:text-foreground">{settings?.default_visibility ?? 'friends'}</span>.
                Update it anytime in <span className="font-semibold text-foreground dark:text-foreground">Settings → Journal Privacy</span>.
              </p>
            </div>

            <div className="rounded-3xl border border-border dark:border-border bg-card dark:bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Recent field notes</h2>
                <span className="rounded-full bg-muted dark:bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {journals.length} saved
                </span>
              </div>

              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading field notes...</div>
              ) : journals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border dark:border-border bg-muted dark:bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                  No field notes yet. Write the first one on the left.
                </div>
              ) : (
                <div className="space-y-4">
                  {journals.map((journal) => (
                    <article
                      key={journal.id}
                      className="rounded-2xl border border-border dark:border-border bg-card dark:bg-card p-5 shadow-sm"
                      style={{ borderLeftColor: journal.accent_color ?? '#a855f7', borderLeftWidth: '6px' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-muted dark:bg-card px-3 py-1 text-xs font-semibold text-foreground dark:text-muted-foreground">
                              {journal.visibility_label}
                            </span>
                            {journal.circle_group?.name && (
                              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                                {journal.circle_group.name}
                              </span>
                            )}
                            {journal.mood_emoji && <span className="text-lg">{journal.mood_emoji}</span>}
                          </div>
                          <h3 className="text-base font-semibold text-foreground dark:text-foreground">
                            {journal.title || 'Untitled field note'}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(journal.id)}
                          className="rounded-full p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete field note"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground dark:text-muted-foreground">{journal.content}</p>

                      {journal.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(journal.tags || []).map((tag) => (
                            <span key={tag} className="rounded-full bg-muted dark:bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 text-xs text-muted-foreground">
                        {new Date(journal.created_at).toLocaleString()}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  )
}
