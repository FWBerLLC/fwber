'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { api } from '@/lib/api/client';

export default function DailyCheckinPage() {
  const { token } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await api.post('/user/checkin', {});
        setResult(data);
      } catch {
        try {
          const data = await api.get('/user/checkin');
          setResult(data);
        } catch {
          setResult({ error: true });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader />
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-6">🔥</div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-4">Daily Check-in</h1>
          {loading ? (
            <div className="animate-pulse h-8 bg-muted dark:bg-card rounded w-48 mx-auto" />
          ) : result?.error ? (
            <p className="text-muted-foreground">Could not process check-in. Please try again.</p>
          ) : (
            <div className="space-y-3">
              {result?.streak !== undefined && (
                <p className="text-orange-500 font-bold text-xl">🔥 {result.streak} Day Streak!</p>
              )}
              {result?.tokens_earned > 0 && (
                <p className="text-green-500 font-semibold">+{result.tokens_earned} FWB earned!</p>
              )}
              {result?.already_checked_in && (
                <p className="text-muted-foreground">Already checked in today. Come back tomorrow!</p>
              )}
              <a href="/dashboard" className="inline-block mt-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                Back to Dashboard
              </a>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
