'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/utils/avatar';
import { api } from '@/lib/api/client';
import { X, Search, UserPlus, Check, Users, User as UserIcon } from 'lucide-react';
import { Group, getMyGroups } from '@/lib/api/groups';
import { PaginatedResponse } from '@/lib/api/types';

interface User {
  id: number;
  name: string;
  avatar_url?: string;
}

interface InviteUserModalProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'friends' | 'groups';

export default function InviteUserModal({ eventId, isOpen, onClose }: InviteUserModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  
  // Friends state
  const [matches, setMatches] = useState<User[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [invitingUser, setInvitingUser] = useState<number | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<number[]>([]);

  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [invitingGroup, setInvitingGroup] = useState<number | null>(null);
  const [invitedGroups, setInvitedGroups] = useState<number[]>([]);

  const fetchMatches = useCallback(async () => {
    if (matches.length > 0) return;
    setLoadingMatches(true);
    try {
      const response = await api.get<User[]>('/matches/established');
      setMatches(response);
    } catch (error) {
      console.error('Failed to fetch matches', error);
    } finally {
      setLoadingMatches(false);
    }
  }, [matches.length]);

  const fetchGroups = useCallback(async () => {
    if (groups.length > 0) return;
    setLoadingGroups(true);
    try {
      const response = await getMyGroups();
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch groups', error);
    } finally {
      setLoadingGroups(false);
    }
  }, [groups.length]);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'friends') {
        fetchMatches();
      } else {
        fetchGroups();
      }
    }
  }, [isOpen, activeTab, fetchMatches, fetchGroups]);

  const handleInviteUser = async (userId: number) => {
    setInvitingUser(userId);
    try {
      await api.post(`/events/${eventId}/invite`, { user_id: userId });
      setInvitedUsers([...invitedUsers, userId]);
    } catch (error) {
      console.error('Failed to invite user', error);
      alert('Failed to invite user');
    } finally {
      setInvitingUser(null);
    }
  };

  const handleInviteGroup = async (groupId: number) => {
    setInvitingGroup(groupId);
    try {
      await api.post(`/events/${eventId}/invite`, { group_id: groupId });
      setInvitedGroups([...invitedGroups, groupId]);
    } catch (error) {
      console.error('Failed to invite group', error);
      alert('Failed to invite group');
    } finally {
      setInvitingGroup(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 relative">
        <button type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold mb-4">Invite to Event</h2>

        <div className="flex border-b dark:border-gray-700 mb-4">
          <button
            className={`flex-1 pb-2 font-medium flex items-center justify-center gap-2 ${
              activeTab === 'friends'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('friends')}
          >
            <UserIcon className="w-4 h-4" />
            Friends
          </button>
          <button
            className={`flex-1 pb-2 font-medium flex items-center justify-center gap-2 ${
              activeTab === 'groups'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('groups')}
          >
            <Users className="w-4 h-4" />
            My Groups
          </button>
        </div>

        <div className="mb-4 relative">
          <input
            type="text"
            placeholder={activeTab === 'friends' ? "Search matches..." : "Search groups..."}
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2">
          {activeTab === 'friends' ? (
            loadingMatches ? (
              <div className="text-center py-4">Loading friends...</div>
            ) : matches.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No matches found to invite.</div>
            ) : (
              matches.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden relative">
                      {user.avatar_url ? (
                        <Image 
                          src={getAvatarUrl(user.avatar_url, user.name)} 
                          alt={user.name} 
                          width={40} 
                          height={40} 
                          className="object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          {user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{user.name}</span>
                  </div>
                  <button type="button"
                    onClick={() => handleInviteUser(user.id)}
                    disabled={invitingUser === user.id || invitedUsers.includes(user.id)}
                    className={`p-2 rounded-full ${
                      invitedUsers.includes(user.id)
                        ? 'bg-green-100 text-green-600'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                    aria-label={invitedUsers.includes(user.id) ? "Invited" : "Invite"}
                  >
                    {invitedUsers.includes(user.id) ? (
                      <Check className="w-5 h-5" />
                    ) : invitingUser === user.id ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UserPlus className="w-5 h-5" />
                    )}
                  </button>
                </div>
              ))
            )
          ) : (
            loadingGroups ? (
              <div className="text-center py-4">Loading groups...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No groups found to invite.</div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden relative flex items-center justify-center bg-indigo-100 text-indigo-600">
                      {group.icon ? (
                         <Image 
                           src={group.icon} 
                           alt={group.name} 
                           width={40} 
                           height={40} 
                           className="object-cover" 
                         />
                      ) : (
                        <Users className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium block">{group.name}</span>
                      <span className="text-xs text-gray-500">{group.member_count} members</span>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => handleInviteGroup(group.id)}
                    disabled={invitingGroup === group.id || invitedGroups.includes(group.id)}
                    className={`p-2 rounded-full ${
                      invitedGroups.includes(group.id)
                        ? 'bg-green-100 text-green-600'
                        : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                    }`}
                    aria-label={invitedGroups.includes(group.id) ? "Invited" : "Invite Group"}
                  >
                    {invitedGroups.includes(group.id) ? (
                      <Check className="w-5 h-5" />
                    ) : invitingGroup === group.id ? (
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UserPlus className="w-5 h-5" />
                    )}
                  </button>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
