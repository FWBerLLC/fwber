'use client'

import { useState, useEffect } from 'react'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reason: string, details: string) => Promise<void>
  userName: string
}

const REPORT_REASONS = [
  'Harassment',
  'Spam',
  'Inappropriate Content',
  'Fake Profile',
  'Scam / Fraud',
  'Underage',
  'Other'
]

export default function ReportModal({ isOpen, onClose, onSubmit, userName }: ReportModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setReason(REPORT_REASONS[0])
      setDetails('')
      setError(null)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return

    try {
      setIsSubmitting(true)
      setError(null)
      await onSubmit(reason, details)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isVisible && !isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full max-w-md bg-card dark:bg-card rounded-xl shadow-xl transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-4">Report {userName}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="report-reason" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                Reason for reporting
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border-border dark:border-border rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="report-details" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                Additional Details (Optional)
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                className="w-full border-border dark:border-border rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                placeholder="Please provide more context..."
                maxLength={2000}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-border dark:border-border text-foreground dark:text-muted-foreground rounded-md hover:bg-muted dark:bg-background font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
