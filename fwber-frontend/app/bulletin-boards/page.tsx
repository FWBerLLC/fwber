'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, MessageSquare, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function BulletinBoardsPage() {
    const [boards, setBoards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBoards = async () => {
            try {
                const res = await fetch('/api/bulletin-boards');
                if (!res.ok) throw new Error('Failed to fetch bulletin boards');
                const data = await res.json();
                setBoards(data.boards || []);
            } catch (e: any) {
                toast.error(e.message || 'Error loading boards');
            } finally {
                setLoading(false);
            }
        };
        fetchBoards();
    }, []);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-8 h-8 text-primary" />
                    Local Bulletin Boards
                </h1>
                <Button>Create New Post</Button>
            </div>

            <Card className="bg-card shadow-sm border border-border mb-8">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        Neighborhood Hubs
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Discover local announcements, events, and discussions in your proximity.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <CardDescription>
                        Connect with your local community.
                    </CardDescription>
                </CardHeader>
            </Card>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : boards.length === 0 ? (
                <div className="text-center p-12 bg-muted rounded-lg border border-border">
                    <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No boards nearby</h3>
                    <p className="text-muted-foreground">There are no active bulletin boards in your immediate vicinity. Be the first to start one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {boards.map((board) => (
                        <Card key={board.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-6">
                                <h3 className="font-bold text-lg mb-2">{board.name}</h3>
                                <p className="text-muted-foreground text-sm mb-4">{board.description}</p>
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {board.distance} miles</span>
                                    <span>{board.postCount} posts</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
