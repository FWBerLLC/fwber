import { ImageResponse } from 'next/og'
 
// Next 16: edge runtime deprecated; nodejs is the default and runs ImageResponse fine
 
export const alt = 'fwber - The Definitive Privacy-First Social Network'
export const size = {
  width: 1200,
  height: 630,
}
 
export const contentType = 'image/png'
 
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #0f172a, #1e1b4b)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Glow effect behind logo */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              letterSpacing: '-0.05em',
              color: 'transparent',
              backgroundImage: 'linear-gradient(to right, #ec4899, #a855f7, #06b6d4)',
              backgroundClip: 'text',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'baseline',
            }}
          >
            fwber
            <span style={{ fontSize: 40, color: '#9ca3af', marginLeft: 10 }}>.me</span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 32,
              color: '#e2e8f0',
              textAlign: 'center',
              maxWidth: '800px',
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            The Definitive Privacy-First Social Network
          </div>

          {/* CTA Badge */}
          <div
            style={{
              marginTop: 40,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 50,
              padding: '12px 32px',
              color: '#fff',
              fontSize: 24,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Join the Community
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
