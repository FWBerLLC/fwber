'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import LocalPulse from '@/components/LocalPulse'
import ProtectedRoute from '@/components/ProtectedRoute'
import { GroupCard } from '@/components/GroupCard'
import { TopicCard } from '@/components/TopicCard'
import { useTopic } from '@/lib/hooks/use-topics'
import { BookHeart, Compass, Radio, Users } from 'lucide-react'

export default function TopicDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = typeof params?.slug === 'string' ? params.slug : ''
  const { data, isLoading } = useTopic(slug)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Topic Hub" />
        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {isLoading || !data ? (
              <div className="rounded-3xl border border-dashed border-border dark:border-border bg-card dark:bg-card px-6 py-16 text-center text-sm text-muted-foreground">
                Loading topic hub...
              </div>
            ) : (
              <>
                <TopicCard topic={data.topic} />

                <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="space-y-8">
                    <section className="rounded-3xl border border-border dark:border-border bg-card dark:bg-card p-6 shadow-sm">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold text-foreground dark:text-foreground">Groups in this scene</h2>
                            <p className="text-sm text-muted-foreground">Public circles already aligned with {data.topic.label.toLowerCase()}.</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-muted dark:bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {data.groups.length} groups
                        </span>
                      </div>

                      {data.groups.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border dark:border-border bg-muted dark:bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                          No public groups have been tagged into this scene yet.
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          {data.groups.map((group) => (
                            <GroupCard key={group.id} group={group} />
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-3xl border border-border dark:border-border bg-card dark:bg-card p-6 shadow-sm">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-pink-100 p-3 text-pink-700">
                            <BookHeart className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold text-foreground dark:text-foreground">Visible field notes</h2>
                            <p className="text-sm text-muted-foreground">Journals are filtered through the existing visibility graph.</p>
                          </div>
                        </div>
                        <Link href="/journal" className="text-sm font-semibold text-purple-700 hover:text-purple-800">
                          Write a note
                        </Link>
                      </div>

                      {data.journals.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border dark:border-border bg-muted dark:bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                          No visible field notes are tagged into this topic yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {data.journals.map((journal) => (
                            <article
                              key={journal.id}
                              className="rounded-2xl border border-border dark:border-border bg-card dark:bg-card p-5 shadow-sm"
                              style={{ borderLeftColor: journal.accent_color ?? '#a855f7', borderLeftWidth: '6px' }}
                            >
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full bg-muted dark:bg-card px-2.5 py-1 font-semibold uppercase tracking-wide">
                                  {journal.visibility_label}
                                </span>
                                {(journal.tags ?? []).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-purple-50 px-2.5 py-1 font-medium text-purple-700"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                              <h3 className="mt-3 text-lg font-semibold text-foreground dark:text-foreground">
                                {journal.title || 'Untitled field note'}
                              </h3>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                                {journal.content}
                              </p>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  <div className="space-y-8">
                    <section className="rounded-3xl border border-border dark:border-border bg-card dark:bg-card p-6 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-purple-100 p-3 text-purple-700">
                          <Compass className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-foreground dark:text-foreground">Scene cues</h2>
                          <p className="text-sm text-muted-foreground">Use this hub to branch into nearby discovery.</p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3">
                        <Link
                          href={`/local-pulse?topic=${data.topic.slug}`}
                          className="rounded-2xl bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
                        >
                          Open Local Pulse for {data.topic.label}
                        </Link>
                        <Link
                          href="/matches"
                          className="rounded-2xl bg-muted dark:bg-card px-4 py-3 text-sm font-semibold text-foreground dark:text-muted-foreground transition hover:bg-muted"
                        >
                          Browse matches with shared interests
                        </Link>
                      </div>
                    </section>

                    <section className="rounded-3xl border border-border dark:border-border bg-card dark:bg-card p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                          <Radio className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-foreground dark:text-foreground">Topic Pulse</h2>
                          <p className="text-sm text-muted-foreground">Hyperlocal posts filtered to this scene.</p>
                        </div>
                      </div>
                      <LocalPulse initialTopicSlug={data.topic.slug} compact />
                    </section>
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
