'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { blurFacesOnFile } from '@/lib/faceBlur'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Ticket, Loader2 } from 'lucide-react'

function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    referralCode: '',
  })
  const [avatar, setAvatar] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [referrer, setReferrer] = useState<{
    name: string
    avatar?: string
    hasGoldenTicket?: boolean
  } | null>(null)

  const { register, error, clearError, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const user = localStorage.getItem('fwber_user')
      const parsed = user ? JSON.parse(user) : {}
      const needsOnboarding = !parsed.onboarding_completed_at
      const destination = needsOnboarding ? '/onboarding' : '/dashboard'
      // Use setTimeout to avoid blocking the render cycle
      const timer = setTimeout(() => {
        router.push(destination)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, router])

  // Check for referral code
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setFormData((prev) => ({ ...prev, referralCode: ref }))

      // Verify referral code
      fetch(`/api/auth/referral/${ref}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setReferrer({
              name: data.referrer_name,
              avatar: data.referrer_avatar,
              hasGoldenTicket: data.has_golden_tickets,
            })
          }
        })
        .catch(console.error)
    }
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatar(file)

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    clearError()
    setValidationError(null)
    setSuccessMessage(null)

    // Client-side validation
    if (formData.password !== formData.passwordConfirmation) {
      setValidationError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    try {
      let finalAvatar = avatar
      if (finalAvatar && isFeatureEnabled('clientFaceBlur')) {
        try {
          const result = await blurFacesOnFile(finalAvatar)
          if (result.blurred) {
            finalAvatar = result.file
          }
        } catch (e) {
          console.warn('Face blur failed, proceeding with original', e)
        }
      }

      await register(
        formData.name,
        formData.email,
        formData.password,
        formData.passwordConfirmation,
        finalAvatar,
        formData.referralCode
      )
      setSuccessMessage('Account created successfully! Redirecting...')
      // Note: The useEffect hook will handle the redirect since isAuthenticated becomes true
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Registration failed. Please try again.'
      )
      setIsLoading(false)
    }
    // Note: We don't set isLoading(false) in finally block if successful
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h2 className="mt-6 text-center text-2xl font-bold text-foreground dark:text-foreground">
          Join fwber
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground dark:text-muted-foreground">
          Free to join. Your privacy is built in from day one.
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground dark:text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
          >
            Sign in
          </Link>
        </p>
      </div>

      {referrer && (
        <div className="animate-in fade-in slide-in-from-top-4 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 duration-500 dark:border-amber-800 dark:from-amber-900/20 dark:to-yellow-900/20">
          <div className="flex items-center gap-4">
            {referrer.avatar ? (
              <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-amber-400">
                <Image src={getAvatarUrl(referrer.avatar, referrer.name)} alt={referrer.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200 text-xl font-bold text-amber-800">
                {referrer.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                You&apos;ve been invited by <span className="font-bold">{referrer.name}</span>!
              </p>
              {referrer.hasGoldenTicket && (
                <div className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                  <Ticket className="h-3 w-3" />
                  <span>Includes 3 Days of Gold Premium</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground dark:text-muted-foreground"
            >
              Nickname (or first name)
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="given-name"
              required
              className="relative mt-1 block w-full appearance-none rounded-md border border-border px-3 py-2 text-foreground placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-border dark:bg-card dark:text-foreground dark:placeholder-gray-400"
              placeholder="What should we call you?"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground dark:text-muted-foreground"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="relative mt-1 block w-full appearance-none rounded-md border border-border px-3 py-2 text-foreground placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-border dark:bg-card dark:text-foreground dark:placeholder-gray-400"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label
              htmlFor="avatar"
              className="block text-sm font-medium text-foreground dark:text-muted-foreground"
            >
              Profile Photo{' '}
              <span className="font-normal text-muted-foreground dark:text-muted-foreground">
                (optional — you can stay anonymous)
              </span>
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-4
                file:rounded-full file:border-0 file:bg-blue-50
                file:px-4 file:py-2
                file:text-sm file:font-semibold
                file:text-blue-700 hover:file:bg-blue-100
                dark:text-muted-foreground dark:file:bg-blue-900/20
                dark:file:text-blue-400 dark:hover:file:bg-blue-900/30"
              onChange={handleFileChange}
            />
            {previewUrl && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-muted-foreground dark:text-muted-foreground">Preview:</p>
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-border dark:border-border">
                  <Image src={previewUrl} alt="Avatar preview" fill className="object-cover" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="referralCode"
              className="block text-sm font-medium text-foreground dark:text-muted-foreground"
            >
              Referral Code (Optional)
            </label>
            <input
              id="referralCode"
              name="referralCode"
              type="text"
              className="relative mt-1 block w-full appearance-none rounded-md border border-border px-3 py-2 text-foreground placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-border dark:bg-card dark:text-foreground dark:placeholder-gray-400"
              placeholder="Enter referral code if you have one"
              value={formData.referralCode}
              onChange={handleChange}
            />
            <p className="mt-1.5 text-xs text-muted-foreground dark:text-muted-foreground">
              Invite a friend and you&apos;ll both earn bonus tokens. Find your referral link in
              Settings after signing up.
            </p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground dark:text-muted-foreground"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="relative mt-1 block w-full appearance-none rounded-md border border-border px-3 py-2 text-foreground placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-border dark:bg-card dark:text-foreground dark:placeholder-gray-400"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div>
            <label
              htmlFor="passwordConfirmation"
              className="block text-sm font-medium text-foreground dark:text-muted-foreground"
            >
              Confirm Password
            </label>
            <input
              id="passwordConfirmation"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              required
              className="relative mt-1 block w-full appearance-none rounded-md border border-border px-3 py-2 text-foreground placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:border-border dark:bg-card dark:text-foreground dark:placeholder-gray-400"
              placeholder="Confirm your password"
              value={formData.passwordConfirmation}
              onChange={handleChange}
            />
          </div>
        </div>

        {successMessage && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="text-sm font-medium text-green-800 dark:text-green-400">
              {successMessage}
            </div>
          </div>
        )}

        {(error || validationError) && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="text-sm font-medium text-red-800 dark:text-red-400">
              {validationError || error}
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted px-4 py-12 sm:px-6 lg:px-8 dark:bg-background">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Loading registration...</p>
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  )
}
