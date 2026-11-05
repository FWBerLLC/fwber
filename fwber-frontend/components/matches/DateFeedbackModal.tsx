"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { submitDateFeedback, checkDateFeedback } from "@/lib/api/matches";
import { useToast } from "@/components/ui/use-toast";

interface DateFeedbackModalProps {
    matchId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    otherUserName: string;
}

export function DateFeedbackModal({
    matchId,
    open,
    onOpenChange,
    otherUserName,
}: DateFeedbackModalProps) {
    const { toast } = useToast();
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [feedbackText, setFeedbackText] = useState("");
    const [safetyConcerns, setSafetyConcerns] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alreadySubmitted, setAlreadySubmitted] = useState(false);

    useEffect(() => {
        if (open) {
            // Check if already submitted
            checkDateFeedback(matchId)
                .then((res) => {
                    if (res.submitted) {
                        setAlreadySubmitted(true);
                        setRating(res.feedback?.rating || 0);
                    }
                })
                .catch(() => {
                    // It's a 404 if not submitted, so we ignore
                });
        }
    }, [open, matchId]);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({
                title: "Rating required",
                description: "Please select a star rating first.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await submitDateFeedback(matchId, {
                rating,
                feedback_text: feedbackText,
                safety_concerns: safetyConcerns,
            });

            toast({
                title: "Feedback Submitted",
                description: "Thank you! This helps us improve your future matches.",
            });

            setAlreadySubmitted(true);
            setTimeout(() => onOpenChange(false), 1500);
        } catch (error: any) {
            toast({
                title: "Error submitting feedback",
                description: error.message || "Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Rate Your Date</DialogTitle>
                    <DialogDescription>
                        How was your meetup with {otherUserName}? This helps us optimize your future Chemistry Scores.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex flex-col items-center space-y-2">
                        <span className="text-sm font-medium text-muted-foreground">Overall Vibe</span>
                        <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button type="button"
                                    key={star}
                                    onClick={() => !alreadySubmitted && setRating(star)}
                                    onMouseEnter={() => !alreadySubmitted && setHoverRating(star)}
                                    className="transition-colors focus:outline-none disabled:cursor-not-allowed"
                                    disabled={alreadySubmitted}
                                >
                                    <Star
                                        className={`h-8 w-8 ${(hoverRating || rating) >= star
                                                ? "fill-primary text-primary"
                                                : "text-muted"
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="feedback">Private Notes (Optional)</Label>
                        <Textarea
                            id="feedback"
                            placeholder="Any specific traits you enjoyed or disliked?"
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            disabled={alreadySubmitted}
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base text-destructive">Safety Concerns</Label>
                            <p className="text-sm text-muted-foreground">
                                Flag this if they made you feel unsafe.
                            </p>
                        </div>
                        <Switch
                            checked={safetyConcerns}
                            onCheckedChange={setSafetyConcerns}
                            disabled={alreadySubmitted}
                            className="data-[state=checked]:bg-destructive"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {alreadySubmitted ? "Close" : "Cancel"}
                    </Button>
                    {!alreadySubmitted && (
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Submit Feedback"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
