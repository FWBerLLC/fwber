"use client";

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { proximityApi } from '@/lib/api/proximity';
import { useAuth } from '@/lib/auth-context';

interface ArtifactVotingProps {
    artifactId: number;
    initialScore: number;
    initialUserVote: number;
}

export default function ArtifactVoting({ artifactId, initialScore, initialUserVote }: ArtifactVotingProps) {
    const { token } = useAuth();

    // Optimistic UI State
    const [score, setScore] = useState(initialScore);
    const [userVote, setUserVote] = useState(initialUserVote); // 1, -1, or 0
    const [isVoting, setIsVoting] = useState(false);

    const handleVote = async (newValue: number) => {
        // If clicking the active vote again, remove it (value = 0)
        const targetValue = userVote === newValue ? 0 : newValue;

        // Calculate score difference
        const diff = targetValue - userVote;

        // Apply optimistic update
        const prevScore = score;
        const prevUserVote = userVote;

        setScore(prev => prev + diff);
        setUserVote(targetValue);
        setIsVoting(true);

        try {
            await proximityApi.voteArtifact(artifactId, targetValue, token as string);
        } catch (err) {
            console.error("Failed to vote:", err);
            // Revert optimistic update
            setScore(prevScore);
            setUserVote(prevUserVote);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center bg-muted dark:bg-background rounded-lg p-1 mr-3 border border-gray-100">
            <button type="button"
                onClick={() => handleVote(1)}
                disabled={isVoting || !token}
                className={`p-1 rounded transition-colors ${userVote === 1
                        ? 'text-orange-600 bg-orange-100'
                        : 'text-muted-foreground hover:text-orange-500 hover:bg-orange-50'
                    }`}
                aria-label="Upvote"
            >
                <ChevronUp className="h-5 w-5 stroke-[2.5]" />
            </button>

            <span className={`text-sm font-bold my-1 ${userVote === 1 ? 'text-orange-600' : userVote === -1 ? 'text-purple-600' : 'text-foreground dark:text-muted-foreground'
                }`}>
                {score}
            </span>

            <button type="button"
                onClick={() => handleVote(-1)}
                disabled={isVoting || !token}
                className={`p-1 rounded transition-colors ${userVote === -1
                        ? 'text-purple-600 bg-purple-100'
                        : 'text-muted-foreground hover:text-purple-500 hover:bg-purple-50'
                    }`}
                aria-label="Downvote"
            >
                <ChevronDown className="h-5 w-5 stroke-[2.5]" />
            </button>
        </div>
    );
}
