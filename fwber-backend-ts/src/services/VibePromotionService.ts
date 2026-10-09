import prisma from '../lib/prisma.js';
import { generateText } from '../lib/wingman-ai.js';
import { SentimentAnalysisService } from './SentimentAnalysisService.js';
import { AutonomousService } from './AutonomousService.js';

export class VibePromotionService {
  /**
   * Autonomously generates a vibe-matched quest based on neighborhood sentiment.
   */
  static async generateContextualQuest(lat: number, lng: number) {
    try {
      const sentiment = await SentimentAnalysisService.analyzeNeighborhoodSentiment(lat, lng);

      const prompt = `
        Based on the current neighborhood vibe: "${sentiment.vibe}", and keywords: [${sentiment.keywords.join(', ')}].
        Generate a community quest for a local social app.
        Return a JSON object with:
        - title: The title of the quest.
        - description: A short description of the quest.
        - token_reward: An integer between 10 and 50 representing the reward.
        - target_vibe: The emotion this quest is targeting (e.g., 'excited', 'thoughtful', 'happy', 'cynical', 'mysterious', 'melancholic').
      `;

      const response = await generateText(prompt, '', 0.7);

      let questData: any;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          questData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('[VibePromotionService] Failed to parse AI generated quest JSON');
      }

      if (!questData) {
        questData = {
          title: `Explore the ${sentiment.vibe} neighborhood`,
          description: `The neighborhood is feeling ${sentiment.vibe}. Get out there and explore!`,
          token_reward: 20,
          target_vibe: 'neutral'
        };
      }

      // `type` is required by the quests schema and distinguishes quest sources;
      // these are always sentiment-derived, so they are 'vibe_action'.
      const newQuest = await prisma.quests.create({
        data: {
          title: questData.title,
          description: questData.description,
          type: 'vibe_action',
          target_vibe: questData.target_vibe || 'neutral',
          token_reward: Number(questData.token_reward),
          is_active: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
        }
      });

      await AutonomousService.logAction('Vibe Quest Generated', 'Completed', {
        questId: newQuest.id.toString(),
        vibe: sentiment.vibe
      });

      // Surface the matched vibe alongside the row so callers can explain why
      // this quest was chosen without re-querying sentiment.
      return { ...newQuest, ai_vibe_match: true, target_vibe: questData.target_vibe || 'neutral' };

    } catch (err: any) {
      console.error('[VibePromotionService] Error generating quest:', err.message);
      return null;
    }
  }
}
