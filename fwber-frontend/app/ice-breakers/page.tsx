'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useIceBreakerQuestions, useSubmitIceBreakerAnswer } from '@/lib/hooks/use-ice-breakers';
import { Lock, Unlock, Send, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import type { IceBreakerQuestion } from '@/lib/api/ice-breakers';

/* Category colors */
const CAT_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    fun: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24', glow: 'rgba(251, 191, 36, 0.15)' },
    deep: { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.3)', text: '#818cf8', glow: 'rgba(99, 102, 241, 0.15)' },
    creative: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399', glow: 'rgba(16, 185, 129, 0.15)' },
    spicy: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171', glow: 'rgba(239, 68, 68, 0.15)' },
};

/* ── Flip Card ──────────────────────────────────────────── */
function IceBreakerCard({
    question,
    matchId,
    onSubmit,
    isSubmitting,
}: {
    question: IceBreakerQuestion;
    matchId: number;
    onSubmit: (questionId: number, answer: string) => void;
    isSubmitting: boolean;
}) {
    const [flipped, setFlipped] = useState(question.user_answered);
    const [answer, setAnswer] = useState(question.user_answer || '');
    const cat = CAT_COLORS[question.category] || CAT_COLORS.fun;

    const handleSubmit = () => {
        if (!answer.trim()) return;
        onSubmit(question.id, answer.trim());
        setFlipped(true);
    };

    return (
        <div
            className="ib-card-container"
            id={`ib-card-${question.id}`}
            style={{ perspective: '1000px' }}
        >
            <div
                className={`ib-card-inner ${flipped ? 'ib-flipped' : ''}`}
                style={{
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
            >
                {/* FRONT — Question */}
                <div
                    className="ib-card-face ib-front"
                    style={{
                        background: cat.bg,
                        borderColor: cat.border,
                        boxShadow: `0 4px 20px ${cat.glow}`,
                        backfaceVisibility: 'hidden',
                    }}
                >
                    <div className="ib-category-badge" style={{ color: cat.text, borderColor: cat.border }}>
                        {question.emoji} {question.category}
                    </div>
                    <p className="ib-question">{question.question}</p>

                    {!question.user_answered ? (
                        <div className="ib-answer-form">
                            <textarea
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="Type your answer..."
                                maxLength={500}
                                className="ib-textarea"
                                rows={3}
                            />
                            <button type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !answer.trim()}
                                className="ib-submit-btn"
                                style={{ background: `linear-gradient(135deg, ${cat.text}, ${cat.border})` }}
                            >
                                <Send size={14} />
                                <span>{isSubmitting ? 'Sending...' : 'Submit'}</span>
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setFlipped(true)} className="ib-flip-hint">
                            Tap to see answers →
                        </button>
                    )}
                </div>

                {/* BACK — Answers */}
                <div
                    className="ib-card-face ib-back"
                    style={{
                        background: cat.bg,
                        borderColor: cat.border,
                        boxShadow: `0 4px 20px ${cat.glow}`,
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                    }}
                >
                    <div className="ib-category-badge" style={{ color: cat.text, borderColor: cat.border }}>
                        {question.emoji} {question.category}
                    </div>
                    <p className="ib-question-back">{question.question}</p>

                    <div className="ib-answers-section">
                        <div className="ib-answer-block">
                            <span className="ib-answer-label" style={{ color: cat.text }}>Your Answer</span>
                            <p className="ib-answer-text">{question.user_answer || answer}</p>
                        </div>

                        <div className="ib-answer-block">
                            <span className="ib-answer-label" style={{ color: cat.text }}>
                                {question.is_revealed ? (
                                    <><Unlock size={12} /> Their Answer</>
                                ) : (
                                    <><Lock size={12} /> Waiting for their answer...</>
                                )}
                            </span>
                            {question.is_revealed ? (
                                <p className="ib-answer-text">{question.match_answer}</p>
                            ) : (
                                <div className="ib-locked-answer">
                                    <Lock size={20} />
                                    <span>Both must answer to reveal</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button type="button" onClick={() => setFlipped(false)} className="ib-flip-hint">
                        ← Flip back
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Page ───────────────────────────────────────────────── */
function IceBreakerContent() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const matchId = Number(searchParams.get('match') || 0);
    const [currentIndex, setCurrentIndex] = useState(0);

    const { data, isLoading, error } = useIceBreakerQuestions(matchId);
    const submitAnswer = useSubmitIceBreakerAnswer();

    const handleSubmit = (questionId: number, answer: string) => {
        submitAnswer.mutate({ question_id: questionId, match_id: matchId, answer });
    };

    const questions = data?.questions || [];
    const currentQuestion = questions[currentIndex];

    if (!isAuthenticated) {
        return (
            <div className="ib-auth-wall">
                <Sparkles size={48} />
                <h1>Ice Breaker Cards</h1>
                <p>Sign in to start breaking the ice.</p>
                <button type="button" onClick={() => router.push('/login')} className="ib-primary-btn">Log In</button>
            </div>
        );
    }

    if (!matchId) {
        return (
            <div className="ib-auth-wall">
                <Sparkles size={48} />
                <h1>Ice Breaker Cards</h1>
                <p>Open this page from a match to start answering questions together!</p>
                <button type="button" onClick={() => router.push('/matches')} className="ib-primary-btn">Go to Matches</button>
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
        .ib-page {
          min-height: 100vh;
          background: linear-gradient(160deg, #0a0a1a 0%, #1a1030 40%, #0f1628 100%);
          color: #e0e0ff;
          font-family: 'Inter', -apple-system, sans-serif;
          display: flex; flex-direction: column; align-items: center;
          padding: 2rem 1rem;
        }
        .ib-header {
          text-align: center; margin-bottom: 2rem;
        }
        .ib-header h1 {
          font-size: 1.8rem; font-weight: 700;
          background: linear-gradient(to right, #c4b5fd, #f9a8d4);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .ib-header p { color: #7c7caa; font-size: 0.9rem; margin-top: 0.25rem; }
        .ib-progress {
          display: flex; gap: 6px; margin-bottom: 1.5rem;
        }
        .ib-progress-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: rgba(100, 100, 200, 0.2);
          transition: background 0.3s, transform 0.3s;
          cursor: pointer;
        }
        .ib-progress-dot.active {
          background: #818cf8; transform: scale(1.3);
        }
        .ib-progress-dot.answered {
          background: rgba(99, 102, 241, 0.5);
        }

        .ib-card-container {
          width: 100%; max-width: 420px; height: 420px;
        }
        .ib-card-inner {
          position: relative; width: 100%; height: 100%;
        }
        .ib-card-face {
          position: absolute; top: 0; left: 0;
          width: 100%; height: 100%;
          border-radius: 20px;
          border: 1px solid;
          padding: 1.5rem;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .ib-category-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 8px;
          border: 1px solid; font-size: 0.75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
          width: fit-content; margin-bottom: 1rem;
        }
        .ib-question {
          font-size: 1.2rem; font-weight: 600; color: #e0e0ff;
          line-height: 1.5; flex: 1; display: flex; align-items: center;
        }
        .ib-question-back {
          font-size: 0.9rem; font-weight: 500; color: #a0a0cc;
          margin-bottom: 0.75rem; line-height: 1.4;
        }
        .ib-answer-form {
          display: flex; flex-direction: column; gap: 0.75rem;
        }
        .ib-textarea {
          width: 100%; padding: 0.75rem;
          background: rgba(20, 20, 40, 0.6);
          border: 1px solid rgba(100, 100, 200, 0.2);
          border-radius: 12px; color: #e0e0ff;
          font-size: 0.9rem; resize: none;
        }
        .ib-textarea::placeholder { color: #5a5a8a; }
        .ib-textarea:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
        }
        .ib-submit-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 6px; padding: 0.6rem 1rem;
          color: white; border: none; border-radius: 10px;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          transition: transform 0.15s, opacity 0.2s;
        }
        .ib-submit-btn:hover { transform: scale(1.02); }
        .ib-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ib-flip-hint {
          background: none; border: none; color: #7c7caa;
          font-size: 0.8rem; cursor: pointer; padding: 0.5rem;
          transition: color 0.2s;
        }
        .ib-flip-hint:hover { color: #a5b4fc; }

        .ib-answers-section {
          flex: 1; display: flex; flex-direction: column; gap: 0.75rem;
          overflow-y: auto;
        }
        .ib-answer-block {
          padding: 0.75rem;
          background: rgba(20, 20, 40, 0.5);
          border-radius: 10px;
        }
        .ib-answer-label {
          font-size: 0.75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          display: flex; align-items: center; gap: 4px;
          margin-bottom: 0.5rem;
        }
        .ib-answer-text {
          font-size: 0.9rem; color: #d0d0ee; line-height: 1.4;
        }
        .ib-locked-answer {
          display: flex; align-items: center; gap: 8px;
          color: #5a5a8a; font-size: 0.85rem; font-style: italic;
          padding: 0.5rem 0;
        }

        .ib-nav {
          display: flex; align-items: center; gap: 1.5rem;
          margin-top: 1.5rem;
        }
        .ib-nav-btn {
          display: flex; align-items: center; justify-content: center;
          width: 44px; height: 44px;
          background: rgba(30, 30, 60, 0.6);
          border: 1px solid rgba(100, 100, 200, 0.2);
          border-radius: 12px; color: #a5b4fc;
          cursor: pointer; transition: background 0.2s;
        }
        .ib-nav-btn:hover { background: rgba(50, 50, 80, 0.6); }
        .ib-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .ib-nav-count {
          font-size: 0.9rem; color: #7c7caa; font-weight: 500;
        }

        .ib-auth-wall {
          min-height: 100vh;
          background: linear-gradient(160deg, #0a0a1a 0%, #1a1030 40%, #0f1628 100%);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 1rem; text-align: center; padding: 2rem;
          color: #7c7caa;
        }
        .ib-auth-wall h1 {
          font-size: 1.6rem; color: #e0e0ff;
        }
        .ib-primary-btn {
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white; border: none; border-radius: 12px;
          font-size: 1rem; font-weight: 600; cursor: pointer;
        }
        .ib-primary-btn:hover {
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
        }

        .ib-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: ib-spin 0.8s linear infinite;
        }
        @keyframes ib-spin { to { transform: rotate(360deg); } }

        .ib-meta-bar {
          display: flex; gap: 1.5rem; margin-bottom: 1rem;
          font-size: 0.8rem; color: #7c7caa;
        }
        .ib-meta-bar span { font-weight: 600; color: #a5b4fc; }
      `}</style>

            <div className="ib-page">
                <div className="ib-header">
                    <h1>✨ Ice Breaker Cards</h1>
                    <p>Answer the same questions — both reveal when you both respond</p>
                </div>

                {data?.meta && (
                    <div className="ib-meta-bar">
                        <div>Answered: <span>{data.meta.total_answered}</span> / {data.meta.total_questions}</div>
                    </div>
                )}

                {/* Progress dots */}
                {questions.length > 0 && (
                    <div className="ib-progress">
                        {questions.map((q, i) => (
                            <div
                                key={q.id}
                                className={`ib-progress-dot ${i === currentIndex ? 'active' : ''} ${q.user_answered ? 'answered' : ''}`}
                                onClick={() => setCurrentIndex(i)}
                            />
                        ))}
                    </div>
                )}

                {/* Card */}
                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '4rem' }}>
                        <div className="ib-spinner" />
                        <p style={{ color: '#7c7caa' }}>Shuffling cards...</p>
                    </div>
                ) : error ? (
                    <div style={{ color: '#f87171', textAlign: 'center', marginTop: '4rem' }}>
                        <p>Failed to load ice breakers. Try again later.</p>
                    </div>
                ) : currentQuestion ? (
                    <>
                        <IceBreakerCard
                            key={currentQuestion.id}
                            question={currentQuestion}
                            matchId={matchId}
                            onSubmit={handleSubmit}
                            isSubmitting={submitAnswer.isPending}
                        />
                        <div className="ib-nav">
                            <button type="button"
                                className="ib-nav-btn"
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <span className="ib-nav-count">{currentIndex + 1} / {questions.length}</span>
                            <button type="button"
                                className="ib-nav-btn"
                                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                                disabled={currentIndex === questions.length - 1}
                            >
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ color: '#7c7caa', textAlign: 'center', marginTop: '4rem' }}>
                        <Sparkles size={40} style={{ marginBottom: '1rem' }} />
                        <p>No ice breaker questions available yet.</p>
                    </div>
                )}
            </div>
        </>
    );
}

export default function IceBreakersPage() {
    return (
        <Suspense fallback={
            <div className="ib-auth-wall">
                <div className="ib-spinner" />
                <p>Loading...</p>
            </div>
        }>
            <IceBreakerContent />
        </Suspense>
    );
}
