'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TopicCard } from '@/components/TopicCard';
import { useTopics } from '@/lib/hooks/use-topics';
import { Compass, Search } from 'lucide-react';

export default function TopicsPage() {
  const [search, setSearch] = useState('');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [followedOnly, setFollowedOnly] = useState(false);
  const { data: topics = [], isLoading } = useTopics({
    search: search.trim() || undefined,
    featured: featuredOnly || undefined,
    followed: followedOnly || undefined,
  });

  const categories = useMemo(
    () => Array.from(new Set((Array.isArray(topics) ? topics : []).map((topic) => topic.category).filter(Boolean))).sort(),
    [topics]
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Topic Hubs" />
        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <section className="rounded-3xl border border-border dark:border-border bg-card dark:bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-2xl bg-purple-100 p-3 text-purple-700">
                      <Compass className="h-6 w-6" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Structured topic hubs</h1>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Browse the scenes forming across interests, Local Pulse posts, public groups, and visible field notes.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-4">
                    {categories.map((category) => (
                      <span key={category} className="rounded-full bg-muted dark:bg-card px-3 py-1 font-medium uppercase tracking-wide">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="w-full max-w-xl space-y-3">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search music, wellness, nightlife..."
                      className="w-full rounded-2xl border border-border dark:border-border bg-card dark:bg-card py-3 pl-11 pr-4 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFeaturedOnly((value) => !value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        featuredOnly ? 'bg-purple-600 text-white' : 'bg-muted text-foreground'
                      }`}
                    >
                      Featured
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowedOnly((value) => !value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        followedOnly ? 'dark:bg-background text-white' : 'bg-muted text-foreground'
                      }`}
                    >
                      Following
                    </button>
                    <Link
                      href="/local-pulse"
                      className="rounded-full bg-pink-100 px-4 py-2 text-sm font-semibold text-pink-700 transition hover:bg-pink-200"
                    >
                      Open Local Pulse
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {isLoading ? (
              <div className="rounded-3xl border border-dashed border-border dark:border-border bg-card dark:bg-card px-6 py-16 text-center text-sm text-muted-foreground">
                Loading topic hubs...
              </div>
            ) : topics.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border dark:border-border bg-card dark:bg-card px-6 py-16 text-center">
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground">No topics matched that filter.</h2>
                <p className="mt-1 text-sm text-muted-foreground">Try a broader scene name or clear one of the pills above.</p>
              </div>
            ) : (
              <section className="grid gap-6 xl:grid-cols-2">
                {topics.map((topic) => (
                  <TopicCard key={topic.slug} topic={topic} />
                ))}
              </section>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
