import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'fwber — AI Profile Analysis';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.fwber.site/api';
  
  let userName = 'Someone';
  let type = 'roast';
  let emoji = '🔥';
  let bgColor = 'from-orange-600 to-red-600';
  
  try {
    const res = await fetch(`${apiUrl}/api/viral-content/${id}`, { 
      next: { revalidate: 3600 } 
    });
    
    if (res.ok) {
      const data = await res.json();
      userName = data.user_name || 'Someone';
      type = data.type || 'roast';
    }
  } catch {
    // Use defaults
  }
  
  switch (type) {
    case 'hype':
      emoji = '✨';
      bgColor = 'from-blue-600 to-purple-600';
      break;
    case 'fortune':
      emoji = '🔮';
      bgColor = 'from-yellow-600 to-amber-600';
      break;
    case 'nemesis':
      emoji = '🧬';
      bgColor = 'from-red-600 to-pink-600';
      break;
    case 'vibe':
      emoji = '🚩';
      bgColor = 'from-purple-600 to-indigo-600';
      break;
  }
  
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
          background: `linear-gradient(135deg, ${bgColor.includes('orange') ? '#ea580c, #dc2626' : bgColor.includes('blue') ? '#2563eb, #9333ea' : bgColor.includes('yellow') ? '#ca8a04, #d97706' : bgColor.includes('red') ? '#dc2626, #ec4899' : '#9333ea, #6366f1'})`,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 80, marginBottom: 20 }}>{emoji}</div>
        <div style={{ display: 'flex', fontSize: 48, fontWeight: 800, color: 'white', marginBottom: 10 }}>
          {type === 'roast' ? `Roast of ${userName}` : 
           type === 'hype' ? `${userName}'s Hype` :
           type === 'fortune' ? `${userName}'s Fortune` :
           type === 'nemesis' ? `Scientific Nemesis` :
           `${userName}'s Vibe Check`}
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.8)' }}>
          See what AI thinks — fwber.site
        </div>
      </div>
    ),
    { ...size }
  );
}
