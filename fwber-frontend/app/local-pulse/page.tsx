'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import LocalPulse from '@/components/LocalPulse';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function LocalPulsePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to access Local Pulse.</p>
          <button type="button"
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader title="Local Pulse" />
        <LocalPulse />
      </div>
    </ProtectedRoute>
  );
}
