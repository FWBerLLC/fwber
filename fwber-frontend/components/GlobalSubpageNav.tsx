'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

import { useAuth } from '@/lib/auth-context'
import { Logo } from '@/components/Logo'

function shouldHideGlobalSubpageNav(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/api/')
  )
}

export default function GlobalSubpageNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [hasLocalHeader, setHasLocalHeader] = useState(false)
  const [headerCheckComplete, setHeaderCheckComplete] = useState(false)

  useEffect(() => {
    const updateHeaderPresence = () => {
      setHasLocalHeader(Boolean(document.querySelector('[data-app-header="true"]')))
      setHeaderCheckComplete(true)
    }

    updateHeaderPresence()

    const frameId = window.requestAnimationFrame(updateHeaderPresence)
    const timeoutId = window.setTimeout(updateHeaderPresence, 250)
    const observer = new MutationObserver(updateHeaderPresence)

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-app-header'],
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [pathname])

  if (!headerCheckComplete || shouldHideGlobalSubpageNav(pathname) || hasLocalHeader) {
    return null
  }

  const homeHref = user ? '/dashboard' : '/'

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push(homeHref)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-strong shadow-premium-lg fixed left-4 top-4 z-[60] flex items-center gap-2 rounded-full border border-white/20 px-2 py-2 dark:border-white/10"
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        type="button"
        onClick={handleBack}
        className="rounded-full p-2 text-foreground transition-colors hover:bg-card/20 dark:text-muted-foreground dark:hover:bg-card/10"
        aria-label="Go back"
        title="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </motion.button>
      <Link
        href={homeHref}
        className="flex items-center transition-opacity hover:opacity-90"
        aria-label="Go home"
      >
        <Logo className="text-2xl" />
      </Link>
    </motion.div>
  )
}
