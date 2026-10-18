"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { proximityApi } from '@/lib/api/proximity';
import { MessageSquare, Loader2, User, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/utils/avatar';

interface Comment {
    id: string;
    proximity_artifact_id: number;
    user_id: number;
    content: string;
    parent_id: string | null;
    created_at: string;
    user: {
        id: number;
        name: string;
        avatar_url: string | null;
    };
    replies?: Comment[];
}

interface ArtifactCommentsProps {
    artifactId: number;
    isOpen: boolean;
    onClose?: () => void;
}

export default function ArtifactComments({ artifactId, isOpen }: ArtifactCommentsProps) {
    const { token } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadComments = async () => {
        setIsLoading(true);
        try {
            const response = await proximityApi.getComments(artifactId, token as string);
            // Backend returns paginated data inside "data"
            setComments(response.data || []);
        } catch (err) {
            console.error("Failed to load comments", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && artifactId) {
            loadComments();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, artifactId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !token) return;

        setIsSubmitting(true);
        try {
            const res = await proximityApi.commentArtifact(artifactId, newComment, undefined, token);
            setComments(prev => [res.comment, ...prev]);
            setNewComment('');
        } catch (err) {
            console.error("Failed to post comment", err);
            alert("Failed to post comment");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="flex items-center gap-2 font-semibold text-foreground dark:text-foreground mb-4 whitespace-nowrap">
                <MessageSquare className="h-4 w-4" /> Discussion
            </h4>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 rounded-full border-border dark:border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-4"
                    disabled={isSubmitting}
                />
                <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
            </form>

            {/* List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : comments.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-4">No comments yet. Be the first to start the conversation!</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                            <div className="flex-shrink-0 relative w-8 h-8 rounded-full overflow-hidden">
                                {comment.user?.avatar_url ? (
                                    <Image src={getAvatarUrl(comment.user.avatar_url, comment.user.name)} alt={comment.user.name} fill sizes="32px" className="object-cover" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-end gap-2 mb-1">
                                    <span className="font-semibold text-sm text-foreground dark:text-foreground">{comment.user?.name || `User #${comment.user_id}`}</span>
                                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                                </div>
                                <p className="text-sm text-foreground dark:text-foreground break-words">{comment.content}</p>

                                {/* Nested Replies (1 level deep) */}
                                {comment.replies && comment.replies.length > 0 && (
                                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100">
                                        {comment.replies.map(reply => (
                                            <div key={reply.id} className="flex gap-2">
                                                <div className="flex-shrink-0">
                                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                                        <User className="h-3 w-3 text-muted-foreground" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-end gap-2">
                                                        <span className="font-semibold text-xs text-foreground dark:text-foreground">{reply.user?.name || `User #${reply.user_id}`}</span>
                                                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                                                    </div>
                                                    <p className="text-xs text-foreground dark:text-foreground">{reply.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
