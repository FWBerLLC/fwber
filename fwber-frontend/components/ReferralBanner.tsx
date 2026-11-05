'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'
import { api } from '@/lib/api/client'

import axios from 'axios'
import Link from 'next/link'

export default function ReferralBanner() {
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')

  const [referrer, setReferrer] = useState<{name: string, avatar: string | null} | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (refCode) {
      // Store referral code in local storage so it persists during registration
      try {
        localStorage.setItem('fwber_referral_code', refCode)
      } catch (e) {
        console.error("Failed to store referral code", e)
      }

      const checkCode = async () => {
        try {
          const res = await api.get<{valid: boolean, referrer_name: string, referrer_avatar: string|null}>(`/auth/referral/${refCode}`)
          if (res && res.valid) {
             setReferrer({
               name: res.referrer_name,
               avatar: res.referrer_avatar
             })
             setIsVisible(true)
          }
        } catch (e) {
          console.error("Invalid referral code", e)
        }
      }
      checkCode()
    }
  }, [refCode])

  if (!isVisible || !referrer) return null

  return (
    <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-card dark:dark:bg-card/20 rounded-full animate-pulse">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div className="text-center sm:text-left">
              <p className="font-bold text-lg">You&apos;ve been invited by {referrer.name}!</p>
              <p className="text-purple-100 text-sm">Join the inner circle and get <span className="font-bold text-yellow-300">50 Free Tokens</span> instantly.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/register?ref=${refCode}`}
              className="bg-card dark:bg-card text-purple-600 px-6 py-2 rounded-full font-bold hover:bg-purple-50 transition-all shadow-lg hover:scale-105 whitespace-nowrap"
            >
              Claim Reward
            </Link>
            <button type="button"
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-card dark:dark:bg-card/20 rounded-full transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
