'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Logo } from '@/components/Logo'
import { ProfileSearch } from '@/components/ProfileSearch'
import { ConnectionStatusBadge } from './realtime/PresenceComponents'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  type LucideIcon,
  Menu,
  X,
  ArrowLeft,
  Home,
  Heart,
  MessageSquare,
  UserPlus,
  Calendar,
  Activity,
  MapPin,
  Shield,
  Settings,
  User,
  Bell,
  Plane,
  LogOut,
  CircleHelp,
  Crown,
  Wallet,
  Flame,
  Store,
  ShoppingBag,
  Sparkles,
  Gavel,
  Gift,
  Rocket,
  Phone,
  Lock,
  Radio,
  Map,
  Award,
  Compass,
  Wand2,
  HeartHandshake,
} from 'lucide-react'

interface AppHeaderProps {
  title?: string
  showNav?: boolean
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface ExploreSection {
  id: string
  label: string
  links: NavItem[]
}

const hardNavigationRoutes = new Set(['/help', '/nearby'])

function shouldDisablePrefetch(href: string) {
  return href !== '/dashboard' && href !== '/help'
}

function shouldUseHardNavigation(href: string) {
  return hardNavigationRoutes.has(href)
}

const navLinks: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/matches', label: 'Matches', icon: Heart },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/friends', label: 'Friends', icon: UserPlus },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/nearby', label: 'Nearby', icon: MapPin },
  { href: '/safety', label: 'Safety', icon: Shield },
]

const accountLinks: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/travel', label: 'Travel Mode', icon: Plane },
  { href: '/settings/account', label: 'Account', icon: User },
]

function getExploreLinks(user: { role?: string; is_moderator?: boolean } | null): NavItem[] {
  const links: NavItem[] = [
    { href: '/matching', label: 'Matching', icon: Heart },
    { href: '/scenes', label: 'Scenes', icon: Compass },
    { href: '/connections', label: 'Connections', icon: HeartHandshake },
    { href: '/places', label: 'Places', icon: Map },
    { href: '/plans', label: 'Plans', icon: Calendar },
    { href: '/identity', label: 'Identity', icon: User },
    { href: '/reputation', label: 'Reputation', icon: Award },
    { href: '/support', label: 'Support', icon: CircleHelp },
    { href: '/operations', label: 'Operations', icon: Shield },
    { href: '/economy', label: 'Economy', icon: Wallet },
    { href: '/studio', label: 'Studio', icon: Wand2 },
    { href: '/spaces', label: 'Spaces', icon: Radio },
    { href: '/commerce', label: 'Commerce', icon: Store },
    { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  ]

  if (user?.is_moderator) {
    links.push({ href: '/moderation', label: 'Moderation', icon: Gavel })
  }

  return links
}

function getExploreSections(
  user: { role?: string; is_moderator?: boolean } | null
): ExploreSection[] {
  const links = getExploreLinks(user)

  const hrefMap = new globalThis.Map(links.map((link) => [link.href, link]))

  const sections: Array<{ id: string; label: string; hrefs: string[] }> = [
    {
      id: 'dating',
      label: 'Dating loop',
      hrefs: ['/matching', '/scenes', '/connections', '/places', '/plans', '/marketplace'],
    },
    {
      id: 'trust',
      label: 'Identity & trust',
      hrefs: ['/identity', '/reputation', '/support', '/operations'],
    },
    {
      id: 'growth',
      label: 'Premium & growth',
      hrefs: ['/economy'],
    },
    {
      id: 'creative',
      label: 'Creative & live',
      hrefs: ['/studio', '/spaces'],
    },
    {
      id: 'local-business',
      label: 'Local business',
      hrefs: ['/commerce', '/moderation'],
    },
  ]

  return sections
    .map((section) => ({
      id: section.id,
      label: section.label,
      links: section.hrefs
        .map((href) => hrefMap.get(href))
        .filter((link): link is NavItem => Boolean(link)),
    }))
    .filter((section) => section.links.length > 0)
}

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function getNavLinkClasses(isActive: boolean, compact = false) {
  return [
    'group flex items-center rounded-xl font-medium transition-colors',
    compact ? 'gap-2 px-3 py-2 text-sm' : 'gap-3 px-4 py-3 text-sm',
    isActive
      ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-sm'
      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
  ].join(' ')
}

function getUtilityLinkClasses(isActive: boolean) {
  return [
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
  ].join(' ')
}

export default function AppHeader({ title = 'FWBer', showNav = true }: AppHeaderProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const bodyClass = 'app-shell-sidebar'

    if (showNav) {
      document.body.classList.add(bodyClass)
    } else {
      document.body.classList.remove(bodyClass)
    }

    return () => {
      document.body.classList.remove(bodyClass)
    }
  }, [showNav])

  const userDisplayName = user?.display_name || user?.name || user?.email || 'User'
  const userInitial = (userDisplayName?.[0] || 'U').toUpperCase()
  const homeHref = user ? '/dashboard' : '/'
  const shouldShowBackButton = pathname !== homeHref
  const exploreSections = getExploreSections(
    user as { role?: string; is_moderator?: boolean } | null
  )

  const handleLogout = () => {
    logout()
  }

  const navigateHome = () => {
    if (!homeHref) return
    if (shouldUseHardNavigation(homeHref)) {
      window.location.href = homeHref
      return
    }

    router.push(homeHref)
  }

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    navigateHome()
  }

  const renderNavLink = (
    link: NavItem,
    className: string,
    options?: {
      onClick?: () => void
    }
  ) => {
    const content = (
      <>
        <link.icon className="h-5 w-5" />
        <span>{link.label}</span>
      </>
    )

    if (shouldUseHardNavigation(link.href)) {
      return (
        <a key={link.href} href={link.href} onClick={options?.onClick} className={className}>
          {content}
        </a>
      )
    }

    return (
      <Link
        key={link.href}
        href={link.href}
        prefetch={!shouldDisablePrefetch(link.href)}
        onClick={options?.onClick}
        className={className}
      >
        {content}
      </Link>
    )
  }

  return (
    <>
      <header
        data-app-header="true"
        className={`sticky top-0 z-40 bg-white shadow dark:bg-gray-900 ${
          showNav ? 'app-header-with-sidebar' : ''
        }`}
      >
        <div className="mx-auto flex h-[4.625rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {shouldShowBackButton && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <Link
              href={homeHref}
              className="flex items-center gap-2 pr-1 transition-opacity hover:opacity-90"
              aria-label="Go home"
            >
              <Logo className="text-3xl" />
            </Link>
            <div className="ml-4 mr-2 hidden md:flex">
              <ProfileSearch />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <ConnectionStatusBadge className="ml-5 shrink-0" />
                {title && title !== 'FWBer' && (
                  <span className="hidden truncate text-sm font-medium text-gray-500 sm:inline dark:text-gray-400">
                    {title}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <ThemeToggle />
            <NotificationBell />

            <div className="hidden items-center gap-2 lg:flex">
              {accountLinks.map((link) => {
                const active = isActivePath(pathname, link.href)

                return shouldUseHardNavigation(link.href) ? (
                  <a key={link.href} href={link.href} className={getUtilityLinkClasses(active)}>
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={!shouldDisablePrefetch(link.href)}
                    className={getUtilityLinkClasses(active)}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                )
              })}

              <button type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 sm:flex dark:border-gray-700 dark:bg-gray-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-500 text-sm font-bold text-white">
                {userInitial}
              </div>
              <span className="max-w-32 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                {userDisplayName}
              </span>
            </div>

            {showNav && (
              <button type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 lg:hidden dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>

        {showNav && mobileMenuOpen && (
          <div className="border-t border-gray-200 px-4 py-4 lg:hidden dark:border-gray-700">
            <nav className="space-y-1" aria-label="Mobile primary navigation">
              {navLinks.map((link) => {
                const active = isActivePath(pathname, link.href)
                return renderNavLink(link, getNavLinkClasses(active), {
                  onClick: () => setMobileMenuOpen(false),
                })
              })}
            </nav>

            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:border-gray-800 dark:bg-gray-950/60">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Product map
              </p>
              <div className="space-y-3">
                {exploreSections.map((section) => (
                  <div key={section.id}>
                    <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                      {section.label}
                    </p>
                    <div className="space-y-1">
                      {section.links.map((link) => {
                        const active = isActivePath(pathname, link.href)
                        return renderNavLink(link, getNavLinkClasses(active, true), {
                          onClick: () => setMobileMenuOpen(false),
                        })
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="mb-3 flex items-center gap-3 px-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-500 text-base font-bold text-white">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {userDisplayName}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {user?.email || 'Signed in'}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                {accountLinks.map((link) => {
                  const active = isActivePath(pathname, link.href)
                  return shouldUseHardNavigation(link.href) ? (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={getNavLinkClasses(active, true)}
                    >
                      <link.icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={!shouldDisablePrefetch(link.href)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={getNavLinkClasses(active, true)}
                    >
                      <link.icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  )
                })}

                <button type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {showNav && (
        <aside className="fixed bottom-0 left-0 top-[4.625rem] z-30 hidden w-72 border-r border-gray-200 bg-white/95 backdrop-blur lg:flex lg:flex-col dark:border-gray-700 dark:border-gray-800 dark:bg-gray-900/95">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="glass shadow-premium mb-6 rounded-2xl border border-white/20 p-4 dark:border-white/5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-500 text-base font-bold text-white">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {userDisplayName}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {user?.email || 'Signed in'}
                  </p>
                </div>
              </div>
            </div>

            <nav className="space-y-1" aria-label="Primary navigation">
              {navLinks.map((link) => {
                const active = isActivePath(pathname, link.href)
                return renderNavLink(link, getNavLinkClasses(active))
              })}
            </nav>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:border-gray-800 dark:bg-gray-950/60">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Product map
              </p>
              <div className="space-y-4">
                {exploreSections.map((section) => (
                  <div key={section.id}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                      {section.label}
                    </p>
                    <div className="space-y-1">
                      {section.links.map((link) => {
                        const active = isActivePath(pathname, link.href)
                        return renderNavLink(link, getNavLinkClasses(active, true))
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass mt-6 rounded-2xl border border-white/20 p-4 shadow-sm dark:border-white/5">
              <a
                href="/help"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400"
              >
                <CircleHelp className="h-4 w-4" />
                <span>Need help?</span>
              </a>
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
