'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiClient } from '@/lib/api/client';
import { ArrowLeft, Shield, UserX, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/utils/avatar';

interface BlockedUser {
  id: number;
  name: string;
  profile: {
    displayName: string;
    avatarUrl?: string;
  };
  blocked_at: string;
}

export default function BlockedUsersPage() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unblockingId, setUnblockingId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<number | null>(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const response = await apiClient.get<{ data: BlockedUser[] }>('/blocks');
      setBlockedUsers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch blocked users', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (userId: number) => {
    setUnblockingId(userId);
    try {
      await apiClient.delete(`/blocks/${userId}`);
      setBlockedUsers(prev => prev.filter(user => user.id !== userId));
      setShowConfirmModal(null);
    } catch (error) {
      console.error('Failed to unblock user', error);
    } finally {
      setUnblockingId(null);
    }
  };

  const filteredUsers = blockedUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.profile.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link href="/settings" className="p-2 -ml-2 hover:bg-gray-100 dark:bg-gray-800 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Blocked Users</h1>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search blocked users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No blocked users</h3>
                <p className="text-gray-500 mt-1">
                  {searchQuery ? 'No users match your search.' : 'You haven\'t blocked anyone yet.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <li key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:bg-gray-900 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                        {user.profile.avatarUrl ? (
                          <Image
                            src={getAvatarUrl(user.profile.avatarUrl, user.profile.displayName)}
                            alt={user.profile.displayName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <UserX className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{user.profile.displayName}</h3>
                        <p className="text-sm text-gray-500">Blocked on {new Date(user.blocked_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => setShowConfirmModal(user.id)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Unblock
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-sm w-full p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Unblock User?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to unblock this user? They will be able to see your profile and send you messages again.
              </p>
              <div className="flex justify-end gap-3">
                <button type="button"
                  onClick={() => setShowConfirmModal(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button type="button"
                  onClick={() => handleUnblock(showConfirmModal)}
                  disabled={unblockingId === showConfirmModal}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {unblockingId === showConfirmModal ? 'Unblocking...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
