"use client";
import { Sparkles } from 'lucide-react';
import { EvolvingAvatar } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/utils/avatar';

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getConversations, type Conversation } from "@/lib/api/messages";
import { api } from "@/lib/api/client";
import ReportModal from "@/components/ReportModal";
import ProfileViewModal from "@/components/ProfileViewModal";
import { blockUser, reportUser } from "@/lib/api/safety";
import { PresenceIndicator } from "@/components/realtime/PresenceComponents";
import { useToast } from "@/components/ToastProvider";
import { VideoCallModal } from "@/components/VideoCall/VideoCallModal";
import { useWebSocket } from "@/lib/hooks/use-websocket";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { CallHistory } from "@/components/VideoCall/CallHistory";
import RealTimeChat from "@/components/RealTimeChat";
import { DateFeedbackModal } from "@/components/matches/DateFeedbackModal";
import MatchARView from "@/components/ar/MatchARView";
import AppHeader from "@/components/AppHeader";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useSocketLogic } from "@/lib/hooks/use-socket-logic";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function MessagesPage() {
	const { token, isAuthenticated } = useAuth();
	const { connected } = useSocketLogic({ autoConnect: true });
	const { showError } = useToast();
	const { videoSignals }: { videoSignals: any[] } = useWebSocket();
	const { confirmAction, ConfirmDialog } = useConfirmDialog();
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [auraMatches, setAuraMatches] = useState<any[]>([]);
	const [selectedConversation, setSelectedConversation] =
		useState<Conversation | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isReportModalOpen, setIsReportModalOpen] = useState(false);
	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
	const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
	const [isAROpen, setIsAROpen] = useState(false);
	const [incomingCall, setIncomingCall] = useState<{ callerId: string } | null>(
		null,
	);

	const loadConversations = useCallback(async () => {
		if (!token) return;

		try {
			setIsLoading(true);
			setError(null);
			const [conversationsData, auraMatchesData] = await Promise.all([
				getConversations(token),
				api.get('/matching/aura-matches')
			]);
			setConversations(
				Array.isArray(conversationsData) ? conversationsData : [],
			);
			setAuraMatches(Array.isArray(auraMatchesData) ? auraMatchesData : []);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load conversations",
			);
		} finally {
			setIsLoading(false);
		}
	}, [token]);

	useEffect(() => {
		if (isAuthenticated && token) {
			loadConversations();
		}
	}, [isAuthenticated, token, loadConversations]);

	useEffect(() => {
		const signals = videoSignals || [];
		const lastSignal = signals[signals.length - 1];
		if (lastSignal && lastSignal.signal?.type === "offer") {
			setIncomingCall({ callerId: lastSignal.from_user_id });
			setIsVideoCallOpen(true);
		}
	}, [videoSignals]);

	const handleBlock = async () => {
		const otherUser = selectedConversation?.other_user;
		if (!token || !otherUser) return;

		// Use inline confirmation instead of native confirm()
		confirmAction({
			title: "Block User",
			message: `Are you sure you want to block ${otherUser.profile?.display_name || otherUser.email || 'this user'}? You will no longer see their messages or profile.`,
			confirmLabel: "Block",
			variant: "destructive",
			onConfirm: async () => {
				try {
					await blockUser(token, otherUser.id);
					setConversations((prev) =>
						prev.filter((c) => c.id !== selectedConversation!.id),
					);
					setSelectedConversation(null);
				} catch (err) {
					showError("Failed to block user");
				}
			},
		});
	};

	const handleReport = async (reason: string, details: string) => {
		const otherUser = selectedConversation?.other_user;
		if (!token || !otherUser) return;

		try {
			await reportUser(token, otherUser.id, reason, details);

			// Offer to block after report
			confirmAction({
				title: "Report Submitted",
				message: "Do you want to block this user as well?",
				confirmLabel: "Block User",
				variant: "destructive",
				onConfirm: async () => {
					try {
						await blockUser(token, otherUser.id);
						setConversations((prev) =>
							prev.filter((c) => c.id !== selectedConversation!.id),
						);
						setSelectedConversation(null);
					} catch (err) {
						console.error("Failed to block after report", err);
					}
				},
			});
		} catch (err) {
			showError(
				"Failed to submit report",
				err instanceof Error ? err.message : "Unknown error",
			);
		}
	};

	const formatMessageTime = (timestamp: string) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 24) {
			return date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
		} else if (diffInHours < 168) {
			// 7 days
			return date.toLocaleDateString([], {
				weekday: "short",
				hour: "2-digit",
				minute: "2-digit",
			});
		} else {
			return date.toLocaleDateString([], { month: "short", day: "numeric" });
		}
	};

	if (isLoading) {
		return (
			<ProtectedRoute>
				<div className="min-h-screen bg-muted dark:bg-background">
					<AppHeader />
					<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
						<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
					</div>
				</div>
			</ProtectedRoute>
		);
	}

	if (error) {
		return (
			<ProtectedRoute>
				<div className="min-h-screen bg-muted dark:bg-background">
					<AppHeader />
					<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
						<div className="text-center">
							<div className="text-red-500 text-xl mb-4">Error: {error}</div>
							<button type="button"
								onClick={loadConversations}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
							>
								Try Again
							</button>
						</div>
					</div>
				</div>
			</ProtectedRoute>
		);
	}

	return (
		<ProtectedRoute>
			{ConfirmDialog}
			<div className="min-h-screen bg-muted dark:bg-background">
				<AppHeader />

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					{/* Aura Matches Bar */}
					{auraMatches.length > 0 && (
						<div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
							<div className="flex items-center gap-2 mb-3 px-2">
								<Sparkles className="w-4 h-4 text-purple-500 fill-current" />
								<h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
									Vibe-Compatible Partners
								</h3>
							</div>
							<div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide">
								{(auraMatches || []).map((match) => (
									<div
										key={match.user_id}
										className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
										onClick={() => {
											const conv = conversations.find(c => String(c.other_user.id) === String(match.user_id));
											if (conv) setSelectedConversation(conv);
										}}
									>
										<div className="relative">
											<EvolvingAvatar
												src={getAvatarUrl(match.avatar, match.name)}
												alt={match.name}
												size="md"
												emotion={match.emotion.toLowerCase()}
												className="group-hover:scale-105 transition-transform"
											/>
											<div className="absolute -top-1 -right-1 bg-purple-600 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-lg shadow-purple-500/20">
												Match
											</div>
										</div>
										<div className="text-center">
											<p className="text-[10px] font-bold text-foreground dark:text-foreground truncate max-w-[64px]">
												{match.name}
											</p>
											<p className="text-[8px] font-medium text-purple-500 uppercase tracking-tighter">
												{match.aura_mood}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					<div className="mb-8 rounded-2xl border border-border dark:border-border bg-card dark:bg-card p-6 shadow-sm">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<h1 className="text-3xl font-bold text-foreground dark:text-foreground">
									Messages
								</h1>
								<p className="text-muted-foreground">
									{conversations.length} conversation
									{conversations.length !== 1 ? "s" : ""}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<button type="button"
									onClick={() => setIsHistoryOpen(true)}
									className="dark:bg-muted text-white px-4 py-2 rounded-md text-sm font-medium hover:dark:bg-muted"
								>
									Call History
								</button>
								<button type="button"
									onClick={loadConversations}
									className="dark:bg-muted text-white px-4 py-2 rounded-md text-sm font-medium hover:dark:bg-muted"
								>
									Refresh
								</button>
								<a
									href="/friends"
									className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
								>
									Friends
								</a>
								<a
									href="/dashboard"
									className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
								>
									Dashboard
								</a>
							</div>
						</div>
					</div>

					{conversations.length === 0 ? (
						<div className="text-center">
							<h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-4">
								No Conversations Yet
							</h2>
							<p className="text-muted-foreground mb-8">
								Start matching with people to begin conversations!
							</p>
							<a
								href="/matches"
								className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
							>
								Find Matches
							</a>
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
							{/* Conversations List */}
							<div className="lg:col-span-1 bg-card dark:bg-card rounded-lg shadow">
								<div className="p-4 border-b">
									<h2 className="text-lg font-semibold text-foreground dark:text-foreground">
										Conversations
									</h2>
								</div>
								<div className="overflow-y-auto h-[calc(100%-80px)]">
									{(conversations || []).map((conversation) => (
										<div
											key={conversation.id}
											onClick={() => setSelectedConversation(conversation)}
											className={`p-4 border-b cursor-pointer hover:bg-muted dark:bg-background ${
												selectedConversation?.id === conversation.id
													? "bg-blue-50 border-blue-200"
													: ""
											}`}
										>
											<div className="flex items-center space-x-3">
												<div className="relative">
													<EvolvingAvatar
														src={getAvatarUrl(conversation.other_user?.profile?.photos?.[0]?.url, conversation.other_user?.profile?.display_name)}
														alt={conversation.other_user?.profile?.display_name || "User"}
														size="md"
														emotion={(conversation.other_user?.profile?.current_emotion as any) || "neutral"}
													/>
													<div className="absolute -bottom-0.5 -right-0.5">
														<PresenceIndicator
															userId={String(conversation.other_user?.id)}
															size="sm"
														/>
													</div>
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium text-foreground dark:text-foreground truncate">
														{conversation.other_user?.profile?.display_name ||
															"Anonymous"}
													</p>
													<p className="text-sm text-muted-foreground truncate">
														{conversation.last_message?.content ||
															"No messages yet"}
													</p>
												</div>
												{conversation.last_message && (
													<div className="text-xs text-muted-foreground">
														{formatMessageTime(
															conversation.last_message.created_at,
														)}
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Messages Area */}
							<div className="lg:col-span-2 bg-card dark:bg-card rounded-lg shadow flex flex-col overflow-hidden">
								{selectedConversation ? (
									<ErrorBoundary>
										<RealTimeChat
										recipientId={String(selectedConversation.other_user?.id)}
										recipientName={
											selectedConversation.other_user?.profile?.display_name ||
											"User"
										}
										recipientAvatar={
											selectedConversation.other_user?.profile?.photos?.[0]
												?.url || "/placeholder-avatar.png"
										}
										recipientEmotion={
											selectedConversation.other_user?.profile?.current_emotion
										}
										className="h-full"
										onVideoCall={() => setIsVideoCallOpen(true)}
										onProfileView={() => setIsProfileModalOpen(true)}
										onLocate={() => setIsAROpen(true)}
										onReport={() => setIsReportModalOpen(true)}
										onBlock={handleBlock}
										onRateDate={() => setIsFeedbackModalOpen(true)}
										/>
									</ErrorBoundary>
								) : (
									<div className="flex-1 flex items-center justify-center">
										<div className="text-center">
											<h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">
												Select a Conversation
											</h3>
											<p className="text-muted-foreground">
												Choose a conversation from the list to start messaging
											</p>
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{isAROpen && selectedConversation && token && (
				<MatchARView
					matchId={selectedConversation.id}
					matchName={
						selectedConversation.other_user?.profile?.display_name || "Match"
					}
					token={token}
					onClose={() => setIsAROpen(false)}
				/>
			)}

			{selectedConversation && (
				<ReportModal
					isOpen={isReportModalOpen}
					onClose={() => setIsReportModalOpen(false)}
					onSubmit={handleReport}
					userName={
						selectedConversation.other_user?.profile?.display_name || "User"
					}
				/>
			)}

			{selectedConversation && selectedConversation.other_user && (
				<ProfileViewModal
					isOpen={isProfileModalOpen}
					onClose={() => setIsProfileModalOpen(false)}
					user={selectedConversation.other_user}
					messagesExchanged={0} // RealTimeChat handles message history now
					matchId={selectedConversation.id}
				/>
			)}

			{(selectedConversation?.other_user || incomingCall) && (
				<VideoCallModal
					recipientId={
						incomingCall
							? incomingCall.callerId
							: String(selectedConversation!.other_user!.id)
					}
					isOpen={isVideoCallOpen}
					onClose={() => {
						setIsVideoCallOpen(false);
						setIncomingCall(null);
					}}
					isIncoming={!!incomingCall}
				/>
			)}

			<Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Call History</DialogTitle>
					</DialogHeader>
					<CallHistory />
				</DialogContent>
			</Dialog>

			{selectedConversation && selectedConversation.other_user && (
				<DateFeedbackModal
					matchId={selectedConversation.id}
					open={isFeedbackModalOpen}
					onOpenChange={setIsFeedbackModalOpen}
					otherUserName={
						selectedConversation.other_user?.profile?.display_name || "User"
					}
				/>
			)}
		</ProtectedRoute>
	);
}
