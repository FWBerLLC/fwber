import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Roasted by AI — fwber | Free AI Profile Roast',
  description: 'Get a brutally honest AI roast of your dating profile. Share your roast, go viral, and earn 24h of Gold Premium. Free, instant, and hilarious.',
  openGraph: {
    title: 'Get Roasted by AI 🔥 — fwber',
    description: 'Get a brutally honest AI roast of your dating profile. Free, instant, hilarious.',
    type: 'website',
    url: 'https://www.fwber.site/roast',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Get Roasted by AI 🔥 — fwber',
    description: 'Get a brutally honest AI roast of your dating profile. Free, instant, hilarious.',
  },
  alternates: {
    canonical: 'https://www.fwber.site/roast',
  },
};

export default function RoastLayout({ children }: { children: React.ReactNode }) {
  return children;
}
