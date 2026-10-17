'use client'

import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
  loadTime: number | null
  bundleSize: number | null
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    loadTime: null,
    bundleSize: null,
  })

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return

    const measurePerformance = () => {
      if (typeof window === 'undefined' || !('performance' in window)) return

      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')
      
      // Measure Core Web Vitals
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      const fcp = fcpEntry ? Math.round(fcpEntry.startTime) : null

      // Measure load time
      const loadTime = navigation ? Math.round(navigation.loadEventEnd - navigation.loadEventStart) : null

      // Measure TTFB
      const ttfb = navigation ? Math.round(navigation.responseStart - navigation.requestStart) : null

      // Estimate bundle size (rough approximation)
      const scripts = document.querySelectorAll('script[src]')
      let bundleSize = 0
      scripts.forEach(script => {
        const src = script.getAttribute('src')
        if (src && src.includes('_next/static')) {
          // This is a rough estimate - in reality you'd need to fetch the actual file size
          bundleSize += 100000 // Assume ~100KB per chunk
        }
      })

      setMetrics(prev => ({
        ...prev,
        fcp,
        loadTime,
        ttfb,
        bundleSize: bundleSize || null,
      }))

      // Measure LCP using PerformanceObserver
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          setMetrics(prev => ({
            ...prev,
            lcp: Math.round(lastEntry.startTime),
          }))
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // Measure CLS
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          setMetrics(prev => ({
            ...prev,
            cls: Math.round(clsValue * 1000) / 1000,
          }))
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // Measure FID
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry) => {
            setMetrics(prev => ({
              ...prev,
              fid: Math.round((entry as any).processingStart - entry.startTime),
            }))
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
      }
    }

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance()
    } else {
      window.addEventListener('load', measurePerformance)
    }

    return () => {
      window.removeEventListener('load', measurePerformance)
    }
  }, [])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null

  const getScoreColor = (value: number | null, thresholds: { good: number; poor: number }) => {
    if (value === null) return 'text-gray-500'
    if (value <= thresholds.good) return 'text-green-600'
    if (value <= thresholds.poor) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreText = (value: number | null, thresholds: { good: number; poor: number }) => {
    if (value === null) return 'N/A'
    if (value <= thresholds.good) return 'Good'
    if (value <= thresholds.poor) return 'Needs Improvement'
    return 'Poor'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        📊 Performance
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-card border rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-lg mb-3">Performance Metrics</h3>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">FCP:</span>
                <span className={`ml-2 ${getScoreColor(metrics.fcp, { good: 1800, poor: 3000 })}`}>
                  {metrics.fcp ? `${metrics.fcp}ms` : 'N/A'}
                </span>
                <div className="text-xs text-muted-foreground">
                  {getScoreText(metrics.fcp, { good: 1800, poor: 3000 })}
                </div>
              </div>
              
              <div>
                <span className="font-medium">LCP:</span>
                <span className={`ml-2 ${getScoreColor(metrics.lcp, { good: 2500, poor: 4000 })}`}>
                  {metrics.lcp ? `${metrics.lcp}ms` : 'N/A'}
                </span>
                <div className="text-xs text-muted-foreground">
                  {getScoreText(metrics.lcp, { good: 2500, poor: 4000 })}
                </div>
              </div>
              
              <div>
                <span className="font-medium">FID:</span>
                <span className={`ml-2 ${getScoreColor(metrics.fid, { good: 100, poor: 300 })}`}>
                  {metrics.fid ? `${metrics.fid}ms` : 'N/A'}
                </span>
                <div className="text-xs text-muted-foreground">
                  {getScoreText(metrics.fid, { good: 100, poor: 300 })}
                </div>
              </div>
              
              <div>
                <span className="font-medium">CLS:</span>
                <span className={`ml-2 ${getScoreColor(metrics.cls, { good: 0.1, poor: 0.25 })}`}>
                  {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
                </span>
                <div className="text-xs text-muted-foreground">
                  {getScoreText(metrics.cls, { good: 0.1, poor: 0.25 })}
                </div>
              </div>
              
              <div>
                <span className="font-medium">TTFB:</span>
                <span className={`ml-2 ${getScoreColor(metrics.ttfb, { good: 800, poor: 1800 })}`}>
                  {metrics.ttfb ? `${metrics.ttfb}ms` : 'N/A'}
                </span>
                <div className="text-xs text-muted-foreground">
                  {getScoreText(metrics.ttfb, { good: 800, poor: 1800 })}
                </div>
              </div>
              
              <div>
                <span className="font-medium">Load Time:</span>
                <span className={`ml-2 ${getScoreColor(metrics.loadTime, { good: 2000, poor: 4000 })}`}>
                  {metrics.loadTime ? `${metrics.loadTime}ms` : 'N/A'}
                </span>
                <div className="text-xs text-muted-foreground">
                  {getScoreText(metrics.loadTime, { good: 2000, poor: 4000 })}
                </div>
              </div>
            </div>
            
            {metrics.bundleSize && (
              <div className="pt-2 border-t">
                <div className="text-sm">
                  <span className="font-medium">Bundle Size:</span>
                  <span className="ml-2 text-blue-600">
                    {Math.round(metrics.bundleSize / 1024)}KB
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t">
            <button type="button"
              onClick={() => {
                setMetrics({
                  fcp: null,
                  lcp: null,
                  fid: null,
                  cls: null,
                  ttfb: null,
                  loadTime: null,
                  bundleSize: null,
                })
                // Reload page to remeasure
                window.location.reload()
              }}
              className="text-xs text-primary hover:text-primary/80"
            >
              🔄 Remeasure
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
