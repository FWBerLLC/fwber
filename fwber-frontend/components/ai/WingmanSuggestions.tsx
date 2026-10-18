import React from "react";
import { useAiWingman } from "@/lib/hooks/use-ai-wingman";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

interface WingmanSuggestionsProps {
	matchId: string;
	onSelectSuggestion: (text: string) => void;
	mode?: "ice-breaker" | "reply";
}

export function WingmanSuggestions({
	matchId,
	onSelectSuggestion,
	mode = "reply",
}: WingmanSuggestionsProps) {
	const { getIceBreakers, getReplySuggestions, error, setError } =
		useAiWingman();

	const mutation =
		mode === "ice-breaker" ? getIceBreakers : getReplySuggestions;

	const handleGenerate = () => {
		setError(null);
		mutation.mutate(matchId);
	};

	return (
		<Card className="w-full bg-gray-800 border-gray-700">
			<CardHeader className="pb-2 pt-3 px-4">
				<CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
					<Sparkles className="h-4 w-4 text-purple-500" />
					AI Wingman
				</CardTitle>
			</CardHeader>
			<CardContent className="px-4 pb-3 space-y-3">
				{error && (
					<div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50">
						{error}
					</div>
				)}
				{!mutation.data ? (
					<Button
						size="sm"
						variant="secondary"
						className="w-full bg-purple-600 hover:bg-purple-700 text-white border-none"
						onClick={handleGenerate}
						disabled={mutation.isPending}
					>
						{mutation.isPending ? (
							<>
								<Loader2 className="h-3 w-3 animate-spin mr-2" />
								Thinking...
							</>
						) : (
							"Get Suggestions"
						)}
					</Button>
				) : (
					<div className="space-y-2 animate-in fade-in slide-in-from-top-2">
						{Array.isArray(mutation.data?.suggestions) ? (
							mutation.data.suggestions.map((suggestion, idx) => (
								<Button
									key={idx}
									variant="outline"
									className="w-full justify-start text-left h-auto whitespace-normal p-2 text-sm border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
									onClick={() => onSelectSuggestion(suggestion)}
								>
									<span className="line-clamp-2">{suggestion}</span>
								</Button>
							))
						) : (
							<p className="text-xs text-muted-foreground">No suggestions available.</p>
						)}
						<Button
							variant="ghost"
							size="sm"
							className="w-full text-xs text-muted-foreground hover:text-white"
							onClick={handleGenerate}
						>
							Refresh
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
