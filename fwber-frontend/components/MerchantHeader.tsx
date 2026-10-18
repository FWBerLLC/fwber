'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  ArrowLeft,
  Home,
  Menu,
  X,
  PlusCircle,
  BarChart3,
  LogOut,
  LayoutDashboard,
  Store
} from 'lucide-react'

interface MerchantHeaderProps {
  title?: string
  showNav?: boolean
}

const navLinks = [
  { href: '/merchant/dashboard', label: 'Dashboard', icon: Home },
  { href: '/merchant/promotions', label: 'Promotions', icon: LayoutDashboard },
  { href: '/merchant/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/merchant/profile', label: 'Profile', icon: Store },
  { href: '/merchant/promotions/new', label: 'New Promotion', icon: PlusCircle },
]

export default function MerchantHeader({ title = 'fwber Merchant', showNav = true }: MerchantHeaderProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const homeHref = '/merchant/dashboard'
  const shouldShowBackButton = pathname !== homeHref

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push(homeHref)
  }

  return (
    <header data-app-header="true" className="bg-card dark:bg-background shadow sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            {shouldShowBackButton && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-full p-2 text-foreground transition-colors hover:bg-muted dark:bg-card dark:text-muted-foreground dark:hover:bg-gray-800"
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Link href={homeHref} className="flex items-center gap-2 hover:opacity-90 transition-opacity" aria-label="Go home">
              <Logo className="text-3xl" />
              <span className="hidden sm:inline-block font-semibold text-foreground dark:text-foreground px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs uppercase tracking-wider">Merchant</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {showNav && (
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground dark:text-muted-foreground hover:bg-muted dark:bg-card dark:hover:bg-gray-800 transition-colors"
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* User Menu */}
            <div className="relative">
              <button type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground dark:text-muted-foreground hover:bg-muted dark:bg-card dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
                  {(user?.name || user?.email || 'M').charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline">{user?.name || user?.email}</span>
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setUserMenuOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-card dark:bg-card rounded-lg shadow-lg border border-border dark:border-border py-1 z-50">
                    <div className="px-4 py-3 border-b border-border dark:border-border">
                      <p className="text-sm font-medium text-foreground dark:text-foreground truncate">
                        {user?.name || 'Merchant'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground dark:text-muted-foreground hover:bg-muted dark:bg-card dark:hover:bg-gray-700"
                    >
                      <LogOut className="w-4 h-4" />
                      Back to App
                    </Link>
                    
                    <div className="border-t border-border dark:border-border mt-1 pt-1">
                      <button type="button"
                        onClick={() => {
                          setUserMenuOpen(false)
                          logout()
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            {showNav && (
              <button type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-foreground dark:text-muted-foreground hover:bg-muted dark:bg-card dark:hover:bg-gray-800"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {showNav && mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border dark:border-border">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-foreground dark:text-muted-foreground hover:bg-muted dark:bg-card dark:hover:bg-gray-800 transition-colors"
                >
                  <link.icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
