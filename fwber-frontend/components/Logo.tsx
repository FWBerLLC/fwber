import React from 'react'

interface LogoProps {
  className?: string
  showDotMe?: boolean
}

export function Logo({ className = '', showDotMe = true }: LogoProps) {
  // Unified gradient for the whole text to allow smooth cycling
  const gradientClass = 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500'

  const fontClasses = 'font-black tracking-tight'

  // Thicker stroke for the background to create the outline
  const outlineClass =
    'text-black [-webkit-text-stroke:4px_black] md:[-webkit-text-stroke:6px_black]'

  // Purple glow outside the black outline
  const outlineGlowClass = 'drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]'

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Layer 1: Outline (Background) with Glow */}
      <div
        className={`${fontClasses} absolute inset-0 select-none ${outlineGlowClass} z-0`}
        aria-hidden="true"
      >
        <span className={outlineClass}>fwber</span>
      </div>

      {/* Layer 2: Fill (Foreground) with Color Cycle */}
      <div className={`${fontClasses} relative z-10 animate-gradient-chaos select-none`}>
        <span className={`relative bg-clip-text text-transparent ${gradientClass}`}>
          fwber
          {/* Layer 3: Inner Shine/Highlight */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/60 via-transparent to-transparent bg-clip-text text-transparent">
            fwber
          </span>
        </span>

        {showDotMe && <span className="ml-0.5 text-[0.5em] font-bold text-muted-foreground">.me</span>}
      </div>
    </div>
  )
}
