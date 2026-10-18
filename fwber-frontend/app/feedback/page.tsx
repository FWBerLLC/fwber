'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { api } from '@/lib/api/client';

export default function FeedbackPage() {
  const { token } = useAuth();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      await api.post('/feedback', { message: text });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader />
        <main className="max-w-xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-6">Send Feedback</h1>
          {sent ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
              <p className="text-green-700 dark:text-green-300 font-medium">Thank you for your feedback!</p>
              <p className="text-green-600 dark:text-green-400 text-sm mt-2">We appreciate you helping us improve fwber.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={6}
                placeholder="Tell us what you think, what could be better, or report a bug..."
                className="w-full rounded-xl border border-border dark:border-border bg-card dark:bg-card px-4 py-3 text-foreground dark:text-foreground focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? 'Sending...' : 'Send Feedback'}
              </button>
            </form>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
