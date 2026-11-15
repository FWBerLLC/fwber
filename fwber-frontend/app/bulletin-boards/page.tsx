'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PostSuggester } from '@/components/ai/PostSuggester';
import { Info, MessageSquare, MapPin, Plus, Users, Heart, Send, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BoardSummary {
  id: number;
  slug: string;
  name: string;
  label: string;
  emoji: string;
  category: string;
  description: string;
  follower_count: number;
  post_count: number;
  is_followed: boolean;
}

interface BoardPost {
  id: number;
  content: string;
  created_at: string;
  is_mine?: boolean;
  author: {
    id: number;
    name: string;
    avatar_url?: string | null;
  };
}

interface BoardDetail extends BoardSummary {
  posts: BoardPost[];
}

export default function BulletinBoardsPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Create Board Dialog
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardCategory, setNewBoardCategory] = useState('community');
  const [newBoardEmoji, setNewBoardEmoji] = useState('📌');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  // Create Post Dialog
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postBoardSlug, setPostBoardSlug] = useState('general');
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Board Discussion Dialog
  const [activeBoard, setActiveBoard] = useState<BoardDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ boards: BoardSummary[] }>('/bulletin-boards');
      const list = Array.isArray(res?.boards) ? res.boards : [];
      setBoards(list);
      if (list.length > 0) {
        setPostBoardSlug((prev) => (prev === 'general' && !list.some((b) => b.slug === 'general') ? list[0].slug : prev));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Error loading bulletin boards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const categories = useMemo(() => {
    const unique = new Set(boards.map((b) => b.category || 'community'));
    return ['all', ...Array.from(unique).sort()];
  }, [boards]);

  const filteredBoards = useMemo(() => {
    return boards.filter((board) => {
      if (selectedCategory !== 'all' && board.category !== selectedCategory) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        (board.name || board.label || '').toLowerCase().includes(q) ||
        (board.description || '').toLowerCase().includes(q) ||
        (board.category || '').toLowerCase().includes(q)
      );
    });
  }, [boards, search, selectedCategory]);

  const openBoardDetail = async (slug: string) => {
    setLoadingDetail(true);
    try {
      const detail = await api.get<BoardDetail>(`/bulletin-boards/${encodeURIComponent(slug)}`);
      setActiveBoard({
        ...detail,
        name: detail.name || detail.label,
        posts: Array.isArray(detail.posts) ? detail.posts : [],
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load board posts');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleFollow = async (board: BoardSummary, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      if (board.is_followed) {
        await api.delete(`/bulletin-boards/${encodeURIComponent(board.slug)}/follow`);
        toast.success(`Unfollowed ${board.name || board.label}`);
      } else {
        await api.post(`/bulletin-boards/${encodeURIComponent(board.slug)}/follow`, {});
        toast.success(`Following ${board.name || board.label}`);
      }
      setBoards((prev) =>
        prev.map((b) =>
          b.slug === board.slug
            ? {
                ...b,
                is_followed: !b.is_followed,
                follower_count: Math.max(0, b.follower_count + (b.is_followed ? -1 : 1)),
              }
            : b
        )
      );
      if (activeBoard && activeBoard.slug === board.slug) {
        setActiveBoard({
          ...activeBoard,
          is_followed: !activeBoard.is_followed,
          follower_count: Math.max(0, activeBoard.follower_count + (activeBoard.is_followed ? -1 : 1)),
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update follow status');
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) {
      toast.error('Enter a board name');
      return;
    }
    setIsCreatingBoard(true);
    try {
      const res = await api.post<{ board: BoardSummary }>('/bulletin-boards/boards', {
        name: newBoardName.trim(),
        category: newBoardCategory,
        emoji: newBoardEmoji.trim() || '📌',
        description: newBoardDescription.trim(),
      });
      if (res?.board) {
        setBoards((prev) => [res.board, ...prev]);
        setPostBoardSlug(res.board.slug);
      }
      toast.success('Community board created!');
      setIsCreateBoardOpen(false);
      setNewBoardName('');
      setNewBoardDescription('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create board');
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const submitPost = async (targetSlug: string, content: string): Promise<boolean> => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('Post content cannot be empty');
      return false;
    }
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2500 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // Optional proximity coords — backend falls back cleanly
      }
    }

    await api.post('/bulletin-boards', {
      topic_slug: targetSlug,
      content: trimmed,
      latitude,
      longitude,
    });
    return true;
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPosting(true);
    try {
      const ok = await submitPost(postBoardSlug, postContent);
      if (ok) {
        toast.success('Posted to bulletin board!');
        setPostContent('');
        setIsCreatePostOpen(false);
        await fetchBoards();
        if (activeBoard && activeBoard.slug === postBoardSlug) {
          await openBoardDetail(postBoardSlug);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to publish post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleReplyInBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBoard) return;
    setIsReplying(true);
    try {
      const ok = await submitPost(activeBoard.slug, replyContent);
      if (ok) {
        toast.success('Post added to board!');
        setReplyContent('');
        await openBoardDetail(activeBoard.slug);
        await fetchBoards();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add post');
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await api.delete(`/bulletin-boards/posts/${postId}`);
      toast.success('Board post deleted');
      if (activeBoard) {
        setActiveBoard({
          ...activeBoard,
          posts: activeBoard.posts.filter((p) => p.id !== postId),
          post_count: Math.max(0, activeBoard.post_count - 1),
        });
      }
      fetchBoards();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete post');
    }
  };

  const selectedBoardForSuggester = useMemo(
    () => boards.find((b) => b.slug === postBoardSlug)?.id || boards[0]?.id || 1,
    [boards, postBoardSlug]
  );

  return (
    <ProtectedRoute>
      <TooltipProvider delayDuration={200}>
        <div className="min-h-screen bg-muted dark:bg-background">
          <AppHeader title="Bulletin Boards" />
          <main className="container mx-auto p-4 md:p-8 max-w-6xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-8 h-8 text-primary" />
                  Local Bulletin Boards
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Neighborhood announcements, missed connections, event flyers, and community discussions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateBoardOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Start Board
                </Button>
                <Button type="button" onClick={() => setIsCreatePostOpen(true)}>
                  <Send className="w-4 h-4 mr-1.5" />
                  Create New Post
                </Button>
              </div>
            </div>

            <Card className="bg-card shadow-sm border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  Neighborhood Hubs
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Posts stay live for 7 days. Click any board card to read threads, follow updates, or reply.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>
                  Filter by scene or start a new board for your block, venue, or interest group.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search boards by name, neighborhood, or vibe..."
                    className="pl-9 bg-background text-foreground"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      size="sm"
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(cat)}
                      className="capitalize rounded-full h-8 text-xs"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredBoards.length === 0 ? (
              <div className="text-center p-12 bg-card rounded-2xl border border-border space-y-4">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">No bulletin boards found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {boards.length === 0
                      ? 'Be the first to launch a neighborhood or community bulletin board!'
                      : 'No boards matched your current search filter.'}
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  <Button type="button" onClick={() => setIsCreateBoardOpen(true)}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Start First Board
                  </Button>
                  {search && (
                    <Button type="button" variant="outline" onClick={() => { setSearch(''); setSelectedCategory('all'); }}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBoards.map((board) => (
                  <Card
                    key={board.id}
                    onClick={() => openBoardDetail(board.slug)}
                    className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between bg-card"
                  >
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl" aria-hidden="true">{board.emoji || '📌'}</span>
                          <div>
                            <h3 className="font-bold text-lg text-foreground leading-tight">{board.name || board.label}</h3>
                            <Badge variant="secondary" className="text-[10px] capitalize mt-1">
                              {board.category || 'community'}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={board.is_followed ? 'secondary' : 'outline'}
                          onClick={(e) => handleToggleFollow(board, e)}
                          className="h-8 text-xs shrink-0"
                        >
                          <Heart className={`w-3.5 h-3.5 mr-1 ${board.is_followed ? 'fill-pink-500 text-pink-500' : ''}`} />
                          {board.is_followed ? 'Following' : 'Follow'}
                        </Button>
                      </div>

                      <p className="text-muted-foreground text-sm line-clamp-3">
                        {board.description || `Open bulletin board for ${board.name || board.label}.`}
                      </p>

                      <div className="flex justify-between items-center pt-2 border-t border-border text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {board.follower_count ?? 0} followers
                        </span>
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                          {board.post_count ?? 0} active posts
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>

          {/* Start New Board Dialog */}
          <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Start a Bulletin Board</DialogTitle>
                <DialogDescription>
                  Launch a dedicated board for your neighborhood, nightlife scene, or local group.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="board-emoji">Emoji</Label>
                    <Input
                      id="board-emoji"
                      value={newBoardEmoji}
                      onChange={(e) => setNewBoardEmoji(e.target.value)}
                      maxLength={8}
                      className="text-center text-lg bg-background text-foreground"
                    />
                  </div>
                  <div className="col-span-3 space-y-1.5">
                    <Label htmlFor="board-name">Board Name</Label>
                    <Input
                      id="board-name"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      placeholder="e.g. Midtown Detroit Late Night"
                      maxLength={100}
                      required
                      className="bg-background text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="board-category">Category</Label>
                  <select
                    id="board-category"
                    value={newBoardCategory}
                    onChange={(e) => setNewBoardCategory(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="community">Community &amp; Neighborhood</option>
                    <option value="nightlife">Nightlife &amp; Events</option>
                    <option value="music">Music &amp; Arts</option>
                    <option value="missed-connections">Missed Connections</option>
                    <option value="wellness">Fitness &amp; Wellness</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="board-desc">Description</Label>
                  <Textarea
                    id="board-desc"
                    value={newBoardDescription}
                    onChange={(e) => setNewBoardDescription(e.target.value)}
                    placeholder="What should neighbors share here?"
                    rows={3}
                    maxLength={400}
                    className="bg-background text-foreground"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateBoardOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatingBoard || !newBoardName.trim()}>
                    {isCreatingBoard ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                    Create Board
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Create Post Dialog (with AI PostSuggester!) */}
          <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Post to Bulletin Board</DialogTitle>
                <DialogDescription>
                  Posts stay visible on the board and Local Pulse for 7 days.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="post-board-select">Target Board</Label>
                  <select
                    id="post-board-select"
                    value={postBoardSlug}
                    onChange={(e) => setPostBoardSlug(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {boards.length === 0 ? (
                      <option value="general">💬 General Community</option>
                    ) : (
                      boards.map((b) => (
                        <option key={b.slug} value={b.slug}>
                          {b.emoji || '📌'} {b.name || b.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="post-body">Your Flyer / Note</Label>
                  <Textarea
                    id="post-body"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Share an upcoming meetup, local recommendation, or missed connection..."
                    rows={4}
                    maxLength={2000}
                    required
                    className="bg-background text-foreground"
                  />
                </div>

                <PostSuggester
                  boardId={selectedBoardForSuggester}
                  onSelectPost={(suggestion) => setPostContent(suggestion)}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPosting || !postContent.trim()}>
                    {isPosting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                    Publish Post
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Board Detail / Thread Dialog */}
          <Dialog
            open={Boolean(activeBoard) || loadingDetail}
            onOpenChange={(open) => {
              if (!open) {
                setActiveBoard(null);
                setReplyContent('');
              }
            }}
          >
            <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
              {loadingDetail && !activeBoard ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : activeBoard ? (
                <>
                  <DialogHeader>
                    <div className="flex items-start justify-between gap-3 pr-6">
                      <div>
                        <DialogTitle className="text-xl flex items-center gap-2">
                          <span>{activeBoard.emoji || '📌'}</span>
                          <span>{activeBoard.name || activeBoard.label}</span>
                        </DialogTitle>
                        <DialogDescription className="mt-1">
                          {activeBoard.description}
                        </DialogDescription>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={activeBoard.is_followed ? 'secondary' : 'outline'}
                        onClick={() => handleToggleFollow(activeBoard)}
                      >
                        <Heart className={`w-3.5 h-3.5 mr-1 ${activeBoard.is_followed ? 'fill-pink-500 text-pink-500' : ''}`} />
                        {activeBoard.is_followed ? 'Following' : 'Follow'}
                      </Button>
                    </div>
                  </DialogHeader>

                  <form onSubmit={handleReplyInBoard} className="flex gap-2 pt-2">
                    <Input
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={`Post a note to ${activeBoard.name || activeBoard.label}...`}
                      maxLength={2000}
                      className="flex-1 bg-background text-foreground"
                    />
                    <Button type="submit" disabled={isReplying || !replyContent.trim()}>
                      {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>

                  <div className="space-y-3 pt-2">
                    {activeBoard.posts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No active posts on this board yet. Kick off the conversation above!
                      </div>
                    ) : (
                      activeBoard.posts.map((post) => (
                        <div key={post.id} className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{post.author?.name || 'Member'}</span>
                              {' · '}
                              {post.created_at ? new Date(post.created_at).toLocaleString() : 'Just now'}
                            </div>
                            {post.is_mine && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                onClick={() => handleDeletePost(post.id)}
                                aria-label="Delete post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}
