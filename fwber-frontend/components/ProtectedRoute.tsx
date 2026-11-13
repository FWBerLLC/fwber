'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  redirectTo?: string
  requireOnboarding?: boolean
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = '/login',
  requireOnboarding = true
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, isBanned } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isBanned) {
        // Allow access to the appeals page if banned
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/council/appeals')) {
          router.push('/council/appeals')
        }
      } else if (!isAuthenticated) {
        router.push(redirectTo)
      } else if (requireOnboarding && user && !user.onboarding_completed_at) {
        // Check if we are already on the onboarding page to avoid loops
        // Note: This check is basic; ideally we'd check pathname but router doesn't expose it directly in this hook easily without usePathname
        // But since this component wraps pages, the page itself determines if it uses ProtectedRoute.
        // OnboardingPage should use ProtectedRoute with requireOnboarding={false}
        router.push('/onboarding')
      }
    }
  }, [isAuthenticated, isLoading, router, redirectTo, requireOnboarding, user, isBanned])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
