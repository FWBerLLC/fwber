import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';

// Matching answer flow: POST /matching/answer upserts and GET /questions
// embeds the caller's answers. (The created_at null-constraint 500 that
// broke this on prod was a schema-default defect, fixed in the model +
// tools/migrations/2026-11-17-matching-answers-timestamps.sql; here we
// pin the route contract the frontend actually uses.)

(BigInt.prototype as any).toJSON = function () { return Number(this); };

let answers: any[] = [];
const mockUpsert = jest.fn(async (args: any) => {
  const key = `${args.where.user_id_question_id.user_id}:${args.where.user_id_question_id.question_id}`;
  const existing = answers.find((a) => a.key === key);
  if (existing) { Object.assign(existing, args.update); return existing; }
  const row = { id: 1n, key, ...args.create };
  answers.push(row);
  return row;
});

jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    matching_questions: {
      findMany: jest.fn(async () => [{
        id: 26n, text: 'Q?', category: 'lifestyle', priority: 1,
        matching_options: [{ id: 46n, text: 'Yes' }, { id: 47n, text: 'No' }],
        user_matching_answers: answers.map((a) => ({
          chosen_option_id: a.chosen_option_id, accepted_option_ids: a.accepted_option_ids,
          importance: a.importance, explanation: a.explanation,
        })),
      }]),
    },
    user_matching_answers: { upsert: mockUpsert },
    matches: { findMany: jest.fn(async () => []) },
  },
}));
jest.unstable_mockModule('../src/services/MatchingHeuristicService.js', () => ({
  MatchingHeuristicService: class { async calculateCompatibility() { return 0; } async calculateAuraCompatibility() { return { score: 0, mood: 'neutral' }; } },
}));
jest.unstable_mockModule('../src/services/NarrativeService.js', () => ({
  NarrativeService: class { async generateNarrative() { return ''; } },
}));
jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.user = { id: 42 }; next(); },
}));

const { default: matchingRoutes } = await import('../src/routes/matching.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/matching', matchingRoutes);
  return app;
}

describe('matching answers', () => {
  beforeEach(() => { answers = []; mockUpsert.mockClear(); });

  it('accepts an answer and embeds it on question re-read', async () => {
    const post = await request(buildApp())
      .post('/api/matching/answer')
      .send({ question_id: '26', chosen_option_id: '46', accepted_option_ids: ['46'], importance: 1 });
    expect(post.status).toBe(200);
    expect(post.body.success).toBe(true);

    const list = await request(buildApp()).get('/api/matching/questions');
    expect(list.status).toBe(200);
    expect(list.body[0].answer.chosen_option_id).toBe('46');
  });

  it('upserts (re-answer updates in place, still one row)', async () => {
    await request(buildApp()).post('/api/matching/answer').send({ question_id: '26', chosen_option_id: '46', importance: 1 });
    await request(buildApp()).post('/api/matching/answer').send({ question_id: '26', chosen_option_id: '47', importance: 2 });
    expect(answers).toHaveLength(1);
    expect(answers[0].chosen_option_id).toBe(47n);
  });
});
