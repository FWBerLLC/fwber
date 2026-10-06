import { useCallback } from 'react'

export type PreviewTelemetryEventName =
  | 'face_blur_preview_ready'
  | 'face_blur_preview_toggled'
  | 'face_blur_preview_discarded'

type PreviewToggleView = 'original' | 'processed'

type PendingTelemetryEvent = {
  id: string
  name: PreviewTelemetryEventName
  payload: Record<string, unknown>
  ts: string
}

export interface PreviewReadyPayload {
  previewId: string
  fileName: string
  facesDetected?: number
  blurApplied: boolean
  processingTimeMs?: number
  backend?: 'client' | 'server'
  warning?: string
  skippedReason?: string
}

export interface PreviewToggledPayload {
  previewId: string
  view: PreviewToggleView
  facesDetected?: number
  blurApplied?: boolean
  warning?: string
}

export interface PreviewDiscardedPayload {
  previewId: string
  facesDetected?: number
  blurApplied?: boolean
  discardReason: 'user_removed' | 'validation_failed'
  warning?: string
  skippedReason?: string
}

const pendingEvents: PendingTelemetryEvent[] = []
const MAX_BATCH_SIZE = 10
const ENDPOINT = '/telemetry/client-events'

let flushInFlight: Promise<void> | null = null
let onlineListenerBound = false

const generateId = () => {
  const cryptoRef = typeof globalThis !== 'undefined'
    ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
    : undefined

  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID()
  }

  return Math.random().toString(36).slice(2)
}

const canSend = () => typeof navigator === 'undefined' || navigator.onLine

const ensureOnlineListener = () => {
  if (typeof window === 'undefined' || onlineListenerBound) {
    return
  }

  window.addEventListener('online', () => {
    void flushPreviewTelemetry()
  })
  onlineListenerBound = true
}

const formatPayload = (payload: Record<string, unknown>) =>
  Object.entries(payload).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})

const toReadyPayload = (payload: PreviewReadyPayload) =>
  formatPayload({
    preview_id: payload.previewId,
    file_name: payload.fileName,
    faces_detected: payload.facesDetected ?? null,
    blur_applied: payload.blurApplied,
    processing_ms: payload.processingTimeMs ?? null,
    backend: payload.backend ?? 'client',
    warning: payload.warning,
    skipped_reason: payload.skippedReason,
  })

const toToggledPayload = (payload: PreviewToggledPayload) =>
  formatPayload({
    preview_id: payload.previewId,
    view: payload.view,
    faces_detected: payload.facesDetected ?? null,
    blur_applied: payload.blurApplied,
    warning: payload.warning,
  })

const toDiscardedPayload = (payload: PreviewDiscardedPayload) =>
  formatPayload({
    preview_id: payload.previewId,
    faces_detected: payload.facesDetected ?? null,
    blur_applied: payload.blurApplied,
    discard_reason: payload.discardReason,
    warning: payload.warning,
    skipped_reason: payload.skippedReason,
  })

const enqueueEvent = (name: PreviewTelemetryEventName, payload: Record<string, unknown>) => {
  ensureOnlineListener()
  pendingEvents.push({
    id: generateId(),
    name,
    payload,
    ts: new Date().toISOString(),
  })

  if (canSend()) {
    void flushPreviewTelemetry()
  }
}

const postBatch = async (events: PendingTelemetryEvent[]) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fwber_token') : null
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const apiBaseUrl = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'https://api.fwber.site/api');
    const url = `${apiBaseUrl}${ENDPOINT}`

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events }),
    })

    if (!response.ok) {
      if (response.status === 404) return
      throw new Error(`Telemetry upload failed: ${response.status}`)
    }
  } catch (error) {
    console.warn('[telemetry] failed to upload preview events', error)
    throw error
  }
}

export const flushPreviewTelemetry = async (): Promise<void> => {
  if (pendingEvents.length === 0) {
    return
  }

  if (!canSend()) {
    return
  }

  if (flushInFlight) {
    return flushInFlight
  }

  flushInFlight = (async () => {
    while (pendingEvents.length > 0 && canSend()) {
      const batch = pendingEvents.splice(0, MAX_BATCH_SIZE)
      try {
        await postBatch(batch)
      } catch (error) {
        pendingEvents.unshift(...batch)
        break
      }
    }
    flushInFlight = null
  })()

  return flushInFlight
}

export const usePreviewTelemetry = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true

  const trackPreviewReady = useCallback(
    (payload: PreviewReadyPayload) => {
      if (!enabled) return
      enqueueEvent('face_blur_preview_ready', toReadyPayload(payload))
    },
    [enabled]
  )

  const trackPreviewToggled = useCallback(
    (payload: PreviewToggledPayload) => {
      if (!enabled) return
      enqueueEvent('face_blur_preview_toggled', toToggledPayload(payload))
    },
    [enabled]
  )

  const trackPreviewDiscarded = useCallback(
    (payload: PreviewDiscardedPayload) => {
      if (!enabled) return
      enqueueEvent('face_blur_preview_discarded', toDiscardedPayload(payload))
    },
    [enabled]
  )

  const flushTelemetryQueue = useCallback(() => {
    if (!enabled) {
      return Promise.resolve()
    }
    return flushPreviewTelemetry()
  }, [enabled])

  return {
    trackPreviewReady,
    trackPreviewToggled,
    trackPreviewDiscarded,
    flushTelemetryQueue,
  }
}
