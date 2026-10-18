'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import {
  X, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Crop, Sun, Contrast, Droplets, Palette, ZoomIn, ZoomOut,
  Check, Undo2, Move, Maximize2, CircleDot, Sparkles,
  Eraser, Highlighter
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PhotoEditorResult {
  file: File
  previewUrl: string
}

interface PhotoEditorProps {
  /** Image source URL (blob or data URL) */
  src: string
  /** Original file name (used for the output File) */
  fileName: string
  /** Called when user confirms edits */
  onSave: (result: PhotoEditorResult) => void
  /** Called when user cancels */
  onCancel: () => void
}

interface AdjustmentState {
  brightness: number    // 0 – 200 (100 = neutral)
  contrast: number      // 0 – 200
  saturation: number    // 0 – 200
  blur: number          // 0 – 20 px
  sharpen: number       // 0 – 100
  hueRotate: number     // 0 – 360 deg
  vignette: number      // 0 – 100
}

interface CropState {
  x: number
  y: number
  width: number
  height: number
  active: boolean
}

interface HistoryEntry {
  adjustments: AdjustmentState
  filter: string
  rotation: number
  flipH: boolean
  flipV: boolean
  crop: CropState | null
}

type Tool = 'adjust' | 'crop' | 'filter' | 'blur-brush'

const FILTERS: Record<string, string> = {
  none: '',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(80%)',
  vintage: 'sepia(40%) saturate(70%) brightness(110%)',
  warm: 'saturate(150%) brightness(105%) hue-rotate(-10deg)',
  cool: 'saturate(80%) brightness(105%) hue-rotate(20deg)',
  dramatic: 'contrast(140%) saturate(120%) brightness(90%)',
  fade: 'brightness(115%) contrast(85%) saturate(80%)',
  vivid: 'saturate(200%) contrast(110%)',
  noir: 'grayscale(100%) contrast(140%) brightness(90%)',
  chrome: 'saturate(60%) contrast(130%) brightness(115%)',
}

const FILTER_THUMBNAILS: Record<string, { label: string; css: string }> = {
  none: { label: 'None', css: '' },
  grayscale: { label: 'B&W', css: 'grayscale(100%)' },
  sepia: { label: 'Sepia', css: 'sepia(80%)' },
  vintage: { label: 'Vintage', css: 'sepia(40%) saturate(70%) brightness(110%)' },
  warm: { label: 'Warm', css: 'saturate(150%) brightness(105%) hue-rotate(-10deg)' },
  cool: { label: 'Cool', css: 'saturate(80%) brightness(105%) hue-rotate(20deg)' },
  dramatic: { label: 'Dramatic', css: 'contrast(140%) saturate(120%) brightness(90%)' },
  fade: { label: 'Fade', css: 'brightness(115%) contrast(85%) saturate(80%)' },
  vivid: { label: 'Vivid', css: 'saturate(200%) contrast(110%)' },
  noir: { label: 'Noir', css: 'grayscale(100%) contrast(140%) brightness(90%)' },
  chrome: { label: 'Chrome', css: 'saturate(60%) contrast(130%) brightness(115%)' },
}

const DEFAULT_ADJUSTMENTS: AdjustmentState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  sharpen: 0,
  hueRotate: 0,
  vignette: 0,
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhotoEditor({ src, fileName, onSave, onCancel }: PhotoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const cropCanvasRef = useRef<HTMLCanvasElement>(null)

  const [adjustments, setAdjustments] = useState<AdjustmentState>({ ...DEFAULT_ADJUSTMENTS })
  const [activeFilter, setActiveFilter] = useState('none')
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [activeTool, setActiveTool] = useState<Tool>('adjust')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Crop state
  const [crop, setCrop] = useState<CropState | null>(null)
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 })
  const cropContainerRef = useRef<HTMLDivElement>(null)

  // Blur brush
  const [blurBrushSize, setBlurBrushSize] = useState(30)
  const [isBlurPainting, setIsBlurPainting] = useState(false)
  const blurMaskRef = useRef<ImageData | null>(null)

  // ─── Load Image ────────────────────────────────────────────────────────

  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight })
      setImageLoaded(true)
      pushHistory()
    }
    img.src = src
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // ─── History ───────────────────────────────────────────────────────────

  const pushHistory = useCallback(() => {
    setHistory(prev => {
      const entry: HistoryEntry = {
        adjustments: { ...adjustments },
        filter: activeFilter,
        rotation,
        flipH,
        flipV,
        crop: crop ? { ...crop } : null,
      }
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(entry)
      return newHistory.slice(-30) // Keep last 30 states
    })
    setHistoryIndex(prev => Math.min(prev + 1, 29))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const prevEntry = history[historyIndex - 1]
    setAdjustments(prevEntry.adjustments)
    setActiveFilter(prevEntry.filter)
    setRotation(prevEntry.rotation)
    setFlipH(prevEntry.flipH)
    setFlipV(prevEntry.flipV)
    setCrop(prevEntry.crop)
    setHistoryIndex(historyIndex - 1)
  }, [history, historyIndex])

  // ─── Adjustment Helpers ────────────────────────────────────────────────

  const setAdjustment = useCallback((key: keyof AdjustmentState, value: number) => {
    setAdjustments(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetAdjustments = useCallback(() => {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS })
    setActiveFilter('none')
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setCrop(null)
    pushHistory()
  }, [pushHistory])

  // ─── Rotation & Flip ──────────────────────────────────────────────────

  const rotateLeft = useCallback(() => {
    setRotation(prev => (prev - 90 + 360) % 360)
    pushHistory()
  }, [pushHistory])

  const rotateRight = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
    pushHistory()
  }, [pushHistory])

  const toggleFlipH = useCallback(() => {
    setFlipH(prev => !prev)
    pushHistory()
  }, [pushHistory])

  const toggleFlipV = useCallback(() => {
    setFlipV(prev => !prev)
    pushHistory()
  }, [pushHistory])

  // ─── Crop Interaction ─────────────────────────────────────────────────

  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'crop' || !cropContainerRef.current) return
    const rect = cropContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setCrop({ x, y, width: 0, height: 0, active: true })
    setCropStart({ x, y })
    setIsDraggingCrop(true)
  }, [activeTool])

  const handleCropMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingCrop || !cropContainerRef.current) return
    const rect = cropContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setCrop(prev => {
      if (!prev) return prev
      return {
        ...prev,
        width: Math.max(5, x - cropStart.x),
        height: Math.max(5, y - cropStart.y),
      }
    })
  }, [isDraggingCrop, cropStart])

  const handleCropMouseUp = useCallback(() => {
    setIsDraggingCrop(false)
  }, [])

  // ─── Blur Brush ────────────────────────────────────────────────────────

  const handleBlurBrush = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'blur-brush' || !canvasRef.current || !imageRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Apply local blur using a small area
    const radius = blurBrushSize * scaleX
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.clip()
    ctx.filter = `blur(${blurBrushSize / 2}px)`
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height)
    ctx.restore()
    ctx.filter = 'none'
  }, [activeTool, blurBrushSize])

  // ─── Render Preview ────────────────────────────────────────────────────

  const buildFilterString = useCallback(() => {
    const parts: string[] = []
    if (adjustments.brightness !== 100) parts.push(`brightness(${adjustments.brightness}%)`)
    if (adjustments.contrast !== 100) parts.push(`contrast(${adjustments.contrast}%)`)
    if (adjustments.saturation !== 100) parts.push(`saturate(${adjustments.saturation}%)`)
    if (adjustments.blur > 0) parts.push(`blur(${adjustments.blur}px)`)
    if (adjustments.hueRotate !== 0) parts.push(`hue-rotate(${adjustments.hueRotate}deg)`)
    const filterCSS = FILTERS[activeFilter] || ''
    if (filterCSS) parts.push(filterCSS)
    return parts.join(' ') || 'none'
  }, [adjustments, activeFilter])

  const cssFilter = buildFilterString()

  // ─── Export Final Image ────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const img = imageRef.current
    if (!img || !canvasRef.current) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Determine crop dimensions
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight

    if (crop && crop.width > 2 && crop.height > 2) {
      sx = (crop.x / 100) * img.naturalWidth
      sy = (crop.y / 100) * img.naturalHeight
      sw = (crop.width / 100) * img.naturalWidth
      sh = (crop.height / 100) * img.naturalHeight
    }

    // Handle rotation
    const isRotated = rotation === 90 || rotation === 270
    const outW = isRotated ? sh : sw
    const outH = isRotated ? sw : sh

    canvas.width = outW
    canvas.height = outH

    ctx.save()
    ctx.filter = cssFilter === 'none' ? '' : cssFilter

    // Apply transforms
    ctx.translate(outW / 2, outH / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    if (flipH) ctx.scale(-1, 1)
    if (flipV) ctx.scale(1, -1)
    ctx.translate(-sw / 2, -sh / 2)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    ctx.restore()

    // Vignette
    if (adjustments.vignette > 0) {
      const gradient = ctx.createRadialGradient(outW / 2, outH / 2, outW * 0.2, outW / 2, outH / 2, outW * 0.7)
      gradient.addColorStop(0, `rgba(0,0,0,0)`)
      gradient.addColorStop(1, `rgba(0,0,0,${adjustments.vignette / 100})`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, outW, outH)
    }

    canvas.toBlob((blob) => {
      if (!blob) return
      const previewUrl = URL.createObjectURL(blob)
      const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
      const file = new File([blob], fileName, { type: mimeType })
      onSave({ file, previewUrl })
    }, 'image/jpeg', 0.92)
  }, [cssFilter, rotation, flipH, flipV, crop, adjustments.vignette, fileName, onSave])

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, undo, handleSave])

  // ─── Render ────────────────────────────────────────────────────────────

  if (!imageLoaded) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90">
        <div className="text-white animate-pulse">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-gray-950 text-white">
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="p-2 hover:bg-gray-800 rounded-lg transition" title="Cancel (Esc)">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">Photo Editor</span>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={undo} disabled={historyIndex <= 0} className="p-2 hover:bg-gray-800 rounded-lg transition disabled:opacity-30" title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={resetAdjustments} className="px-3 py-1.5 text-xs hover:bg-gray-800 rounded-lg transition text-muted-foreground">
            Reset All
          </button>
        </div>

        <button type="button" onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition">
          <Check className="w-4 h-4" />
          Save
        </button>
      </div>

      {/* ── Main Area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Toolbar ──────────────────────────────────────────── */}
        <div className="w-14 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-3 gap-1">
          <ToolButton icon={<Palette className="w-5 h-5" />} label="Adjust" active={activeTool === 'adjust'} onClick={() => setActiveTool('adjust')} />
          <ToolButton icon={<Crop className="w-5 h-5" />} label="Crop" active={activeTool === 'crop'} onClick={() => setActiveTool('crop')} />
          <ToolButton icon={<Sparkles className="w-5 h-5" />} label="Filters" active={activeTool === 'filter'} onClick={() => setActiveTool('filter')} />
          <ToolButton icon={<Eraser className="w-5 h-5" />} label="Blur Brush" active={activeTool === 'blur-brush'} onClick={() => setActiveTool('blur-brush')} />

          <div className="w-8 h-px bg-gray-700 my-2" />

          <ToolButton icon={<RotateCcw className="w-5 h-5" />} label="Rotate Left" onClick={rotateLeft} />
          <ToolButton icon={<RotateCw className="w-5 h-5" />} label="Rotate Right" onClick={rotateRight} />
          <ToolButton icon={<FlipHorizontal className="w-5 h-5" />} label="Flip H" onClick={toggleFlipH} />
          <ToolButton icon={<FlipVertical className="w-5 h-5" />} label="Flip V" onClick={toggleFlipV} />
        </div>

        {/* ── Canvas Area ───────────────────────────────────────────── */}
        <div
          ref={cropContainerRef}
          className="flex-1 flex items-center justify-center bg-black relative overflow-hidden"
          onMouseDown={activeTool === 'crop' ? handleCropMouseDown : activeTool === 'blur-brush' ? (e) => { setIsBlurPainting(true); handleBlurBrush(e); } : undefined}
          onMouseMove={activeTool === 'crop' ? handleCropMouseMove : activeTool === 'blur-brush' && isBlurPainting ? handleBlurBrush : undefined}
          onMouseUp={activeTool === 'crop' ? handleCropMouseUp : () => setIsBlurPainting(false)}
          onMouseLeave={() => { setIsDraggingCrop(false); setIsBlurPainting(false); }}
          style={{ cursor: activeTool === 'crop' ? 'crosshair' : activeTool === 'blur-brush' ? 'none' : 'default' }}
        >
          <div className="relative max-w-full max-h-full" style={{ transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})` }}>
            <img
              src={src}
              alt="Editing"
              className="max-w-full max-h-[calc(100vh-180px)] object-contain select-none pointer-events-none"
              style={{ filter: cssFilter }}
              draggable={false}
            />

            {/* Crop overlay */}
            {activeTool === 'crop' && crop && crop.active && (
              <>
                {/* Dimmed areas outside crop */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-black/50" />
                  <div
                    className="absolute bg-transparent border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                    style={{
                      left: `${crop.x}%`,
                      top: `${crop.y}%`,
                      width: `${crop.width}%`,
                      height: `${crop.height}%`,
                    }}
                  >
                    {/* Grid lines */}
                    <div className="absolute inset-0">
                      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Blur brush cursor */}
          {activeTool === 'blur-brush' && (
            <div
              className="pointer-events-none fixed z-50 border-2 border-white rounded-full"
              style={{
                width: blurBrushSize,
                height: blurBrushSize,
                transform: 'translate(-50%, -50%)',
              }}
              id="blur-cursor"
            />
          )}
        </div>

        {/* ── Right Panel ───────────────────────────────────────────── */}
        <div className="w-72 bg-gray-900 border-l border-gray-800 overflow-y-auto">

          {/* ── Adjust Panel ─────────────────────────────────────────── */}
          {activeTool === 'adjust' && (
            <div className="p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adjustments</h3>
              <SliderControl label="Brightness" icon={<Sun className="w-4 h-4" />} value={adjustments.brightness} min={0} max={200} defaultValue={100} onChange={v => setAdjustment('brightness', v)} />
              <SliderControl label="Contrast" icon={<Contrast className="w-4 h-4" />} value={adjustments.contrast} min={0} max={200} defaultValue={100} onChange={v => setAdjustment('contrast', v)} />
              <SliderControl label="Saturation" icon={<Droplets className="w-4 h-4" />} value={adjustments.saturation} min={0} max={200} defaultValue={100} onChange={v => setAdjustment('saturation', v)} />
              <SliderControl label="Blur" icon={<CircleDot className="w-4 h-4" />} value={adjustments.blur} min={0} max={20} defaultValue={0} onChange={v => setAdjustment('blur', v)} />
              <SliderControl label="Hue" icon={<Palette className="w-4 h-4" />} value={adjustments.hueRotate} min={0} max={360} defaultValue={0} onChange={v => setAdjustment('hueRotate', v)} />
              <SliderControl label="Vignette" icon={<Maximize2 className="w-4 h-4" />} value={adjustments.vignette} min={0} max={100} defaultValue={0} onChange={v => setAdjustment('vignette', v)} />
            </div>
          )}

          {/* ── Crop Panel ──────────────────────────────────────────── */}
          {activeTool === 'crop' && (
            <div className="p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Crop</h3>
              <p className="text-xs text-muted-foreground">Click and drag on the image to select crop area</p>
              {crop && crop.width > 2 && crop.height > 2 && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Selection: {Math.round(crop.width)}% × {Math.round(crop.height)}%
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { setCrop({ x: 10, y: 10, width: 80, height: 80, active: true }); pushHistory(); }} className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">1:1</button>
                    <button type="button" onClick={() => { setCrop({ x: 10, y: 15, width: 80, height: 70, active: true }); pushHistory(); }} className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">4:3</button>
                    <button type="button" onClick={() => { setCrop({ x: 5, y: 20, width: 90, height: 60, active: true }); pushHistory(); }} className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">3:2</button>
                    <button type="button" onClick={() => { setCrop({ x: 0, y: 15, width: 100, height: 56.25, active: true }); pushHistory(); }} className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">16:9</button>
                  </div>
                  <button type="button" onClick={() => { setCrop(null); pushHistory(); }} className="w-full text-xs px-3 py-2 bg-red-900/50 hover:bg-red-800/50 rounded-lg transition text-red-300">
                    Clear Crop
                  </button>
                </div>
              )}
              {!crop && (
                <p className="text-xs text-muted-foreground italic">No crop selected. Drag on the image to create one.</p>
              )}
            </div>
          )}

          {/* ── Filter Panel ────────────────────────────────────────── */}
          {activeTool === 'filter' && (
            <div className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(FILTER_THUMBNAILS).map(([key, { label, css }]) => (
                  <button type="button"
                    key={key}
                    onClick={() => { setActiveFilter(key); pushHistory(); }}
                    className={`flex flex-col items-center gap-1 p-1 rounded-lg transition ${activeFilter === key ? 'ring-2 ring-purple-500 bg-gray-800' : 'hover:bg-gray-800'}`}
                  >
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-700">
                      <img
                        src={src}
                        alt={label}
                        className="w-full h-full object-cover"
                        style={{ filter: css || 'none' }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Blur Brush Panel ────────────────────────────────────── */}
          {activeTool === 'blur-brush' && (
            <div className="p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blur Brush</h3>
              <p className="text-xs text-muted-foreground">Paint over areas to blur them (faces, tattoos, etc.)</p>
              <SliderControl label="Brush Size" icon={<CircleDot className="w-4 h-4" />} value={blurBrushSize} min={5} max={100} defaultValue={30} onChange={setBlurBrushSize} />
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ToolButton({ icon, label, active, onClick }: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button type="button"
      onClick={onClick}
      title={label}
      className={`p-2.5 rounded-lg transition-colors ${active ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:bg-gray-800 hover:text-white'}`}
    >
      {icon}
    </button>
  )
}

function SliderControl({ label, icon, value, min, max, defaultValue, onChange }: {
  label: string
  icon: React.ReactNode
  value: number
  min: number
  max: number
  defaultValue: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground w-8 text-right">{value}</span>
          {value !== defaultValue && (
            <button type="button"
              onClick={() => onChange(defaultValue)}
              className="text-[10px] text-purple-400 hover:text-purple-300 px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onMouseUp={() => {}} // Could push history here
        className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
      />
    </div>
  )
}
