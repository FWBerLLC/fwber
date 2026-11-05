'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('No verification token found. Please request a new verification email.')
      return
    }

    apiClient.post('/email/verify', { token })
      .then((res: any) => {
        if (res.success || res.data?.success) {
          setStatus('success')
          setMessage(res.message || res.data?.message || 'Your email has been verified successfully!')
        } else {
          setStatus('error')
          setMessage(res.message || res.data?.message || 'Verification failed.')
        }
      })
      .catch((err: any) => {
        setStatus('error')
        setMessage(err.response?.data?.message || err.message || 'Verification failed. The link may have expired.')
      })
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Email Verification</h1>
        </div>

        <div className="bg-card dark:bg-card rounded-2xl border border-border dark:border-border p-8 shadow-sm">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
              <p className="text-muted-foreground dark:text-muted-foreground">Verifying your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">Verified!</h2>
              <p className="text-muted-foreground dark:text-muted-foreground mb-6">{message}</p>
              <button type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-lg"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Verification Failed</h2>
              <p className="text-muted-foreground dark:text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/settings"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-lg"
                >
                  Resend Verification Email
                </Link>
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-border dark:border-border text-foreground dark:text-muted-foreground font-semibold rounded-xl transition hover:bg-muted dark:hover:dark:bg-muted"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
