'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

interface PhotoGalleryProps {
  photos: string[]
  photoIds?: string[]
  initialIndex?: number
  onClose: () => void
  onDelete?: (photoId: string) => void
}

export default function PhotoGallery({ 
  photos, 
  photoIds, 
  initialIndex = 0, 
  onClose,
  onDelete 
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, Math.min(initialIndex, photos.length - 1)))

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const handleDelete = async () => {
    if (onDelete && photoIds && photoIds[currentIndex]) {
      const photoId = photoIds[currentIndex]
      try {
        await onDelete(photoId)
        // After deletion, the parent will update the photos array
        // We'll handle navigation in useEffect when photos array changes
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }
  
  // Use ref to avoid onClose dependency issues
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Update current index when photos array changes (e.g., after deletion)
  useEffect(() => {
    if (photos.length === 0) {
      // If no photos left, close gallery
      onCloseRef.current()
    } else if (currentIndex >= photos.length) {
      // If current index is out of bounds, move to last photo
      setCurrentIndex(Math.max(0, photos.length - 1))
    }
  }, [photos.length, currentIndex])

  if (photos.length === 0) {
    return null
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <div 
        className="relative w-full h-full p-4 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button type="button"
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-3 bg-black/70 text-white rounded-full border-2 border-white/30 flex items-center justify-center hover:bg-black/90 transition-colors"
          aria-label="Close gallery"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Delete Button */}
        {onDelete && photoIds && photoIds[currentIndex] && (
          <button type="button"
            onClick={handleDelete}
            className="absolute top-6 right-20 z-10 p-3 bg-red-500/80 text-white rounded-full border-2 border-white/30 flex items-center justify-center hover:bg-red-500 transition-colors"
            title="Delete photo"
            aria-label="Delete photo"
          >
            <Trash2 className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Photo */}
        <div className="relative w-screen h-screen flex items-center justify-center p-8">
          <div className="relative w-full h-full">
            <Image
              src={photos[currentIndex]}
              alt={`Photo ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>

        {/* Navigation */}
        {photos.length > 1 && (
          <>
            <button type="button"
              onClick={prevPhoto}
              className="absolute left-8 top-1/2 -translate-y-1/2 z-10 p-4 bg-black/70 text-white rounded-full border-2 border-white/30 flex items-center justify-center hover:bg-black/90 hover:scale-110 transition-all"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
            
            <button type="button"
              onClick={nextPhoto}
              className="absolute right-8 top-1/2 -translate-y-1/2 z-10 p-4 bg-black/70 text-white rounded-full border-2 border-white/30 flex items-center justify-center hover:bg-black/90 hover:scale-110 transition-all"
              aria-label="Next photo"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          </>
        )}

        {/* Photo Counter */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm border-2 border-white/30 z-10">
          {currentIndex + 1} / {photos.length}
        </div>
      </div>
    </div>
  )
}
