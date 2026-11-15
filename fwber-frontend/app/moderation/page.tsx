'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import ModerationDashboard from '@/components/ModerationDashboard';

export default function ModerationPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader />
        <ModerationDashboard />
      </div>
    </ProtectedRoute>
  );
}
