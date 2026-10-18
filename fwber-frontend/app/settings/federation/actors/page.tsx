'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { sanitizeHtml } from '@/lib/utils/sanitize'
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Loader2,
  MessageSquare,
  Radio,
  UserPlus,
  UserMinus,
} from 'lucide-react'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api/client'
import {
  buildFederationActorExplorerHref,
  formatFederationHandle,
  getFederatedPosts,
  getFederationActorDetail,
  type FederatedPost,
  type FederationActor,
  type FederationConnection,
} from '@/lib/api/activitypub'

interface FollowingResponse {
  following?: FederationConnection[]
}

function FederationActorExplorerContent() {
  const searchParams = useSearchParams()
  const actorUri = searchParams.get('uri')
  const { user } = useAuth()
  const { toast } = useToast()

  const [actor, setActor] = useState<FederationActor | null>(null)
  const [posts, setPosts] = useState<FederatedPost[]>([])
  const [following, setFollowing] = useState<FederationConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowPending, setIsFollowPending] = useState(false)

  const isFederated = Boolean(user?.profile?.is_federated)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!actorUri) {
        setIsLoading(false)
        return
      }

      try {
        const [actorData, postData, followingResponse] = await Promise.all([
          getFederationActorDetail(actorUri),
          getFederatedPosts({ actorUri, limit: 25 }),
          api.get<FollowingResponse>('/federation/following'),
        ])

        if (cancelled) {
          return
        }

        setActor(actorData)
        setPosts(postData)
        setFollowing(Array.isArray(followingResponse.following) ? followingResponse.following : [])
      } catch (error) {
        console.error('Failed to load federation actor explorer:', error)

        if (!cancelled) {
          setActor(null)
          setPosts([])
          setFollowing([])
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
  }, [actorUri])

  const followedActorIds = useMemo(
    () => new Set(following.map((connection) => connection.actor_uri)),
    [following]
  )
  const isFollowing = actor ? followedActorIds.has(actor.id) : false

  const handleFollow = async () => {
    if (!actor || isFollowing) {
      return
    }

    try {
      setIsFollowPending(true)
      await api.post('/federation/follow', { actor_id: actor.id })
      setFollowing((current) => [
        ...current,
        {
          id: Date.now(),
          actor_uri: actor.id,
          username: actor.preferredUsername,
          domain: actor.server,
          status: 'pending',
        },
      ])
      setActor((current) =>
        current
          ? {
              ...current,
              followingStatus: 'pending',
            }
          : current
      )
      toast({
        title: 'Follow request sent',
        description: 'The remote server still needs to accept or process the follow handshake.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Follow failed',
        description: 'Could not send follow request to the remote server.',
      })
    } finally {
      setIsFollowPending(false)
    }
  }

  const handleUnfollow = async () => {
    if (!actor || !isFollowing) {
      return
    }

    try {
      setIsFollowPending(true)
      await api.post('/federation/unfollow', { actor_id: actor.id })
      setFollowing((current) => current.filter(f => f.actor_uri !== actor.id))
      setActor((current) =>
        current
          ? {
              ...current,
              followingStatus: undefined,
            }
          : current
      )
      toast({
        title: 'Unfollowed',
        description: 'You have unfollowed this federated actor.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Unfollow failed',
        description: 'Could not send unfollow request to the remote server.',
      })
    } finally {
      setIsFollowPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="icon" className="rounded-full">
                <Link href="/settings/federation">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
                  <Globe className="w-8 h-8 text-blue-500" />
                  Federated Actor Explorer
                </h1>
                <p className="text-muted-foreground dark:text-muted-foreground mt-1">
                  Inspect a remote profile using real cached posts and the actor data fwber can resolve today.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                <Link href="/settings/federation/activity">
                  <Radio className="w-4 h-4 mr-2" />
                  Activity Center
                </Link>
              </Button>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Read Only
              </Badge>
            </div>
          </div>
        </div>

        {!actorUri ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Choose a federated actor from search results, activity, or the global feed to inspect them here.
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : !actor ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              This remote actor could not be resolved right now. Cached posts may appear again once the server is reachable.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border border-blue-100 bg-blue-50">
                      {actor.icon?.url ? (
                        <Image src={actor.icon.url} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-bold text-blue-700">
                          {(actor.name || actor.preferredUsername || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-2xl text-foreground dark:text-foreground">
                        {actor.name || actor.preferredUsername}
                      </CardTitle>
                      <CardDescription className="mt-1 break-all">
                        {formatFederationHandle(actor.preferredUsername, actor.server, actor.id)}
                      </CardDescription>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{actor.type || 'Person'}</Badge>
                        <Badge variant="outline">{actor.server}</Badge>
                        {actor.followingStatus ? <Badge variant="outline">Following: {actor.followingStatus}</Badge> : null}
                        {actor.followerStatus ? <Badge variant="outline">Follower: {actor.followerStatus}</Badge> : null}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border bg-card dark:bg-card p-4 text-sm text-foreground dark:dark:bg-background/30 dark:text-muted-foreground">
                    {actor.summary || 'This remote actor has not published a summary yet.'}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {actor.url ? (
                      <Button asChild variant="outline">
                        <a href={actor.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Profile
                        </a>
                      </Button>
                    ) : null}
                    {isFollowing ? (
                        <Button
                            variant="outline"
                            className="text-rose-500 border-rose-200 hover:bg-rose-50"
                            onClick={() => void handleUnfollow()}
                            disabled={isFollowPending || !isFederated}
                        >
                            <UserMinus className="w-4 h-4 mr-2" />
                            {isFollowPending ? 'Sending…' : 'Unfollow Actor'}
                        </Button>
                    ) : (
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => void handleFollow()}
                            disabled={isFollowPending || !isFederated}
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            {isFollowPending ? 'Sending…' : 'Follow Actor'}
                        </Button>
                    )}
                  </div>
                  {!isFederated ? (
                    <p className="text-xs text-amber-600">
                      Enable federation visibility before opening new follow relationships from fwber.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Discovery Snapshot</CardTitle>
                    <CardDescription>What fwber can honestly show about this remote profile today.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Cached posts</p>
                      <p className="mt-1 font-semibold">{actor.cachedPostsCount || posts.length}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Last cached activity</p>
                      <p className="mt-1 font-semibold">
                        {actor.lastCachedPostAt
                          ? formatDistanceToNow(new Date(actor.lastCachedPostAt), { addSuffix: true })
                          : 'No cached posts yet'}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Actor URI</p>
                      <p className="mt-1 break-all font-mono text-xs">{actor.id}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">What is not live yet</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>Replies, boosts, and likes are still read-only placeholders.</p>
                    <p>The public outbox endpoint is still honest about being empty, so this page uses cached posts instead.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  Cached Posts From This Actor
                </CardTitle>
                <CardDescription>
                  These are the federated notes fwber has already stored locally for this profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {posts.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No cached posts are available for this actor yet.
                  </div>
                ) : (
                  posts.map((post) => {
                    const authorName = post.metadata?.name || post.actor_username || actor.name || 'Federated User'

                    return (
                      <article key={post.id} className="rounded-xl border bg-card dark:bg-card p-4 shadow-sm dark:dark:bg-background/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-blue-100">
                              {post.actor_avatar ? (
                                <Image src={post.actor_avatar} alt="" fill sizes="40px" className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center font-semibold text-blue-700">
                                  {authorName.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground dark:text-foreground">{authorName}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {formatFederationHandle(post.actor_username, post.actor_domain, post.actor_uri)}
                              </p>
                            </div>
                          </div>
                          <time className="shrink-0 text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                          </time>
                        </div>
                        <div
                          className="mt-4 prose max-w-none text-sm text-foreground dark:prose-invert dark:text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
                        />
                        <div className="mt-4 flex flex-wrap gap-3">
                          {post.url ? (
                            <Button asChild variant="outline" size="sm">
                              <a href={post.url} target="_blank" rel="noreferrer">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open Remote Post
                              </a>
                            </Button>
                          ) : null}
                          <Button asChild variant="ghost" size="sm">
                            <Link href={buildFederationActorExplorerHref(post.actor_uri)}>Refresh Actor View</Link>
                          </Button>
                        </div>
                      </article>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

function FederationActorExplorerFallback() {
  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </main>
    </div>
  )
}

export default function FederationActorExplorerPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<FederationActorExplorerFallback />}>
        <FederationActorExplorerContent />
      </Suspense>
    </ProtectedRoute>
  )
}
