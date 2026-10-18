import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAiWingman } from '@/lib/hooks/use-ai-wingman';
import { Button } from '@/components/ui/button';
import { Sparkles, Skull, ScrollText, HeartPulse, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function WingmanDashboardModal({ matchId, matchName }: { matchId: string, matchName: string }) {
  const [activeTab, setActiveTab] = useState<'fortune' | 'nemesis' | 'audit'>('fortune');
  const { predictFortune, findNemesis, getCompatibilityAudit } = useAiWingman();

  const renderContent = () => {
    if (activeTab === 'fortune') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Let the stars predict the fate of your connection with {matchName}.</p>
          {!predictFortune.data ? (
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              onClick={() => predictFortune.mutate()}
              disabled={predictFortune.isPending}
            >
              {predictFortune.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Read Our Fortune
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-purple-900/30 border border-purple-500/30 rounded-lg text-purple-200 italic">
              "{predictFortune.data.fortune}"
            </motion.div>
          )}
          {predictFortune.error && <p className="text-red-400 text-xs">{predictFortune.error}</p>}
        </div>
      );
    }

    if (activeTab === 'nemesis') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Could {matchName} actually be your sworn enemy? Let's check the clashing traits.</p>
          {!findNemesis.data ? (
            <Button 
              className="w-full bg-red-900 hover:bg-red-800 text-red-100" 
              onClick={() => findNemesis.mutate()}
              disabled={findNemesis.isPending}
            >
              {findNemesis.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Skull className="w-4 h-4 mr-2" />}
              Analyze Nemesis Potential
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg space-y-2">
              <h4 className="text-red-400 font-bold">You are dealing with: {findNemesis.data.nemesis_type}</h4>
              <p className="text-red-200 text-sm"><strong>Why it fails:</strong> {findNemesis.data.why_it_would_fail}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {findNemesis.data.clashing_traits.map((trait, i) => (
                  <span key={i} className="text-xs bg-red-950 text-red-300 px-2 py-1 rounded border border-red-800">{trait}</span>
                ))}
              </div>
              <p className="text-red-300/60 text-xs mt-2">{findNemesis.data.scientific_explanation}</p>
            </motion.div>
          )}
          {findNemesis.error && <p className="text-red-400 text-xs">{findNemesis.error}</p>}
        </div>
      );
    }

    if (activeTab === 'audit') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">A brutal, honest compatibility audit. Are you two actually going to make it?</p>
          {!getCompatibilityAudit.data ? (
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              onClick={() => getCompatibilityAudit.mutate(matchId)}
              disabled={getCompatibilityAudit.isPending}
            >
              {getCompatibilityAudit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HeartPulse className="w-4 h-4 mr-2" />}
              Run Full Audit
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-blue-200 font-semibold">Overall Score</span>
                <span className="text-2xl font-black text-blue-400">{getCompatibilityAudit.data.overall_score}%</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-900/20 border border-green-500/30 p-2 rounded">
                  <h5 className="text-green-400 text-xs font-bold mb-1">Strengths</h5>
                  <ul className="text-green-200/80 text-xs space-y-1 list-disc pl-4">
                    {getCompatibilityAudit.data.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="bg-red-900/20 border border-red-500/30 p-2 rounded">
                  <h5 className="text-red-400 text-xs font-bold mb-1">Weaknesses</h5>
                  <ul className="text-red-200/80 text-xs space-y-1 list-disc pl-4">
                    {getCompatibilityAudit.data.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>

              <div className={`p-2 rounded text-center text-xs font-bold ${getCompatibilityAudit.data.surviving_the_apocalypse_together ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                {getCompatibilityAudit.data.surviving_the_apocalypse_together ? '✅ You would survive the apocalypse together.' : '❌ You would NOT survive the apocalypse together.'}
              </div>
            </motion.div>
          )}
          {getCompatibilityAudit.error && <p className="text-red-400 text-xs">{getCompatibilityAudit.error}</p>}
        </div>
      );
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="p-2 hover:bg-gray-700 rounded-full text-muted-foreground hover:text-indigo-400 transition-colors"
          title="AI Wingman Tools"
        >
          <ScrollText className="w-5 h-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Wingman Dashboard
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex bg-gray-800 p-1 rounded-lg mb-4">
          <button type="button" 
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'fortune' ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:text-white hover:bg-gray-700'}`}
            onClick={() => setActiveTab('fortune')}
          >
            Fortune
          </button>
          <button type="button" 
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'audit' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:text-white hover:bg-gray-700'}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit
          </button>
          <button type="button" 
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeTab === 'nemesis' ? 'bg-red-800 text-white' : 'text-muted-foreground hover:text-white hover:bg-gray-700'}`}
            onClick={() => setActiveTab('nemesis')}
          >
            Nemesis
          </button>
        </div>

        <div className="min-h-[250px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}