'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground dark:text-foreground">Something went wrong</h2>
        <p className="text-muted-foreground dark:text-muted-foreground text-sm">
          We encountered an unexpected error. This has been logged and we&apos;re working on it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted dark:bg-card text-foreground dark:text-foreground rounded-xl font-semibold hover:bg-muted dark:hover:bg-gray-700 transition"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
