'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/lib/auth-context';
import { useDateIdeas } from '@/lib/hooks/use-date-planner';
import {
    MapPin,
    Sparkles,
    Clock,
    DollarSign,
    MessageCircle,
    Navigation,
    RefreshCw,
    Heart,
} from 'lucide-react';
import type { DateIdea } from '@/lib/api/date-planner';

/* Step accent colors for the timeline */
const STEP_COLORS = [
    { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7', dot: '#a855f7' },
    { bg: 'rgba(236, 72, 153, 0.1)', border: '#ec4899', dot: '#ec4899' },
    { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', dot: '#3b82f6' },
    { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', dot: '#10b981' },
    { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', dot: '#f59e0b' },
];

/* ── Timeline Step ──────────────────────────────────────── */
function TimelineStep({ idea, index }: { idea: DateIdea; index: number }) {
    const color = STEP_COLORS[index % STEP_COLORS.length];
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="dp-step" id={`dp-step-${index}`}>
            {/* Timeline connector */}
            <div className="dp-timeline-track">
                <div className="dp-dot" style={{ background: color.dot, boxShadow: `0 0 12px ${color.dot}40` }} />
                {index < 4 && <div className="dp-line" />}
            </div>

            {/* Card */}
            <div
                className="dp-card"
                style={{ background: color.bg, borderColor: `${color.border}30` }}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="dp-card-header">
                    <span className="dp-step-num" style={{ color: color.dot }}>Step {index + 1}</span>
                    <h3 className="dp-card-title">{idea.title}</h3>
                </div>

                <p className="dp-card-desc">{idea.description}</p>

                <div className="dp-card-meta">
                    {idea.duration && (
                        <span className="dp-meta-chip"><Clock size={12} /> {idea.duration}</span>
                    )}
                    {idea.estimated_cost && (
                        <span className="dp-meta-chip"><DollarSign size={12} /> {idea.estimated_cost}</span>
                    )}
                    {idea.venue && (
                        <span className="dp-meta-chip"><MapPin size={12} /> {idea.venue}</span>
                    )}
                </div>

                {/* Reason badge */}
                <div className="dp-reason">
                    <Heart size={12} style={{ color: color.dot }} />
                    <span>{idea.reason}</span>
                </div>

                {/* Conversation starter — expandable */}
                {idea.conversation_starter && expanded && (
                    <div className="dp-conversation" style={{ borderColor: `${color.border}30` }}>
                        <MessageCircle size={14} style={{ color: color.dot, flexShrink: 0 }} />
                        <div>
                            <span className="dp-conv-label" style={{ color: color.dot }}>Conversation Starter</span>
                            <p className="dp-conv-text">{idea.conversation_starter}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Inner Page Content ─────────────────────────────────── */
function DatePlannerContent() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const matchIdParam = searchParams.get('match');
    const [matchId, setMatchId] = useState(matchIdParam ? Number(matchIdParam) : 0);
    const [location, setLocation] = useState('');
    const [submitted, setSubmitted] = useState(!!matchIdParam);

    const { data, isLoading, error, refetch, isFetching } = useDateIdeas(
        submitted ? matchId : 0,
        submitted ? location || undefined : undefined
    );

    const handleGeolocate = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`),
            () => { }
        );
    };

    const handleGenerate = () => {
        if (!matchId) return;
        setSubmitted(true);
    };

    if (!isAuthenticated) {
        return (
            <div className="dp-empty-state">
                <Sparkles size={48} />
                <h1>AI Date Planner</h1>
                <p>Sign in to plan your perfect date.</p>
                <button type="button" onClick={() => router.push('/login')} className="dp-primary-btn">Log In</button>
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
        .dp-page {
          min-height: 100vh;
          background: linear-gradient(160deg, #0a0a1a 0%, #1e0a2e 40%, #0f1628 100%);
          color: #e0e0ff;
          font-family: 'Inter', -apple-system, sans-serif;
          padding: 2rem 1rem;
        }
        .dp-container {
          max-width: 640px; margin: 0 auto;
        }
        .dp-header {
          text-align: center; margin-bottom: 2rem;
        }
        .dp-header h1 {
          font-size: 2rem; font-weight: 700;
          background: linear-gradient(to right, #a855f7, #ec4899, #f59e0b);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .dp-header p { color: #7c7caa; font-size: 0.9rem; margin-top: 0.25rem; }

        /* Input section */
        .dp-input-section {
          background: rgba(20, 15, 35, 0.6);
          border: 1px solid rgba(100, 100, 200, 0.15);
          border-radius: 16px; padding: 1.5rem;
          margin-bottom: 2rem;
        }
        .dp-input-group {
          margin-bottom: 1rem;
        }
        .dp-label {
          display: block; font-size: 0.8rem; font-weight: 600;
          color: #a5b4fc; text-transform: uppercase;
          letter-spacing: 0.05em; margin-bottom: 0.5rem;
        }
        .dp-input {
          width: 100%; padding: 0.75rem 1rem;
          background: rgba(10, 10, 25, 0.8);
          border: 1px solid rgba(100, 100, 200, 0.2);
          border-radius: 10px; color: #e0e0ff;
          font-size: 0.9rem;
        }
        .dp-input::placeholder { color: #5a5a8a; }
        .dp-input:focus {
          outline: none; border-color: rgba(168, 85, 247, 0.5);
        }
        .dp-location-row {
          display: flex; gap: 0.5rem;
        }
        .dp-location-row .dp-input { flex: 1; }
        .dp-geo-btn {
          display: flex; align-items: center; justify-content: center;
          width: 44px; height: 44px;
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 10px; color: #a855f7;
          cursor: pointer; transition: background 0.2s;
          flex-shrink: 0;
        }
        .dp-geo-btn:hover { background: rgba(168, 85, 247, 0.25); }

        .dp-generate-btn {
          width: 100%; padding: 0.85rem;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          color: white; border: none; border-radius: 12px;
          font-size: 1rem; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .dp-generate-btn:hover {
          box-shadow: 0 8px 25px rgba(168, 85, 247, 0.3);
          transform: translateY(-1px);
        }
        .dp-generate-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Timeline */
        .dp-timeline {
          display: flex; flex-direction: column;
        }
        .dp-step {
          display: flex; gap: 1rem; margin-bottom: 0;
        }
        .dp-timeline-track {
          display: flex; flex-direction: column; align-items: center;
          width: 24px; flex-shrink: 0; padding-top: 4px;
        }
        .dp-dot {
          width: 14px; height: 14px; border-radius: 50%;
          flex-shrink: 0;
        }
        .dp-line {
          width: 2px; flex: 1;
          background: linear-gradient(to bottom, rgba(100, 100, 200, 0.3), rgba(100, 100, 200, 0.05));
          margin: 4px 0;
        }

        .dp-card {
          flex: 1; border: 1px solid; border-radius: 16px;
          padding: 1.25rem; margin-bottom: 1rem;
          cursor: pointer; transition: transform 0.2s;
        }
        .dp-card:hover { transform: translateX(4px); }
        .dp-card-header { margin-bottom: 0.5rem; }
        .dp-step-num {
          font-size: 0.7rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .dp-card-title {
          font-size: 1.1rem; font-weight: 600; color: #e0e0ff;
          margin-top: 0.25rem;
        }
        .dp-card-desc {
          font-size: 0.85rem; color: #a0a0cc; line-height: 1.5;
          margin-bottom: 0.75rem;
        }
        .dp-card-meta {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .dp-meta-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: 6px;
          background: rgba(30, 30, 60, 0.5);
          font-size: 0.75rem; color: #8888bb;
        }
        .dp-reason {
          display: flex; align-items: flex-start; gap: 6px;
          font-size: 0.8rem; color: #7c7caa; font-style: italic;
          line-height: 1.4;
        }
        .dp-conversation {
          margin-top: 0.75rem; padding: 0.75rem;
          border-top: 1px solid;
          display: flex; gap: 8px;
          animation: dp-fade-in 0.3s ease;
        }
        .dp-conv-label {
          font-size: 0.7rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .dp-conv-text {
          font-size: 0.85rem; color: #c0c0ee; margin-top: 0.25rem;
          line-height: 1.4;
        }
        @keyframes dp-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dp-regen-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 6px; margin: 1.5rem auto 0;
          padding: 0.65rem 1.5rem;
          background: rgba(30, 30, 60, 0.6);
          border: 1px solid rgba(100, 100, 200, 0.2);
          border-radius: 10px; color: #a5b4fc;
          font-size: 0.85rem; cursor: pointer;
          transition: background 0.2s;
        }
        .dp-regen-btn:hover { background: rgba(50, 50, 80, 0.6); }
        .dp-regen-btn:disabled { opacity: 0.5; }
        .dp-spin { animation: dp-spin 1s linear infinite; }
        @keyframes dp-spin { to { transform: rotate(360deg); } }

        /* Empty / loading */
        .dp-empty-state {
          min-height: 100vh;
          background: linear-gradient(160deg, #0a0a1a 0%, #1e0a2e 40%, #0f1628 100%);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 1rem; text-align: center; padding: 2rem;
          color: #7c7caa;
        }
        .dp-empty-state h1 { font-size: 1.6rem; color: #e0e0ff; }
        .dp-primary-btn {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          color: white; border: none; border-radius: 12px;
          font-size: 1rem; font-weight: 600; cursor: pointer;
        }
        .dp-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(168, 85, 247, 0.2);
          border-top-color: #a855f7;
          border-radius: 50%;
          animation: dp-spin 0.8s linear infinite;
        }
      `}</style>

            <div className="min-h-screen dark:bg-background">
                <AppHeader title="Date Planner" />

                <div className="dp-page">
                <div className="dp-container">
                    <div className="dp-header">
                        <h1>🗓️ AI Date Planner</h1>
                        <p>Your AI concierge crafts the perfect date itinerary</p>
                    </div>

                    {/* Input panel */}
                    <div className="dp-input-section">
                        <div className="dp-input-group">
                            <label className="dp-label">Match ID</label>
                            <input
                                type="number"
                                className="dp-input"
                                placeholder="Enter your match's user ID"
                                value={matchId || ''}
                                onChange={(e) => { setMatchId(Number(e.target.value)); setSubmitted(false); }}
                            />
                        </div>
                        <div className="dp-input-group">
                            <label className="dp-label">Location (optional)</label>
                            <div className="dp-location-row">
                                <input
                                    className="dp-input"
                                    placeholder="City, neighborhood, or coordinates"
                                    value={location}
                                    onChange={(e) => { setLocation(e.target.value); setSubmitted(false); }}
                                />
                                <button type="button" className="dp-geo-btn" onClick={handleGeolocate} title="Use my location">
                                    <Navigation size={18} />
                                </button>
                            </div>
                        </div>
                        <button type="button"
                            className="dp-generate-btn"
                            disabled={!matchId || (isLoading && submitted)}
                            onClick={handleGenerate}
                        >
                            <Sparkles size={18} />
                            {isLoading && submitted ? 'Generating...' : 'Generate Itinerary'}
                        </button>
                    </div>

                    {/* Results */}
                    {isLoading && submitted ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                            <div className="dp-spinner" />
                            <p style={{ color: '#7c7caa' }}>Your AI concierge is planning...</p>
                        </div>
                    ) : error && submitted ? (
                        <div style={{ color: '#f87171', textAlign: 'center', marginTop: '2rem' }}>
                            <p>Could not generate date ideas. Make sure you are matched with this user.</p>
                        </div>
                    ) : data?.ideas && data.ideas.length > 0 ? (
                        <>
                            <div className="dp-timeline">
                                {(data.ideas || []).map((idea, i) => (
                                    <TimelineStep key={i} idea={idea} index={i} />
                                ))}
                            </div>
                            <button type="button"
                                className="dp-regen-btn"
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <RefreshCw size={14} className={isFetching ? 'dp-spin' : ''} />
                                {isFetching ? 'Regenerating...' : 'Regenerate Itinerary'}
                            </button>
                        </>
                    ) : submitted && !isLoading ? (
                        <div style={{ color: '#7c7caa', textAlign: 'center', marginTop: '2rem' }}>
                            <p>No ideas generated yet. Try entering a location for better results.</p>
                        </div>
                    ) : null}
                </div>
                </div>
            </div>
        </>
    );
}

/* ── Suspense Wrapper ───────────────────────────────────── */
export default function DatePlannerPage() {
    return (
        <Suspense fallback={
            <div className="dp-empty-state">
                <div className="dp-spinner" />
                <p>Loading...</p>
            </div>
        }>
            <DatePlannerContent />
        </Suspense>
    );
}
