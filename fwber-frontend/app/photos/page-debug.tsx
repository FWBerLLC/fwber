'use client'

import { useState } from 'react'
import Image from 'next/image'
import { usePhotos } from '@/lib/api/photos'
import { Eye, Star, Trash2, GripVertical } from 'lucide-react'

// Simple test component to verify rendering
export default function PhotoTestPage() {
  const { photos, loading } = usePhotos()
  
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Photo Test Page</h1>
      <p style={{ marginBottom: '20px' }}>Photos count: {photos.length}</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '16px',
        marginTop: '20px'
      }}>
        {photos.map((photo, index) => (
          <div 
            key={photo.id} 
            style={{
              position: 'relative',
              width: '200px',
              height: '200px',
              border: '2px solid #000',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#f0f0f0'
            }}
          >
            <Image
              src={photo.thumbnail_url || photo.url}
              alt={`Photo ${index + 1}`}
              fill
              style={{
                objectFit: 'cover'
              }}
            />
            
            {/* Always visible drag handle */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                padding: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.9)',
                borderRadius: '4px',
                cursor: 'grab',
                zIndex: 20,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
              title="Drag to reorder"
            >
              <GripVertical style={{ width: '20px', height: '20px', color: 'white' }} />
            </div>
            
            {/* Always visible action buttons */}
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                right: '8px',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center'
              }}
            >
              <button type="button"
                onClick={() => alert(`View photo ${index + 1}`)}
                style={{
                  padding: '8px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="View photo"
              >
                <Eye style={{ width: '16px', height: '16px' }} />
              </button>
              
              <button type="button"
                onClick={() => alert(`Set primary ${index + 1}`)}
                style={{
                  padding: '8px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Set primary"
              >
                <Star style={{ width: '16px', height: '16px' }} />
              </button>
              
              <button type="button"
                onClick={() => alert(`Delete ${index + 1}`)}
                style={{
                  padding: '8px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Delete photo"
              >
                <Trash2 style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            
            {/* Photo number badge */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                padding: '4px 8px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              #{index + 1}
            </div>
          </div>
        ))}
      </div>
      
      {photos.length === 0 && (
        <p style={{ marginTop: '20px', color: '#666' }}>No photos uploaded yet.</p>
      )}
    </div>
  )
}

