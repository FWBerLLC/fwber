'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { Calendar, Check, X } from 'lucide-react';
import Link from 'next/link';

interface EventInvitation {
  id: number;
  event: {
    id: number;
    title: string;
    starts_at: string;
    location_name: string;
  };
  inviter: {
    name: string;
  };
  status: string;
  created_at: string;
}

export default function EventInvitationsList() {
  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const response = await api.get<EventInvitation[]>('/events/invitations');
      setInvitations(Array.isArray(response) ? response : response ? (response as any).data || [] : []);
    } catch (error) {
      console.error('Failed to fetch invitations', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id: number, status: 'accepted' | 'declined') => {
    setProcessing(id);
    try {
      await api.post(`/events/invitations/${id}/respond`, { status });
      setInvitations(invitations.filter((inv) => inv.id !== id));
    } catch (error) {
      console.error('Failed to respond to invitation', error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading invitations...</div>;
  if (invitations.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          Event Invitations
          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">
            {invitations.length}
          </span>
        </h2>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {(Array.isArray(invitations) ? invitations : []).map((invitation) => (
          <div key={invitation.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                <span className="font-bold">{invitation.inviter.name}</span> invited you to{' '}
                <Link href={`/events/${invitation.event.id}`} className="text-purple-600 hover:underline">
                  {invitation.event.title}
                </Link>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {new Date(invitation.event.starts_at).toLocaleDateString()} • {invitation.event.location_name}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => handleRespond(invitation.id, 'accepted')}
                disabled={processing === invitation.id}
                className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 disabled:opacity-50"
                title="Accept"
              >
                <Check className="w-5 h-5" />
              </button>
              <button type="button"
                onClick={() => handleRespond(invitation.id, 'declined')}
                disabled={processing === invitation.id}
                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:opacity-50"
                title="Decline"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
