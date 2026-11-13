import { apiClient } from './client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'

// Define local interface to avoid circular dependency with faceBlur types
interface FileWithFaceBlurMetadata extends File {
  faceBlurMetadata?: {
    facesDetected?: number
    blurApplied?: boolean
    processingTimeMs?: number
    skippedReason?: string
    originalFileName?: string
    processedFileName?: string
    warningMessage?: string
    previewId?: string
  }
}

export interface Photo {
  id: string
  url: string
  thumbnail_url?: string
  is_primary: boolean
  is_private?: boolean
  unlock_price?: number
  order: number
  created_at: string
  updated_at: string
}

export interface PhotoUploadResponse {
  success: boolean
  photos: Photo[]
  message?: string
}

export interface PhotoReorderRequest {
  photo_ids: string[]
}

class PhotoAPI {
  // Get all photos for the current user
  async getPhotos(): Promise<Photo[]> {
    const response: any = await apiClient.get<{ success: boolean; data: Photo[]; count: number }>('/photos')
    // Backend returns { success, data, count } format
    return response.data.data || []
  }

  // Upload new photos (uploads one at a time since backend expects single 'photo' field)
  async uploadPhotos(
    items: Array<{ file: File; isPrivate?: boolean; unlockPrice?: number }>,
    onProgress?: (fileIndex: number, progress: number, fileName: string) => void
  ): Promise<PhotoUploadResponse> {
    const uploadedPhotos: Photo[] = []
    
    // Upload files sequentially since backend expects single photo per request
    for (let i = 0; i < items.length; i++) {
      const { file, isPrivate, unlockPrice } = items[i]
      const fileWithMetadata = file as FileWithFaceBlurMetadata
      
      // Report progress start
      if (onProgress) onProgress(i, 0, file.name)
      
      const formData = new FormData()
      formData.append('photo', file) // Backend expects 'photo', not 'photos[...]'
      if (isPrivate) {
        formData.append('is_private', '1')
        if (unlockPrice) {
          formData.append('unlock_price', String(unlockPrice))
        }
      }
      if (fileWithMetadata.faceBlurMetadata) {
        formData.append('face_blur_metadata', JSON.stringify(fileWithMetadata.faceBlurMetadata))
      }
      
      try {
        // Simulate progress for better UX
        if (onProgress) {
          // Initialize progress
          let currentProgress = 0
          // Start at 10%
          currentProgress = 10
          onProgress(i, currentProgress, file.name)
          
          // Increment progress smoothly up to 90%
          const progressInterval = setInterval(() => {
            // Increment by small random amount (1-5%) but accumulate
            // This prevents "bouncing" where it jumps back and forth
            currentProgress = Math.min(90, currentProgress + (Math.random() * 5))
            
            if (onProgress) {
              onProgress(i, currentProgress, file.name)
            }
          }, 200)
          
          const response = await apiClient.post<{ success: boolean; data: any }>('/photos', formData)
          
          clearInterval(progressInterval)
          
          const result = response.data
          
          // Progress to 100% on success
          if (onProgress) onProgress(i, 100, file.name)
          
          if (result.success && result.data) {
            // Backend returns single photo object, convert to Photo[] format
            uploadedPhotos.push({
              id: String(result.data.id),
              url: result.data.url || result.data.thumbnail_url,
              thumbnail_url: result.data.thumbnail_url,
              is_primary: result.data.is_primary || false,
              order: result.data.sort_order || 0,
              created_at: result.data.created_at,
              updated_at: result.data.updated_at || result.data.created_at,
            })
          }
        } else {
          // No progress callback - simple upload
          const response = await apiClient.post<{ success: boolean; data: any }>('/photos', formData)
          
          const result = response.data
          if (result.success && result.data) {
            uploadedPhotos.push({
              id: String(result.data.id),
              url: result.data.url || result.data.thumbnail_url,
              thumbnail_url: result.data.thumbnail_url,
              is_primary: result.data.is_primary || false,
              order: result.data.sort_order || 0,
              created_at: result.data.created_at,
              updated_at: result.data.updated_at || result.data.created_at,
            })
          }
        }
      } catch (error) {
        if (onProgress) onProgress(i, 0, file.name)
        throw error
      }
    }
    
    return {
      success: true,
      photos: uploadedPhotos,
      message: `Successfully uploaded ${uploadedPhotos.length} photo(s)`
    }
  }

  // Update photo details
  async updatePhoto(photoId: string, updates: Partial<Photo>): Promise<Photo> {
    const response = await apiClient.put<Photo>(`/photos/${photoId}`, updates)
    return response.data
  }

  // Set primary photo
  async setPrimaryPhoto(photoId: string): Promise<Photo[]> {
    // Backend doesn't have /primary endpoint, use PUT with is_primary=true
    await apiClient.put<{ success: boolean; data: Photo }>(`/photos/${photoId}`, { is_primary: true })
    // Return updated photos list by fetching all photos
    return this.getPhotos()
  }

  // Reorder photos
  async reorderPhotos(photoIds: string[]): Promise<Photo[]> {
    // Backend returns { success: true, message: ... }, not Photo[]
    // So we make the reorder request and then fetch updated photos
    await apiClient.post<{ success: boolean; message?: string }>('/photos/reorder', {
      photo_ids: photoIds.map(id => parseInt(id, 10)), // Convert to integers for backend
    })
    // Refetch photos to get updated order
    return this.getPhotos()
  }

  // Delete photo
  async deletePhoto(photoId: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(`/photos/${photoId}`)
    return response.data
  }

  // Get photo upload limits and settings
  async getUploadSettings(): Promise<{
    max_photos: number
    max_file_size: number
    allowed_formats: string[]
    compression_quality: number
  }> {
    try {
      const response: any = await apiClient.get<{
        max_photos: number
        max_file_size: number
        allowed_formats: string[]
        compression_quality: number
      }>('/photos/settings')
      return response.data
    } catch (error) {
      // If endpoint doesn't exist (405 or 404), return defaults
      return {
        max_photos: 6,
        max_file_size: 5 * 1024 * 1024, // 5MB
        allowed_formats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        compression_quality: 85,
      }
    }
  }

  // Reveal photo to a match
  async revealPhoto(photoId: string, matchId: string): Promise<{ success: boolean; status: string }> {
    const response = await apiClient.post<{ success: boolean; status: string }>(`/photos/${photoId}/reveal`, {
      match_id: matchId,
    })
    return response.data
  }

  // Unlock photo with tokens
  async unlockPhoto(photoId: string): Promise<{ success: boolean; message: string; balance: number }> {
    const response = await apiClient.post<{ success: boolean; message: string; balance: number }>(`/photos/${photoId}/unlock`)
    return response.data
  }

  // Get original photo blob
  async getOriginalPhoto(photoId: string): Promise<Blob> {
    const response: any = await apiClient.get(`/photos/${photoId}/original`, {
      // responseType: 'blob',
    })

    return response.data
  }
}

// Create singleton instance
export const photoAPI = new PhotoAPI()

// React hook for photo management
export function usePhotos() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPhotos = useCallback(async () => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('fwber_token') : null
    if (!token && !storedToken) {
      setPhotos([])
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const photoData = await photoAPI.getPhotos()
      setPhotos(photoData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch photos')
    } finally {
      setLoading(false)
    }
  }, [token])

  const uploadPhotos = async (
    items: Array<{ file: File; isPrivate?: boolean; unlockPrice?: number }> | File[],
    onProgress?: (fileIndex: number, progress: number, fileName: string) => void
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      // Normalize input to array of objects
      const normalizedItems = Array.isArray(items) && items.length > 0 && items[0] instanceof File
        ? (items as File[]).map(f => ({ file: f, isPrivate: false }))
        : (items as Array<{ file: File; isPrivate?: boolean; unlockPrice?: number }>)

      const response = await photoAPI.uploadPhotos(normalizedItems, onProgress)
      if (response.success) {
        setPhotos(prev => {
            const newPhotos = response.photos;
            const existingIds = new Set(prev.map(p => String(p.id)));
            const uniqueNewPhotos = newPhotos.filter(p => !existingIds.has(String(p.id)));
            return [...prev, ...uniqueNewPhotos];
        });

        const updatedPhotos = await photoAPI.getPhotos()
        setPhotos(updatedPhotos)
        return response
      } else {
        throw new Error(response.message || 'Upload failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deletePhoto = async (photoId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await photoAPI.deletePhoto(photoId)
      // Remove from state immediately - compare both string and number forms
      setPhotos(prev => prev.filter(photo => String(photo.id) !== photoId && photo.id !== photoId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const setPrimaryPhoto = async (photoId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const updatedPhotos = await photoAPI.setPrimaryPhoto(photoId)
      setPhotos(updatedPhotos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary photo')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const reorderPhotos = async (photoIds: string[], skipOptimisticUpdate = false) => {
    // If optimistic update was already done, don't set loading (to prevent UI flash)
    if (!skipOptimisticUpdate) {
      setLoading(true)
    }
    setError(null)
    
    try {
      const updatedPhotos = await photoAPI.reorderPhotos(photoIds)
      // Only update state if we haven't already done optimistic update
      // This prevents the "teleport" effect
      if (!skipOptimisticUpdate) {
        setPhotos(updatedPhotos)
      }
      // Otherwise, the state was already set optimistically, so we just verify it matches
    } catch (err) {
      console.error('Reorder error:', err)
      setError(err instanceof Error ? err.message : 'Failed to reorder photos')
      throw err
    } finally {
      if (!skipOptimisticUpdate) {
        setLoading(false)
      }
    }
  }

  const unlockPhoto = async (photoId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await photoAPI.unlockPhoto(photoId)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('fwber_token') : null

    if (authLoading) {
      return
    }

    if (!isAuthenticated && !storedToken) {
      return
    }

    void fetchPhotos()
  }, [authLoading, isAuthenticated, token, fetchPhotos])

  return {
    photos,
    loading,
    error,
    fetchPhotos,
    uploadPhotos,
    deletePhoto,
    setPrimaryPhoto,
    reorderPhotos,
    unlockPhoto,
    setPhotos, // Export for optimistic updates
  }
}

// Default photo settings
const DEFAULT_PHOTO_SETTINGS = {
  max_photos: 12, // Increased from 6 to be more generous
  max_file_size: 5 * 1024 * 1024, // 5MB in bytes
  allowed_formats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  compression_quality: 85,
}

// Photo upload settings hook
export function usePhotoSettings() {
  const [settings, setSettings] = useState<{
    max_photos: number
    max_file_size: number
    allowed_formats: string[]
    compression_quality: number
  } | null>(DEFAULT_PHOTO_SETTINGS) // Initialize with defaults
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const photoSettings = await photoAPI.getUploadSettings()
      setSettings(photoSettings)
    } catch (err) {
      // If endpoint doesn't exist, use defaults (don't set error, just use defaults)
      if (err instanceof Error && err.message.includes('405')) {
        // Method not allowed - endpoint exists but doesn't support GET
        // Just use defaults, don't show error
        setSettings(DEFAULT_PHOTO_SETTINGS)
      } else {
        // Other error - still use defaults but might log it
        setSettings(DEFAULT_PHOTO_SETTINGS)
        setError(err instanceof Error ? err.message : 'Failed to fetch settings')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Don't fetch if endpoint doesn't exist - just use defaults
    // fetchSettings()
  }, [])

  return {
    settings: settings || DEFAULT_PHOTO_SETTINGS, // Always return defaults if null
    loading,
    error,
    fetchSettings,
  }
}
