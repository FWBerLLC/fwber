-- Journal default-visibility persistence (v2.3.112).
-- PUT /settings/privacy/journals previously echoed the request body
-- without persisting anything (and hardcoded circle group 1 on write,
-- swallowed errors). GET derived visibility from journal_circle_group_id
-- alone, so 'friends'/'public' could never survive a re-read.
-- Idempotent: adds the column only when missing.
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_profiles'
    AND COLUMN_NAME = 'journal_default_visibility'
);
SET @ddl := IF(@has_col = 0,
  'ALTER TABLE user_profiles ADD COLUMN journal_default_visibility VARCHAR(16) NULL DEFAULT ''private''',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
