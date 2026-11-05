'use client'

import { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { usePhotos, usePhotoSettings } from '@/lib/api/photos'
import PhotoGallery from '@/components/PhotoGallery'
import { Button } from '@/components/ui/button'

const PhotoUpload = dynamic(() => import('@/components/PhotoUpload'), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />
})
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Camera, 
  ShieldCheck,
  Star, 
  Trash2, 
  Eye, 
  AlertCircle,
  CheckCircle2,
  GripVertical
} from 'lucide-react'
import { isFeatureEnabled } from '@/lib/featureFlags'

// Sortable Photo Item Component
function SortablePhotoItem({ 
  photo, 
  index, 
  onView, 
  onSetPrimary, 
  onDelete,
  isPrimary 
}: {
  photo: any
  index: number
  onView: () => void
  onSetPrimary: () => void
  onDelete: () => void
  isPrimary: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(photo.id) })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div 
      ref={setNodeRef} 
      style={{ 
        ...style, 
        position: 'relative',
        width: '100%',
        marginBottom: '16px'
      }} 
    >
      {/* Photo container with square aspect ratio (standard for photo grids) */}
      <div style={{ 
        position: 'relative',
        width: '100%',
        paddingTop: '100%', // Creates square aspect ratio (1:1) using padding trick for better browser support
        borderRadius: '0.5rem', 
        overflow: 'visible', // Changed to visible so buttons can show
        backgroundColor: '#f3f4f6',
        cursor: 'pointer',
        border: '1px solid #e5e7eb',
        isolation: 'isolate' // Create new stacking context
      }}>
             {/* Image container - fills the padding-top container - this is where ALL overlays should be positioned relative to */}
             <div 
               style={{
                 position: 'absolute',
                 top: 0,
                 left: 0,
                 width: '100%',
                 height: '100%',
                 overflow: 'visible', // Changed to visible so overlay buttons can show
                 borderRadius: '0.5rem',
                 zIndex: 1,
               }}
               onDragStart={(e) => {
                 // Prevent drag on everything except the drag handle
                 const target = e.target as HTMLElement
                 const isDragHandle = target.closest('[data-drag-handle="true"]')
                 if (!isDragHandle) {
                   e.preventDefault()
                   e.stopPropagation()
                   return false
                 }
               }}
               draggable={false}
             >
               <Image
                 src={photo.thumbnail_url || photo.url}
                 alt={`Photo ${index + 1}`}
                 onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                 style={{
                   width: '100%',
                   height: '100%',
                   objectFit: 'cover',
                   display: 'block',
                   borderRadius: '0.5rem',
                   userSelect: 'none',
                   pointerEvents: 'auto',
                 } as React.CSSProperties}
                 fill
                 className="object-cover rounded-lg select-none pointer-events-auto"
                 onClick={(e) => {
                   // Only open gallery if not dragging
                   if (!isDragging) {
                     onView()
                   }
                 }}
                 draggable={false}
                 onDragStart={(e) => {
                   e.preventDefault()
                   e.stopPropagation()
                   return false
                 }}
                 sizes="(max-width: 768px) 50vw, 33vw"
               />
          
          {/* Drag Handle - BRIGHT BLUE, positioned relative to image container */}
          <div
            data-drag-handle="true"
            {...attributes}
            {...listeners}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '48px',
              height: '48px',
              backgroundColor: '#2563eb',
              borderRadius: '8px',
              cursor: 'grab',
              zIndex: 10000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
              border: '4px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
              transition: 'all 0.2s',
              transform: 'translateZ(0)',
              willChange: 'transform',
            }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1d4ed8'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          onMouseDown={(e) => { 
            e.stopPropagation()
            e.currentTarget.style.cursor = 'grabbing'
            e.currentTarget.style.backgroundColor = '#1e40af'
          }}
          onMouseUp={(e) => { 
            e.stopPropagation()
            e.currentTarget.style.cursor = 'grab'
            e.currentTarget.style.backgroundColor = '#2563eb'
          }}
          title="DRAG TO REORDER"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          >
            <GripVertical style={{ width: '28px', height: '28px', color: 'white', strokeWidth: 3 }} />
          </div>
          
          {/* Photo Actions - positioned relative to image container, overlay at bottom */}
          <div 
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              right: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              zIndex: 10000,
              pointerEvents: 'auto',
              padding: '4px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '8px',
              backdropFilter: 'blur(4px)',
              transform: 'translateZ(0)',
              willChange: 'transform',
            }}
          >
        <button type="button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onView()
          }}
          style={{
            padding: '12px',
            backgroundColor: '#4b5563',
            color: 'white',
            border: '2px solid #ffffff',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '44px',
            minHeight: '44px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#6b7280'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4b5563'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title="View photo in full screen"
        >
          <Eye style={{ width: '20px', height: '20px', strokeWidth: 2.5 }} />
        </button>
        
        {!isPrimary && (
          <button type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onSetPrimary()
            }}
            style={{
              padding: '12px',
              backgroundColor: '#4b5563',
              color: 'white',
              border: '2px solid #ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#6b7280'
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4b5563'
              e.currentTarget.style.transform = 'scale(1)'
            }}
            title="Set as primary photo"
          >
            <Star style={{ width: '20px', height: '20px', strokeWidth: 2.5 }} />
          </button>
        )}
        
        <button type="button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onDelete()
          }}
          style={{
            padding: '12px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: '2px solid #ffffff',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '44px',
            minHeight: '44px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#dc2626'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ef4444'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title="Delete photo"
        >
          <Trash2 style={{ width: '20px', height: '20px', strokeWidth: 2.5 }} />
        </button>
        </div>
        
        {/* Photo Badges - positioned relative to image container, overlay top-left */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          pointerEvents: 'none',
          transform: 'translateZ(0)',
        }}>
          {isPrimary && (
            <div style={{
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              <Star style={{ width: '12px', height: '12px', fill: 'white' }} />
              Primary
            </div>
          )}
          <div style={{
            padding: '2px 6px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            #{index + 1}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default function PhotoManagementPage() {
  const { photos, loading, error, uploadPhotos, deletePhoto, setPrimaryPhoto, reorderPhotos, setPhotos, fetchPhotos } = usePhotos()
  const { settings } = usePhotoSettings()
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [showGallery, setShowGallery] = useState(false)

  // Removed debug logging

  // Drag and drop sensors - Reduced activation distance for easier dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8 pixels before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleUpload = async (
    items: Array<{ file: File; isPrivate?: boolean }> | File[],
    onProgress?: (fileIndex: number, progress: number, fileName: string) => void
  ) => {
    try {
      await uploadPhotos(items, onProgress)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const handleRemove = async (photoId: string) => {
    // Optimistically remove from UI immediately for instant feedback
    const photoToRemove = photos.find(p => String(p.id) === photoId)
    if (photoToRemove) {
      setPhotos(photos.filter(p => String(p.id) !== photoId))
      
      // Close gallery if the deleted photo was being viewed
      if (selectedPhoto === photoToRemove.url) {
        closeGallery()
      }
    }
    
    try {
      await deletePhoto(photoId)
      // deletePhoto already updates state, no need to refetch unless error
    } catch (error) {
      console.error('Delete failed:', error)
      // On error, refetch to restore correct state
      fetchPhotos()
    }
  }

  const handleSetPrimary = async (photoId: string) => {
    try {
      await setPrimaryPhoto(photoId)
    } catch (error) {
      console.error('Set primary failed:', error)
    }
  }

  const faceBlurEnabled = isFeatureEnabled('clientFaceBlur')

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    // Ensure IDs are compared as strings
    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    const oldIndex = photos.findIndex((photo) => String(photo.id) === activeIdStr)
    const newIndex = photos.findIndex((photo) => String(photo.id) === overIdStr)

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return
    }

    // Optimistically update UI immediately for instant feedback
    const newOrder = arrayMove(photos, oldIndex, newIndex)
    
    // Update photos state immediately using the hook's internal state setter
    // This gives instant visual feedback - no delay or "teleport" effect
    setPhotos(newOrder)

    // Save to backend in the background (don't await - fire and forget)
    // Pass skipOptimisticUpdate=true to prevent the hook from overwriting our optimistic update
    // If it fails, we'll refetch to get the correct order from backend
    reorderPhotos(newOrder.map(photo => String(photo.id)), true).catch((error) => {
      console.error('Reorder failed:', error)
      // On error, refetch photos to get correct order from backend
      fetchPhotos()
    })
  }

  const openGallery = (photoUrl: string) => {
    setSelectedPhoto(photoUrl)
    setShowGallery(true)
  }

  const closeGallery = () => {
    setShowGallery(false)
    setSelectedPhoto(null)
  }

  // Page-wide drag and drop handler for file uploads
  // MUST be declared before any early returns to satisfy React hooks rules
  const [isPageDragActive, setIsPageDragActive] = useState(false)
  
  useEffect(() => {
    let dragCounter = 0 // Track nested drag events
    
    const handleDragEnter = (e: DragEvent) => {
      // Only handle file drags, ignore photo reordering drags
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files') && !Array.from(e.dataTransfer.types).includes('application/json')) {
        dragCounter++
        if (dragCounter === 1) {
          e.preventDefault()
          e.stopPropagation()
          setIsPageDragActive(true)
        }
      }
    }
    
    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files') && !Array.from(e.dataTransfer.types).includes('application/json')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    
    const handleDragLeave = (e: DragEvent) => {
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files') && !Array.from(e.dataTransfer.types).includes('application/json')) {
        dragCounter--
        if (dragCounter === 0) {
          setIsPageDragActive(false)
        }
      }
    }
    
    const handleDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files') && !Array.from(e.dataTransfer.types).includes('application/json')) {
        e.preventDefault()
        e.stopPropagation()
        dragCounter = 0
        setIsPageDragActive(false)
        // Let the PhotoUpload component's dropzone handle the actual drop
        // This just provides visual feedback that the page accepts drops
      }
    }
    
    document.addEventListener('dragenter', handleDragEnter, false)
    document.addEventListener('dragover', handleDragOver, false)
    document.addEventListener('dragleave', handleDragLeave, false)
    document.addEventListener('drop', handleDrop, false)
    
    return () => {
      document.removeEventListener('dragenter', handleDragEnter, false)
      document.removeEventListener('dragover', handleDragOver, false)
      document.removeEventListener('dragleave', handleDragLeave, false)
      document.removeEventListener('drop', handleDrop, false)
    }
  }, [])

  // Early return after all hooks are declared
  if (loading && photos.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading photos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background ${isPageDragActive ? 'opacity-95' : ''}`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Photo Management</h1>
          <p className="text-muted-foreground">
            Manage your profile photos to showcase your personality and attract better matches.
                </p>
              </div>

        {/* Error Display */}
          {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Upload Photos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {faceBlurEnabled && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary-900">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Local face blur is turned on</p>
                  <p className="text-xs text-primary-800">
                    We detect and blur faces in new uploads directly on your device before any data reaches our servers.
                  </p>
                </div>
              </div>
            )}
            <PhotoUpload
              onUpload={handleUpload}
              onRemove={(index: number) => {
                // PhotoUpload passes index, but we need photo ID
                const photo = photos[index]
                if (photo) {
                  handleRemove(String(photo.id))
                }
              }}
              photos={photos}
              maxPhotos={settings?.max_photos || 12}
              maxSize={settings ? settings.max_file_size / (1024 * 1024) : 5}
            />
          </CardContent>
        </Card>

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Your Photos</span>
                  <Badge variant="secondary">{photos.length} photos</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Drag to reorder • Click to view
              </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={photos.map(photo => String(photo.id))}
                  strategy={rectSortingStrategy}
                >
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '16px',
                    width: '100%'
                  }}>
                    {photos.map((photo, index) => (
                      <SortablePhotoItem
                        key={String(photo.id)}
                        photo={photo}
                        index={index}
                        isPrimary={photo.is_primary}
                        onView={() => {
                          openGallery(photo.url)
                        }}
                        onSetPrimary={() => handleSetPrimary(String(photo.id))}
                        onDelete={() => handleRemove(String(photo.id))}
                      />
                    ))}
                    </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        )}

        {/* Photo Tips */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Photo Best Practices</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-green-600">✅ Do This</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Use clear, well-lit photos</li>
                  <li>• Include a smiling face photo as primary</li>
                  <li>• Show your hobbies and interests</li>
                  <li>• Use recent photos (within 2 years)</li>
                  <li>• Include full-body shots</li>
                  <li>• Show your personality</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-red-600">❌ Avoid This</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Group photos or cropped faces</li>
                  <li>• Heavily filtered or edited photos</li>
                  <li>• Photos with sunglasses or hats</li>
                  <li>• Inappropriate or explicit content</li>
                  <li>• Photos with other people</li>
                  <li>• Low-quality or blurry images</li>
                </ul>
          </div>
        </div>
          </CardContent>
        </Card>
      </div>

      {/* Photo Gallery Modal */}
      {showGallery && selectedPhoto && photos.length > 0 && (
        <PhotoGallery
          photos={photos.map(photo => photo.url)}
          photoIds={photos.map(photo => String(photo.id))}
          initialIndex={photos.findIndex(p => p.url === selectedPhoto)}
          onClose={closeGallery}
          onDelete={async (photoId: string) => {
            try {
              await handleRemove(photoId)
              // Check if photo still exists (handleRemove updates photos state)
              // We'll rely on the useEffect in PhotoGallery to handle closing
            } catch (error) {
              console.error('Delete failed in gallery:', error)
            }
          }}
        />
      )}
    </div>
  )
}