'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, ExternalLink, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FederatedPost {
    id: number;
    actor_username: string;
    actor_domain: string;
    actor_avatar?: string;
    content: string;
    url?: string;
    published_at: string;
}

export function FederatedFeed() {
    const [posts, setPosts] = useState<FederatedPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<{ posts: FederatedPost[] }>('/federation/posts')
            .then(res => setPosts(res.posts))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {posts.length === 0 ? (
                <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <Globe className="mx-auto h-10 w-10 text-zinc-300 mb-2" />
                    <p className="text-sm text-zinc-500">No federated posts yet. Follow someone on the Fediverse!</p>
                </div>
            ) : (
                (posts || []).map(post => (
                    <Card key={post.id} className="border-zinc-200 dark:border-zinc-800 hover:border-purple-500/30 transition-colors">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-zinc-100 dark:border-zinc-800">
                                        <AvatarImage src={post.actor_avatar} />
                                        <AvatarFallback>{post.actor_username[0].toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{post.actor_username}</span>
                                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-none">
                                                {post.actor_domain}
                                            </Badge>
                                        </div>
                                        <span className="text-[10px] text-zinc-500">
                                            {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                                {post.url && (
                                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-purple-500">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div 
                                className="text-sm prose prose-zinc dark:prose-invert max-w-none break-words"
                                dangerouslySetInnerHTML={{ __html: post.content }}
                            />
                            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-50 dark:border-zinc-900">
                                <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-purple-500 transition-colors">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span>View on {post.actor_domain}</span>
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
