'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Loader2, Radio, Send } from 'lucide-react'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { sanitizeHtml } from '@/lib/utils/sanitize'
import {
  getFederationOutbox,
  type FederationOutboxActivity,
} from '@/lib/api/activitypub'

export default function FederationOutboxPage() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<FederationOutboxActivity[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        const response = await getFederationOutbox(user.id, { limit: 20 })

        if (cancelled) {
          return
        }

        setActivities(response.orderedItems)
        setTotalItems(response.totalItems ?? response.orderedItems.length)
      } catch (error) {
        console.error('Failed to load federation outbox:', error)

        if (!cancelled) {
          setActivities([])
          setTotalItems(0)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader />
        <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground dark:text-foreground">
                  <Send className="h-8 w-8 text-blue-500" />
                  Federation Outbox
                </h1>
                <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
                  Review the public ActivityPub activities fwber exposes for your federated identity.
                </p>
              </div>
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                Public OrderedCollection
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Link href="/settings/federation/activity">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Activity Center
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                <Link href="/settings/federation/feed">
                  <Radio className="mr-2 h-4 w-4" />
                  Global Feed
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Published Activities</CardDescription>
                <CardTitle>{totalItems}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Public `Create` activities currently present in your ActivityPub outbox.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Current Shape</CardDescription>
                <CardTitle>Board posts</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                fwber currently publishes public bulletin-style board posts into the federated outbox.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Audience</CardDescription>
                <CardTitle>Public</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Outbox entries are marked for the public ActivityStreams audience.
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : activities.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <CardTitle className="text-xl">No outbox entries yet</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Public board posts will appear here once they are eligible for federation.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <Card key={activity.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg text-foreground dark:text-foreground">
                          {activity.type} activity
                        </CardTitle>
                        <CardDescription className="mt-1 break-all">
                          {activity.id}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{activity.object.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className="prose max-w-none text-sm text-foreground dark:text-muted-foreground dark:prose-invert dark:text-foreground"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(activity.object.content) }}
                    />
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Actor: {activity.actor}</span>
                      {activity.published ? (
                        <span>
                          Published {formatDistanceToNow(new Date(activity.published), { addSuffix: true })}
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
