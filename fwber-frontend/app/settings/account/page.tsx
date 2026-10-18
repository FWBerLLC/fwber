'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api/client';
import { ArrowLeft, Mail, Lock, Trash2, AlertTriangle, Download, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Email State
  const [email, setEmail] = useState(user?.email || '');
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delete Account State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // Data Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'ready'>('idle');

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      await apiClient.put('/profile', { email });
      setMessage({ type: 'success', text: 'Email updated successfully' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update email' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      await apiClient.put('/profile/password', { 
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword
      });
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update password' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post('/profile/delete', { password: deletePassword });
      await logout();
      router.push('/login');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete account' });
      setIsLoading(false);
    }
  };

  const handleDataExport = async () => {
    setIsExporting(true);
    try {
      const res = await apiClient.post<{ message: string }>('/user/export', {});
      setMessage({ type: 'success', text: res.data?.message || 'Data export requested. You will receive a download link via email when ready.' });
      setExportStatus('processing');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to request data export' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <header className="bg-card dark:bg-background shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link href="/settings" className="p-2 -ml-2 hover:bg-muted dark:bg-card rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <h1 className="text-xl font-bold text-foreground dark:text-foreground">Account Settings</h1>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {message && (
            <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}

          {/* Email Section */}
          <section className="bg-card dark:bg-card rounded-lg shadow-sm border border-border dark:border-border overflow-hidden">
            <div className="p-6 border-b border-border dark:border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Email Address</h2>
              </div>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-border dark:border-border dark:dark:bg-muted dark:text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || email === user?.email}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </section>

          {/* Password Section */}
          <section className="bg-card dark:bg-card rounded-lg shadow-sm border border-border dark:border-border overflow-hidden">
            <div className="p-6 border-b border-border dark:border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Change Password</h2>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">Current Password</label>
                  <input
                    type="password"
                    name="current_password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border dark:border-border dark:dark:bg-muted dark:text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">New Password</label>
                  <input
                    type="password"
                    name="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border dark:border-border dark:dark:bg-muted dark:text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    name="password_confirmation"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border dark:border-border dark:dark:bg-muted dark:text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                    minLength={8}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !currentPassword || !newPassword}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </section>

          {/* Data Export Section (GDPR) */}
          <section className="bg-card dark:bg-card rounded-lg shadow-sm border border-border dark:border-border overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400">
                  <Download className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Export Your Data</h2>
              </div>
              <p className="text-muted-foreground dark:text-muted-foreground mb-4">
                Download a copy of all your data including profile, messages, matches, and photos. We&apos;ll email you when your export is ready.
              </p>
              <button type="button"
                onClick={handleDataExport}
                disabled={isExporting || exportStatus === 'processing'}
                className="px-4 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'Requesting...' : exportStatus === 'processing' ? 'Export Processing...' : 'Request Data Export'}
              </button>
            </div>
          </section>

          {/* Privacy & Security Info */}
          <section className="bg-card dark:bg-card rounded-lg shadow-sm border border-border dark:border-border overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg text-green-600 dark:text-green-400">
                  <Shield className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Your Privacy Rights</h2>
              </div>
              <ul className="text-muted-foreground text-sm space-y-2">
                <li>&bull; <strong>Right to Access:</strong> Export all your personal data above.</li>
                <li>&bull; <strong>Right to Erasure:</strong> Delete your account below to remove all data.</li>
                <li>&bull; <strong>Right to Rectification:</strong> Update your profile information anytime.</li>
                <li>&bull; <strong>Data Portability:</strong> Your export is provided in machine-readable format.</li>
              </ul>
              <div className="mt-4">
                <Link href="/privacy" className="text-sm text-orange-600 hover:text-orange-500">
                  Read our full Privacy Policy →
                </Link>
              </div>
            </div>
          </section>

          {/* Delete Account Section */}
          <section className="bg-card dark:bg-card rounded-lg shadow-sm border border-red-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-red-600">Delete Account</h2>
              </div>
              
              {!showDeleteConfirm ? (
                <div>
                  <p className="text-muted-foreground dark:text-muted-foreground mb-4">
                    Permanently delete your account and all of your content. This action cannot be undone.
                  </p>
                  <button type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-md border border-red-100">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-red-800">Are you sure?</h3>
                      <p className="text-sm text-red-700 mt-1">
                        This action cannot be undone. Please enter your password to confirm.
                      </p>
                    </div>
                  </div>
                  <form onSubmit={handleDeleteAccount} className="space-y-4">
                    <input
                      type="password"
                      name="confirm_password"
                      placeholder="Enter your password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 dark:border-red-800 dark:dark:bg-muted dark:text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={isLoading || !deletePassword}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? 'Deleting...' : 'Delete My Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeletePassword('');
                        }}
                        className="px-4 py-2 text-muted-foreground hover:text-foreground dark:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
