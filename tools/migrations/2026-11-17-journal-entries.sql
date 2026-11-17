-- Journal entries storage (v2.3.111).
-- The /api/journals router ran raw SQL against this table for months
-- without it ever being created: every create 500'd, every list
-- silently returned []. Idempotent; safe to re-run.
CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NULL,
  content TEXT NOT NULL,
  visibility ENUM('public','friends','circle','private') NOT NULL DEFAULT 'private',
  circle_group_id BIGINT UNSIGNED NULL,
  tags JSON NULL,
  mood_emoji VARCHAR(16) NULL,
  accent_color VARCHAR(32) NULL,
  mood VARCHAR(255) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX journal_entries_user_id_index (user_id),
  CONSTRAINT journal_entries_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
