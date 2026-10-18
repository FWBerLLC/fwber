'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Loader2, ArrowLeft, BarChart3, Eye, MousePointerClick, Ticket, Save, Trash2 } from 'lucide-react'

import { useAuth } from '@/lib/auth-context'
import {
  deletePromotion,
  getPromotionDetail,
  type Promotion,
  type PromotionMetrics,
  updatePromotion,
} from '@/lib/api/merchant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

interface FormState {
  title: string
  description: string
  promo_code: string
  discount_value: string
  radius: string
  starts_at: string
  expires_at: string
  is_active: boolean
}

function toDateTimeLocal(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : format(date, "yyyy-MM-dd'T'HH:mm")
}

export default function MerchantPromotionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { token } = useAuth()
  const { toast } = useToast()

  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [metrics, setMetrics] = useState<PromotionMetrics | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function loadPromotion() {
      if (!token || !params?.id) {
        return
      }

      try {
        const detail = await getPromotionDetail(token, params.id)
        setPromotion(detail.promotion)
        setMetrics(detail.metrics)
        setForm({
          title: detail.promotion.title,
          description: detail.promotion.description ?? '',
          promo_code: detail.promotion.promo_code ?? '',
          discount_value: detail.promotion.discount_value,
          radius: String(detail.promotion.radius),
          starts_at: toDateTimeLocal(detail.promotion.starts_at),
          expires_at: toDateTimeLocal(detail.promotion.expires_at),
          is_active: detail.promotion.is_active,
        })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Promotion unavailable',
          description: error instanceof Error ? error.message : 'Could not load promotion details.',
        })
        router.push('/merchant/promotions')
      } finally {
        setIsLoading(false)
      }
    }

    void loadPromotion()
  }, [params?.id, router, toast, token])

  const statCards = useMemo(
    () => [
      { label: 'Views', value: metrics?.views ?? 0, icon: Eye },
      { label: 'Clicks', value: metrics?.clicks ?? 0, icon: MousePointerClick },
      { label: 'Redemptions', value: metrics?.redemptions ?? 0, icon: Ticket },
      { label: 'Conversion', value: `${metrics?.conversion_rate ?? 0}%`, icon: BarChart3 },
    ],
    [metrics]
  )

  if (isLoading || !form) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!promotion) {
    return null
  }

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current)
  }

  const handleSave = async () => {
    if (!token || !promotion) {
      return
    }

    setIsSaving(true)
    try {
      const updated = await updatePromotion(token, promotion.id, {
        title: form.title,
        description: form.description || null,
        promo_code: form.promo_code || null,
        discount_value: form.discount_value,
        radius: Number(form.radius),
        starts_at: form.starts_at,
        expires_at: form.expires_at,
        is_active: form.is_active,
      })

      setPromotion(updated)
      setForm((current) =>
        current
          ? {
              ...current,
              title: updated.title,
              description: updated.description ?? '',
              promo_code: updated.promo_code ?? '',
              discount_value: updated.discount_value,
              radius: String(updated.radius),
              starts_at: toDateTimeLocal(updated.starts_at),
              expires_at: toDateTimeLocal(updated.expires_at),
              is_active: updated.is_active,
            }
          : current
      )

      toast({
        title: 'Promotion updated',
        description: 'Your promotion details are saved and ready for customers.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Could not save this promotion.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!token || !promotion) {
      return
    }

    setIsDeleting(true)
    try {
      const updated = await deletePromotion(token, promotion.id)
      toast({
        title: 'Promotion deactivated',
        description: 'The promotion is no longer active in the merchant portal.',
      })
      router.push(`/merchant/promotions/${updated.id}`)
      setPromotion(updated)
      setForm((current) => current ? { ...current, is_active: updated.is_active, expires_at: toDateTimeLocal(updated.expires_at) } : current)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Deactivate failed',
        description: error instanceof Error ? error.message : 'Could not deactivate this promotion.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 px-4 sm:px-0 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/merchant/promotions" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground dark:text-foreground dark:hover:text-gray-200">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Promotions
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground">{promotion.title}</h1>
            <Badge className={form.is_active ? 'bg-green-600 text-white' : 'bg-muted text-foreground dark:text-muted-foreground dark:bg-card dark:text-foreground'}>
              {form.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
            Fine-tune your campaign details and watch how it performs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => void handleDeactivate()} disabled={isDeleting || !form.is_active}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Deactivate
          </Button>
          <Button className="bg-amber-500 text-white hover:bg-amber-600" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>Update the live-facing copy and schedule without rebuilding the promotion from scratch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Promotion Title</Label>
                <Input id="title" value={form.title} onChange={(event) => handleChange('title', event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo_code">Promo Code</Label>
                <Input id="promo_code" value={form.promo_code} onChange={(event) => handleChange('promo_code', event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_value">Discount Value</Label>
                <Input id="discount_value" value={form.discount_value} onChange={(event) => handleChange('discount_value', event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">Radius (meters)</Label>
                <Input id="radius" type="number" min={10} max={5000} value={form.radius} onChange={(event) => handleChange('radius', event.target.value)} />
              </div>

              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => handleChange('is_active', event.target.checked)}
                    className="h-4 w-4 rounded border-border dark:border-border"
                  />
                  Promotion is active
                </label>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(event) => handleChange('description', event.target.value)} className="min-h-[120px]" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="starts_at">Starts At</Label>
                <Input id="starts_at" type="datetime-local" value={form.starts_at} onChange={(event) => handleChange('starts_at', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expires At</Label>
                <Input id="expires_at" type="datetime-local" value={form.expires_at} onChange={(event) => handleChange('expires_at', event.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placement Snapshot</CardTitle>
            <CardDescription>Immutable location details for this promotion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground dark:text-muted-foreground">
            <div>
              <p className="font-medium text-foreground dark:text-foreground">Latitude / Longitude</p>
              <p>{promotion.lat}, {promotion.lng}</p>
            </div>
            <div>
              <p className="font-medium text-foreground dark:text-foreground">Created</p>
              <p>{format(new Date(promotion.created_at), 'MMM d, yyyy h:mm a')}</p>
            </div>
            <div>
              <p className="font-medium text-foreground dark:text-foreground">Last Updated</p>
              <p>{format(new Date(promotion.updated_at), 'MMM d, yyyy h:mm a')}</p>
            </div>
            <div>
              <p className="font-medium text-foreground dark:text-foreground">Next Step</p>
              <p>Use analytics to compare this campaign against your other active promotions.</p>
            </div>
            <Button asChild variant="outline" className="w-full border-amber-200 text-amber-700 hover:bg-amber-50">
              <Link href="/merchant/analytics">Open Analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
