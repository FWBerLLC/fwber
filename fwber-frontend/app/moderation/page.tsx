'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import ModerationDashboard from '@/components/ModerationDashboard';

export default function ModerationPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <ModerationDashboard />
      </div>
    </ProtectedRoute>
  );
}
