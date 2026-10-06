"use client";

import { useState, useEffect, useRef } from "react";
import {
	useWebSocketChat,
	ChatMessage,
	OnlineUser,
	useWebSocket,
} from "@/lib/hooks/use-websocket";
import { useAuth } from "@/lib/auth-context";
import { MessageMetadata } from "@/components/MessageStatusIndicator";
import {
	PresenceIndicator,
	PresenceStatus,
} from "@/components/PresenceIndicator";
import { EvolvingAvatar } from "@/components/ui/EvolvingAvatar";
import { WingmanSuggestions } from "@/components/ai/WingmanSuggestions";
import { WingmanDashboardModal } from "@/components/ai/WingmanDashboardModal";
import AudioRecorder from "@/components/AudioRecorder";
import { api } from "@/lib/api/client";
import {
	Languages,
	Loader2,
	Sparkles,
	Gift as GiftIcon,
	Lock,
	Video,
	MoreVertical,
	Paperclip,
	X,
	ThumbsUp,
	Heart,
	Laugh,
	BookOpen,
	MessageSquareQuote,
	Star,
	Zap,
} from "lucide-react";
import { useTranslation } from "@/lib/hooks/use-translation";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MatchInsights } from "@/components/matches/MatchInsights";
import { DatePlanner } from "@/components/realtime/DatePlanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { storeOfflineChatMessage } from "@/lib/offline-store";
import { useToast } from "@/components/ToastProvider";
import GiftShopModal from "@/components/gifts/GiftShopModal";
import { useE2EEncryption } from "@/lib/hooks/use-e2e-encryption";
import { useChatSync } from "@/lib/hooks/use-chat-sync";
import { storeOfflineMessage } from "@/lib/offline-store";
import { v4 as uuidv4 } from "uuid";
import TipButton from "@/components/tipping/TipButton";
import { ConversationCoach } from "@/components/chat/ConversationCoach";
import { TierUnlockGuide } from "@/components/chat/TierUnlockGuide";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RealTimeChatProps {
	recipientId: string;
	recipientName?: string;
	recipientAvatar?: string;
	recipientEmotion?: any;
	className?: string;
	onVideoCall?: () => void;
	onProfileView?: () => void;
	onLocate?: () => void;
	onReport?: () => void;
	onBlock?: () => void;
	onRateDate?: () => void;
}

function TranslateButton({
	text,
	isOwnMessage,
}: {
	text: string;
	isOwnMessage: boolean;
}) {
	const { translate, isLoading } = useTranslation();
	const [translatedText, setTranslatedText] = useState<string | null>(null);

	const handleTranslate = async () => {
		if (translatedText) {
			setTranslatedText(null);
			return;
		}
		const result = await translate(text, "en");
		if (result) setTranslatedText(result);
	};

	return (
		<div
			className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
		>
			{translatedText && (
				<div className="text-xs text-gray-200 italic mb-1 border-l-2 border-blue-500 pl-2 bg-black/20 p-1 rounded">
					{translatedText}
				</div>
			)}
			<button
				onClick={handleTranslate}
				className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 mt-1 opacity-50 hover:opacity-100 transition-opacity"
				title="Translate"
			>
				{isLoading ? (
					<Loader2 className="h-3 w-3 animate-spin" />
				) : (
					<Languages className="h-3 w-3" />
				)}
				{translatedText ? "Original" : "Translate"}
			</button>
		</div>
	);
}

function EncryptedMessageContent({
	content,
	senderId,
	isOwnMessage,
}: {
	content: string;
	senderId: number;
	isOwnMessage: boolean;
}) {
	const { decrypt, isReady } = useE2EEncryption();
	const [decryptedText, setDecryptedText] = useState<string | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		if (!isReady || !content) return;
		if (!content.trim().startsWith("{")) {
			setDecryptedText(content);
			return;
		}
		const decryptMsg = async () => {
			try {
				const text = await decrypt(senderId, content);
				setDecryptedText(text);
			} catch (e) {
				console.error("Decryption failed", e);
				setError(true);
			}
		};
		decryptMsg();
	}, [content, senderId, isReady, decrypt]);

	if (error)
		return (
			<span className="text-red-300 italic text-xs">
				Failed to decrypt message
			</span>
		);
	if (!decryptedText)
		return <span className="text-gray-400 italic text-xs">Decrypting...</span>;

	return (
		<div>
			<p className="text-sm">{decryptedText}</p>
			{!isOwnMessage && (
				<TranslateButton text={decryptedText} isOwnMessage={isOwnMessage} />
			)}
		</div>
	);
}

export default function RealTimeChat({
	recipientId,
	recipientName = "User",
	recipientAvatar,
	recipientEmotion,
	className = "",
	onVideoCall,
	onProfileView,
	onLocate,
	onReport,
	onBlock,
	onRateDate,
}: RealTimeChatProps) {
	const [message, setMessage] = useState("");
	const [isRecordingVoice, setIsRecordingVoice] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const [atmosphere, setAtmosphere] = useState("standard");
	const [loadingHistory, setLoadingHistory] = useState(true);
	const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
	const [isDatePlannerOpen, setIsDatePlannerOpen] = useState(false);
	const [showSafetyMenu, setShowSafetyMenu] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isSending, setIsSending] = useState(false);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { user } = useAuth();
	const { showSuccess, showError } = useToast();
	const { encrypt, isReady: isE2EReady } = useE2EEncryption();
	const router = useRouter();

	const {
		messages = [],
		typingIndicators = [],
		onlineUsers = [],
		sendMessage,
		handleTypingChange,
		isTyping,
		currentNudges = [],
	} = useWebSocketChat(recipientId);

	const [activeNudge, setActiveNudge] = useState<any>(null);

	useEffect(() => {
		if (currentNudges && currentNudges.length > 0) {
			setActiveNudge(currentNudges[currentNudges.length - 1]);
			const timer = setTimeout(() => {
				setActiveNudge(null);
			}, 15000);
			return () => clearTimeout(timer);
		}
	}, [currentNudges]);

	const { loadConversationHistory, connectionStatus } = useWebSocket();
  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://api.fwber.site').replace('/api', '');

	useEffect(() => {
		setIsConnected(connectionStatus.connected);
	}, [connectionStatus.connected]);

	useEffect(() => {
		if (recipientId && user?.id) {
			setLoadingHistory(true);
			api.get(`/messages/${recipientId}`).then(res => {
				if (res.atmosphere) setAtmosphere(res.atmosphere);
				setLoadingHistory(false);
			}).catch(() => setLoadingHistory(false));
		}
	}, [recipientId, user?.id]);

	const recipientUser = (onlineUsers as OnlineUser[]).find(
		(u) => u.user_id === recipientId,
	);
	const recipientStatus: PresenceStatus =
		(recipientUser?.status as PresenceStatus) || "offline";

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const recipientTyping = (typingIndicators || []).find(
		(indicator: any) =>
			indicator.from_user_id === recipientId && indicator.is_typing,
	);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setSelectedFile(e.target.files[0]);
		}
	};

	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if ((message.trim() || selectedFile) && recipientId && user) {
			setIsSending(true);

			const messageUuid = uuidv4();
			const messageContent = message.trim();

			if (!navigator.onLine) {
				if (selectedFile) {
					showError("Offline", "File uploads require an active connection.");
					setIsSending(false);
					return;
				}

				try {
					await storeOfflineMessage({
						uuid: messageUuid,
						recipient_id: recipientId,
						content: messageContent,
						type: "text",
						is_encrypted: isE2EReady,
						created_at: new Date().toISOString(),
					});

					setMessage("");
					showSuccess(
						"Saved Offline",
						"Message will be synced when you reconnect.",
					);
					setIsSending(false);
					return;
				} catch (err) {
					console.error("Failed to store offline message", err);
				}
			}

			try {
				if (selectedFile) {
					const formData = new FormData();
					formData.append("uuid", messageUuid);
					formData.append("receiver_id", recipientId);
					formData.append("content", messageContent);
					formData.append("media", selectedFile);

					if (selectedFile.type.startsWith("image/"))
						formData.append("message_type", "image");
					else if (selectedFile.type.startsWith("video/"))
						formData.append("message_type", "video");
					else if (selectedFile.type.startsWith("audio/"))
						formData.append("message_type", "audio");
					else formData.append("message_type", "file");

					await api.post("/messages", formData);
				} else {
					let payload = message.trim();
					if (isE2EReady) {
						try {
							payload = await encrypt(parseInt(recipientId), payload);
						} catch (error) {}
					}
					sendMessage(payload);
				}

				if (!isConnected) {
					try {
						await api.post("/messages", {
							receiver_id: parseInt(recipientId),
							content: messageContent,
							message_type: "text",
						});
					} catch (_) {}
				}

				setMessage("");
				setSelectedFile(null);
				if (fileInputRef.current) fileInputRef.current.value = "";
			} catch (error) {
				console.error("Failed to send message:", error);
				showError("Error", "Failed to send message");
			} finally {
				setIsSending(false);
			}
		}
	};

	const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setMessage(value);
		handleTypingChange(value);
	};

	const handleVoiceMessage = async (audioFile: File, duration: number) => {
		if (!recipientId) return;

		const formData = new FormData();
		formData.append("receiver_id", recipientId);
		formData.append("media", audioFile);
		formData.append("media_duration", duration.toString());
		formData.append("message_type", "audio");

		try {
			if (!navigator.onLine) throw new Error("Offline");
			await api.post("/messages", formData);
		} catch (error) {
			console.error("Failed to send voice message:", error);
			if (
				!navigator.onLine ||
				(error as any)?.message === "Offline" ||
				(error as any)?.code === "ERR_NETWORK"
			) {
				try {
					const token = localStorage.getItem("fwber_token");
					if (token) {
						await storeOfflineChatMessage({
							uuid: uuidv4(),
							recipient_id: recipientId,
							content: "[Voice Message]",
							type: "audio",
							is_encrypted: isE2EReady,
							created_at: new Date().toISOString(),
						});
						if ("serviceWorker" in navigator && "SyncManager" in window) {
							const registration = await navigator.serviceWorker.ready;
							await (registration as any).sync.register("chat-message");
						}
						showSuccess(
							"Saved Offline",
							"Voice message will be sent when online",
						);
					}
				} catch (storeErr) {
					console.error("Failed to store offline voice message:", storeErr);
					showError("Error", "Failed to save voice message offline");
				}
			} else {
				showError("Error", "Failed to send voice message");
			}
		}
	};

	const handleReaction = async (messageId: string, emoji: string) => {
		try {
			await api.post(`/messages/${messageId}/react`, { emoji });
		} catch (err) {
			console.error("Failed to react", err);
		}
	};

	const atmosphereStyles: Record<string, string> = {
		standard: "bg-gray-800",
		calm: "bg-slate-800/90 backdrop-blur-sm",
		electric: "bg-indigo-900/40 shadow-[inset_0_0_50px_rgba(79,70,229,0.2)]",
		warm: "bg-orange-900/20 shadow-[inset_0_0_50px_rgba(245,158,11,0.1)]",
		contemplative: "bg-zinc-900/80 grayscale-[20%]",
		noir: "bg-black/90 grayscale contrast-125",
		moody: "bg-purple-950/30 backdrop-blur-md",
		shadowy: "bg-stone-950/90 transition-opacity duration-1000"
	};

	return (
		<div className={cn(
			"flex flex-col h-full rounded-lg transition-all duration-1000",
			atmosphereStyles[atmosphere] || atmosphereStyles.standard,
			className
		)}>
			<div className="flex items-center justify-between p-4 border-b border-gray-700">
				<div
					className="flex items-center space-x-3 cursor-pointer"
					onClick={onProfileView}
				>
					<div className="relative">
						<EvolvingAvatar
							src={recipientAvatar || "/placeholder-avatar.png"}
							alt={recipientName}
							size="md"
							emotion={recipientEmotion || "neutral"}
						/>
					</div>
					<div>
						<h3 className="text-white font-semibold flex items-center gap-2 hover:underline">
							{recipientName}
							{isE2EReady && (
								<span title="End-to-End Encrypted">
									<Lock className="w-3 h-3 text-green-400" />
								</span>
							)}
						</h3>
						<PresenceIndicator
							status={recipientStatus}
							lastSeen={recipientUser?.last_seen}
							showLabel
						/>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					<ErrorBoundary>
						<DatePlanner
							matchId={recipientId}
							matchName={recipientName}
							open={isDatePlannerOpen}
							onOpenChange={setIsDatePlannerOpen}
						/>
					</ErrorBoundary>

					<button
						onClick={onLocate}
						className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-purple-400 transition-colors"
						title="Locate Match (AR)"
					>
						<Zap className="w-5 h-5" />
					</button>

					{onVideoCall && (
						<button
							onClick={onVideoCall}
							className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-blue-400 transition-colors"
							title="Video Call"
						>
							<Video className="w-5 h-5" />
						</button>
					)}

					<button
						onClick={() => setIsGiftModalOpen(true)}
						className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-pink-400 transition-colors"
						title="Send Gift"
					>
						<GiftIcon className="w-5 h-5" />
					</button>

					<TipButton
						recipientId={parseInt(recipientId)}
						recipientName={recipientName}
						compact
					/>

					<WingmanDashboardModal
						matchId={recipientId}
						matchName={recipientName}
					/>

					<Popover>
						<PopoverTrigger asChild>
							<button
								className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-purple-400 transition-colors"
								title="Shared Experiences"
							>
								<BookOpen className="w-5 h-5" />
							</button>
						</PopoverTrigger>
						<PopoverContent className="w-56 bg-gray-900 border-gray-700 text-white p-2">
							<div className="space-y-1">
								<button
									onClick={() =>
										router.push(`/ice-breakers?match=${recipientId}`)
									}
									className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800 rounded-md transition-colors text-sm"
								>
									<Sparkles className="h-4 w-4 text-yellow-400" />
									<span>Play Ice Breakers</span>
								</button>
								<button
									onClick={() => router.push(`/scrapbook?match=${recipientId}`)}
									className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800 rounded-md transition-colors text-sm"
								>
									<MessageSquareQuote className="h-4 w-4 text-purple-400" />
									<span>Shared Scrapbook</span>
								</button>
							</div>
						</PopoverContent>
					</Popover>

					<Dialog>
						<DialogTrigger asChild>
							<button
								className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-yellow-400 transition-colors"
								title="View Match Insights"
							>
								<Sparkles className="w-5 h-5" />
							</button>
						</DialogTrigger>
						<DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
							<MatchInsights matchId={recipientId} />
						</DialogContent>
					</Dialog>

					{onRateDate && (
						<button
							onClick={onRateDate}
							className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-green-400 transition-colors"
							title="Rate Date Feedback"
						>
							<Star className="w-5 h-5" />
						</button>
					)}

					<div className="relative">
						<button
							onClick={() => setShowSafetyMenu(!showSafetyMenu)}
							className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
							title="Options"
						>
							<MoreVertical className="w-5 h-5" />
						</button>
						{showSafetyMenu && (
							<div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 dark:bg-gray-700 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700 dark:border-gray-600">
								<div className="py-1">
									{onReport && (
										<button
											onClick={() => {
												onReport();
												setShowSafetyMenu(false);
											}}
											className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 dark:text-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-600"
										>
											Report User
										</button>
									)}
									{onBlock && (
										<button
											onClick={() => {
												onBlock();
												setShowSafetyMenu(false);
											}}
											className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-600"
										>
											Block User
										</button>
									)}
								</div>
							</div>
						)}
					</div>

					{recipientTyping && (
						<div className="flex items-center space-x-1 text-gray-400 text-sm">
							<div className="flex space-x-1">
								<div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
								<div
									className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: "0.1s" }}
								></div>
								<div
									className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: "0.2s" }}
								></div>
							</div>
							<span>typing...</span>
						</div>
					)}
				</div>
			</div>

			<TierUnlockGuide matchId={recipientId} />

			<AnimatePresence>
				{activeNudge && (
					<motion.div
						initial={{ opacity: 0, y: -20, height: 0 }}
						animate={{ opacity: 1, y: 0, height: "auto" }}
						exit={{ opacity: 0, scale: 0.95, height: 0 }}
						className="px-4 pt-2 -mb-2 z-10"
					>
						<div className="bg-gradient-to-r from-red-900/40 to-pink-900/40 border border-red-500/30 rounded-lg p-3 flex gap-3 items-start shadow-xl backdrop-blur-sm">
							<div className="p-2 bg-red-500/20 rounded-full text-pink-400 shrink-0">
								<Sparkles className="h-5 w-5" />
							</div>
							<div className="flex-1 min-w-0">
								<h4 className="text-red-400 font-semibold text-sm flex items-center justify-between">
									Wingman Suggestion
									<button
										onClick={() => setActiveNudge(null)}
										className="text-gray-400 hover:text-white transition-colors p-1"
									>
										<X className="h-3 w-3" />
									</button>
								</h4>
								<p className="text-gray-200 text-sm mt-1 leading-snug">
									{activeNudge.nudge?.message ||
										activeNudge.message ||
										"Consider asking them out!"}
								</p>
								{activeNudge.nudge?.action_label && (
									<Button
										size="sm"
										className="mt-2 bg-red-600 hover:bg-red-700 text-xs h-7"
										onClick={() => {
											const type = activeNudge.nudge?.type;
											if (type === "ice_breaker")
												router.push(`/ice-breakers?match=${recipientId}`);
											else if (type === "scrapbook")
												router.push(`/scrapbook?match=${recipientId}`);
											else if (type === "ask_out") setIsDatePlannerOpen(true);
											setActiveNudge(null);
										}}
									>
										{activeNudge.nudge.action_label}
									</Button>
								)}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{((messages || []) as ChatMessage[]).length === 0 ? (
					<div className="text-center text-gray-400 py-8">
						<p>No messages yet. Start a conversation!</p>
						{isE2EReady && (
							<p className="text-xs text-green-500 mt-2 flex items-center justify-center gap-1">
								<Lock className="w-3 h-3" /> Messages are end-to-end encrypted
							</p>
						)}
					</div>
				) : (
					(Array.isArray(messages) ? messages : []).map((msg, index) => {
						const isOwnMessage = msg.from_user_id === user?.id;
						const content = msg.message?.content || msg.content || "";
						const messageType = msg.message_type || msg.message?.type || "text";
						const mediaUrl = msg.media_url;

						return (
							<div
								key={msg.message_id || msg.id || index}
								className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
							>
								<div
									className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
										isOwnMessage
											? "bg-red-600 text-white"
											: "bg-gray-700 text-white"
									}`}
								>
									{mediaUrl && (
										<div className="mb-2">
											{messageType === "image" ? (
												<Image
													src={
														mediaUrl.startsWith("http")
															? mediaUrl
															: `${BACKEND_URL}${mediaUrl}`
													}
													alt="Attachment"
													width={200}
													height={200}
													className="w-full h-auto rounded-lg"
													loading="lazy"
												/>
											) : messageType === "video" ? (
												<video
													src={
														mediaUrl.startsWith("http")
															? mediaUrl
															: `${BACKEND_URL}${mediaUrl}`
													}
													controls
													className="max-w-full rounded-lg"
												/>
											) : messageType === "audio" ? (
												<div className="flex flex-col gap-1 min-w-[200px]">
													<audio
														controls
														src={
															mediaUrl.startsWith("http")
																? mediaUrl
																: `${BACKEND_URL}${mediaUrl}`
														}
														className="w-full h-8"
													/>
													<div className="flex justify-between items-center">
														{msg.media_duration && (
															<span className="text-xs opacity-75">
																{msg.media_duration}s
															</span>
														)}
													</div>
													{msg.transcription && (
														<div className="mt-1 p-2 bg-black/20 rounded text-sm italic text-gray-200">
															&quot;{msg.transcription}&quot;
														</div>
													)}
												</div>
											) : (
												<a
													href={
														mediaUrl.startsWith("http")
															? mediaUrl
															: `${BACKEND_URL}${mediaUrl}`
													}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center gap-2 underline text-white"
												>
													<Paperclip className="h-4 w-4" />
													Download File
												</a>
											)}
										</div>
									)}

									{!mediaUrl && messageType === "text" && (
										<EncryptedMessageContent
											content={content}
											senderId={parseInt(msg.from_user_id || "0")}
											isOwnMessage={isOwnMessage}
										/>
									)}

									{mediaUrl && content && (
										<p className="text-sm mt-1">{content}</p>
									)}

									<MessageMetadata
										timestamp={msg.timestamp}
										status={msg.status}
										isOwnMessage={isOwnMessage}
										className="mt-1"
									/>
								</div>

								<div className="flex gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity">
									<button
										onClick={() =>
											handleReaction(
												String(msg.message_id || msg.id || ""),
												"👍",
											)
										}
										className="hover:scale-110 transition-transform"
										title="Like"
									>
										<ThumbsUp className="w-3 h-3 text-gray-400 hover:text-blue-400" />
									</button>
									<button
										onClick={() =>
											handleReaction(
												String(msg.message_id || msg.id || ""),
												"❤️",
											)
										}
										className="hover:scale-110 transition-transform"
										title="Love"
									>
										<Heart className="w-3 h-3 text-gray-400 hover:text-pink-500" />
									</button>
									<button
										onClick={() =>
											handleReaction(
												String(msg.message_id || msg.id || ""),
												"😂",
											)
										}
										className="hover:scale-110 transition-transform"
										title="Haha"
									>
										<Laugh className="w-3 h-3 text-gray-400 hover:text-yellow-400" />
									</button>
								</div>

								{Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
									<div className="flex gap-1 mt-1 -translate-y-2 translate-x-2">
										{msg.reactions.map((r: any, i: number) => (
												<span
													key={i}
													className="bg-gray-800 border border-gray-600 rounded-full px-1 text-xs"
													title={r.user_name}
												>
													{r.emoji}
												</span>
											))}
									</div>
								)}
							</div>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>

			<div className="p-4 border-t border-gray-700">
				<div className="mb-2">
					<WingmanSuggestions
						matchId={recipientId}
						onSelectSuggestion={(suggestion) => {
							setMessage(suggestion);
							handleTypingChange(suggestion);
						}}
						mode={
							((messages || []) as ChatMessage[]).length === 0
								? "ice-breaker"
								: "reply"
						}
					/>
				</div>

				{selectedFile && (
					<div className="mb-2 px-3 py-1 bg-gray-700 rounded flex justify-between items-center">
						<span className="text-sm text-gray-300 truncate max-w-xs">
							{selectedFile.name}
						</span>
						<button
							onClick={() => {
								setSelectedFile(null);
								if (fileInputRef.current) fileInputRef.current.value = "";
							}}
							className="text-gray-400 hover:text-red-400"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				)}

				<form
					onSubmit={handleSendMessage}
					className="flex space-x-2 items-center"
				>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
						title="Attach file"
					>
						<Paperclip className="w-5 h-5" />
					</button>
					<input
						type="file"
						ref={fileInputRef}
						onChange={handleFileSelect}
						className="hidden"
						accept="image/*,video/*,audio/*"
					/>

					<AudioRecorder
						onRecordingComplete={handleVoiceMessage}
						onRecordingStateChange={setIsRecordingVoice}
						isSending={isSending}
					/>

					{!isRecordingVoice && (
						<>
							<div className="flex-1 relative">
								<input
									type="text"
									value={message}
									onChange={handleMessageChange}
									placeholder={
										isE2EReady
											? "Type an encrypted message..."
											: "Type a message..."
									}
									className="w-full bg-gray-700 text-white px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
									disabled={isSending}
								/>
								<div className="absolute right-2 top-1/2 transform -translate-y-1/2">
									<ConversationCoach
										matchId={recipientId}
										draft={message}
										onApplySuggestion={(suggestion) => {
											setMessage(suggestion);
											handleTypingChange(suggestion);
										}}
									/>
								</div>
							</div>
							<button
								type="submit"
								disabled={(!message.trim() && !selectedFile) || isSending}
								className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
							>
								{isSending ? (
									<Loader2 className="w-5 h-5 animate-spin" />
								) : (
									"Send"
								)}
							</button>
						</>
					)}
				</form>
			</div>

			<GiftShopModal
				isOpen={isGiftModalOpen}
				onClose={() => setIsGiftModalOpen(false)}
				receiverId={parseInt(recipientId)}
				receiverName={recipientName}
			/>
		</div>
	);
}

export function ChatList({ className = "" }: { className?: string }) {
	const { chatMessages, onlineUsers } = useWebSocketChat();
	const conversations = (Array.isArray(chatMessages) ? chatMessages : []).reduce<
		Record<string, ChatMessage[]>
	>((acc, msg) => {
		const otherUserId = msg.from_user_id || msg.to_user_id || "";
		if (otherUserId) {
			if (!acc[otherUserId]) {
				acc[otherUserId] = [];
			}
			acc[otherUserId].push(msg);
		}
		return acc;
	}, {});

	return (
		<div className={`bg-gray-800 rounded-lg ${className}`}>
			<div className="p-4 border-b border-gray-700">
				<h3 className="text-white font-semibold">Active Conversations</h3>
			</div>

			<div className="divide-y divide-gray-700">
				{Object.entries(conversations).map(([userId, messages]) => {
					if (!Array.isArray(messages) || messages.length === 0) return null;
					const lastMessage = messages[messages.length - 1];
					const isOnline = (Array.isArray(onlineUsers) ? onlineUsers : []).some(
						(user) => user && String(user.user_id) === String(userId),
					);

					return (
						<div
							key={userId}
							className="p-4 hover:bg-gray-700 cursor-pointer transition-colors"
						>
							<div className="flex items-center space-x-3">
								<div className="relative">
									<div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
										<span className="text-white font-bold">
											{userId.charAt(0).toUpperCase()}
										</span>
									</div>
									{isOnline && (
										<div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
									)}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-white font-medium truncate">
										User {userId}
									</p>
									<p className="text-gray-400 text-sm truncate">
										{lastMessage?.message?.content || lastMessage?.content}
									</p>
								</div>
								<div className="text-gray-400 text-xs">
									{lastMessage?.timestamp ? new Date(lastMessage.timestamp).toLocaleTimeString() : ''}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function OnlineUsers({ className = "" }: { className?: string }) {
	const { onlineUsers } = useWebSocketChat();

	return (
		<div className={`bg-gray-800 rounded-lg ${className}`}>
			<div className="p-4 border-b border-gray-700">
				<h3 className="text-white font-semibold">
					Online Users ({(Array.isArray(onlineUsers) ? onlineUsers : []).length})
				</h3>
			</div>

			<div className="p-4 space-y-3">
				{(!Array.isArray(onlineUsers) || onlineUsers.length === 0) ? (
					<p className="text-gray-400 text-center py-4">No users online</p>
				) : (
					onlineUsers.map((user) => (
						<div key={user?.user_id || 'unknown'} className="flex items-center space-x-3">
							<div className="relative">
								<div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
									<span className="text-white text-sm font-bold">
										{user?.user_id?.charAt(0).toUpperCase() || '?'}
									</span>
								</div>
								<div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
							</div>
							<div className="flex-1">
								<p className="text-white text-sm">User {user?.user_id || 'Unknown'}</p>
								<p className="text-gray-400 text-xs capitalize">
									{user?.status || 'offline'}
								</p>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
