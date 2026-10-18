'use client'

import { useState } from 'react'
import { logger, logAuth, logWebSocket, logLocation, logAPI, logUI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export default function SentryTestPage() {
  const [testResult, setTestResult] = useState<string>('')

  const testError = () => {
    try {
      logger.error('Test error from Sentry Test Page', {
        test: true,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      })
      setTestResult('✅ Error sent to Sentry! Check your Sentry dashboard.')
    } catch (e) {
      setTestResult('❌ Failed to send error')
    }
  }

  const testWarning = () => {
    logger.warn('Test warning - this creates a breadcrumb', {
      test: true,
      level: 'warning',
    })
    setTestResult('✅ Warning logged (creates breadcrumb in Sentry)')
  }

  const testAuthError = () => {
    logAuth.login('test@example.com', false, new Error('Invalid credentials'))
    setTestResult('✅ Auth error logged to Sentry')
  }

  const testWebSocketError = () => {
    logWebSocket.error({ code: 1006, message: 'Connection closed abnormally' }, 'test scenario')
    setTestResult('✅ WebSocket error logged to Sentry')
  }

  const testLocationError = () => {
    logLocation.error({ code: 1, message: 'Permission denied by user' })
    setTestResult('✅ Location error logged to Sentry')
  }

  const testAPIError = () => {
    logAPI.error('POST', '/api/test', new Error('Network timeout'))
    setTestResult('✅ API error logged to Sentry')
  }

  const testComponentError = () => {
    logUI.error('SentryTestPage', new Error('Simulated component crash'))
    setTestResult('✅ Component error logged to Sentry')
  }

  const testInfo = () => {
    logger.info('Test info message - console only', { test: true })
    setTestResult('✅ Info logged to console (not sent to Sentry)')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🔍 Sentry Test Dashboard</h1>
        <p className="text-muted-foreground mb-8">Test your error tracking integration</p>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">📊 Configuration Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="w-40">Sentry DSN:</span>
              <span className="text-green-400">
                {process.env.NEXT_PUBLIC_SENTRY_DSN ? '✅ Configured' : '❌ Not configured'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-40">Environment:</span>
              <span className="text-blue-400">{process.env.NODE_ENV}</span>
            </div>
            <div className="flex items-center">
              <span className="w-40">Project:</span>
              <span className="text-purple-400">fwber-frontend</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">🧪 Test Error Logging</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button type="button"
              onClick={testError}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Test General Error
            </button>

            <button type="button"
              onClick={testWarning}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Test Warning (Breadcrumb)
            </button>

            <button type="button"
              onClick={testAuthError}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Test Auth Error
            </button>

            <button type="button"
              onClick={testWebSocketError}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Test WebSocket Error
            </button>

            <button type="button"
              onClick={testLocationError}
              className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Test Location Error
            </button>

            <button type="button"
              onClick={testAPIError}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Test API Error
            </button>

            <button type="button"
              onClick={testComponentError}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Test Component Error
            </button>

            <button type="button"
              onClick={testInfo}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Test Info (Console Only)
            </button>
          </div>

          {testResult && (
            <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-600">
              <p className="font-mono text-sm">{testResult}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">📖 Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground text-sm">
            <li>Click any test button above</li>
            <li>Open your browser console to see local logging</li>
            <li>
              Go to{' '}
              <a
                href="https://sentry.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                sentry.io
              </a>
            </li>
            <li>Navigate to your &quot;fwber-frontend&quot; project</li>
            <li>Click &quot;Issues&quot; in the sidebar</li>
            <li>You should see your test errors appear within seconds!</li>
            <li>Click on an error to see stack trace, breadcrumbs, and context</li>
          </ol>

          <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
            <p className="text-yellow-200 text-sm">
              <strong>Note:</strong> Info and debug messages are console-only. Only warnings (as breadcrumbs)
              and errors are sent to Sentry.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-muted-foreground text-sm">
          <p>Open browser DevTools Console to see all logging in real-time</p>
        </div>
      </div>
    </div>
  )
}
