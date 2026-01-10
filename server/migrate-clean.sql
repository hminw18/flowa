-- Clean up old schema and ensure new schema is correct

-- Drop old columns from messages table if they exist
ALTER TABLE messages DROP COLUMN IF EXISTS translation_status;
ALTER TABLE messages DROP COLUMN IF EXISTS translated_text;
ALTER TABLE messages DROP COLUMN IF EXISTS highlight_start;
ALTER TABLE messages DROP COLUMN IF EXISTS highlight_end;

-- Ensure original_language column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'original_language'
  ) THEN
    ALTER TABLE messages ADD COLUMN original_language text;
  END IF;
END $$;

-- Update all existing messages to have a default language if null
UPDATE messages SET original_language = 'ko' WHERE original_language IS NULL;

-- Now make original_language NOT NULL
ALTER TABLE messages ALTER COLUMN original_language SET NOT NULL;

-- Ensure users table has language columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'native_language'
  ) THEN
    ALTER TABLE users ADD COLUMN native_language text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'learning_language'
  ) THEN
    ALTER TABLE users ADD COLUMN learning_language text;
  END IF;
END $$;

-- Update all existing users to have default languages if null
UPDATE users SET native_language = 'ko' WHERE native_language IS NULL;
UPDATE users SET learning_language = 'en' WHERE learning_language IS NULL;

-- Now make language columns NOT NULL
ALTER TABLE users ALTER COLUMN native_language SET NOT NULL;
ALTER TABLE users ALTER COLUMN learning_language SET NOT NULL;

-- Ensure translations table exists
CREATE TABLE IF NOT EXISTS translations (
  message_id text NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
  target_language text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, target_language)
);

CREATE INDEX IF NOT EXISTS translations_message_idx ON translations (message_id);

-- Drop old translation_opens table if it exists
DROP TABLE IF EXISTS translation_opens;
