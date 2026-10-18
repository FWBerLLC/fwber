'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Upload, X, Camera, RotateCw, Download, Eye, ChevronLeft, ChevronRight, Trash2, Lock, Unlock, Pencil } from 'lucide-react'
import PhotoEditor, { type PhotoEditorResult } from '@/components/PhotoEditor'
import { blurFacesOnFile, FaceBlurError } from '@/lib/faceBlur'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { attachFaceBlurMetadata } from '@/lib/faceBlurTelemetry'
import type { FileWithFaceBlurMetadata } from '@/lib/types/faceBlur'
import { usePreviewTelemetry } from '@/lib/previewTelemetry'
import { Photo } from '@/lib/api/photos'

const generatePreviewId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 11)

interface PhotoUploadProps {
  onUpload: (
    items: Array<{ file: File; isPrivate?: boolean; unlockPrice?: number }> | File[],
    onProgress?: (fileIndex: number, progress: number, fileName: string) => void
  ) => Promise<void>
  onRemove: (index: number) => void
  photos: Photo[]
  maxPhotos?: number
  maxSize?: number // in MB
  className?: string
}

type PreviewView = 'original' | 'processed'

interface PreviewUrls {
  original: string
  processed?: string
}

interface PhotoPreview {
  file: FileWithFaceBlurMetadata
  previewUrls: PreviewUrls
  activeView: PreviewView
  id: string
  facesDetected?: number
  blurApplied?: boolean
  isPrivate: boolean
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

export default function PhotoUpload({
  onUpload,
  onRemove,
  photos = [],
  maxPhotos = 6,
  maxSize = 5,
  className = ''
}: PhotoUploadProps) {
  const [previews, setPreviews] = useState<PhotoPreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadAsPrivate, setUploadAsPrivate] = useState(false)
  const [unlockPrice, setUnlockPrice] = useState('50')
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map())
  const [dragActive, setDragActive] = useState(false)
  const [clientProcessingMessage, setClientProcessingMessage] = useState<string | null>(null)
  const [processingWarnings, setProcessingWarnings] = useState<string[]>([])
  const [comparisonPreviewId, setComparisonPreviewId] = useState<string | null>(null)
  const [editingPreviewId, setEditingPreviewId] = useState<string | null>(null)
  const [comparisonSliderValue, setComparisonSliderValue] = useState(50)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewsRef = useRef<PhotoPreview[]>([])
  const faceBlurEnabled = isFeatureEnabled('clientFaceBlur')
  const { trackPreviewReady, trackPreviewToggled, trackPreviewDiscarded, flushTelemetryQueue } = usePreviewTelemetry({ enabled: faceBlurEnabled })

  const revokePreviewUrls = useCallback((preview: PhotoPreview) => {
    if (!preview?.previewUrls) return
    URL.revokeObjectURL(preview.previewUrls.original)
    if (preview.previewUrls.processed && preview.previewUrls.processed !== preview.previewUrls.original) {
      URL.revokeObjectURL(preview.previewUrls.processed)
    }
  }, [])

  const emitPreviewReady = useCallback(
    (previewId: string, file: FileWithFaceBlurMetadata) => {
      if (!file?.faceBlurMetadata) return
      const metadata = file.faceBlurMetadata
      const resolvedPreviewId = metadata.previewId ?? previewId
      trackPreviewReady({
        previewId: resolvedPreviewId,
        fileName: metadata.originalFileName ?? file.name,
        facesDetected: metadata.facesDetected,
        blurApplied: Boolean(metadata.blurApplied),
        processingTimeMs: metadata.processingTimeMs,
        backend: 'client',
        warning: metadata.warningMessage,
        skippedReason: metadata.skippedReason,
      })
    },
    [trackPreviewReady]
  )

  useEffect(() => {
    previewsRef.current = previews
  }, [previews])

  useEffect(() => {
    return () => {
      previewsRef.current.forEach(revokePreviewUrls)
    }
  }, [revokePreviewUrls])

  useEffect(() => {
    if (!comparisonPreviewId) {
      setComparisonSliderValue(50)
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setComparisonPreviewId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [comparisonPreviewId])

  useEffect(() => {
    if (!comparisonPreviewId) return
    const stillExists = previews.some(preview => preview.id === comparisonPreviewId)
    if (!stillExists) {
      setComparisonPreviewId(null)
    }
  }, [comparisonPreviewId, previews])

  const processFilesForPreview = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return []

      if (!faceBlurEnabled) {
        return files.map((file) => ({
          file: file as FileWithFaceBlurMetadata,
          previewUrls: {
            original: URL.createObjectURL(file),
          },
          activeView: 'original' as PreviewView,
          id: generatePreviewId(),
          isPrivate: uploadAsPrivate,
        }))
      }

      setClientProcessingMessage('Detecting faces locally and applying blur...')
      const warnings: string[] = []

      try {
        const processed: PhotoPreview[] = []
        for (const file of files) {
          const originalPreviewUrl = URL.createObjectURL(file)
          const previewId = generatePreviewId()
          try {
            const result = await blurFacesOnFile(file)
            const metadata = {
              previewId,
              facesDetected: result.facesFound,
              blurApplied: result.blurred,
              processingTimeMs: result.processingTimeMs,
              originalFileName: file.name,
              processedFileName: result.file.name,
            }

            let processedFile = attachFaceBlurMetadata(result.file, metadata)
            let processedPreviewUrl: string | undefined
            if (result.blurred) {
              processedPreviewUrl = URL.createObjectURL(result.file)
            }
            if (!result.blurred) {
              const warning = `No faces detected in ${file.name}; upload will continue unblurred.`
              warnings.push(warning)
              processedFile = attachFaceBlurMetadata(result.file, {
                ...metadata,
                skippedReason: 'no_faces_detected',
                warningMessage: warning,
              })
            }

            processed.push({
              file: processedFile,
              previewUrls: {
                original: originalPreviewUrl,
                processed: processedPreviewUrl,
              },
              activeView: result.blurred && processedPreviewUrl ? 'processed' : 'original',
              id: previewId,
              facesDetected: result.facesFound,
              blurApplied: result.blurred,
              isPrivate: uploadAsPrivate,
            })
            emitPreviewReady(previewId, processedFile)
          } catch (error) {
            const message =
              error instanceof FaceBlurError
                ? error.message
                : 'Unexpected error while applying face blur.'
            const warning = `Face blur skipped for ${file.name}: ${message}`
            warnings.push(warning)
            const skippedReason = error instanceof FaceBlurError ? error.code.toLowerCase() : 'processing_failed'
            const processedFile = attachFaceBlurMetadata(file, {
              previewId,
              facesDetected: 0,
              blurApplied: false,
              skippedReason,
              originalFileName: file.name,
              processedFileName: file.name,
              warningMessage: warning,
            })
            processed.push({
              file: processedFile,
              previewUrls: {
                original: originalPreviewUrl,
              },
              activeView: 'original',
              id: previewId,
              facesDetected: 0,
              blurApplied: false,
              isPrivate: uploadAsPrivate,
            })
            emitPreviewReady(previewId, processedFile)
          }
        }

        if (warnings.length > 0) {
          setProcessingWarnings((prev) => {
            const combined = [...prev, ...warnings]
            return combined.slice(-4)
          })
        }

        return processed
      } finally {
        setClientProcessingMessage(null)
      }
    },
    [faceBlurEnabled, emitPreviewReady, uploadAsPrivate]
  )

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= maxSize * 1024 * 1024

      if (!isValidType) {
        alert(`File ${file.name} is not a valid image type`)
        return false
      }

      if (!isValidSize) {
        alert(`File ${file.name} is too large. Maximum size is ${maxSize}MB`)
        return false
      }

      return true
    })

    if (validFiles.length === 0) return

    const newPreviews = await processFilesForPreview(validFiles)
    if (newPreviews.length === 0) return

    setPreviews(prev => [...prev, ...newPreviews])

    // Auto-upload immediately after selection
    setIsUploading(true)

    setUploadProgress(prev => {
      const newMap = new Map(prev)
      newPreviews.forEach(preview => {
        newMap.set(preview.id, {
          fileName: preview.file.name,
          progress: 0,
          status: 'pending'
        })
      })
      return newMap
    })

    try {
      const progressCallback = (fileIndex: number, progress: number, fileName: string) => {
        const preview = newPreviews[fileIndex]
        if (!preview) return

        setUploadProgress(prev => {
          const newMap = new Map(prev)
          const existing = newMap.get(preview.id) || { fileName, progress: 0, status: 'pending' as const }

          newMap.set(preview.id, {
            ...existing,
            fileName,
            progress,
            status: progress === 100 ? 'completed' as const : 'uploading' as const
          })

          return newMap
        })
      }

      void flushTelemetryQueue()
      await onUpload(newPreviews.map(p => ({
        file: p.file,
        isPrivate: p.isPrivate,
        unlockPrice: p.isPrivate ? parseFloat(unlockPrice) : undefined
      })), progressCallback)

      // Mark all as completed
      setUploadProgress(prev => {
        const newMap = new Map(prev)
        newPreviews.forEach(preview => {
          const existing = newMap.get(preview.id)
          if (existing) {
            newMap.set(preview.id, { ...existing, status: 'completed', progress: 100 })
          }
        })
        return newMap
      })

      // Clean up previews and object URLs after upload
      const uploadedPreviewIds = new Set(newPreviews.map(preview => preview.id))
      newPreviews.forEach(preview => {
        revokePreviewUrls(preview)
      })
      setPreviews(prev => prev.filter(preview => !uploadedPreviewIds.has(preview.id)))

      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(new Map())
      }, 1500)

    } catch (error) {
      console.error('Upload failed:', error)
      // Mark all as error
      setUploadProgress(prev => {
        const newMap = new Map(prev)
        newPreviews.forEach(preview => {
          const existing = newMap.get(preview.id)
          if (existing && existing.status !== 'completed') {
            newMap.set(preview.id, {
              ...existing,
              status: 'error' as const,
              error: (error as any).response?.data?.message || (error instanceof Error ? error.message : 'Upload failed')
            })
          }
        })
        return newMap
      })

      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(new Map())
      }, 2000)
    }
  }, [flushTelemetryQueue, maxSize, onUpload, processFilesForPreview, revokePreviewUrls, unlockPrice])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxFiles: maxPhotos - photos.length - previews.length,
    disabled: photos.length + previews.length >= maxPhotos,
    noClick: true, // Disable click on the entire dropzone
    noKeyboard: false, // Allow keyboard navigation
  })

  // Full-page drag and drop listener
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setDragActive(true)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // Only deactivate if leaving the window
      if (e.target === document || e.target === document.documentElement) {
        setDragActive(false)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
    }

    // Add listeners to the document
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])


  const removePreview = (id: string) => {
    const previewToRemove = previewsRef.current.find(p => p.id === id)
    if (previewToRemove) {
      const metadata = previewToRemove.file.faceBlurMetadata
      if (metadata) {
        trackPreviewDiscarded({
          previewId: id,
          facesDetected: metadata.facesDetected ?? previewToRemove.facesDetected,
          blurApplied: metadata.blurApplied ?? previewToRemove.blurApplied,
          discardReason: 'user_removed',
          warning: metadata.warningMessage,
          skippedReason: metadata.skippedReason,
        })
      }
    }

    setPreviews(prev => {
      const preview = prev.find(p => p.id === id)
      if (preview) {
        revokePreviewUrls(preview)
      }
      return prev.filter(p => p.id !== id)
    })
  }

  const removePhoto = (index: number) => {
    onRemove(index)
  }

  const togglePreviewView = useCallback((id: string, view: PreviewView) => {
    const preview = previewsRef.current.find(p => p.id === id)
    if (!preview) return
    if (view === 'processed' && !preview.previewUrls.processed) return
    if (preview.activeView === view) return

    const metadata = preview.file.faceBlurMetadata
    trackPreviewToggled({
      previewId: id,
      view,
      facesDetected: metadata?.facesDetected ?? preview.facesDetected,
      blurApplied: metadata?.blurApplied ?? preview.blurApplied,
      warning: metadata?.warningMessage,
    })

    setPreviews(prev =>
      prev.map(current => {
        if (current.id !== id) return current
        if (view === 'processed' && !current.previewUrls.processed) return current
        if (current.activeView === view) return current
        return { ...current, activeView: view }
      })
    )
  }, [trackPreviewToggled])

  const totalPhotos = photos.length + previews.length
  const comparisonPreview = comparisonPreviewId ? previews.find(p => p.id === comparisonPreviewId) : null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Full-page drag overlay */}
      {dragActive && (
        <div
          {...getRootProps()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm pointer-events-auto"
        >
          <input {...getInputProps()} />
          <div className="bg-card dark:bg-card rounded-lg p-8 shadow-2xl border-4 border-dashed border-primary">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-6 rounded-full bg-primary/20">
                <Upload className="w-16 h-16 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground dark:text-foreground">
                Drop photos here
              </h3>
              <p className="text-muted-foreground dark:text-muted-foreground">
                Release to upload (max {maxPhotos - totalPhotos} more)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out select-none min-h-[200px]
          ${isDragActive || dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
          ${totalPhotos >= maxPhotos ? 'opacity-50 cursor-not-allowed' : 'pointer-events-auto'}
        `}
        onClick={(e) => {
          // Prevent opening if clicking on interactive elements
          if ((e.target as HTMLElement).closest('input, label, button')) {
            return
          }
          if (totalPhotos < maxPhotos) {
            // Use fileInputRef if available, otherwise fallback to open()
            if (fileInputRef.current) {
              fileInputRef.current.click();
            } else {
              open();
            }
          }
        }}
      >
        <input
          {...getInputProps({
            style: { display: 'block' }
          })}
          className="sr-only"
          ref={fileInputRef}
        />

        <div
          className="flex flex-col items-center space-y-4 pointer-events-none"
        >
          <div className="p-4 rounded-full bg-primary/10">
            <Camera className="w-8 h-8 text-primary" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {isDragActive || dragActive ? 'Drop photos here' : 'Upload Photos'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Drag and drop images anywhere here, or click to select
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Max {maxPhotos} photos, {maxSize}MB each • Uploads automatically
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            Supported: JPEG, PNG, WebP, GIF
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (fileInputRef.current) {
                fileInputRef.current.click();
              } else {
                open();
              }
            }}
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors pointer-events-auto"
          >
            Select Photos
          </button>

          <div className="flex items-center gap-2 mt-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <input
                type="checkbox"
                checked={uploadAsPrivate}
                onChange={(e) => setUploadAsPrivate(e.target.checked)}
                className="rounded border-border dark:border-border text-primary focus:ring-primary"
              />
              <span className="flex items-center gap-1">
                {uploadAsPrivate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                Upload as Private (Locked)
              </span>
            </label>
          </div>

          {uploadAsPrivate && (
            <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <span className="text-sm text-muted-foreground">Unlock Price (FWB):</span>
              <input
                type="number"
                value={unlockPrice}
                onChange={(e) => setUnlockPrice(e.target.value)}
                className="w-20 p-1 border rounded text-sm text-black"
                min="0"
                placeholder="50"
              />
            </div>
          )}

          {faceBlurEnabled && (
            <div className="mt-3 text-xs font-medium text-primary">
              Client-side face blur active
            </div>
          )}
        </div>
      </div>

      {clientProcessingMessage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RotateCw className="w-4 h-4 animate-spin" />
          {clientProcessingMessage}
        </div>
      )}

      {processingWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Face blur notices</span>
            <button type="button"
              onClick={() => setProcessingWarnings([])}
              className="text-xs underline decoration-dotted"
            >
              Clear
            </button>
          </div>
          <ul className="space-y-1 text-xs list-disc list-inside">
            {processingWarnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Batch Upload Progress */}
      {isUploading && uploadProgress.size > 0 && (
        <div className="space-y-4 bg-muted/50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-sm">Uploading {uploadProgress.size} photo{uploadProgress.size > 1 ? 's' : ''}...</h4>
            <span className="text-xs text-muted-foreground">
              {Array.from(uploadProgress.values()).filter(p => p.status === 'completed').length} / {uploadProgress.size} complete
            </span>
          </div>

          <div className="space-y-3">
            {previews.map((preview) => {
              const progress = uploadProgress.get(preview.id)
              if (!progress) return null

              const { progress: percent, status, fileName, error } = progress
              const isCompleted = status === 'completed'
              const isError = status === 'error'

              return (
                <div key={preview.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className={`truncate flex-1 mr-2 ${isError ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-foreground'}`}>
                      {fileName.length > 30 ? `${fileName.substring(0, 30)}...` : fileName}
                    </span>
                    <span className={`font-medium ${isError ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {isError ? 'Failed' : isCompleted ? 'Complete' : `${Math.round(percent)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden relative">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${isError
                          ? 'bg-red-500'
                          : isCompleted
                            ? 'bg-green-500'
                            : 'bg-primary'
                        }`}
                      style={{ width: `${Math.max(5, percent)}%` }}
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Overall Progress Bar */}
          <div className="pt-2 border-t border-border">
            <div className="flex justify-between text-xs mb-1">
              <span>Overall Progress</span>
              <span>
                {Math.round(
                  Array.from(uploadProgress.values()).reduce((sum, p) => sum + p.progress, 0) / uploadProgress.size
                )}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden relative">
              {(Array.from(uploadProgress.values()).some(p => p.status === 'uploading' || p.status === 'pending')) && (
                <div className="absolute inset-0 bg-primary/20 animate-pulse" />
              )}
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Array.from(uploadProgress.values()).reduce((sum, p) => sum + p.progress, 0) / uploadProgress.size}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {(photos.length > 0 || previews.length > 0) && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold">Your Photos</h4>
            <span className="text-sm text-muted-foreground">
              {totalPhotos} / {maxPhotos}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Existing Photos */}
            {photos.map((photo, index) => (
              <div key={`photo-${index}`} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={photo.url || photo.thumbnail_url || ''}
                    alt={`Photo ${index + 1}`}
                    width={200}
                    height={200}
                    className={`w-full h-full object-cover ${photo.is_private ? 'blur-sm hover:blur-none transition-all duration-300' : ''}`}
                  />
                </div>

                {/* Photo Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg">
                  <div className="flex items-center justify-center h-full space-x-2">
                    <button type="button"
                      onClick={() => removePhoto(index)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                      title="View photo"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Primary Photo Badge */}
                {photo.is_primary && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                    Primary
                  </div>
                )}

                {/* Private Badge */}
                {photo.is_private && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full" title="Private Photo">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}

            {/* Preview Photos */}
            {previews.map((preview) => {
              const progress = uploadProgress.get(preview.id)
              const status = progress?.status || 'pending'
              const isUploadingPhoto = status === 'uploading'
              const isCompleted = status === 'completed'
              const isError = status === 'error'
              const previewSrc =
                preview.activeView === 'processed' && preview.previewUrls.processed
                  ? preview.previewUrls.processed
                  : preview.previewUrls.original

              return (
                <div key={preview.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={previewSrc}
                      alt="Preview"
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                    {/* Upload Progress Overlay */}
                    {isUploadingPhoto && progress && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="text-white text-xs font-medium">
                          {Math.round(progress.progress)}%
                        </div>
                      </div>
                    )}
                    {/* Status Overlay */}
                    {isCompleted && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {isError && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <X className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preview Actions */}
                  {!isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg">
                      <div className="flex items-center justify-center h-full space-x-2">
                        <button type="button"
                          onClick={() => removePreview(preview.id)}
                          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          title="Remove preview"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button type="button"
                          onClick={() => setEditingPreviewId(preview.id)}
                          className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors"
                          title="Edit photo"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {preview.blurApplied && preview.previewUrls.processed && (
                          <button type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setComparisonPreviewId(preview.id)
                              setComparisonSliderValue(50)
                            }}
                            className="p-2 bg-card dark:dark:bg-card/80 text-foreground dark:text-foreground rounded-full hover:bg-card transition-colors"
                            title="Compare blur"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${isError
                      ? 'bg-red-500 text-white'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : isUploadingPhoto
                          ? 'bg-blue-500 text-white'
                          : 'bg-yellow-500 text-white'
                    }`}>
                    {isError ? 'Failed' : isCompleted ? 'Complete' : isUploadingPhoto ? 'Uploading...' : 'Pending'}
                  </div>

                  {preview.isPrivate && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full" title="Private Photo">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}

                  {preview.blurApplied && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full">
                      Faces blurred{typeof preview.facesDetected === 'number' ? ` (${preview.facesDetected})` : ''}
                    </div>
                  )}

                  {preview.blurApplied && preview.previewUrls.processed && (
                    <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white shadow-lg backdrop-blur pointer-events-auto">
                      <button
                        type="button"
                        aria-pressed={preview.activeView === 'processed'}
                        className={`px-2 py-0.5 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${preview.activeView === 'processed'
                            ? 'bg-card text-black'
                            : 'text-white/80 hover:text-white'
                          }`}
                        onClick={(event) => {
                          event.stopPropagation()
                          togglePreviewView(preview.id, 'processed')
                        }}
                      >
                        Blurred
                      </button>
                      <button
                        type="button"
                        aria-pressed={preview.activeView === 'original'}
                        className={`px-2 py-0.5 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${preview.activeView === 'original'
                            ? 'bg-card text-black'
                            : 'text-white/80 hover:text-white'
                          }`}
                        onClick={(event) => {
                          event.stopPropagation()
                          togglePreviewView(preview.id, 'original')
                        }}
                      >
                        Original
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {comparisonPreview && comparisonPreview.previewUrls.processed && (
        (() => {
          const facesLabel = typeof comparisonPreview.facesDetected === 'number'
            ? `${comparisonPreview.facesDetected} face${comparisonPreview.facesDetected === 1 ? '' : 's'} detected`
            : 'Face blur applied'
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
              <div className="relative w-full max-w-4xl rounded-2xl bg-background p-6 shadow-2xl">
                <button
                  type="button"
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-foreground transition hover:bg-black/20"
                  onClick={() => setComparisonPreviewId(null)}
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close comparison</span>
                </button>

                <div className="mb-4 flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">Compare blur</h3>
                  <p className="text-sm text-muted-foreground">{facesLabel}</p>
                </div>

                <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-black">
                  <Image
                    src={comparisonPreview.previewUrls.original}
                    alt="Original preview"
                    fill
                    className="object-contain"
                    sizes="100vw"
                    priority
                  />
                  <div
                    className="absolute inset-y-0 left-0 overflow-hidden"
                    style={{ width: `${comparisonSliderValue}%` }}
                  >
                    <div className="relative h-full w-full">
                      <Image
                        src={comparisonPreview.previewUrls.processed}
                        alt="Blurred preview"
                        fill
                        className="object-contain"
                        sizes="100vw"
                        priority
                      />
                    </div>
                  </div>
                  <div
                    className="pointer-events-none absolute inset-y-0"
                    style={{ left: `calc(${comparisonSliderValue}% - 1px)` }}
                  >
                    <div className="relative h-full w-px bg-card dark:dark:bg-card/70">
                      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-card dark:dark:bg-card/90 px-2 py-1 text-xs font-medium text-foreground dark:text-foreground">
                        <ChevronLeft className="h-4 w-4" />
                        <span>Drag</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">Original</span>
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">Blurred</span>
                </div>

                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="comparison-slider">
                  Adjust slider to reveal more of each version
                </label>
                <input
                  id="comparison-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={comparisonSliderValue}
                  onChange={(event) => setComparisonSliderValue(Number(event.target.value))}
                  className="w-full accent-primary"
                />
                <div className="mt-2 flex justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span>Original</span>
                  <span>Blurred</span>
                </div>
              </div>
            </div>
          )
        })()
      )}


      {/* Photo Editor Modal */}
      {editingPreviewId && (() => {
        const editPreview = previews.find(p => p.id === editingPreviewId)
        if (!editPreview) return null
        const editSrc = editPreview.activeView === 'processed' && editPreview.previewUrls.processed
          ? editPreview.previewUrls.processed
          : editPreview.previewUrls.original
        return (
          <PhotoEditor
            src={editSrc}
            fileName={editPreview.file.name}
            onSave={(result: PhotoEditorResult) => {
              // Replace the preview's file and URL with the edited version
              setPreviews(prev => prev.map(p => {
                if (p.id !== editingPreviewId) return p
                // Revoke old URLs
                revokePreviewUrls(p)
                const newMetadata = p.file.faceBlurMetadata ? {
                  ...p.file.faceBlurMetadata,
                  edited: true,
                } : undefined
                const editedFile = new File([result.file], result.file.name, { type: result.file.type }) as FileWithFaceBlurMetadata
                if (newMetadata) {
                  editedFile.faceBlurMetadata = newMetadata
                }
                return {
                  ...p,
                  file: editedFile,
                  previewUrls: {
                    original: result.previewUrl,
                    processed: undefined,
                  },
                  activeView: 'original' as PreviewView,
                  id: p.id,
                  blurApplied: false,
                }
              }))
              setEditingPreviewId(null)
            }}
            onCancel={() => setEditingPreviewId(null)}
          />
        )
      })()}

      {/* Photo Tips */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h5 className="font-medium text-sm mb-2">Photo Tips</h5>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Use high-quality, well-lit photos</li>
          <li>• Include a clear face photo as your primary image</li>
          <li>• Show your personality and interests</li>
          <li>• Avoid group photos or heavily filtered images</li>
          <li>• Keep photos recent and authentic</li>
        </ul>
      </div>
    </div>
  )
}


