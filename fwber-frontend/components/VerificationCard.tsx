'use client'

import { useState, useEffect } from 'react'
import { verificationApi, type VerificationStatus } from '@/lib/api/verification'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BadgeCheck, Camera, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function VerificationCard() {
  const [status, setStatus] = useState<VerificationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const result: any = await verificationApi.getStatus()
      const data = result.data || result
      setStatus(data)
    } catch (err) {
      console.error('Failed to load verification status', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      setError(null)
      setSuccessMessage(null)

      const result: any = await verificationApi.verify(file)
      const data = result.data || result

      if (data.verified) {
        setSuccessMessage(data.message)
        loadStatus() // Refresh status
      } else {
        setError(data.message || 'Verification failed. Please try again.')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'An error occurred during verification.'
      setError(msg)
    } finally {
      setIsUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BadgeCheck className="w-5 h-5 text-blue-500" />
          <span>Profile Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status?.is_verified ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
              <BadgeCheck className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground dark:text-foreground">Verified Profile</h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Your identity has been verified. You have the blue checkmark!
              </p>
            </div>
            {status.verified_at && (
              <p className="text-xs text-muted-foreground">
                Verified on {new Date(status.verified_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Get Verified</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Upload a selfie to verify your identity against your profile photo. 
                This helps build trust in the community.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Verification Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <BadgeCheck className="h-4 w-4 text-green-600" />
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border dark:border-border rounded-lg p-6 hover:bg-muted dark:bg-background dark:hover:dark:bg-card/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileChange}
                className="hidden"
                id="verification-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="verification-upload"
                className={`flex flex-col items-center cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isUploading ? (
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-2" />
                ) : (
                  <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                )}
                <span className="text-sm font-medium text-foreground dark:text-foreground">
                  {isUploading ? 'Verifying...' : 'Take a Selfie'}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Click to upload or take a photo
                </span>
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
