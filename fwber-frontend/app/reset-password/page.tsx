'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password,
        password_confirmation: passwordConfirmation,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err?.data?.message || 'Invalid or expired reset link. Please request a new one.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4 dark:bg-background">
        <div className="w-full max-w-md text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground dark:text-foreground">Invalid Link</h2>
          <p className="mb-6 text-muted-foreground dark:text-muted-foreground">
            This password reset link is invalid. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="font-medium text-orange-600 hover:text-orange-500"
          >
            Request New Link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted px-4 dark:bg-background">
      <div className="absolute left-4 top-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:text-foreground dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
      </div>
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-foreground dark:text-foreground">
              Password Reset!
            </h2>
            <p className="mb-6 text-muted-foreground dark:text-muted-foreground">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-600"
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-center text-2xl font-bold text-foreground dark:text-foreground">
              Reset Your Password
            </h2>
            <p className="mb-8 text-center text-muted-foreground dark:text-muted-foreground">
              Enter your new password below.
            </p>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground dark:text-muted-foreground"
                >
                  New Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border border-border px-3 py-2 pr-10 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm dark:border-border dark:bg-card dark:text-foreground"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="passwordConfirmation"
                  className="block text-sm font-medium text-foreground dark:text-muted-foreground"
                >
                  Confirm New Password
                </label>
                <input
                  id="passwordConfirmation"
                  type="password"
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border px-3 py-2 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm dark:border-border dark:bg-card dark:text-foreground"
                  placeholder="Confirm your password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-md border border-transparent bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
