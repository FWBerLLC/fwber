import ProtectedRoute from '@/components/ProtectedRoute'
import ProfilePageClient from '@/components/profile/ProfilePageClient'
import AppHeader from '@/components/AppHeader'

export const dynamic = 'force-dynamic'

export default function ProfileEditPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader title="Edit Profile" />
        <ProfilePageClient />
      </div>
    </ProtectedRoute>
  )
}
