'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import dynamic from 'next/dynamic'
import { format, addDays } from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { createPromotion } from '@/lib/api/merchant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Dynamically import map component to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-muted dark:bg-card animate-pulse rounded-md flex items-center justify-center text-muted-foreground">Loading Map...</div>
})

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  promo_code: z.string().max(50, 'Promo code must be 50 characters or fewer').optional(),
  discount_value: z.string().min(1, 'Discount value is required'),
  radius: z.coerce.number().min(10, 'Radius must be at least 10 meters').max(5000, 'Radius cannot exceed 5000 meters'),
  starts_at: z.string(),
  expires_at: z.string(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).refine((val) => val.lat !== 0 && val.lng !== 0, {
    message: "Please select a location on the map",
  }),
})

type FormData = z.infer<typeof formSchema>

export default function NewPromotionPage() {
  const { token } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Default dates
  const now = new Date()
  const tomorrow = addDays(now, 1)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      promo_code: '',
      discount_value: '',
      radius: 100,
      starts_at: format(now, "yyyy-MM-dd'T'HH:mm"),
      expires_at: format(tomorrow, "yyyy-MM-dd'T'HH:mm"),
      location: { lat: 0, lng: 0 }, // Will trigger validation if not set
    },
  })

  const location = watch('location')
  const radius = watch('radius')

  async function onSubmit(values: FormData) {
    if (!token) return

    setIsLoading(true)
    try {
      await createPromotion(token, {
        title: values.title,
        description: values.description,
        promo_code: values.promo_code || undefined,
        discount_value: values.discount_value,
        lat: values.location.lat,
        lng: values.location.lng,
        radius: values.radius,
        starts_at: values.starts_at,
        expires_at: values.expires_at,
      })

      toast({
        title: "Promotion Created",
        description: "Your new promotion is now live!",
      })

      router.push('/merchant/dashboard')
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Creation failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-12">
      <div className="mb-6">
        <Link 
          href="/merchant/dashboard" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground dark:text-foreground dark:hover:text-muted-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Create New Promotion</h1>
        <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
          Set up a new deal to attract customers nearby.
        </p>
      </div>

      <div className="bg-card dark:bg-card rounded-xl shadow-sm border border-border dark:border-border p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Promotion Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. 50% Off Lunch Special" 
                  {...register('title')} 
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo_code">Promo Code</Label>
                <Input 
                  id="promo_code" 
                  placeholder="e.g. DETROIT_HAPPY_HOUR" 
                  {...register('promo_code')} 
                />
                {errors.promo_code && <p className="text-sm text-red-500">{errors.promo_code.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_value">Discount Value</Label>
                <Input 
                  id="discount_value" 
                  placeholder="e.g. 20% OFF or $5.00" 
                  {...register('discount_value')} 
                />
                {errors.discount_value && <p className="text-sm text-red-500">{errors.discount_value.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">Radius (meters)</Label>
                <Input 
                  id="radius" 
                  type="number" 
                  min={10} 
                  max={5000} 
                  {...register('radius')} 
                />
                <p className="text-xs text-muted-foreground">Distance from location where users can see this.</p>
                {errors.radius && <p className="text-sm text-red-500">{errors.radius.message}</p>}
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  placeholder="Terms and conditions, details..." 
                  className="resize-none" 
                  {...register('description')} 
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-lg font-medium border-b pb-2">Location</h3>
             <div className="space-y-2">
               <Label>Pick Location</Label>
               <p className="text-sm text-muted-foreground mb-2">Click on the map to set the center of your promotion.</p>
               <LocationPicker 
                 value={location.lat !== 0 ? location : undefined} 
                 onChange={(val) => setValue('location', val, { shouldValidate: true })}
                 radius={Number(radius)}
               />
               {errors.location && <p className="text-sm text-red-500">{errors.location.message}</p>}
             </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Schedule</h3>
            <div className="grid gap-4 sm:grid-cols-2">
               <div className="space-y-2">
                <Label htmlFor="starts_at">Starts At</Label>
                <Input 
                  id="starts_at" 
                  type="datetime-local" 
                  {...register('starts_at')} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expires At</Label>
                <Input 
                  id="expires_at" 
                  type="datetime-local" 
                  {...register('expires_at')} 
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Promotion
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
