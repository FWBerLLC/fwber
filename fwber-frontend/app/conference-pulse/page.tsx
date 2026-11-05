'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/lib/auth-context';
import { useConferencePulse } from '@/lib/hooks/use-proximity-chatrooms';
import { Search, MapPin, Users, Coffee, Briefcase, Wifi, Navigation, Sparkles } from 'lucide-react';
import type { ConferenceProfessional } from '@/lib/api/proximity-chatrooms';

/* ── Professional Card ────────────────────────────────────────────── */
function ProfessionalCard({
    pro,
    onCoffeeChat,
}: {
    pro: ConferenceProfessional;
    onCoffeeChat: (userId: number) => void;
}) {
    // Deterministic avatar gradient based on user_id
    const hue = (pro.user_id * 137) % 360;
    const gradient = `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 60) % 360}, 80%, 45%))`;

    return (
        <div className="conference-card group" id={`pro-card-${pro.user_id}`}>
            {/* Avatar */}
            <div className="conference-avatar" style={{ background: gradient }}>
                <span className="conference-avatar-initial">
                    {pro.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
            </div>

            {/* Info */}
            <div className="conference-info">
                <h3 className="conference-name">{pro.name}</h3>
                {pro.title && (
                    <p className="conference-title">
                        <Briefcase size={12} /> {pro.title}
                        {pro.company && <span className="conference-company"> @ {pro.company}</span>}
                    </p>
                )}
                {pro.bio && <p className="conference-bio">{pro.bio}</p>}

                {/* Skills */}
                {pro.skills.length > 0 && (
                    <div className="conference-skills">
                        {pro.skills.slice(0, 5).map((skill) => (
                            <span key={skill} className="conference-skill-badge">{skill}</span>
                        ))}
                        {pro.skills.length > 5 && (
                            <span className="conference-skill-overflow">+{pro.skills.length - 5}</span>
                        )}
                    </div>
                )}

                {/* Meta row */}
                <div className="conference-meta">
                    <span className="conference-distance">
                        <MapPin size={12} /> {pro.distance_meters < 1000
                            ? `${pro.distance_meters}m`
                            : `${(pro.distance_meters / 1000).toFixed(1)}km`}
                    </span>
                    <span className="conference-chatroom">
                        <Wifi size={12} /> {pro.chatroom_name}
                    </span>
                </div>
            </div>

            {/* CTA */}
            <button type="button"
                onClick={() => onCoffeeChat(pro.user_id)}
                className="conference-cta"
                id={`coffee-chat-${pro.user_id}`}
            >
                <Coffee size={16} />
                <span>Coffee Chat</span>
            </button>
        </div>
    );
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function ConferencePulsePage() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const [location, setLocation] = useState<{ lat: number | null; lng: number | null; error: string | null }>({
        lat: null, lng: null, error: null,
    });
    const [skillFilter, setSkillFilter] = useState('');
    const [radius, setRadius] = useState(2000);
    const [debouncedSkill, setDebouncedSkill] = useState('');

    // Debounce skill search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSkill(skillFilter), 400);
        return () => clearTimeout(timer);
    }, [skillFilter]);

    // Geolocation
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocation((p) => ({ ...p, error: 'Geolocation not supported' }));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null }),
            (err) => setLocation((p) => ({ ...p, error: err.message })),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
        );
    }, []);

    const { data, isLoading, error } = useConferencePulse({
        latitude: location.lat || 0,
        longitude: location.lng || 0,
        radius_meters: radius,
        skill: debouncedSkill || undefined,
    });

    const handleCoffeeChat = (userId: number) => {
        router.push(`/messages?to=${userId}`);
    };

    if (!isAuthenticated) {
        return (
            <div className="conference-auth-wall">
                <Briefcase size={48} />
                <h1>Conference Pulse</h1>
                <p>Sign in to discover professionals nearby.</p>
                <button type="button" onClick={() => router.push('/login')} className="conference-cta-primary">Log In</button>
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
        /* ── Conference Pulse Design System ─── */
        .conference-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
          color: #e0e0ff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .conference-header {
          background: rgba(15, 15, 26, 0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(100, 100, 255, 0.1);
          position: sticky; top: 0; z-index: 40;
        }
        .conference-header-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 1.25rem 1.5rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .conference-brand {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .conference-brand-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
        }
        .conference-brand h1 {
          font-size: 1.4rem; font-weight: 700;
          background: linear-gradient(to right, #a5b4fc, #818cf8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .conference-brand p { font-size: 0.8rem; color: #7c7caa; }
        .conference-stats {
          display: flex; gap: 1.5rem;
        }
        .conference-stat {
          text-align: center;
        }
        .conference-stat-value {
          font-size: 1.25rem; font-weight: 700; color: #a5b4fc;
        }
        .conference-stat-label {
          font-size: 0.7rem; color: #7c7caa; text-transform: uppercase; letter-spacing: 0.08em;
        }

        /* ── Controls ─── */
        .conference-controls {
          max-width: 1200px; margin: 0 auto;
          padding: 1.5rem;
        }
        .conference-search-row {
          display: flex; gap: 0.75rem; flex-wrap: wrap;
        }
        .conference-search-box {
          flex: 1; min-width: 250px; position: relative;
        }
        .conference-search-box svg {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #6366f1; pointer-events: none;
        }
        .conference-search-input {
          width: 100%; padding: 0.75rem 1rem 0.75rem 2.75rem;
          background: rgba(30, 30, 60, 0.6);
          border: 1px solid rgba(100, 100, 255, 0.15);
          border-radius: 12px; color: #e0e0ff; font-size: 0.95rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .conference-search-input::placeholder { color: #5a5a8a; }
        .conference-search-input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .conference-radius-select {
          padding: 0.75rem 1rem;
          background: rgba(30, 30, 60, 0.6);
          border: 1px solid rgba(100, 100, 255, 0.15);
          border-radius: 12px; color: #e0e0ff; font-size: 0.9rem;
          cursor: pointer;
        }
        .conference-radius-select:focus {
          outline: none; border-color: rgba(99, 102, 241, 0.5);
        }

        /* ── Grid ─── */
        .conference-grid {
          max-width: 1200px; margin: 0 auto;
          padding: 0 1.5rem 3rem;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1rem;
        }

        /* ── Card ─── */
        .conference-card {
          background: rgba(25, 25, 50, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(100, 100, 255, 0.1);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex; flex-direction: column; gap: 0.75rem;
          transition: transform 0.2s, border-color 0.3s, box-shadow 0.3s;
        }
        .conference-card:hover {
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.35);
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.12);
        }
        .conference-avatar {
          width: 56px; height: 56px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .conference-avatar-initial {
          font-size: 1.5rem; font-weight: 700; color: white;
          text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .conference-info { flex: 1; min-width: 0; }
        .conference-name {
          font-size: 1.05rem; font-weight: 600; color: #e0e0ff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .conference-title {
          font-size: 0.82rem; color: #9999cc;
          display: flex; align-items: center; gap: 4px;
          margin-top: 2px;
        }
        .conference-company { color: #a5b4fc; }
        .conference-bio {
          font-size: 0.78rem; color: #7c7caa;
          margin-top: 4px; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .conference-skills {
          display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;
        }
        .conference-skill-badge {
          padding: 3px 8px; font-size: 0.7rem; font-weight: 500;
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 6px;
        }
        .conference-skill-overflow {
          padding: 3px 8px; font-size: 0.7rem;
          color: #7c7caa;
        }
        .conference-meta {
          display: flex; align-items: center; gap: 12px;
          margin-top: 8px; font-size: 0.75rem; color: #6a6a99;
        }
        .conference-meta span {
          display: flex; align-items: center; gap: 3px;
        }
        .conference-distance { color: #818cf8; }
        .conference-cta {
          display: flex; align-items: center; justify-content: center;
          gap: 6px; padding: 0.6rem 1rem;
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: white; border: none; border-radius: 10px;
          font-size: 0.85rem; font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .conference-cta:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        /* ── Empty / Loading ─── */
        .conference-empty, .conference-auth-wall {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          min-height: 60vh; gap: 1rem; text-align: center;
          padding: 2rem; color: #7c7caa;
        }
        .conference-empty h2, .conference-auth-wall h1 {
          font-size: 1.4rem; color: #e0e0ff;
        }
        .conference-cta-primary {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: white; border: none; border-radius: 12px;
          font-size: 1rem; font-weight: 600; cursor: pointer;
          transition: box-shadow 0.2s;
        }
        .conference-cta-primary:hover {
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }
        .conference-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(99, 102, 241, 0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: conf-spin 0.8s linear infinite;
        }
        @keyframes conf-spin { to { transform: rotate(360deg); } }

        .conference-location-bar {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.6rem 1rem; margin-bottom: 1rem;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 10px; font-size: 0.82rem; color: #6ee7b7;
        }
        .conference-error-bar {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.6rem 1rem; margin-bottom: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px; font-size: 0.82rem; color: #fca5a5;
        }

        /* ── Active Events Bar ─── */
        .conference-events {
          max-width: 1200px; margin: 0 auto;
          padding: 0 1.5rem 1rem;
          display: flex; gap: 0.5rem; flex-wrap: wrap;
        }
        .conference-event-chip {
          padding: 0.4rem 0.75rem;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px; font-size: 0.78rem; color: #c4b5fd;
          display: flex; align-items: center; gap: 4px;
        }

        @media (max-width: 640px) {
          .conference-grid {
            grid-template-columns: 1fr;
          }
          .conference-stats { display: none; }
        }
      `}</style>

            <div className="min-h-screen dark:bg-background">
                <AppHeader title="Conference Pulse" />

                <div className="conference-page">
                {/* Header */}
                <header className="conference-header">
                    <div className="conference-header-inner">
                        <div className="conference-brand">
                            <div className="conference-brand-icon">
                                <Sparkles size={22} color="white" />
                            </div>
                            <div>
                                <h1>Conference Pulse</h1>
                                <p>Find professionals nearby — avatar only, no photos</p>
                            </div>
                        </div>
                        <div className="conference-stats">
                            <div className="conference-stat">
                                <div className="conference-stat-value">{data?.meta.professionals_count ?? '—'}</div>
                                <div className="conference-stat-label">Professionals</div>
                            </div>
                            <div className="conference-stat">
                                <div className="conference-stat-value">{data?.meta.chatrooms_count ?? '—'}</div>
                                <div className="conference-stat-label">Events</div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Controls */}
                <div className="conference-controls">
                    {location.error && (
                        <div className="conference-error-bar">
                            <Navigation size={14} /> {location.error}
                        </div>
                    )}
                    {location.lat && location.lng && (
                        <div className="conference-location-bar">
                            <MapPin size={14} /> Location locked — scanning for nearby events
                        </div>
                    )}
                    <div className="conference-search-row">
                        <div className="conference-search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                value={skillFilter}
                                onChange={(e) => setSkillFilter(e.target.value)}
                                placeholder="Find a React dev within 500m..."
                                className="conference-search-input"
                                id="conference-skill-search"
                            />
                        </div>
                        <select
                            value={radius}
                            onChange={(e) => setRadius(Number(e.target.value))}
                            className="conference-radius-select"
                            id="conference-radius-select"
                        >
                            <option value={500}>500m</option>
                            <option value={1000}>1km</option>
                            <option value={2000}>2km</option>
                            <option value={5000}>5km</option>
                            <option value={10000}>10km</option>
                        </select>
                    </div>
                </div>

                {/* Active Events */}
                {data?.chatrooms && data.chatrooms.length > 0 && (
                    <div className="conference-events">
                        {(data?.chatrooms || []).map((ch) => (
                            <div key={ch.id} className="conference-event-chip">
                                <Users size={12} />
                                {ch.event_name || ch.name}
                                <span style={{ color: '#818cf8' }}>({ch.active_members_count})</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Grid */}
                {isLoading ? (
                    <div className="conference-empty">
                        <div className="conference-spinner" />
                        <p>Scanning for nearby professionals...</p>
                    </div>
                ) : error ? (
                    <div className="conference-empty">
                        <Briefcase size={40} />
                        <h2>Connection Error</h2>
                        <p>Unable to load conference data. Try again later.</p>
                    </div>
                ) : data?.professionals.length === 0 ? (
                    <div className="conference-empty">
                        <Briefcase size={40} />
                        <h2>No professionals found nearby</h2>
                        <p>
                            {debouncedSkill
                                ? `No one matching "${debouncedSkill}" within ${radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}.`
                                : 'Join or create a conference/networking chatroom to appear here.'}
                        </p>
                    </div>
                ) : (
                    <div className="conference-grid">
                        {(data?.professionals || []).map((pro) => (
                            <ProfessionalCard
                                key={pro.user_id}
                                pro={pro}
                                onCoffeeChat={handleCoffeeChat}
                            />
                        ))}
                    </div>
                )}
                </div>
            </div>
        </>
    );
}
