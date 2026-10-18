'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ArrowLeft, Loader2, Shield, Store } from 'lucide-react'

import { useAuth } from '@/lib/auth-context'
import { getMerchantProfile, MerchantProfile, updateMerchantProfile } from '@/lib/api/merchant'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

const merchantProfileSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().optional(),
  address: z.string().optional(),
})

type MerchantProfileFormData = z.infer<typeof merchantProfileSchema>

const CATEGORIES = [
  'Restaurant',
  'Cafe',
  'Bar',
  'Retail',
  'Services',
  'Entertainment',
  'Health & Beauty',
  'Other',
]

export default function MerchantProfilePage() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<MerchantProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<MerchantProfileFormData>({
    resolver: zodResolver(merchantProfileSchema),
    defaultValues: {
      business_name: '',
      category: '',
      description: '',
      address: '',
    },
  })

  useEffect(() => {
    async function loadProfile() {
      if (!token) {
        return
      }

      try {
        const merchantProfile = await getMerchantProfile(token)
        setProfile(merchantProfile)
        reset({
          business_name: merchantProfile.business_name,
          category: merchantProfile.category,
          description: merchantProfile.description || '',
          address: merchantProfile.address || '',
        })
      } catch (error) {
        console.error('Failed to load merchant profile:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadProfile()
  }, [reset, token])

  async function onSubmit(values: MerchantProfileFormData) {
    if (!token) {
      return
    }

    try {
      setSaving(true)
      const updatedProfile = await updateMerchantProfile(token, values)
      setProfile(updatedProfile)
      reset(values)
      toast({
        title: 'Profile updated',
        description: 'Your merchant details were saved successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Could not update merchant profile.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 px-4 sm:px-0">
        <Skeleton className="h-14 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const verificationStatus = profile?.verification_status ?? 'pending'
  const verificationClasses =
    verificationStatus === 'verified'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : verificationStatus === 'rejected'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-0 pb-24">
      <div className="flex flex-col gap-4">
        <Link href="/merchant/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground dark:text-foreground dark:hover:text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground">Merchant Profile</h1>
            <p className="text-muted-foreground dark:text-muted-foreground">Keep your business details current so verification can move forward.</p>
          </div>
          <Badge className={verificationClasses}>
            {verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)}
          </Badge>
        </div>
      </div>

      <Card className="border-amber-200 dark:border-amber-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-amber-500" />
            Verification
          </CardTitle>
          <CardDescription>
            Promotions stay locked until the merchant profile is reviewed and marked verified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground dark:text-muted-foreground">
          <p>
            {verificationStatus === 'verified'
              ? 'Your business is verified and ready to publish promotions.'
              : 'Make sure your business name, category, and address are accurate. Then contact support if verification is taking too long.'}
          </p>
          <p>
            Current business: <span className="font-medium text-foreground dark:text-foreground">{profile?.business_name || 'Unknown merchant'}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-5 w-5 text-amber-500" />
            Business Details
          </CardTitle>
          <CardDescription>These are the fields the backend currently stores and uses for merchant verification.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input id="business_name" {...register('business_name')} />
                {errors.business_name ? <p className="text-sm text-red-500">{errors.business_name.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  {...register('category')}
                >
                  <option value="" disabled>Select a category</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category ? <p className="text-sm text-red-500">{errors.category.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} placeholder="123 Main St, Detroit, MI" />
                {errors.address ? <p className="text-sm text-red-500">{errors.address.message}</p> : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} className="min-h-[140px] resize-none" placeholder="Tell customers what makes your business worth visiting." />
                {errors.description ? <p className="text-sm text-red-500">{errors.description.message}</p> : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="submit" disabled={saving || !isDirty} className="bg-amber-500 hover:bg-amber-600 text-white">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Merchant Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
