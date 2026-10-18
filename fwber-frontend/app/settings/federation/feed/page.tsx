'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/use-toast'
import { api } from '@/lib/api/client'
import AppHeader from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Globe, Users, MessageSquare, Repeat, Heart, ArrowLeft, Radio } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { sanitizeHtml } from '@/lib/utils/sanitize'
import {
  buildFederationActorExplorerHref,
  formatFederationHandle,
  getFederatedPosts,
  type FederatedPost,
} from '@/lib/api/activitypub'

function FederationAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  activeColor = 'text-blue-500',
}: {
  icon: typeof MessageSquare
  label: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  activeColor?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 transition-colors hover:text-foreground dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? activeColor : ''
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'fill-current' : ''}`} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

export default function GlobalFeedPage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [posts, setPosts] = useState<FederatedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [interacting, setInteracting] = useState<Record<string, boolean>>({})
  const [replyPost, setReplyPost] = useState<FederatedPost | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [feedMode, setFeedMode] = useState<'global' | 'following'>('global')

  useEffect(() => {
    const fetchPosts = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const endpoint = feedMode === 'following' ? '/federation/feed/following' : '/federation/posts'
        const response = await api.get<{ posts: FederatedPost[] }>(endpoint, {
            headers: { Authorization: `Bearer ${token}` }
        })
        setPosts(Array.isArray(response.posts) ? response.posts : [])
      } catch (error) {
        console.error('Failed to fetch federated posts:', error)
        setPosts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [token, feedMode])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
                  <Globe className="w-8 h-8 text-blue-500" />
                  Global Feed
                </h1>
                <p className="text-muted-foreground dark:text-muted-foreground mt-1">
                  Explore recent posts from the decentralized social web via ActivityPub.
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Federated
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg mr-4">
                  <button type="button"
                    onClick={() => setFeedMode('global')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${feedMode === 'global' ? 'bg-card dark:bg-zinc-700 shadow-sm text-blue-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                      Global
                  </button>
                  <button type="button"
                    onClick={() => setFeedMode('following')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${feedMode === 'following' ? 'bg-card dark:bg-zinc-700 shadow-sm text-blue-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                      Following
                  </button>
              </div>
              <Button asChild variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Link href="/settings/federation">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Federation Settings
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                <Link href="/settings/federation/activity">
                  <Radio className="w-4 h-4 mr-2" />
                  Activity Center
                </Link>
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="bg-card dark:bg-card border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <CardTitle className="text-xl">
                    {feedMode === 'following' ? 'No posts from people you follow' : 'Your feed is empty'}
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  {feedMode === 'following'
                    ? 'Start following federated actors to see their latest updates here.'
                    : 'Follow users from other servers to see their posts collected here.'}
                </p>
                {feedMode === 'following' && (
                    <Button variant="outline" className="mt-6" onClick={() => setFeedMode('global')}>
                        Switch to Global Feed
                    </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => {
                const authorName = post.metadata?.name || post.actor_username || 'Federated User'
                const actorHandle = formatFederationHandle(post.actor_username, post.actor_domain, post.actor_uri)

                return (
                  <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center gap-4 pb-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 overflow-hidden relative">
                        {post.actor_avatar ? (
                          <Image src={post.actor_avatar} alt="" fill sizes="40px" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold uppercase">
                            {authorName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <Link
                            href={buildFederationActorExplorerHref(post.actor_uri)}
                            className="font-bold text-foreground dark:text-foreground truncate hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {authorName}
                          </Link>
                          <time className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                          </time>
                        </div>
                        <Link
                          href={buildFederationActorExplorerHref(post.actor_uri)}
                          className="text-xs text-muted-foreground truncate hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {actorHandle}
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="prose dark:prose-invert max-w-none text-foreground dark:text-foreground dark:text-foreground"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
                      />
                      <div className="flex items-center gap-6 mt-6 pt-4 border-t dark:border-border text-muted-foreground">
                        <FederationAction
                          icon={MessageSquare}
                          label="Reply"
                          onClick={() => setReplyPost(post)}
                        />
                        <FederationAction
                          icon={Repeat}
                          label="Boost"
                          disabled={interacting[post.id]}
                          onClick={async () => {
                            try {
                                setInteracting(prev => ({ ...prev, [post.id]: true }))
                                const objectUri = post.payload?.object?.id || post.id;
                                await api.post(`/federation/posts/${encodeURIComponent(objectUri)}/boost`, {
                                    actor_uri: post.actor_uri
                                }, { headers: { Authorization: `Bearer ${token}` } })
                                toast({ title: "Boost sent", description: "This post has been shared to your followers." })
                            } catch (err: any) {
                                toast({ variant: "destructive", title: "Boost failed", description: err.message })
                            } finally {
                                setInteracting(prev => ({ ...prev, [post.id]: false }))
                            }
                          }}
                        />
                        <FederationAction
                          icon={Heart}
                          label="Like"
                          activeColor="text-rose-500"
                          disabled={interacting[post.id]}
                          onClick={async () => {
                            try {
                                setInteracting(prev => ({ ...prev, [post.id]: true }))
                                const objectUri = post.payload?.object?.id || post.id;
                                await api.post(`/federation/posts/${encodeURIComponent(objectUri)}/like`, {
                                    actor_uri: post.actor_uri
                                }, { headers: { Authorization: `Bearer ${token}` } })
                                toast({ title: "Post liked", description: "A like has been sent to the remote server." })
                            } catch (err: any) {
                                toast({ variant: "destructive", title: "Like failed", description: err.message })
                            } finally {
                                setInteracting(prev => ({ ...prev, [post.id]: false }))
                            }
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </main>

        <Dialog open={Boolean(replyPost)} onOpenChange={(open) => { if (!open) setReplyPost(null); setReplyContent(''); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Reply to {replyPost?.metadata?.name || replyPost?.actor_username}</DialogTitle>
                    <DialogDescription>
                        Your reply will be signed and sent to the author&apos;s server.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {replyPost && (
                        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3 text-xs text-zinc-500 line-clamp-3 overflow-hidden">
                             <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(replyPost.content) }} />
                        </div>
                    )}
                    <Textarea
                        placeholder="Write your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={4}
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setReplyPost(null)}>Cancel</Button>
                    <Button
                        disabled={!replyContent.trim() || isReplying}
                        onClick={async () => {
                            if (!replyPost) return
                            try {
                                setIsReplying(true)
                                const objectUri = replyPost.payload?.object?.id || replyPost.id
                                await api.post(`/federation/posts/${encodeURIComponent(objectUri)}/reply`, {
                                    content: replyContent,
                                    actor_uri: replyPost.actor_uri
                                }, { headers: { Authorization: `Bearer ${token}` } })

                                toast({ title: "Reply sent", description: "Your federated reply has been delivered." })
                                setReplyPost(null)
                                setReplyContent('')
                            } catch (err: any) {
                                toast({ variant: "destructive", title: "Reply failed", description: err.message })
                            } finally {
                                setIsReplying(false)
                            }
                        }}
                    >
                        {isReplying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                        Post Reply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
