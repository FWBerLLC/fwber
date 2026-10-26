import prisma from "../lib/prisma.js";
import OpenAI from "openai";
import { getLocalLlm, localLlmModel } from "../lib/ai-local.js";

/**
 * NarrativeService
 *
 * Generates AI-powered compatibility reports based on shared and differing matching answers.
 */
export class NarrativeService {
	private openai: OpenAI | null = null;
	// True when the client is bound to the local Ollama model (no cloud key) —
	// request models must use the local tag in that case (v2.3.42).
	private usingLocal = false;

	constructor() {
		if (
			process.env.OPENAI_API_KEY &&
			process.env.OPENAI_API_KEY !== "mock-key"
		) {
			this.openai = new OpenAI({
				apiKey: process.env.OPENAI_API_KEY,
			});
		} else {
			// v2.3.42: fall back to the shared on-box LLM so narrative reports
			// still work with no cloud keys (see lib/ai-local.ts).
			this.openai = getLocalLlm();
			this.usingLocal = Boolean(this.openai);
		}
	}

	/**
	 * Generates a narrative report for the compatibility between two users.
	 */
	async generateNarrative(userId: bigint, targetId: bigint): Promise<string> {
		try {
			// 1. Fetch answers for both users
			const userAnswers = await prisma.user_matching_answers.findMany({
				where: { user_id: userId },
				include: { matching_questions: true, chosen_option: true },
			});

			const targetAnswers = await prisma.user_matching_answers.findMany({
				where: { user_id: targetId },
				include: { matching_questions: true, chosen_option: true },
			});

			if (userAnswers.length === 0 || targetAnswers.length === 0) {
				return "Not enough data to generate a narrative report. Answer more matching questions!";
			}

			// 2. Identify commonalities and differences
			const commonalities: string[] = [];
			const differences: string[] = [];

			for (const ua of userAnswers) {
				const uaAny = ua as any;
				const ta = targetAnswers.find((a) => a.question_id === ua.question_id);
				if (ta) {
					const questionText = uaAny.matching_questions?.text ?? "";
					const userOption = uaAny.chosen_option?.text ?? "";
					const targetOption = (ta as any).chosen_option?.text ?? "";

					if (ua.chosen_option_id === ta.chosen_option_id) {
						commonalities.push(
							`Both answered "${userOption}" to "${questionText}"`,
						);
					} else {
						differences.push(
							`User answered "${userOption}" while Target answered "${targetOption}" to "${questionText}"`,
						);
					}
				}
			}

			// 3. Construct prompt for AI
			const prompt = `
        You are an expert compatibility analyst in a "Cyber-Noir" world.
        Analyze the following matching data for two users and write a concise, atmospheric compatibility report (max 150 words).
        Focus on their shared values and notable differences. Use a mysterious, slightly cynical, yet insightful tone.

        Commonalities:
        ${commonalities.slice(0, 5).join("\n")}

        Differences:
        ${differences.slice(0, 5).join("\n")}

        Final Analysis:
      `;

			if (!this.openai) {
				// Fallback if no OpenAI key
				return `Atmospheric Analysis: You share ${commonalities.length} key values including ${commonalities[0] ? commonalities[0].split('"')[1] : "core ethics"}. However, you differ on ${differences.length} points. In this neon-lit void, you might just find a signal in the noise.`;
			}

			const response = await this.openai.chat.completions.create({
				model: this.usingLocal ? localLlmModel() : "gpt-3.5-turbo",
				messages: [
					{
						role: "system",
						content: "You are a Cyber-Noir compatibility analyst.",
					},
					{ role: "user", content: prompt },
				],
				max_tokens: 250,
			});

			const content = response.choices?.[0]?.message?.content;
			return content || "The AI is silent. The void remains.";
		} catch (error: any) {
			console.error("[NarrativeService] Error:", error.message);
			return "The connection is flickering. Narrative unavailable.";
		}
	}
}
