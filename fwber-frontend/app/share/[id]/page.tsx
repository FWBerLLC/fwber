import { Metadata } from 'next';
import { ShareContent } from './share-content';

// This is a Server Component
export default async function SharePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <ShareContent id={params.id} />;
}

// Generate dynamic metadata for social sharing
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.fwber.site/api';
  
  try {
    const res = await fetch(`${apiUrl}/viral-content/${params.id}`);
    
    if (!res.ok) {
        return {
            title: 'fwber - Viral Profile Analysis',
            description: 'Check out this AI-generated profile analysis on fwber.',
        };
    }

    const data = await res.json();
    const userName = data.user_name || 'Someone';
    
    let title = 'fwber Analysis';
    let description = 'See what AI thinks about this profile.';

    switch (data.type) {
      case 'roast':
        title = `Roast of ${userName} 🔥`;
        description = `Read this brutal AI roast of ${userName}'s dating profile.`;
        break;
      case 'hype':
        title = `${userName}'s Hype ✨`;
        description = `See why ${userName} is a catch according to AI.`;
        break;
      case 'fortune':
        title = `${userName}'s Dating Fortune 🔮`;
        description = `See what the future holds for ${userName}'s love life.`;
        break;
      case 'nemesis':
        title = `Scientific Nemesis 🧬`;
        description = `Find out who ${userName} should absolutely avoid dating.`;
        break;
      case 'vibe':
        title = `${userName}'s Vibe Check 🚩`;
        description = `${data.content.green_flags?.length || 0} Green flags, ${data.content.red_flags?.length || 0} Red flags detected by AI.`;
        break;
      case 'quirk':
        title = `${userName}'s Quirk Check 😜`;
        description = `Quirk: "${data.content.quirk}". AI says: ${data.content.flag_type} - ${data.content.reason}`;
        break;
      case 'cosmic':
        title = `Cosmic Match Prediction ✨`;
        description = `The stars have spoken. Find out who is the perfect celestial match for ${userName}.`;
        break;
      case 'compatibility-audit':
        title = `Compatibility Audit: ${data.content.overall_score}% 💖`;
        description = `Deep dive into the connection between these two profiles. ${data.content.narrative}`;
        break;
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      }
    };

  } catch (error) {
    return {
      title: 'fwber - Viral Profile Analysis',
      description: 'Check out this AI-generated profile analysis on fwber.',
    };
  }
}
