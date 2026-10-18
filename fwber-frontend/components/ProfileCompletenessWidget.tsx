'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, Zap } from 'lucide-react';

export default function ProfileCompletenessWidget() {
  const { token, isAuthenticated } = useAuth();

  const { data: completeness } = useQuery({
    queryKey: ['profile-completeness'],
    enabled: isAuthenticated && !!token,
    queryFn: () => api.get<any>('/profile/completeness'),
  });

  if (!completeness) return null;

  const percentage = completeness.percentage || 0;
  const isComplete = completeness.required_complete;

  return (
    <div className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground dark:text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          Profile Power
        </h3>
        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{percentage}%</span>
      </div>

      <div className="w-full bg-muted dark:dark:bg-muted rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isComplete ? (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium mb-4">
          <CheckCircle2 className="w-4 h-4" />
          Profile is mission-ready
        </div>
      ) : (
        <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-4">
          Complete your profile to increase visibility and trust.
        </p>
      )}

      <Link
        href="/identity"
        className="flex items-center justify-center w-full py-2 px-4 bg-muted dark:dark:bg-muted hover:bg-muted dark:hover:dark:bg-muted rounded-lg text-sm font-semibold text-foreground dark:text-foreground transition-colors group"
      >
        Boost Profile
        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}
