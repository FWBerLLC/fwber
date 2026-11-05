"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
	Heart,
	X,
	Star,
	MapPin,
	Info,
	Mic2,
	Play,
	Pause,
	Compass,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useToast } from "@/lib/hooks/use-toast";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppHeader from "@/components/AppHeader";
import MatchFilter from "@/components/MatchFilter";
import Image from "next/image";
import ProfileViewModal from "@/components/ProfileViewModal";
import UserAvatar from "@/components/UserAvatar";
import CreateBountyModal from "@/components/CreateBountyModal";
import BoostButton from "@/components/BoostButton";
import MatchModal from "@/components/MatchModal";
import type { Match } from "@/lib/api/matches";

export default function MatchesPage() {
	const [matches, setMatches] = useState<Match[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [auraMatchMode, setAuraMatchMode] = useState(false);
	const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{id: number; name: string; photoUrl: string} | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const { success, error, ToastContainer } = useToast();

	const toggleAudio = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!audioRef.current) return;
		if (isPlaying) {
			audioRef.current.pause();
		} else {
			audioRef.current.play();
		}
		setIsPlaying(!isPlaying);
	};

	const fetchMatches = useCallback(
		async (filters = {}) => {
			try {
				setLoading(true);
				const endpoint = auraMatchMode ? "/matching/aura-matches" : "/matches";
				const response = await api.get<{ matches?: Match[] } | Match[]>(endpoint, {
					params: filters,
				});
				// Normalize response depending on endpoint
				const matchData = Array.isArray(response) ? response : response.matches;
				setMatches(Array.isArray(matchData) ? matchData : []);
				setCurrentIndex(0);
				setIsPlaying(false);
			} catch (err) {
				console.error("Error fetching matches:", err);
				error("Failed to load matches");
			} finally {
				setLoading(false);
			}
		},
		[error, auraMatchMode],
	);

	useEffect(() => {
		fetchMatches();
	}, [fetchMatches]);

	const handleAction = async (action: "like" | "pass" | "super_like") => {
		if (!matches[currentIndex]) return;

		if (audioRef.current) {
			audioRef.current.pause();
			setIsPlaying(false);
		}

		const targetUserId = matches[currentIndex].id;

		// Optimistic update
		const nextIndex = currentIndex + 1;
		setCurrentIndex(nextIndex);

		try {
			const response = await api.post<{ is_match?: boolean }>(
				"/matches/action",
				{
					target_user_id: targetUserId,
					action,
				},
			);

			if (response.is_match) {
				success(
					`You matched with ${matches[currentIndex].name || "Voice Only Profile"}!`,
				);
				setIsMatchModalOpen(true);
          setMatchedUser({ id: targetUserId, name: matches[currentIndex].name || "Voice Only Profile", photoUrl: matches[currentIndex].avatarUrl || "" });
			}
		} catch (err) {
			console.error("Error performing match action:", err);
			// Revert optimistic update if needed, or just show error
			error("Failed to perform action");
		}
	};

	const handleFilterChange = (filters: any) => {
		fetchMatches(filters);
	};

	if (loading) {
		return (
			<ProtectedRoute>
				<div className="min-h-screen bg-muted dark:bg-background">
					<AppHeader />
					<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
						<div className="text-sm text-muted-foreground dark:text-muted-foreground">
							Loading matches...
						</div>
					</div>
				</div>
			</ProtectedRoute>
		);
	}

	if (matches.length === 0 || currentIndex >= matches.length) {
		return (
			<ProtectedRoute>
				<div className="min-h-screen bg-muted dark:bg-background">
					<AppHeader />
					<div className="mx-auto max-w-md px-4 py-8 text-center">
						<ToastContainer />
						<h2 className="mb-4 text-2xl font-bold text-foreground dark:text-foreground">
							No more matches
						</h2>
						<p className="mb-6 text-muted-foreground">
							Check back later or adjust your filters.
						</p>
						<Button onClick={() => fetchMatches()}>Refresh</Button>
					</div>
				</div>
			</ProtectedRoute>
		);
	}

	const currentMatch = matches[currentIndex];
	const isConfessional = Boolean(currentMatch.is_confessional);

	return (
		<ProtectedRoute>
			<div className="min-h-screen bg-muted dark:bg-background">
				<AppHeader />
				<div className="mx-auto max-w-md px-4 py-8">
					<ToastContainer />
					<div className="mb-4 space-y-4">
						<div className="flex items-center justify-between gap-3">
							<CreateBountyModal />
							<BoostButton />
						</div>
						<div className="flex items-center justify-end">
							<Button
								variant={auraMatchMode ? "default" : "outline"}
								className={auraMatchMode ? "bg-purple-600 hover:bg-purple-700 text-white animate-pulse" : ""}
								onClick={() => setAuraMatchMode(!auraMatchMode)}
							>
								<Star className="w-4 h-4 mr-2" />
								{auraMatchMode ? "Aura Matches Active" : "Find Aura Matches"}
							</Button>
						</div>
						<MatchFilter onFilterChange={handleFilterChange} />
					</div>

					<div
						className={`relative h-[600px] overflow-hidden rounded-lg border shadow-sm dark:border-border ${isConfessional ? "border-purple-500/30" : ""}`}
						style={{ backgroundColor: "#111827" }}
					>
						<div className="relative h-full">
							{/* Image/Content Area */}
							<div
								className={`h-3/4 relative cursor-pointer ${isConfessional ? "bg-zinc-900 flex flex-col items-center justify-center p-8" : "dark:bg-card"}`}
								onClick={() => !isConfessional && setIsProfileOpen(true)}
							>
								{isConfessional ? (
									<div className="flex flex-col items-center justify-center w-full h-full text-center">
										<div className="p-6 rounded-full bg-purple-500/10 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.15)] mb-6">
											<Mic2 className="w-16 h-16 text-purple-400" />
										</div>
										<span className="px-3 py-1 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
											Confessional Mode
										</span>
										<h2 className="text-2xl font-black italic text-white tracking-tighter mb-2">
											LISTEN TO ME
										</h2>
										<p className="text-zinc-500 text-sm leading-relaxed mb-8">
											My profile is hidden. <br />
											Vibe with my voice before we match.
										</p>

										{currentMatch.voice_intro_url ? (
											<div className="w-full relative z-20">
												<audio
													ref={audioRef}
													src={currentMatch.voice_intro_url}
													onEnded={() => setIsPlaying(false)}
													className="hidden"
												/>
												<button type="button"
													onClick={toggleAudio}
													className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition active:scale-95"
												>
													{isPlaying ? (
														<Pause className="w-5 h-5 fill-current" />
													) : (
														<Play className="w-5 h-5 fill-current" />
													)}
													{isPlaying ? "PAUSE INTRO" : "HEAR MY VOICE"}
												</button>
											</div>
										) : (
											<p className="text-red-400 text-sm">
												No voice intro available.
											</p>
										)}
									</div>
								) : (
									<UserAvatar
										src={currentMatch.avatarUrl}
										name={currentMatch.name}
										userId={currentMatch.id}
										fill
										priority
										className="object-cover"
									/>
								)}
							</div>

							<div
								className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 h-1/2 flex flex-col justify-end pointer-events-none"
								style={{ color: "#ffffff" }}
							>
								<div className="flex justify-between items-end">
									<div>
										<h2 className="text-3xl font-bold flex items-center gap-2">
											{isConfessional
												? "Voice Only Profile"
												: currentMatch.name}
											{!isConfessional && currentMatch.age && (
												<span className="text-muted-foreground">
													, {currentMatch.age}
												</span>
											)}
											{currentMatch.is_verified && !isConfessional && (
												<span className="text-blue-400 text-sm">✓</span>
											)}
										</h2>
										<div className="flex items-center gap-1 dark:text-foreground mb-2">
											<MapPin className="h-4 w-4" />
											<span>{currentMatch.distance} miles away</span>
										</div>
									</div>
									{!isConfessional &&
										Array.isArray(currentMatch.shared_interests) &&
										currentMatch.shared_interests.length > 0 && (
											<div className="mb-3 flex flex-wrap gap-2">
												{currentMatch.shared_interests.map(
													(interest: string) => (
														<span
															key={interest}
															className="rounded-full border border-white/30 bg-card/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white"
														>
															{interest}
														</span>
													),
												)}
											</div>
										)}
									{!isConfessional && currentMatch.scene_overlap && (
										<div className="mb-3 rounded-2xl border border-white/15 bg-black/25 p-3 backdrop-blur-sm">
											<div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
												<Compass className="h-3.5 w-3.5" />
												Scene overlap {currentMatch.scene_overlap.score}%
											</div>
											{currentMatch.scene_overlap.headline && (
												<p className="mb-2 text-sm text-white/90">
													{currentMatch.scene_overlap.headline}
												</p>
											)}
											<div className="flex flex-wrap gap-2">
												{(currentMatch.scene_overlap.shared_topics || []).map(
													(topic) => (
														<span
															key={topic.slug}
															className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100"
														>
															{topic.emoji ? `${topic.emoji} ` : ""}
															{topic.label}
														</span>
													),
												)}
												{(currentMatch.scene_overlap.shared_scene_tags || [])
													.slice(0, 3)
													.map((tag) => (
														<span
															key={tag}
															className="rounded-full border border-white/20 bg-card/15 px-2.5 py-1 text-[11px] font-medium text-white"
														>
															#{tag}
														</span>
													))}
											</div>
										</div>
									)}
									{!isConfessional && (
										<Button
											size="icon"
											variant="ghost"
											className="text-white hover:bg-card/20 pointer-events-auto mb-2 z-10"
											onClick={(e) => {
												e.stopPropagation();
												setIsProfileOpen(true);
											}}
										>
											<Info className="h-6 w-6" />
										</Button>
									)}
								</div>
								{!isConfessional && (
									<>
										{(currentMatch.shared_interest_count ?? 0) > 0 && (
											<p className="mb-2 text-sm font-medium text-amber-200">
												{currentMatch.shared_interest_count} shared interest
												{currentMatch.shared_interest_count === 1 ? "" : "s"}
											</p>
										)}
										<p className="line-clamp-2 mb-16">{currentMatch.bio}</p>
									</>
								)}
								{isConfessional && (
									<div className="flex gap-4 mb-16 text-sm text-zinc-400 font-medium">
										<span>Gender: {currentMatch.gender || "??"}</span>
										<span>Age: {currentMatch.age ?? "??"}</span>
									</div>
								)}
							</div>

							{/* Action Buttons */}
							<div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 pointer-events-auto z-20">
								<Button
									size="icon"
									variant="outline"
									className="h-14 w-14 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-50 shadow-lg hover:scale-110 transition-transform bg-card dark:dark:bg-card/10 backdrop-blur-md"
									onClick={() => handleAction("pass")}
								>
									<X className="h-8 w-8" />
								</Button>

								<Button
									size="icon"
									variant="outline"
									className="h-10 w-10 rounded-full border-2 border-blue-400 text-blue-400 hover:bg-blue-50 mt-2 shadow-lg hover:scale-110 transition-transform bg-card dark:dark:bg-card/10 backdrop-blur-md"
									onClick={() => handleAction("super_like")}
								>
									<Star className="h-5 w-5" />
								</Button>

								<Button
									size="icon"
									variant="outline"
									className="h-14 w-14 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-50 shadow-lg hover:scale-110 transition-transform bg-card dark:dark:bg-card/10 backdrop-blur-md"
									onClick={() => handleAction("like")}
								>
									<Heart className="h-8 w-8" />
								</Button>
							</div>
						</div>
					</div>

					{isProfileOpen && (
						<ProfileViewModal
							isOpen={isProfileOpen}
							onClose={() => setIsProfileOpen(false)}
							onAction={handleAction}
							user={{
								id: currentMatch.id,
								profile: {
									display_name: currentMatch.name,
									age: currentMatch.age ?? null,
									bio: currentMatch.bio ?? undefined,
									photos:
										currentMatch.photos ??
										(currentMatch.avatarUrl
											? [
													{
														id: 1,
														url: currentMatch.avatarUrl,
														is_private: false,
														is_primary: true,
													},
												]
											: []),
								},
							}}
							messagesExchanged={0}
						/>
					)}
				</div>
			</div>
		</ProtectedRoute>
	);
}
