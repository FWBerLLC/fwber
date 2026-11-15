'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, Lock, Globe, Send, Trash2, MessageCircle, MapPin, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroup, useGroupPosts, useCreateGroupPost, useJoinGroup, useLeaveGroup, useDeleteGroupPost, useMyGroups, useGroupMatchRequests, useConnectedGroups, useGroupEvents } from '@/lib/hooks/use-groups';

import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/lib/auth-context';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const groupId = parseInt(params.id as string);
  
  const { data: group, isLoading: isLoadingGroup } = useGroup(groupId);
  const { data: posts, isLoading: isLoadingPosts } = useGroupPosts(groupId);
  const { data: myGroupsData } = useMyGroups();
  const { data: events, isLoading: isLoadingEvents } = useGroupEvents(groupId);
  
  // Only fetch requests if user is a member/admin (optimization)
  // We can't conditionally call hooks based on data inside component easily without complex logic or skipping queries
  // But react-query handles 'enabled' flag.
  const isMember = myGroupsData?.data.some(g => g.id === groupId);
  // Simplified admin check: for now, if member, assume can view requests or add logic later.
  // Ideally, useGroup should return role.
  const userRole = group?.user_role;
  const isAdmin = userRole === 'admin' || userRole === 'owner';

  const { data: requests } = useGroupMatchRequests(groupId);
  const { data: connectedGroups } = useConnectedGroups(groupId);
  
  const createPost = useCreateGroupPost(groupId);
  const deletePost = useDeleteGroupPost();
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  
  const [postContent, setPostContent] = React.useState('');
  const [showAllMembers, setShowAllMembers] = React.useState(false);

  // const isMember = myGroupsData?.data.some(g => g.id === groupId); // Already declared above
  // Assume current user is the creator for simplicity or add user context later to check admin rights properly
  // For now, we'll just check if the current user created the group if we had that info readily available in context
  // But we can check if the group creator id matches a stored user id. 
  // Since we don't have global user context here, we'll just show the button if they are a member (simplified logic for prototype)
  // const canViewMatches = isMember; // Removed, using isAdmin logic now

  const handleJoin = () => joinGroup.mutate(groupId);
  const handleLeave = () => leaveGroup.mutate(groupId);


  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    
    createPost.mutate({ content: postContent }, {
      onSuccess: () => setPostContent('')
    });
  };

  const handleDeletePost = (postId: number) => {
    deletePost.mutate(postId);
  };

  if (isLoadingGroup) return <div className="p-8 text-center">Loading group...</div>;
  if (!group) return <div className="p-8 text-center">Group not found</div>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title={group.name} />
        <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="bg-card rounded-lg shadow-sm border p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl bg-muted p-4 rounded-full">
              {group.icon || '👥'}
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {group.name}
                {group.privacy === 'private' ? (
                  <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" /> Private</Badge>
                ) : (
                  <Badge variant="outline"><Globe className="w-3 h-3 mr-1" /> Public</Badge>
                )}
              </h1>
              <p className="text-muted-foreground mt-1">{group.description}</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                 {group.category && (
                    <Badge variant="outline" className="capitalize">{group.category}</Badge>
                 )}
                 {group.tags && group.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
                 ))}
                  {group.matching_enabled && (
                     <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                         Matching Enabled
                     </Badge>
                  )}
               </div>

               <div className="flex flex-wrap gap-2 mt-4">
               {isAdmin && group.matching_enabled && (
                    <>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/groups/${group.id}/matches`}>
                            <Users className="w-4 h-4 mr-2" />
                            Find Groups
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="relative">
                        <Link href={`/groups/${group.id}/requests`}>
                            Requests
                            {requests?.incoming && requests.incoming.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center border-2 border-background">
                                    {requests.incoming.length}
                                </span>
                            )}
                        </Link>
                    </Button>
                    </>
               )}
               </div>

               <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {group.member_count} members
                </span>
                <span>Created by {group.created_by_user_id}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isMember && group.chatroom_id && (
              <Button 
                variant="secondary"
                onClick={() => router.push(`/chatrooms/${group.chatroom_id}`)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>
            )}
            <Button 
              variant={isMember ? "outline" : "default"}
              onClick={isMember ? handleLeave : handleJoin}
              disabled={joinGroup.isPending || leaveGroup.isPending}
            >
              {isMember ? 'Leave Group' : 'Join Group'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="feed" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="feed">Discussion Feed</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>
            
            <TabsContent value="feed" className="space-y-6">
              {isMember ? (
                <Card>
                  <CardContent className="pt-6">
                    <form onSubmit={handlePostSubmit} className="flex gap-4">
                      <Input 
                        placeholder="Share something with the group..." 
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={createPost.isPending || !postContent.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/50">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Join this group to view and create posts.
                  </CardContent>
                </Card>
              )}

              {isLoadingPosts ? (
                <div className="text-center py-8">Loading posts...</div>
              ) : posts?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No posts yet. Be the first to share!</div>
              ) : (
                posts?.map(post => (
                  <Card key={post.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {post.user?.name?.[0] || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold">{post.user?.name || 'Unknown User'}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {(isAdmin || (user && Number(user.id) === Number((post as any).user_id ?? post.user?.id))) && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleDeletePost(post.id)} aria-label="Delete post">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{post.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
                 {isLoadingEvents ? (
                    <div className="text-center py-8">Loading events...</div>
                  ) : events?.length === 0 ? (
                    <Card className="bg-muted/50">
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                        <p>This group hasn&apos;t planned or shared any events yet.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                        {events?.map((event: any) => (
                            <Link href={`/events/${event.id}`} key={event.id} className="block">
                                <Card className="hover:border-primary/50 transition-colors">
                                    <CardContent className="p-4 flex gap-4">
                                        <div className="w-16 h-16 bg-primary/10 rounded-lg flex flex-col items-center justify-center text-primary shrink-0">
                                            <span className="text-xs font-bold uppercase">{new Date(event.start_time).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-xl font-bold">{new Date(event.start_time).getDate()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-lg truncate">{event.title}</h3>
                                            <div className="flex items-center text-sm text-muted-foreground mt-1 gap-4">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {event.location_name || 'TBD'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    {event.attendees_count || 0} attending
                                                </Badge>
                                                {/* If we had shared_by info, we could show it here */}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                  )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Members */}
        <div className="space-y-6">
          {/* Connected Groups Section */}
          {group.matching_enabled && connectedGroups && connectedGroups.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Connected Groups</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {connectedGroups.map(connectedGroup => (
                            <Link href={`/groups/${connectedGroup.id}`} key={connectedGroup.id} className="flex items-center gap-3 hover:bg-muted/50 p-2 rounded transition-colors">
                                <div className="text-2xl bg-muted p-2 rounded-full">
                                    {connectedGroup.icon || '👥'}
                                </div>
                                <div>
                                    <div className="font-medium text-sm">{connectedGroup.name}</div>
                                    <div className="text-xs text-muted-foreground">{connectedGroup.member_count} members</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(showAllMembers ? group.members : group.members?.slice(0, 5))?.map(member => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {member.user?.name?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{member.user?.name || 'User'}</div>
                      <div className="text-xs text-muted-foreground capitalize">{member.role}</div>
                    </div>
                  </div>
                ))}
                {group.members && group.members.length > 5 && (
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-sm"
                    onClick={() => setShowAllMembers((prev) => !prev)}
                  >
                    {showAllMembers ? 'Show fewer members' : `View all ${group.member_count || group.members.length} members`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
