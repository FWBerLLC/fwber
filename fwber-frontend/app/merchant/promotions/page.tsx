'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { getPromotions, Promotion } from '@/lib/api/merchant'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, MapPin, Calendar, Tag, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

export default function PromotionsListPage() {
  const { token } = useAuth()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!token) return
      try {
        const data = await getPromotions(token)
        setPromotions(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [token])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
             <Skeleton className="h-10 w-48" />
             <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
             {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground">Promotions</h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Manage your active and past deals.
          </p>
        </div>
        <Link href="/merchant/promotions/new">
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Promotion
          </Button>
        </Link>
      </div>

      {promotions.length === 0 ? (
        <Card className="bg-muted dark:bg-background dark:dark:bg-card/50 border-dashed py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium text-foreground dark:text-foreground dark:text-foreground">No promotions yet</h3>
                <p className="text-muted-foreground dark:text-muted-foreground mb-6 max-w-sm">
                    Create your first promotion to start attracting customers to your business.
                </p>
                    <Link href="/merchant/promotions/new">
                    <Button>Create Promotion</Button>
                </Link>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(promotions || []).map((promo) => (
            <Card key={promo.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                    <div className="flex-1 p-6">
                         <div className="flex items-start justify-between mb-2">
                             <div>
                                <CardTitle className="text-xl mb-1">{promo.title}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground mb-3">
                                    <span className="font-bold text-green-600 dark:text-green-400">{promo.discount_value}</span>
                                    <span>•</span>
                                    <span className="flex items-center">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {promo.radius}m radius
                                    </span>
                                </div>
                             </div>
                             <Badge variant={promo.is_active ? 'default' : 'secondary'} className={promo.is_active ? 'bg-green-600' : ''}>
                                 {promo.is_active ? 'Active' : 'Inactive'}
                             </Badge>
                         </div>
                         
                         <CardDescription className="mb-4 line-clamp-2">
                             {promo.description || 'No description provided.'}
                         </CardDescription>

                         <div className="flex items-center gap-4 text-xs text-muted-foreground dark:text-muted-foreground border-t pt-3 mt-auto">
                            <div className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Starts: {format(new Date(promo.starts_at), 'MMM d, yyyy h:mm a')}
                            </div>
                            <div className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Ends: {format(new Date(promo.expires_at), 'MMM d, yyyy h:mm a')}
                             </div>
                          </div>
                          <div className="mt-4">
                            <Button asChild variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                              <Link href={`/merchant/promotions/${promo.id}`}>
                                Manage Promotion
                                <ChevronRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                    </div>
                </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
