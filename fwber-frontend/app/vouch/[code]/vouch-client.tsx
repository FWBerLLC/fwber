'use client'

import React, { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import Link from 'next/link'
import { Shield, Flame, PartyPopper, CheckCircle2, User, Loader2 } from 'lucide-react'
import { getAvatarUrl } from '@/lib/utils/avatar'

interface VouchClientProps {
  code: string
}

export function VouchClient({ code }: VouchClientProps) {
  const [referrer, setReferrer] = useState<{name: string, avatar: string | null} | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [vouched, setVouched] = useState<string | null>(null)
  
  const [relationshipType, setRelationshipType] = useState('')
  const [comment, setComment] = useState('')
  const [voucherName, setVoucherName] = useState('')
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [selectedType, setSelectedType] = useState<string>('')

  useEffect(() => {
    if (code) {
      const checkCode = async () => {
        try {
          const res: any = await apiClient.get(`/auth/referral/${code}`)
          if (res && res.valid) {
             setReferrer({
               name: res.referrer_name,
               avatar: res.referrer_avatar
             })
          } else {
             setError(true)
          }
        } catch (e) {
          setError(true)
        } finally {
          setLoading(false)
        }
      }
      checkCode()
    }
  }, [code])

  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    setStep('details')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiClient.post(`/public/vouch`, {
        referral_code: code,
        type: selectedType,
        relationship_type: relationshipType,
        comment: comment,
        voucher_name: voucherName
      })
      setVouched(selectedType)
    } catch (e: any) {
      console.error(e)
      setVouched(selectedType)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  if (error || !referrer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Link Expired or Invalid</h1>
        <p className="text-gray-600 mb-6">We couldn&apos;t find the user you&apos;re looking for.</p>
        <Link href="/" className="text-purple-600 font-bold hover:underline">Go Home</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900 p-8 text-center border-b border-gray-100">
          <div className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4 relative">
            {referrer.avatar ? (
                <img src={getAvatarUrl(referrer.avatar, referrer.name)} alt={referrer.name} className="w-full h-full rounded-full object-cover" />
            ) : (
                <User className="w-12 h-12 text-purple-400" />
            )}
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white">
                <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vouch for {referrer.name}</h1>
          <p className="text-gray-500 mt-2">Help them verify their reputation on fwber.</p>
        </div>

        <div className="p-8">
          {!vouched ? (
            <>
              {step === 'type' ? (
                <>
                  <p className="text-center text-gray-700 dark:text-gray-300 font-medium mb-6">
                    How do you know {referrer.name}?
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleTypeSelect('safe')}
                      className="w-full flex items-center p-4 rounded-xl border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all group"
                    >
                      <div className="p-2 bg-green-100 rounded-full mr-4 group-hover:bg-green-200">
                        <Shield className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-gray-900 dark:text-white">Trustworthy & Safe</span>
                        <span className="text-sm text-gray-500">I&apos;d trust them with my drink</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleTypeSelect('fun')}
                      className="w-full flex items-center p-4 rounded-xl border-2 border-gray-100 hover:border-purple-500 hover:bg-purple-50 transition-all group"
                    >
                      <div className="p-2 bg-purple-100 rounded-full mr-4 group-hover:bg-purple-200">
                        <PartyPopper className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-gray-900 dark:text-white">Fun & Social</span>
                        <span className="text-sm text-gray-500">Life of the party</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleTypeSelect('hot')}
                      className="w-full flex items-center p-4 rounded-xl border-2 border-gray-100 hover:border-orange-500 hover:bg-orange-50 transition-all group"
                    >
                      <div className="p-2 bg-orange-100 rounded-full mr-4 group-hover:bg-orange-200">
                        <Flame className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-gray-900 dark:text-white">Hot & Attractive</span>
                        <span className="text-sm text-gray-500">Total catch</span>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                   <button 
                     type="button" 
                     onClick={() => setStep('type')}
                     className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-100 mb-2 flex items-center"
                   >
                     ← Back
                   </button>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Name (Optional)</label>
                     <input 
                        type="text" 
                        value={voucherName}
                        onChange={(e) => setVoucherName(e.target.value)}
                        placeholder="Anonymous Friend"
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relationship to {referrer.name}</label>
                     <select 
                        value={relationshipType}
                        onChange={(e) => setRelationshipType(e.target.value)}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                     >
                        <option value="">Select relationship...</option>
                        <option value="friend">Friend</option>
                        <option value="bestie">Best Friend</option>
                        <option value="ex">Ex (Good Terms)</option>
                        <option value="colleague">Colleague</option>
                        <option value="roommate">Roommate</option>
                     </select>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vouch Comment</label>
                     <textarea 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={`Tell us why ${referrer.name} is a catch...`}
                        rows={3}
                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                     />
                   </div>

                   <button 
                     type="submit"
                     className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg"
                   >
                     Submit Vouch
                   </button>
                </form>
              )}
            </>
          ) : (
            <div className="text-center">
               <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckCircle2 className="w-8 h-8" />
               </div>
               <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Vouch Recorded!</h2>
               <p className="text-gray-600 mb-6">
                 Thanks for verifying {referrer.name}. You&apos;ve unlocked a reward for yourself.
               </p>

               <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
                 <p className="font-bold text-orange-800">50 Free Tokens</p>
                 <p className="text-sm text-orange-600">Valid for 24 hours</p>
               </div>

               <Link
                 href={`/register?ref=${code}`}
                 className="block w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
               >
                 Claim Reward & Join
               </Link>

               <p className="mt-4 text-xs text-gray-400">
                 Join {referrer.name} and thousands of others on fwber.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
