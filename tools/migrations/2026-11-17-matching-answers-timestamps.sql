-- Matching answers timestamp defaults (v2.3.114).
-- user_matching_answers.created_at is NOT NULL without a DB default and
-- the Prisma model carried no @default either, so every
-- POST /api/matching/answer died on a null-constraint 500 — the whole
-- OkCupid matching engine could not record a single answer.
-- Prisma now supplies the values (@default(now()) / @updatedAt); this
-- ALTER gives the table its own defaults as defense in depth.
ALTER TABLE user_matching_answers
  MODIFY created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  MODIFY updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
