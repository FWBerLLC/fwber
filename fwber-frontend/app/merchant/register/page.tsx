'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/lib/auth-context'
import { registerMerchant } from '@/lib/api/merchant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Store, Users, Megaphone, TrendingUp, CheckCircle2 } from 'lucide-react'

const formSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().optional(),
  address: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

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

export default function MerchantRegisterPage() {
  const { user, token, updateUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_name: '',
      category: '',
      description: '',
      address: '',
    },
  })

  async function onSubmit(values: FormData) {
    if (!token) return

    setIsLoading(true)
    try {
      await registerMerchant(token, values)
      
      // Update local user context to include new role
      if (user) {
        updateUser({ ...user, role: 'merchant' })
      }

      toast({
        title: "Welcome to fwber Merchant! 🎉",
        description: "Your merchant profile has been created successfully. Let's get started.",
      })

      router.push('/merchant/dashboard')
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted dark:bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mb-6 shadow-sm border border-amber-200 dark:border-amber-800">
            <Store className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-4xl font-extrabold text-foreground dark:text-foreground tracking-tight">
            Claim Your Local Presence
          </h1>
          <p className="mt-4 text-xl text-muted-foreground dark:text-muted-foreground max-w-2xl mx-auto">
            Join the fwber ecosystem to connect directly with the community around you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Form Column */}
          <div className="lg:col-span-7 bg-card dark:bg-card rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-8 sm:p-10">
              <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-6">Business Details</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="business_name" className="text-sm font-semibold">Business Name *</Label>
                  <Input 
                    id="business_name" 
                    placeholder="e.g. Joe's Pizza" 
                    className="h-11"
                    {...register('business_name')} 
                  />
                  {errors.business_name && (
                    <p className="text-sm text-red-500 font-medium">{errors.business_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-semibold">Primary Category *</Label>
                  <select
                    id="category"
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register('category')}
                  >
                    <option value="" disabled>Select the category that best fits</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-sm text-red-500 font-medium">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-semibold">Physical Address</Label>
                  <Input 
                    id="address" 
                    placeholder="e.g. 123 Main St, New York, NY" 
                    className="h-11"
                    {...register('address')} 
                  />
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    This helps local users discover you through proximity search.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Business Description</Label>
                  <Textarea 
                    id="description"
                    placeholder="Tell the community what makes your business special..." 
                    className="resize-none min-h-[120px]" 
                    {...register('description')} 
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" size="lg" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Setting up your hub...
                      </>
                    ) : (
                      'Create Merchant Profile'
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    By registering, you agree to our Merchant Terms of Service and Privacy Policy.
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Info Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 text-white shadow-lg">
              <h3 className="text-2xl font-bold mb-4">Why join fwber?</h3>
              <ul className="space-y-5">
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 mr-3 flex-shrink-0 text-amber-200" />
                  <div>
                    <strong className="block text-lg">Hyper-Local Reach</strong>
                    <span className="text-amber-100/90 text-sm">Reach people exactly when they are physically near your business.</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 mr-3 flex-shrink-0 text-amber-200" />
                  <div>
                    <strong className="block text-lg">Verification-Aware Launch</strong>
                    <span className="text-amber-100/90 text-sm">Complete your merchant profile first, then unlock live promotions after approval.</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 mr-3 flex-shrink-0 text-amber-200" />
                  <div>
                    <strong className="block text-lg">Zero Commission Fees</strong>
                    <span className="text-amber-100/90 text-sm">We don&apos;t take a cut of your sales. You keep what you earn.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-card dark:bg-card rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <h4 className="text-lg font-bold text-foreground dark:text-foreground mb-4">What happens next?</h4>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-semibold text-foreground dark:text-foreground">Create Profile</p>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">Fill out your basic business details.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-semibold text-foreground dark:text-foreground">Access Dashboard</p>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">Instantly get access to the Merchant Hub.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-semibold text-foreground dark:text-foreground">Verification Review</p>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">Keep your profile accurate while your merchant account is reviewed before promotions go live.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
