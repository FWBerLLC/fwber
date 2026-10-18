import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full text-center">
        <h2 className="text-6xl font-bold text-foreground dark:text-foreground mb-4">404</h2>
        <h3 className="text-2xl font-semibold text-foreground dark:text-muted-foreground mb-2">Page Not Found</h3>
        <p className="text-muted-foreground dark:text-muted-foreground mb-6">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go back home
        </Link>
      </div>
    </div>
  )
}
