'use client'

import { useAuth } from '@/lib/auth-context'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

interface Vouch {
  id: number
  type: string
  comment: string
  created_at: string
  vouch_from?: { id: number; name: string; display_name?: string; avatar_url?: string }
  vouch_to?: { id: number; name: string; display_name?: string; avatar_url?: string }
}

export default function VouchPage() {
  const { token, isAuthenticated } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['vouch'],
    enabled: isAuthenticated && !!token,
    queryFn: async () => {
      const res: any = await api.get('/vouch')
      return res
    },
  })

  const given: Vouch[] = data?.given || []
  const received: Vouch[] = data?.received || []

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Vouches" />
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Vouches</h1>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  Community endorsements that boost trust scores
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-muted dark:bg-card rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                {/* Received Vouches */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-3">
                    Received ({received.length})
                  </h2>
                  {received.length === 0 ? (
                    <p className="text-muted-foreground dark:text-muted-foreground text-sm py-4">
                      No vouches received yet. Keep being awesome!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {received.map((v: Vouch) => (
                        <div
                          key={v.id}
                          className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-4"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              v.type === 'safe'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : v.type === 'fun'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {v.type}
                            </span>
                            <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                              {new Date(v.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-foreground dark:text-muted-foreground text-sm">{v.comment}</p>
                          {v.vouch_from && (
                            <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">
                              from {v.vouch_from.display_name || v.vouch_from.name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Given Vouches */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-3">
                    Given ({given.length})
                  </h2>
                  {given.length === 0 ? (
                    <p className="text-muted-foreground dark:text-muted-foreground text-sm py-4">
                      You haven&apos;t vouched for anyone yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {given.map((v: Vouch) => (
                        <div
                          key={v.id}
                          className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-4"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              v.type === 'safe'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : v.type === 'fun'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {v.type}
                            </span>
                            <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                              {new Date(v.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-foreground dark:text-muted-foreground text-sm">{v.comment}</p>
                          {v.vouch_to && (
                            <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">
                              for {v.vouch_to.display_name || v.vouch_to.name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}
