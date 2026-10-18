"use client";

import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const QUOTES = [
  "The meeting of two personalities is like the contact of two chemical substances. — Carl Jung",
  "Where there is love there is life. — Mahatma Gandhi",
  "The greatest thing you'll ever learn is just to love and be loved in return. — Eden Ahbez",
  "Love is composed of a single soul inhabiting two bodies. — Aristotle",
  "Intimacy is the capacity to be rather weird with someone — and finding that that's ok with them. — Alain de Botton",
  "We accept the love we think we deserve. — Stephen Chbosky",
  "Being deeply loved by someone gives you strength, while loving someone deeply gives you courage. — Lao Tzu",
  "The best thing to hold onto in life is each other. — Audrey Hepburn",
  "To love and be loved is to feel the sun from both sides. — David Viscott",
  "Love recognizes no barriers. — Maya Angelou",
  "A great relationship doesn't happen because of the love you had in the beginning, but how well you continue building love until the end. — Unknown",
  "Chemistry is you touching my arm and setting fire to my mind. — Nayyirah Waheed",
  "The power of love is a curious thing. — Huey Lewis & The News",
  "The only way to get rid of a temptation is to yield to it. — Oscar Wilde",
  "My mother told me to be a lady. And for her, that meant be your own person, be independent. — Ruth Bader Ginsburg",
  "In all the world, there is no heart for me like yours. — Maya Angelou",
  "You are my today and all of my tomorrows. — Leo Christopher",
  "I have found the one whom my soul loves. — Song of Solomon 3:4",
  "Whatever our souls are made of, his and mine are the same. — Emily Bronte",
  "I would rather share one lifetime with you than face all the ages of this world alone. — J.R.R. Tolkien"
];

export default function InspireQuote() {
  const [quote, setQuote] = useState<string>("");

  useEffect(() => {
    // Select a random quote on mount (client-side only to avoid hydration mismatch)
    const random = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setQuote(random);
  }, []);

  if (!quote) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-200/70 bg-gradient-to-br from-white via-fuchsia-50/80 to-cyan-50/90 p-6 shadow-[0_18px_50px_rgba(168,85,247,0.12)] dark:border-fuchsia-500/20 dark:bg-gradient-to-br dark:from-slate-950 dark:via-fuchsia-950/45 dark:to-slate-900 dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(244,114,182,0.18),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(34,211,238,0.16),_transparent_30%)] pointer-events-none" />

      <div className="relative z-10 flex items-start gap-4">
        <div className="rounded-xl border border-fuchsia-200/80 bg-card dark:bg-gray-800/85 p-2.5 shadow-sm dark:border-cyan-400/20 dark:bg-white/10">
          <Quote className="h-5 w-5 text-fuchsia-500 dark:text-cyan-300" />
        </div>
        <p className="text-lg md:text-xl font-medium italic leading-relaxed text-slate-800 dark:bg-gradient-to-r dark:from-cyan-200 dark:via-white dark:to-fuchsia-200 dark:bg-clip-text dark:text-transparent">
          &ldquo;{quote}&rdquo;
        </p>
      </div>
    </div>
  );
}
