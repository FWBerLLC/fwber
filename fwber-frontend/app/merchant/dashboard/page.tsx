'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getMerchantProfile, getPromotions, MerchantProfile, Promotion } from '@/lib/api/merchant'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PlusCircle, Tag, Radio } from 'lucide-react'
import NeighborhoodVibe from '@/components/merchant/NeighborhoodVibe'
import VibeIntelligence from '@/components/merchant/VibeIntelligence'
import { Badge } from '@/components/ui/badge'
import { MerchantPOS } from '@/components/merchant/MerchantPOS'

export default function MerchantDashboard() {
  const { token } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<MerchantProfile | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!token) return
      try {
        const [profileData, promotionsData] = await Promise.all([
            getMerchantProfile(token),
            getPromotions(token)
        ])
        setProfile(profileData)
        setPromotions(promotionsData)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false);
      }
    }
    loadData()
  }, [token])

  if (loading) {
     return <DashboardSkeleton />
  }

  const verificationStatus = profile?.verification_status ?? 'pending'
  const isVerified = verificationStatus === 'verified'
  const statusLabel = verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)
  const statusClasses =
    verificationStatus === 'verified'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : verificationStatus === 'rejected'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'

  return (
    <div className="space-y-6 px-4 sm:px-0 pb-20">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground uppercase italic tracking-tighter">Merchant Portal</h1>
                <p className="text-muted-foreground dark:text-muted-foreground">
                    {profile?.business_name} — B2B Local Intelligence
                </p>
            </div>
            <div className="flex gap-2">
                <Link href="/merchant/vibe">
                    <Button variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50">
                        <Radio className="mr-2 h-4 w-4 animate-pulse" />
                        Vibe Broadcast
                    </Button>
                </Link>
                {isVerified ? (
                    <Link href="/merchant/promotions/new">
                        <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Promotion
                        </Button>
                    </Link>
                ) : (
                    <Button
                        variant="outline"
                        className="border-amber-500 text-amber-700 hover:bg-amber-50"
                        onClick={() => router.push('/merchant/profile')}
                    >
                        Complete Profile
                    </Button>
                )}
            </div>
        </div>

        <Card className="border-amber-200 dark:border-amber-900/40">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="text-lg text-foreground dark:text-foreground">Verification Status</CardTitle>
                    <CardDescription>
                        Merchants must be verified before promotions can go live.
                    </CardDescription>
                </div>
                <Badge className={statusClasses}>{statusLabel}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    {isVerified
                      ? 'Your merchant profile is verified and ready to publish promotions.'
                      : 'Review your business details and keep them current while verification is pending.'}
                </p>
                <Button variant="outline" onClick={() => router.push('/merchant/profile')}>
                    Manage Profile
                </Button>
            </CardContent>
        </Card>

        {/* Real-time Intel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {token && <NeighborhoodVibe token={token} />}
                {token && <VibeIntelligence token={token} />}
            </div>
            <div>
                <MerchantPOS />
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Promotions</CardTitle>
                    <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {promotions.filter(p => p.is_active).length}
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Promotions</CardTitle>
                    <Tag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{promotions.length}</div>
                </CardContent>
            </Card>
        </div>
        
        {/* Recent Promotions */}
        <div>
            <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-semibold text-foreground dark:text-foreground">Recent Promotions</h2>
                 <Link href="/merchant/promotions" className="text-sm text-amber-600 hover:underline">
                    View all
                 </Link>
            </div>
             {promotions.length === 0 ? (
                <Card className="bg-muted dark:bg-background dark:bg-gray-800/50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                        <Tag className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground dark:text-foreground dark:text-foreground">No promotions yet</h3>
                        <p className="text-muted-foreground dark:text-muted-foreground mb-4 max-w-sm">
                            {isVerified
                              ? 'Create your first promotion to start attracting customers to your business.'
                              : 'Finish your merchant profile and wait for verification before publishing your first promotion.'}
                        </p>
                         <Link href={isVerified ? "/merchant/promotions/new" : "/merchant/profile"}>
                            <Button variant="outline">{isVerified ? 'Create Promotion' : 'Review Profile'}</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {promotions.slice(0, 3).map((promo) => (
                         <Card key={promo.id}>
                            <CardHeader>
                                <CardTitle className="text-lg">{promo.title}</CardTitle>
                                <CardDescription className="line-clamp-2">{promo.description}</CardDescription>
                            </CardHeader>
                             <CardContent>
                                 <div className="flex justify-between items-center text-sm">
                                     <span className="font-bold text-green-600 dark:text-green-400">{promo.discount_value}</span>
                                     <span className={`px-2 py-1 rounded-full text-xs ${promo.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-foreground dark:bg-card dark:text-muted-foreground'}`}>
                                         {promo.is_active ? 'Active' : 'Inactive'}
                                     </span>
                                 </div>
                                 <div className="mt-4">
                                     <Link href={`/merchant/promotions/${promo.id}`} className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline">
                                         Manage promotion
                                     </Link>
                                 </div>
                             </CardContent>
                         </Card>
                     ))}
                 </div>
             )}
         </div>
     </div>
  )
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="h-16 w-1/3 bg-muted dark:bg-card rounded animate-pulse" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
             <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                     {[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}
                 </div>
            </div>
        </div>
    )
}
