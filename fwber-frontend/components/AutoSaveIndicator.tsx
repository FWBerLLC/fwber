'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, AlertCircle, Cloud, CloudOff } from 'lucide-react'
import type { AutoSaveStatus } from '@/lib/useAutoSave'

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus
  isDirty: boolean
  /** Show a more compact inline version (e.g. inside the bottom bar) */
  compact?: boolean
}

const STATUS_CONFIG: Record<AutoSaveStatus, { label: string; icon: React.ElementType; className: string }> = {
  idle: {
    label: 'Changes auto-save',
    icon: Cloud,
    className: 'text-muted-foreground dark:text-muted-foreground',
  },
  saving: {
    label: 'Saving...',
    icon: Loader2,
    className: 'text-blue-500 dark:text-blue-400',
  },
  saved: {
    label: 'Saved!',
    icon: CheckCircle2,
    className: 'text-emerald-500 dark:text-emerald-400',
  },
  error: {
    label: 'Could not save',
    icon: AlertCircle,
    className: 'text-red-500 dark:text-red-400',
  },
}

export default function AutoSaveIndicator({ status, isDirty, compact }: AutoSaveIndicatorProps) {
  const [visible, setVisible] = useState(true)
  const config = STATUS_CONFIG[status]

  // The "saved" badge fades out after 2 seconds
  useEffect(() => {
    if (status === 'saved') {
      const t = setTimeout(() => setVisible(false), 2500)
      return () => clearTimeout(t)
    }
    setVisible(true)
  }, [status])

  if (!visible && status === 'saved') return null

  const Icon = config.icon

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium transition-all duration-500 ${config.className}`}>
        <Icon className={`w-3.5 h-3.5 ${status === 'saving' ? 'animate-spin' : ''}`} />
        {config.label}
      </span>
    )
  }

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-500 ease-out
        ${status === 'saving' ? 'bg-blue-50 dark:bg-blue-900/30 scale-105' : ''}
        ${status === 'saved' ? 'bg-emerald-50 dark:bg-emerald-900/30 scale-105' : ''}
        ${status === 'error' ? 'bg-red-50 dark:bg-red-900/30' : ''}
        ${status === 'idle' && isDirty ? 'bg-amber-50 dark:bg-amber-900/20' : ''}
        ${status === 'idle' && !isDirty ? 'bg-muted dark:dark:bg-card/50' : ''}
        ${config.className}
      `}
    >
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${status === 'saving' ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
      {status === 'idle' && isDirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
    </div>
  )
}
