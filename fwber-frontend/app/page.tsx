'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { trackEvent } from '@/lib/ab-testing'

const STORAGE_KEY = 'fwber_ab_landing_variant'
const ASSIGNED_AT_KEY = 'fwber_ab_landing_assigned_at'

type Variant = 'A' | 'B'

function getOrAssignVariant(): Variant {
  if (typeof window === 'undefined') return 'A'

  const stored = localStorage.getItem(STORAGE_KEY) as Variant | null
  if (stored === 'A' || stored === 'B') return stored

  const variant: Variant = Math.random() < 0.5 ? 'A' : 'B'
  localStorage.setItem(STORAGE_KEY, variant)
  localStorage.setItem(ASSIGNED_AT_KEY, new Date().toISOString())
  trackEvent('ab_assign', { variant })
  return variant
}

export default function HomePage() {
  const [VariantComponent, setVariantComponent] = useState<ComponentType | null>(null)

  useEffect(() => {
    const v = getOrAssignVariant()

    if (v === 'A') {
      import('@/components/landing/LandingVariantA').then((mod) =>
        setVariantComponent(() => mod.default)
      )
    } else {
      import('@/components/landing/LandingVariantB').then((mod) =>
        setVariantComponent(() => mod.default)
      )
    }
  }, [])

  if (!VariantComponent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-card dark:bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600"></div>
      </div>
    )
  }

  return <VariantComponent />
}
