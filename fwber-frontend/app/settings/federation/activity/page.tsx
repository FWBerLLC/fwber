'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { sanitizeHtml } from '@/lib/utils/sanitize'
import {
  ArrowLeft,
  Globe,
  Loader2,
  MessageSquare,
  Radio,
   Send,
  UserPlus,
  Users,
} from 'lucide-react'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api/client'
import {
  buildFederationActorExplorerHref,
  getFederationOutbox,
  formatFederationHandle,
  type FederationOutboxActivity,
  type FederatedPost,
  type FederationConnection,
  type UnifiedActivityItem,
  type UnifiedActivityResponse,
} from '@/lib/api/activitypub'
import { useAuth } from '@/lib/auth-context'

interface FollowersResponse {
  followers?: FederationConnection[]
}

interface FollowingResponse {
  following?: FederationConnection[]
}

interface PostsResponse {
  posts?: FederatedPost[]
}

type ActivityItem =
  | {
      id: string
      kind: 'post' | 'follower' | 'outbox' | 'like' | 'announce' | 'mention'
      title: string
      subtitle: string
      timestamp: string
      content: string
      actorUri: string
    }

export default function FederationActivityPage() {
  const { user } = useAuth()
  const [followers, setFollowers] = useState<FederationConnection[]>([])
  const [following, setFollowing] = useState<FederationConnection[]>([])
  const [posts, setPosts] = useState<FederatedPost[]>([])
  const [outboxActivities, setOutboxActivities] = useState<FederationOutboxActivity[]>([])
  const [unifiedActivity, setUnifiedActivity] = useState<UnifiedActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [followersResponse, followingResponse, postsResponse, outboxResponse, activityResponse] = await Promise.all([
          api.get<FollowersResponse>('/federation/followers'),
          api.get<FollowingResponse>('/federation/following'),
          api.get<PostsResponse>('/federation/posts'),
          user?.id ? getFederationOutbox(user.id, { limit: 12 }) : Promise.resolve({ orderedItems: [], totalItems: 0, id: '', type: 'OrderedCollectionPage' }),
          api.get<UnifiedActivityResponse>('/federation/activity'),
        ])

        if (cancelled) {
          return
        }

        setFollowers(Array.isArray(followersResponse.followers) ? followersResponse.followers : [])
        setFollowing(Array.isArray(followingResponse.following) ? followingResponse.following : [])
        setPosts(Array.isArray(postsResponse.posts) ? postsResponse.posts : [])
        setOutboxActivities(Array.isArray(outboxResponse.orderedItems) ? outboxResponse.orderedItems : [])
        setUnifiedActivity(Array.isArray(activityResponse.activity) ? activityResponse.activity : [])
      } catch (error) {
        console.error('Failed to load federation activity:', error)

        if (!cancelled) {
          setFollowers([])
          setFollowing([])
          setPosts([])
          setOutboxActivities([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const activityItems = useMemo<ActivityItem[]>(() => {
    const merged = (unifiedActivity || []).map((item) => {
      let kind: ActivityItem['kind'] = 'outbox'
      if (item.type === 'Follow') kind = 'follower'
      else if (item.type === 'Create') kind = 'post'
      else if (item.type === 'Like') kind = 'like'
      else if (item.type === 'Announce') kind = 'announce'

      // Check for mention tag in payload/metadata
      if (item.payload?.type === 'mention' || item.type === 'mention') kind = 'mention'

      return {
        id: `unified-${item.id}`,
        kind,
        title: item.type === 'Follow'
            ? `${formatFederationHandle(item.actor_username, item.actor_domain, item.actor_uri)} followed you`
            : (item.type === 'Like' ? `${item.actor_username} liked your post` :
               (item.type === 'Announce' ? `${item.actor_username} boosted your post` :
                (kind === 'mention' ? `${item.actor_username} mentioned you` : `${item.type} activity`))),
        subtitle: formatFederationHandle(item.actor_username, item.actor_domain, item.actor_uri),
        timestamp: item.timestamp,
        content: item.content || `Activity type: ${item.type}`,
        actorUri: item.actor_uri,
      }
    })

    // Keep legacy local outbox items too
    const outboxItems = (outboxActivities || []).map((activity) => ({
      id: `outbox-${activity.id}`,
      kind: 'outbox' as const,
      title: 'You published a federated board post',
      subtitle: activity.object.type,
      timestamp: activity.published || new Date().toISOString(),
      content: activity.object.content,
      actorUri: activity.actor,
    }))

    return [...merged, ...outboxItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
  }, [unifiedActivity, outboxActivities])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader />
        <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
                  <Radio className="w-8 h-8 text-purple-500" />
                  Federation Activity
                </h1>
                <p className="text-muted-foreground dark:text-muted-foreground mt-1">
                  Track federated followers, outbound follows, and recent remote posts in one place.
                </p>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Activity Center
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Link href="/settings/federation">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Federation Settings
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                <Link href="/settings/federation/feed">
                  <Globe className="w-4 h-4 mr-2" />
                  Global Feed
                </Link>
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Followers</CardDescription>
                    <CardTitle>{followers.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Remote profiles that currently follow your federated identity.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Following</CardDescription>
                    <CardTitle>{following.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Outbound ActivityPub follow relationships initiated from fwber.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Remote Posts Cached</CardDescription>
                    <CardTitle>{posts.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Federated posts currently available through the shared global feed.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Outbox Entries</CardDescription>
                    <CardTitle>{outboxActivities.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Public activities currently exposed from your own ActivityPub outbox.
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <MessageSquare className="w-5 h-5 text-purple-500" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>
                      A merged timeline of inbound follows and the latest remote posts cached by fwber.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activityItems.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No federated activity yet. Follow someone from another server to start the stream.
                      </div>
                    ) : (
                      activityItems.map((item) => (
                        <div key={item.id} className="rounded-xl border bg-card dark:bg-card p-4 shadow-sm dark:dark:bg-background/30">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link
                                href={buildFederationActorExplorerHref(item.actorUri)}
                                className="font-semibold text-sm text-foreground dark:text-foreground hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {item.title}
                              </Link>
                              <Link
                                href={buildFederationActorExplorerHref(item.actorUri)}
                                className="mt-1 block text-xs text-muted-foreground dark:text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {item.subtitle}
                              </Link>
                            </div>
                            <Badge
                                variant={item.kind === 'post' ? 'default' : 'outline'}
                                className={`shrink-0 ${
                                    item.kind === 'like' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                    item.kind === 'announce' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                    item.kind === 'mention' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    item.kind === 'follower' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''
                                }`}
                            >
                              {item.kind === 'post' ? 'Post' :
                               item.kind === 'outbox' ? 'Outbox' :
                               item.kind === 'follower' ? 'Follower' :
                               item.kind === 'like' ? 'Like' :
                               item.kind === 'mention' ? 'Mention' : 'Boost'}
                            </Badge>
                          </div>
                          <div
                            className="mt-3 text-sm text-foreground dark:text-muted-foreground dark:text-foreground prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }}
                          />
                          <p className="mt-3 text-xs text-muted-foreground dark:text-muted-foreground">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Send className="w-5 h-5 text-indigo-500" />
                        Outbox
                      </CardTitle>
                      <CardDescription>Your public ActivityPub entries as seen through fwber.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {outboxActivities.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No public outbox entries yet.</p>
                      ) : (
                        outboxActivities.slice(0, 5).map((activity) => (
                          <div key={activity.id} className="rounded-lg border p-3">
                            <p className="text-sm font-medium text-foreground dark:text-foreground">
                              {activity.object.type}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {activity.object.content.replace(/<[^>]+>/g, '')}
                            </p>
                          </div>
                        ))
                      )}
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/settings/federation/outbox">
                          <Send className="mr-2 h-4 w-4" />
                          Open Outbox
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5 text-blue-500" />
                        Followers
                      </CardTitle>
                      <CardDescription>People on other servers who can see your federated posts.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {followers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No remote followers yet.</p>
                      ) : (
                        followers.slice(0, 8).map((follower) => (
                          <div key={follower.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                            <div>
                              <Link
                                href={buildFederationActorExplorerHref(follower.actor_uri)}
                                className="font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {formatFederationHandle(follower.username, follower.domain, follower.actor_uri)}
                              </Link>
                              <p className="text-xs text-muted-foreground">{follower.status || 'accepted'}</p>
                            </div>
                            <Badge variant="outline">Inbound</Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <UserPlus className="w-5 h-5 text-green-500" />
                        Following
                      </CardTitle>
                      <CardDescription>Remote profiles you have already discovered from fwber.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {following.length === 0 ? (
                        <p className="text-sm text-muted-foreground">You are not following any remote profiles yet.</p>
                      ) : (
                        following.slice(0, 8).map((connection) => (
                          <div key={connection.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                            <div>
                              <Link
                                href={buildFederationActorExplorerHref(connection.actor_uri)}
                                className="font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {formatFederationHandle(connection.username, connection.domain, connection.actor_uri)}
                              </Link>
                              <p className="text-xs text-muted-foreground">{connection.status || 'pending'}</p>
                            </div>
                            <Badge variant="outline">Outbound</Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Remote Voices</CardTitle>
                      <CardDescription>Profiles contributing the most recent posts to your federated cache.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {posts.slice(0, 5).map((post) => {
                        const authorName = post.metadata?.name || post.actor_username || 'Federated User'
                        const handle = formatFederationHandle(post.actor_username, post.actor_domain, post.actor_uri)

                        return (
                          <div key={post.id} className="flex items-center gap-3 rounded-lg border p-3">
                            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-purple-100">
                              {post.actor_avatar ? (
                                <Image src={post.actor_avatar} alt="" fill sizes="40px" className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center font-semibold text-purple-700">
                                  {authorName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={buildFederationActorExplorerHref(post.actor_uri)}
                                className="truncate text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {authorName}
                              </Link>
                              <Link
                                href={buildFederationActorExplorerHref(post.actor_uri)}
                                className="truncate text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {handle}
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
