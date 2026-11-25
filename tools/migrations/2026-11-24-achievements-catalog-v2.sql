-- Achievements catalog v2 (gamification expansion, v2.3.118).
-- The code catalog in fwber-backend-ts/src/lib/achievements.ts is the
-- source of truth and is mirrored into this table at runtime by
-- ensureAchievementCatalog(); this migration backfills the 15 new
-- tiered achievements for environments that inspect data via SQL.
-- Idempotent: safe to re-run (slug is UNIQUE).

INSERT INTO achievements (slug, name, description, icon, token_reward, criteria) VALUES
  ('profile_perfect',    'Open Book: Final Chapter', 'Complete 100% of your profile',        '🏅', 50,  JSON_OBJECT('metric','profile_pct','target',100,'category','Profile')),
  ('photo_5',            'Gallery Curator',          'Upload 5 photos',                      '🖼️', 30,  JSON_OBJECT('metric','photos','target',5,'category','Profile')),
  ('twentyfive_matches', 'Quarter Century Club',     'Make 25 matches',                      '🎯', 100, JSON_OBJECT('metric','matches','target',25,'category','Matches')),
  ('chatter_25',         'Smooth Talker',            'Send 25 messages',                     '🗣️', 25,  JSON_OBJECT('metric','messages','target',25,'category','Conversation')),
  ('chatter_100',        'Centurion of Chat',        'Send 100 messages',                    '💯', 75,  JSON_OBJECT('metric','messages','target',100,'category','Conversation')),
  ('gift_sent_20',       'Secret Santa',             'Send 20 gifts',                        '🎅', 75,  JSON_OBJECT('metric','gifts_sent','target',20,'category','Generosity')),
  ('friend_5',           'Inner Circle',             'Connect with 5 friends',               '⭕', 25,  JSON_OBJECT('metric','friends','target',5,'category','Social')),
  ('friend_20',          'Social Butterfly',         'Connect with 20 friends',              '🦋', 75,  JSON_OBJECT('metric','friends','target',20,'category','Social')),
  ('journal_5',          'Chronicler',               'Write 5 journal entries',              '📚', 25,  JSON_OBJECT('metric','journal_entries','target',5,'category','Journal')),
  ('journal_20',         'Memoirist',                'Write 20 journal entries',             '✒️', 60,  JSON_OBJECT('metric','journal_entries','target',20,'category','Journal')),
  ('quest_1',            'Quest Accepted',           'Complete your first quest',            '🗺️', 15,  JSON_OBJECT('metric','quests_completed','target',1,'category','Quests')),
  ('quest_5',            'Quest Master',             'Complete 5 quests',                    '⚔️', 50,  JSON_OBJECT('metric','quests_completed','target',5,'category','Quests')),
  ('answers_10',         'Getting Personal',         'Answer 10 matching questions',       '❓', 15,  JSON_OBJECT('metric','matching_answers','target',10,'category','Matching')),
  ('answers_50',         'Deep Diver',               'Answer 50 matching questions',         '🤿', 40,  JSON_OBJECT('metric','matching_answers','target',50,'category','Matching')),
  ('answers_105',        'Full Disclosure',          'Answer all 105 matching questions',    '🔓', 100, JSON_OBJECT('metric','matching_answers','target',105,'category','Matching'))
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  icon = VALUES(icon),
  token_reward = VALUES(token_reward),
  criteria = VALUES(criteria);
