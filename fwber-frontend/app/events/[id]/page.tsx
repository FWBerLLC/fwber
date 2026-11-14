'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useEvent, useRsvpEvent } from '@/lib/hooks/use-events';
import { useAuth } from '@/lib/auth-context';
import AppHeader from '@/components/AppHeader';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Check,
  Coins,
  DollarSign,
  Lock,
  MapPin,
  MessageCircle,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react';
import InviteUserModal from '@/components/events/InviteUserModal';
import EventPaymentModal from '@/components/events/EventPaymentModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Chatroom from '@/components/chatrooms/Chatroom';
import dynamic from 'next/dynamic';

const EventMap = dynamic(() => import('@/components/EventMap').then(mod => mod.EventMap), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-muted dark:bg-card animate-pulse rounded-lg flex items-center justify-center">Loading Map...</div>
});

export default function EventDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const { data: event, isLoading } = useEvent(id as string);
  const rsvp = useRsvpEvent();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard API may be blocked in insecure contexts
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background">
        {isAuthenticated && <AppHeader title="Event Details" />}
        <div className="container mx-auto px-4 py-12 max-w-4xl flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background">
        {isAuthenticated && <AppHeader title="Event Details" />}
        <div className="container mx-auto px-4 py-12 max-w-lg">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              {isAuthenticated ? <Calendar className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              {isAuthenticated ? 'Event Not Found' : 'Sign In to View Event Details'}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {isAuthenticated
                ? 'This event may have ended, reached capacity, or been removed by its host.'
                : 'Event locations, attendee lists, and live maps are protected for member safety and proximity privacy. Sign in to view full details and RSVP.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Sign In
                </Link>
              )}
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                Browse Events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentUserAttendee = Array.isArray((event as any).attendees)
    ? (event as any).attendees.find((a: any) => Number(a?.user?.id) === Number(user?.id))
    : undefined;
  const activeRsvpStatus = (rsvp.variables?.status as string | undefined) || currentUserAttendee?.status;

  const handleRsvp = (status: string) => {
    // If declining or just 'maybe', proceed directly
    if (status !== 'attending') {
      rsvp.mutate({ id: event.id, status });
      return;
    }

    const hasPrice = (event.price && Number(event.price) > 0) || (event.token_cost && Number(event.token_cost) > 0);

    if (hasPrice) {
      setIsPaymentModalOpen(true);
      return;
    }

    // Free event confirmation
    rsvp.mutate({ id: event.id, status });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-muted dark:bg-background">
        {isAuthenticated && <AppHeader title={event.title} />}

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-4">
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Nearby Events
            </Link>
          </div>

          <div className="bg-card dark:bg-card rounded-lg shadow-lg overflow-hidden border border-border">
            <div className="p-6">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <h1 className="text-3xl font-bold text-foreground">{event.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="px-3 py-1 bg-muted text-foreground rounded-full text-sm font-medium flex items-center gap-1 hover:bg-muted/80"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                        {copiedLink ? 'Copied' : 'Share'}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Copy a shareable oEmbed-ready link to this event</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setIsInviteModalOpen(true)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm font-medium flex items-center gap-1 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Send direct event invitations to your matches or friends</TooltipContent>
                  </Tooltip>

                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      event.status === 'upcoming'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {event.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="w-5 h-5 mr-3 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Starts: {new Date(event.starts_at).toLocaleString()}</p>
                      <p className="text-sm">Ends: {new Date(event.ends_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="w-5 h-5 mr-3 shrink-0" />
                    <span>{event.location_name}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Users className="w-5 h-5 mr-3 shrink-0" />
                    <span>
                      {event.attendees_count} {event.max_attendees ? `/ ${event.max_attendees}` : ''} attending
                    </span>
                  </div>
                  {event.price && Number(event.price) > 0 && (
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="w-5 h-5 mr-3 shrink-0" />
                      <span>${Number(event.price).toFixed(2)}</span>
                    </div>
                  )}
                  {event.token_cost && Number(event.token_cost) > 0 && (
                    <div className="flex items-center text-muted-foreground">
                      <Coins className="w-5 h-5 mr-3 shrink-0 text-purple-500" />
                      <span className="text-purple-600 dark:text-purple-400 font-semibold">{Number(event.token_cost)} Tokens</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <Tabs defaultValue="about" className="w-full">
                  <TabsList className="w-full justify-start border-b border-border rounded-none h-auto p-0 bg-transparent space-x-6">
                    <TabsTrigger
                      value="about"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-0 py-3"
                    >
                      About
                    </TabsTrigger>
                    {event.chatroom_id && (
                      <TabsTrigger
                        value="discussion"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-0 py-3 flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Discussion
                      </TabsTrigger>
                    )}
                    {event.latitude && event.longitude && (
                      <TabsTrigger
                        value="map"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 px-0 py-3 flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Live Map
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="about" className="pt-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                    </div>
                  </TabsContent>

                  {event.chatroom_id && (
                    <TabsContent value="discussion" className="pt-6">
                      <Chatroom chatroomId={event.chatroom_id} />
                    </TabsContent>
                  )}
                  {event.latitude && event.longitude && (
                    <TabsContent value="map" className="pt-6">
                      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h3 className="font-semibold flex items-center gap-2">
                          <MapPin className="w-4 h-4" /> Live Event Map
                        </h3>
                        <p className="text-sm mt-1">
                          See where other attendees are right now! Your location is shared anonymously with other attendees while viewing this map.
                        </p>
                      </div>
                      <EventMap
                        eventId={event.id}
                        centerLat={Number(event.latitude)}
                        centerLng={Number(event.longitude)}
                      />
                    </TabsContent>
                  )}
                </Tabs>
              </div>

              <div className="border-t border-border pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2 className="text-xl font-semibold">RSVP</h2>
                  {activeRsvpStatus && (
                    <span className="text-xs font-medium rounded-full bg-muted px-3 py-1 text-muted-foreground">
                      Your status: <strong className="capitalize text-foreground">{activeRsvpStatus}</strong>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={rsvp.isPending}
                        onClick={() => handleRsvp('attending')}
                        className={`px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 ${
                          activeRsvpStatus === 'attending' ? 'ring-2 ring-green-400 ring-offset-2 dark:ring-offset-background' : ''
                        }`}
                      >
                        Attend
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Confirm your spot and join the attendee roster</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={rsvp.isPending}
                        onClick={() => handleRsvp('maybe')}
                        className={`px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 ${
                          activeRsvpStatus === 'maybe' ? 'ring-2 ring-yellow-400 ring-offset-2 dark:ring-offset-background' : ''
                        }`}
                      >
                        Maybe
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Bookmark this event as tentative without claiming a paid spot</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={rsvp.isPending}
                        onClick={() => handleRsvp('declined')}
                        className={`px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 ${
                          activeRsvpStatus === 'declined' ? 'ring-2 ring-red-400 ring-offset-2 dark:ring-offset-background' : ''
                        }`}
                      >
                        Decline
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Let the host know you cannot make it</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          <InviteUserModal
            eventId={event.id}
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
          />

          <EventPaymentModal
            event={event}
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
