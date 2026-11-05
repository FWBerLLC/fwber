'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import { 
  getCurrentLocation, 
  updateLocation, 
  updateLocationPrivacy, 
  clearLocationHistory,
  getCurrentGeolocation,
  LocationData 
} from '@/lib/api/location'

export default function LocationSettingsPage() {
  const { token, logout } = useAuth()
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'friends' | 'private'>('friends')

  useEffect(() => {
    const fetchLocation = async () => {
      if (!token) {
        setError('Authentication token not found. Please log in.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const locationData = await getCurrentLocation(token)
        setLocation(locationData)
        setPrivacyLevel(locationData.privacy_level)
        setError(null)
      } catch (err: any) {
        console.error('Failed to fetch location:', err)
        if (err.message === 'No location data found') {
          setError('No location data found. Please enable location sharing.')
        } else {
          setError(err.message || 'Failed to load location settings.')
        }
        if (err.message === 'Unauthenticated') {
          logout()
        }
      } finally {
        setLoading(false)
      }
    }

    fetchLocation()
  }, [token, logout])

  const handleUpdateLocation = async () => {
    if (!token) {
      setError('Authentication token not found. Please log in.')
      return
    }

    try {
      setIsUpdating(true)
      
      // Get current geolocation
      const position = await getCurrentGeolocation()
      
      // Update location on server
      const updatedLocation = await updateLocation(token, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined,
        altitude: position.coords.altitude || undefined,
        privacy_level: privacyLevel,
      })
      
      setLocation(updatedLocation)
      setError(null)
    } catch (err: any) {
      console.error('Failed to update location:', err)
      setError(err.message || 'Failed to update location.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePrivacyChange = async (newPrivacyLevel: 'public' | 'friends' | 'private') => {
    if (!token) {
      setError('Authentication token not found. Please log in.')
      return
    }

    try {
      setIsUpdating(true)
      await updateLocationPrivacy(token, newPrivacyLevel)
      setPrivacyLevel(newPrivacyLevel)
      
      // Update local location data
      if (location) {
        setLocation({
          ...location,
          privacy_level: newPrivacyLevel,
        })
      }
      
      setError(null)
    } catch (err: any) {
      console.error('Failed to update privacy settings:', err)
      setError(err.message || 'Failed to update privacy settings.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClearLocation = async () => {
    if (!token) {
      setError('Authentication token not found. Please log in.')
      return
    }

    try {
      setIsUpdating(true)
      await clearLocationHistory(token)
      setLocation(null)
      setError(null)
    } catch (err: any) {
      console.error('Failed to clear location:', err)
      setError(err.message || 'Failed to clear location history.')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatLastUpdated = (lastUpdated: string) => {
    const date = new Date(lastUpdated)
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background p-8">
        <div className="max-w-4xl mx-auto bg-card dark:bg-card rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground mb-6">Location Settings</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {location ? (
            <div className="space-y-6">
              {/* Current Location Info */}
              <div className="p-6 bg-blue-50 rounded-lg">
                <h2 className="text-xl font-semibold text-foreground dark:text-foreground mb-4">Current Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Latitude:</strong> {location.latitude}</p>
                    <p><strong>Longitude:</strong> {location.longitude}</p>
                    <p><strong>Accuracy:</strong> {location.accuracy ? `${location.accuracy}m` : 'Unknown'}</p>
                  </div>
                  <div>
                    <p><strong>Last Updated:</strong> {formatLastUpdated(location.last_updated)}</p>
                    <p><strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        location.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                    <p><strong>Recent:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        location.is_recent 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {location.is_recent ? 'Yes' : 'No'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="p-6 bg-muted dark:bg-background rounded-lg">
                <h2 className="text-xl font-semibold text-foreground dark:text-foreground mb-4">Privacy Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                      Who can see your location?
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'public', label: 'Public', description: 'Everyone can see your location' },
                        { value: 'friends', label: 'Friends Only', description: 'Only your matches can see your location' },
                        { value: 'private', label: 'Private', description: 'No one can see your location' },
                      ].map((option) => (
                        <label key={option.value} className="flex items-start">
                          <input
                            type="radio"
                            name="privacy"
                            value={option.value}
                            checked={privacyLevel === option.value}
                            onChange={() => handlePrivacyChange(option.value as any)}
                            className="mt-1 mr-3"
                            disabled={isUpdating}
                          />
                          <div>
                            <div className="font-medium text-foreground dark:text-foreground">{option.label}</div>
                            <div className="text-sm text-muted-foreground">{option.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
                <button type="button"
                  onClick={handleUpdateLocation}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-6 rounded transition duration-200"
                >
                  {isUpdating ? 'Updating...' : 'Update Location'}
                </button>
                
                <button type="button"
                  onClick={handleClearLocation}
                  disabled={isUpdating}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-2 px-6 rounded transition duration-200"
                >
                  {isUpdating ? 'Clearing...' : 'Clear Location History'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-6xl mb-4">📍</div>
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Location Data</h3>
              <p className="text-muted-foreground mb-6">
                You haven&apos;t shared your location yet. Enable location sharing to discover people nearby!
              </p>
              <button type="button"
                onClick={handleUpdateLocation}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-8 rounded-lg transition duration-200"
              >
                {isUpdating ? 'Enabling...' : 'Enable Location Sharing'}
              </button>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-8 p-6 bg-yellow-50 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">About Location Sharing</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Your location is only shared when you&apos;re actively using the app</li>
              <li>• You can change your privacy settings at any time</li>
              <li>• Location data is encrypted and stored securely</li>
              <li>• You can clear your location history to stop sharing</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
