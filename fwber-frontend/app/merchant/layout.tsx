'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import MerchantHeader from '@/components/MerchantHeader'
import { Loader2 } from 'lucide-react'

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(pathname))
      return
    }

    // specific logic: if user is NOT a merchant, they must be on the register page
    if (user?.role !== 'merchant' && pathname !== '/merchant/register') {
      router.push('/merchant/register')
    }

    // if user IS a merchant and tries to go to register, send them to dashboard
    if (user?.role === 'merchant' && pathname === '/merchant/register') {
      router.push('/merchant/dashboard')
    }
  }, [user, isAuthenticated, isLoading, router, pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect
  }

  // Hide nav on register page or if not a merchant
  const showNav = user?.role === 'merchant' && pathname !== '/merchant/register'

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      <MerchantHeader showNav={showNav} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
