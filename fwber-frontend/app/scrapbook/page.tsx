'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useScrapbook, useAddScrapbookEntry, useTogglePin, useDeleteEntry } from '@/lib/hooks/use-scrapbook';
import { Pin, Trash2, Plus, X, BookHeart, Image, Mic, Link2, Type, Sparkles } from 'lucide-react';
import NextImage from 'next/image';
import type { ScrapbookEntry, CreateScrapbookEntry } from '@/lib/api/scrapbook';

const NOTE_COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
const TYPE_ICONS = { text: Type, image: Image, voice: Mic, link: Link2 };

/* ── Entry Card ─────────────────────────────────────────── */
function EntryCard({
    entry,
    onPin,
    onDelete,
}: {
    entry: ScrapbookEntry;
    onPin: (id: number) => void;
    onDelete: (id: number) => void;
}) {
    const accent = entry.color || '#a855f7';
    const Icon = TYPE_ICONS[entry.type] || Type;

    return (
        <div
            className="sb-card"
            style={{ borderColor: `${accent}30`, background: `${accent}08` }}
        >
            {/* Header */}
            <div className="sb-card-header">
                <div className="sb-type-badge" style={{ color: accent, borderColor: `${accent}40` }}>
                    <Icon size={12} /> {entry.type}
                </div>
                <div className="sb-card-actions">
                    <button type="button"
                        className={`sb-pin-btn ${entry.is_pinned ? 'pinned' : ''}`}
                        onClick={() => onPin(entry.id)}
                        title={entry.is_pinned ? 'Unpin' : 'Pin'}
                        style={{ color: entry.is_pinned ? accent : undefined }}
                    >
                        <Pin size={14} />
                    </button>
                    {entry.is_mine && (
                        <button type="button" className="sb-delete-btn" onClick={() => onDelete(entry.id)}>
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Emoji badge */}
            {entry.emoji && <div className="sb-emoji">{entry.emoji}</div>}

            {/* Content */}
            {entry.type === 'image' && entry.media_url && (
                <div className="sb-media" style={{ position: 'relative', width: '100%', minHeight: '200px' }}>
                    <NextImage src={entry.media_url} alt="Scrapbook" fill style={{ objectFit: 'cover' }} />
                </div>
            )}
            <p className="sb-content">{entry.content}</p>

            {/* Footer */}
            <div className="sb-card-footer">
                <span className="sb-author" style={{ color: accent }}>
                    {entry.is_mine ? 'You' : 'Them'}
                </span>
                <span className="sb-time">
                    {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
            </div>
        </div>
    );
}

/* ── Add Entry Modal ────────────────────────────────────── */
function AddEntryForm({
    matchId,
    onClose,
}: {
    matchId: number;
    onClose: () => void;
}) {
    const addEntry = useAddScrapbookEntry();
    const [type, setType] = useState<CreateScrapbookEntry['type']>('text');
    const [content, setContent] = useState('');
    const [emoji, setEmoji] = useState('');
    const [color, setColor] = useState(NOTE_COLORS[0]);

    const handleSubmit = () => {
        if (!content.trim()) return;
        addEntry.mutate(
            { match_id: matchId, type, content: content.trim(), emoji: emoji || undefined, color },
            { onSuccess: () => onClose() }
        );
    };

    return (
        <div className="sb-modal-overlay" onClick={onClose}>
            <div className="sb-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sb-modal-header">
                    <h3>Add Memory</h3>
                    <button type="button" onClick={onClose} className="sb-close-btn"><X size={18} /></button>
                </div>

                {/* Type selector */}
                <div className="sb-type-selector">
                    {(['text', 'image', 'voice', 'link'] as const).map((t) => {
                        const TIcon = TYPE_ICONS[t];
                        return (
                            <button type="button"
                                key={t}
                                className={`sb-type-opt ${type === t ? 'active' : ''}`}
                                onClick={() => setType(t)}
                                style={type === t ? { borderColor: color, color } : {}}
                            >
                                <TIcon size={14} /> {t}
                            </button>
                        );
                    })}
                </div>

                {/* Color picker */}
                <div className="sb-color-picker">
                    {NOTE_COLORS.map((c) => (
                        <button type="button"
                            key={c}
                            className={`sb-color-dot ${color === c ? 'selected' : ''}`}
                            style={{ background: c }}
                            onClick={() => setColor(c)}
                        />
                    ))}
                </div>

                {/* Emoji */}
                <input
                    className="sb-input"
                    placeholder="Add an emoji (optional)"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    maxLength={4}
                    style={{ width: '160px' }}
                />

                {/* Content */}
                <textarea
                    className="sb-textarea"
                    placeholder={type === 'text' ? 'Write a memory...' : type === 'link' ? 'Paste a URL...' : 'Add a caption...'}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={2000}
                    rows={4}
                />

                <button type="button"
                    className="sb-submit-btn"
                    onClick={handleSubmit}
                    disabled={addEntry.isPending || !content.trim()}
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
                >
                    {addEntry.isPending ? 'Saving...' : 'Save Memory'}
                </button>
            </div>
        </div>
    );
}

/* ── Page Content ───────────────────────────────────────── */
function ScrapbookContent() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const matchId = Number(searchParams.get('match') || 0);
    const [showForm, setShowForm] = useState(false);

    const { data, isLoading, error } = useScrapbook(matchId);
    const togglePin = useTogglePin();
    const deleteEntry = useDeleteEntry();

    if (!isAuthenticated) {
        return (
            <div className="sb-empty">
                <BookHeart size={48} />
                <h1>Scrapbook</h1>
                <p>Sign in to start saving memories.</p>
                <button type="button" onClick={() => router.push('/login')} className="sb-primary-btn">Log In</button>
            </div>
        );
    }

    if (!matchId) {
        return (
            <div className="sb-empty">
                <BookHeart size={48} />
                <h1>Scrapbook</h1>
                <p>Open this from a match to start your shared memory board!</p>
                <button type="button" onClick={() => router.push('/matches')} className="sb-primary-btn">Go to Matches</button>
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
        .sb-page {
          min-height: 100vh;
          background: linear-gradient(160deg, #0a0a1a 0%, #1a0a28 40%, #0f1628 100%);
          color: #e0e0ff; padding: 2rem 1rem;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        .sb-container { max-width: 900px; margin: 0 auto; }
        .sb-header {
          text-align: center; margin-bottom: 1.5rem;
        }
        .sb-header h1 {
          font-size: 2rem; font-weight: 700;
          background: linear-gradient(to right, #ec4899, #a855f7, #3b82f6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .sb-header p { color: #7c7caa; font-size: 0.9rem; }
        .sb-meta {
          display: flex; justify-content: center; gap: 1.5rem;
          font-size: 0.8rem; color: #7c7caa; margin-bottom: 1.5rem;
        }
        .sb-meta span { font-weight: 600; color: #a5b4fc; }

        /* FAB */
        .sb-fab {
          position: fixed; bottom: 2rem; right: 2rem;
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          border: none; color: white; font-size: 1.5rem;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; box-shadow: 0 8px 25px rgba(168, 85, 247, 0.4);
          transition: transform 0.2s;
          z-index: 30;
        }
        .sb-fab:hover { transform: scale(1.1); }

        /* Masonry grid */
        .sb-grid {
          columns: 2;
          column-gap: 1rem;
        }
        @media (max-width: 600px) { .sb-grid { columns: 1; } }

        .sb-card {
          break-inside: avoid;
          border: 1px solid; border-radius: 14px;
          padding: 1rem; margin-bottom: 1rem;
          transition: transform 0.2s;
        }
        .sb-card:hover { transform: translateY(-2px); }
        .sb-card-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 0.5rem;
        }
        .sb-type-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; padding: 2px 6px;
          border: 1px solid; border-radius: 6px;
        }
        .sb-card-actions { display: flex; gap: 4px; }
        .sb-pin-btn, .sb-delete-btn {
          background: none; border: none; color: #5a5a8a;
          cursor: pointer; padding: 4px; border-radius: 6px;
          transition: color 0.2s;
        }
        .sb-pin-btn:hover { color: #f59e0b; }
        .sb-pin-btn.pinned { color: #f59e0b; }
        .sb-delete-btn:hover { color: #ef4444; }
        .sb-emoji { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .sb-media {
          border-radius: 10px; overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .sb-media img { width: 100%; display: block; }
        .sb-content {
          font-size: 0.9rem; color: #c0c0ee;
          line-height: 1.5; word-break: break-word;
        }
        .sb-card-footer {
          display: flex; justify-content: space-between;
          margin-top: 0.75rem; font-size: 0.75rem;
        }
        .sb-author { font-weight: 600; }
        .sb-time { color: #5a5a8a; }

        /* Modal */
        .sb-modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0, 0, 0, 0.7);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .sb-modal {
          background: #1a1030; border: 1px solid rgba(100, 100, 200, 0.2);
          border-radius: 20px; padding: 1.5rem;
          width: 100%; max-width: 440px;
        }
        .sb-modal-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 1rem;
        }
        .sb-modal-header h3 {
          font-size: 1.2rem; font-weight: 600; color: #e0e0ff;
        }
        .sb-close-btn {
          background: none; border: none; color: #7c7caa;
          cursor: pointer;
        }
        .sb-type-selector {
          display: flex; gap: 0.5rem; margin-bottom: 1rem;
        }
        .sb-type-opt {
          display: flex; align-items: center; gap: 4px;
          padding: 6px 12px; border-radius: 8px;
          border: 1px solid rgba(100, 100, 200, 0.2);
          background: rgba(20, 20, 40, 0.5);
          color: #7c7caa; font-size: 0.8rem; font-weight: 500;
          cursor: pointer; text-transform: capitalize;
          transition: all 0.2s;
        }
        .sb-type-opt.active {
          background: rgba(20, 20, 40, 0.8);
        }
        .sb-color-picker {
          display: flex; gap: 8px; margin-bottom: 1rem;
        }
        .sb-color-dot {
          width: 24px; height: 24px; border-radius: 50%;
          border: 2px solid transparent; cursor: pointer;
          transition: transform 0.15s;
        }
        .sb-color-dot.selected {
          border-color: white; transform: scale(1.2);
        }
        .sb-input, .sb-textarea {
          width: 100%; padding: 0.75rem;
          background: rgba(10, 10, 25, 0.8);
          border: 1px solid rgba(100, 100, 200, 0.2);
          border-radius: 10px; color: #e0e0ff;
          font-size: 0.9rem; margin-bottom: 0.75rem;
        }
        .sb-textarea { resize: none; }
        .sb-input::placeholder, .sb-textarea::placeholder { color: #5a5a8a; }
        .sb-input:focus, .sb-textarea:focus {
          outline: none; border-color: rgba(168, 85, 247, 0.5);
        }
        .sb-submit-btn {
          width: 100%; padding: 0.75rem;
          color: white; border: none; border-radius: 10px;
          font-size: 0.95rem; font-weight: 600; cursor: pointer;
          transition: opacity 0.2s;
        }
        .sb-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Empty / loading */
        .sb-empty {
          min-height: 100vh;
          background: linear-gradient(160deg, #0a0a1a 0%, #1a0a28 40%, #0f1628 100%);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 1rem; text-align: center; padding: 2rem; color: #7c7caa;
        }
        .sb-empty h1 { font-size: 1.6rem; color: #e0e0ff; }
        .sb-primary-btn {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          color: white; border: none; border-radius: 12px;
          font-size: 1rem; font-weight: 600; cursor: pointer;
        }
        .sb-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(168, 85, 247, 0.2);
          border-top-color: #a855f7; border-radius: 50%;
          animation: sb-spin 0.8s linear infinite;
        }
        @keyframes sb-spin { to { transform: rotate(360deg); } }
      `}</style>

            <div className="sb-page">
                <div className="sb-container">
                    <div className="sb-header">
                        <h1>📖 Scrapbook</h1>
                        <p>Your shared memory board</p>
                    </div>

                    {data?.meta && (
                        <div className="sb-meta">
                            <div>Memories: <span>{data.meta.total}</span></div>
                            <div>Pinned: <span>{data.meta.pinned}</span></div>
                        </div>
                    )}

                    {isLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '4rem' }}>
                            <div className="sb-spinner" />
                            <p style={{ color: '#7c7caa' }}>Loading memories...</p>
                        </div>
                    ) : error ? (
                        <div style={{ color: '#f87171', textAlign: 'center', marginTop: '4rem' }}>
                            <p>Could not load scrapbook. Make sure you are matched with this user.</p>
                        </div>
                    ) : data?.entries && data.entries.length > 0 ? (
                        <div className="sb-grid">
                            {data.entries.map((entry) => (
                                <EntryCard
                                    key={entry.id}
                                    entry={entry}
                                    onPin={(id) => togglePin.mutate(id)}
                                    onDelete={(id) => deleteEntry.mutate(id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', marginTop: '4rem', color: '#7c7caa' }}>
                            <Sparkles size={40} style={{ marginBottom: '1rem' }} />
                            <p>No memories yet. Tap + to add your first!</p>
                        </div>
                    )}
                </div>

                {/* FAB */}
                <button type="button" className="sb-fab" onClick={() => setShowForm(true)}>
                    <Plus size={24} />
                </button>

                {/* Add form modal */}
                {showForm && (
                    <AddEntryForm matchId={matchId} onClose={() => setShowForm(false)} />
                )}
            </div>
        </>
    );
}

/* ── Suspense Wrapper ───────────────────────────────────── */
export default function ScrapbookPage() {
    return (
        <Suspense fallback={
            <div className="sb-empty">
                <div className="sb-spinner" />
                <p>Loading...</p>
            </div>
        }>
            <ScrapbookContent />
        </Suspense>
    );
}
