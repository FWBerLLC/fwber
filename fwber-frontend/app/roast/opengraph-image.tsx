import { ImageResponse } from 'next/og';

// Next 16: edge runtime deprecated; nodejs is the default and runs ImageResponse fine
export const alt = 'fwber — Get AI Roasted';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ea580c, #dc2626, #9333ea)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 100, marginBottom: 20 }}>🔥</div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, color: 'white', marginBottom: 16 }}>
          Get Roasted by AI
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: 'rgba(255,255,255,0.9)', marginBottom: 30 }}>
          Brutal. Honest. Hilarious.
        </div>
        <div
          style={{
            display: 'flex',
            padding: '16px 48px',
            borderRadius: 50,
            background: 'white',
            color: '#dc2626',
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          Try It Free →
        </div>
      </div>
    ),
    { ...size }
  );
}
