import React from 'react';
import Link from 'next/link';
import { Event } from '@/lib/hooks/use-events';
import { Calendar, MapPin, Tag, Users } from 'lucide-react';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`} className="block">
      <div className="bg-card dark:bg-card rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
        <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
        <div className="flex items-center text-muted-foreground dark:text-muted-foreground mb-1">
          <Calendar className="w-4 h-4 mr-2" />
          <span className="text-sm">
            {new Date(event.starts_at || (event as any).start_time).toLocaleDateString()} {new Date(event.starts_at || (event as any).start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center text-muted-foreground dark:text-muted-foreground mb-1">
          <MapPin className="w-4 h-4 mr-2" />
          <span className="text-sm truncate">{event.location_name}</span>
        </div>
        <div className="flex items-center text-muted-foreground dark:text-muted-foreground">
          <Users className="w-4 h-4 mr-2" />
          <span className="text-sm">{event.attendees_count} attending</span>
        </div>
        {event.scene_signals && (
          <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50 p-3 text-sm text-purple-900">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-700">
              <Tag className="h-3.5 w-3.5" />
              <span>Scene aligned +{Math.round(event.scene_signals.score_boost * 100)} pts</span>
            </div>
            {event.scene_signals.headline && (
              <p className="mb-2 text-sm text-purple-900">{event.scene_signals.headline}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(event.scene_signals.matched_topics) ? event.scene_signals.matched_topics : []).map((topic) => (
                <span
                  key={`event-topic-${event.id}-${topic.slug}`}
                  className="rounded-full bg-card dark:bg-card px-2.5 py-1 text-xs font-medium text-purple-800"
                >
                  {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                </span>
              ))}
              {(Array.isArray(event.scene_signals.matched_tags) ? event.scene_signals.matched_tags : []).map((tag) => (
                <span
                  key={`event-tag-${event.id}-${tag}`}
                  className="rounded-full bg-card dark:bg-gray-800/80 px-2.5 py-1 text-xs font-medium text-purple-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {event.price && Number(event.price) > 0 && (
            <div className="mt-2 text-green-600 font-medium">
                ${Number(event.price).toFixed(2)}
            </div>
        )}
      </div>
    </Link>
  );
}
