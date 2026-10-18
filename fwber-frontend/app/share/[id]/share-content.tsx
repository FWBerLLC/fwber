'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Flame, Sparkles, Flag, AlertTriangle, CheckCircle2, Star, Skull, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface ViralContent {
  type: string;
  content: any;
  created_at: string;
  views: number;
  is_owner: boolean;
  reward_claimed: boolean;
  user_name?: string;
}


export function ShareContent({ id }: { id: string }) {
  const [data, setData] = useState<ViralContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.get<ViralContent>(`/viral-content/${id}`);
        setData(result);
      } catch (err) {
        setError('Failed to load content. It might have expired or does not exist.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Oops!</h1>
        <p className="text-muted-foreground mb-8">{error || 'Content not found'}</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    );
  }

  const renderContent = () => {
    switch (data.type) {

      case 'roast':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-orange-500/20">
                <Flame className="w-12 h-12 text-orange-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white">
              {data.user_name ? `Roast of ${data.user_name} 🔥` : 'Profile Roast 🔥'}
            </h2>
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-6">
              <p className="text-lg text-gray-200 italic leading-relaxed">
                &quot;{data.content.text}&quot;
              </p>
            </div>
          </div>
        );

      case 'hype':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-blue-500/20">
                <Sparkles className="w-12 h-12 text-blue-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white">
              {data.user_name ? `${data.user_name}'s Hype ✨` : 'Profile Hype ✨'}
            </h2>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
              <p className="text-lg text-gray-200 italic leading-relaxed">
                &quot;{data.content.text}&quot;
              </p>
            </div>
          </div>
        );

      case 'vibe':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-purple-500/20">
                <Flag className="w-12 h-12 text-purple-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white">
              {data.user_name ? `${data.user_name}'s Vibe Check` : 'Vibe Check Result'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-green-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Green Flags
                </h4>
                <ul className="space-y-2">
                  {data.content.green_flags.map((flag: string, i: number) => (
                    <li key={i} className="bg-green-900/20 border border-green-500/20 rounded px-3 py-2 text-sm text-green-100">
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-red-400 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Red Flags
                </h4>
                <ul className="space-y-2">
                  {data.content.red_flags.map((flag: string, i: number) => (
                    <li key={i} className="bg-red-900/20 border border-red-500/20 rounded px-3 py-2 text-sm text-red-100">
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );

      case 'fortune':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-yellow-500/20">
                <Star className="w-12 h-12 text-yellow-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white">
              {data.user_name ? `${data.user_name}'s Fortune 🔮` : 'Dating Fortune 🔮'}
            </h2>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
              <p className="text-lg text-gray-200 italic leading-relaxed">
                &quot;{data.content.text}&quot;
              </p>
            </div>
          </div>
        );

      case 'nemesis':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-500/20">
                <Skull className="w-12 h-12 text-red-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white">Scientific Nemesis 🧬</h2>
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-red-400 font-semibold text-sm uppercase tracking-wider mb-1">Nemesis Type</h3>
                <p className="text-white text-lg font-bold">{data.content.nemesis_type}</p>
              </div>
              <div className="pt-2 border-t border-red-500/20">
                <h3 className="text-red-400 font-semibold text-xs uppercase tracking-wider mb-2">Scientific Explanation</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{data.content.scientific_explanation}</p>
              </div>
              <div className="pt-2 border-t border-red-500/20">
                <h3 className="text-red-400 font-semibold text-xs uppercase tracking-wider mb-2">Clashing Traits</h3>
                <div className="flex flex-wrap gap-2">
                   {data.content.clashing_traits?.map((t: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-red-900/40 border border-red-500/30 rounded text-[10px] text-red-200">
                         {t}
                      </span>
                   ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'quirk':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-pink-500/20">
                <span className="text-4xl">{data.content.emoji || '😜'}</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white">
              {data.user_name ? `${data.user_name}'s Quirk Check` : 'Quirk Check Result'}
            </h2>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
               <div>
                <h4 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">The Quirk</h4>
                <p className="text-white text-lg font-medium italic">&quot;{data.content.quirk}&quot;</p>
              </div>
              <div className="flex items-center gap-2">
                 <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    data.content.flag_type?.includes('Green') ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    data.content.flag_type?.includes('Red') ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-zinc-800 text-zinc-400 border border-zinc-700'
                 }`}>
                    {data.content.flag_type}
                 </span>
              </div>
              <p className="text-muted-foreground leading-relaxed italic">
                {data.content.reason}
              </p>
            </div>
          </div>
        );

      case 'cosmic':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-indigo-500/20">
                <Sparkles className="w-12 h-12 text-indigo-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white">
              {data.user_name ? `${data.user_name}'s Cosmic Match` : 'Cosmic Match Oracle'}
            </h2>
            <div className="space-y-4">
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-5">
                <h4 className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Star className="w-3 h-3" /> Best Match
                </h4>
                <p className="text-white font-bold mb-1">{data.content.best_match}</p>
                <p className="text-sm text-muted-foreground italic">{data.content.best_reason}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                <h4 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Avoid
                </h4>
                <p className="text-zinc-300 font-bold mb-1">{data.content.worst_match}</p>
                <p className="text-sm text-zinc-500 italic">{data.content.worst_reason}</p>
              </div>
            </div>
          </div>
        );

      case 'compatibility-audit':
        return (
          <div className="space-y-6">
            <div className="flex justify-center flex-col items-center">
               <div className="text-6xl font-black italic tracking-tighter text-white mb-2">{data.content.overall_score}%</div>
               <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Compatibility Score</div>
            </div>
            <div className="space-y-4">
               <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-inner">
                  <p className="text-muted-foreground italic text-sm leading-relaxed">&quot;{data.content.narrative}&quot;</p>
               </div>
               <div className="grid grid-cols-1 gap-3">
                  {data.content.alignment_areas?.slice(0, 3).map((a: any, i: number) => (
                    <div key={i} className="flex gap-3 p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                       <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-1" />
                       <div>
                          <p className="text-xs font-black uppercase text-green-500">{a.area}</p>
                          <p className="text-sm text-muted-foreground leading-snug">{a.detail}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        );

      default:
        return <p className="text-white">Unknown content type</p>;
    }
  };

  const getCTA = (type: string) => {
    switch (type) {
      case 'roast':
        return {
          title: "Think you can handle the heat?",
          buttonText: "Roast Me Now"
        };
      case 'hype':
        return {
          title: "Need an ego boost?",
          buttonText: "Hype Me Up"
        };
      case 'nemesis':
        return {
          title: "Find who you should AVOID dating.",
          buttonText: "Find My Nemesis"
        };
      case 'fortune':
        return {
          title: "See what the stars (and AI) say.",
          buttonText: "Get My Fortune"
        };
      case 'vibe':
        return {
          title: "Are you a walking Red Flag?",
          buttonText: "Check My Vibes"
        };
      default:
        return {
          title: "Want to know what AI thinks about you?",
          buttonText: "Get Your Own Analysis"
        };
    }
  };

  const cta = data ? getCTA(data.type) : { title: '', buttonText: '' };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-gray-800 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          fwber
        </Link>
        <Link href="/auth/register">
          <Button variant="outline" className="border-gray-700 hover:bg-gray-800">
            Join Now
          </Button>
        </Link>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto p-4 flex flex-col justify-center">
        <Card className="bg-gray-900 border-gray-800 shadow-2xl">
          <CardContent className="p-8">
            {data.is_owner && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">Viral Quest 🚀</h3>
                {data.reward_claimed ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Quest Complete! You earned 24h of Gold Premium.</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted-foreground mb-2">
                      Get 5 views on this link to unlock <strong>24h of Gold Premium</strong>!
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-1">
                      <div
                        className="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((data.views / 5) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right text-muted-foreground">{data.views} / 5 views</p>
                  </div>
                )}
              </div>
            )}

            {renderContent()}

            <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col items-center">
              {data.content.profile_id && (
                <Link href={`/profile/${data.content.profile_id}`}>
                   <Button variant="ghost" className="text-primary hover:text-primary/80 transition-colors flex items-center gap-2 group mb-4 font-bold italic uppercase tracking-tighter">
                      View {data.user_name || 'User'}&apos;s Profile
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </Button>
                </Link>
              )}
              
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-center">
                Strictly for Entertainment Purposes <br/>
                Powered by fwber AI &copy; {new Date().getFullYear()}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Sticky Bottom CTA for Maximum Virality */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent z-50 pointer-events-none"
      >
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <Link href={data.type === 'roast' || data.type === 'hype' ? "/roast" : "/auth/register"} className="block w-full">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button className="w-full bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 text-white font-black py-7 text-lg shadow-[0_0_30px_rgba(236,72,153,0.3)] border border-pink-500/50 rounded-2xl flex flex-col items-center justify-center group overflow-hidden relative">

                {/* Animated shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />

                <span className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400 group-hover:animate-bounce" />
                  {cta.buttonText}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="text-xs font-medium text-pink-200/70 mt-1">
                  {cta.title}
                </span>
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      <footer className="p-6 pb-28 text-center text-muted-foreground text-sm">
        &copy; {new Date().getFullYear()} fwber. All rights reserved.
      </footer>
    </div>
  );
}
