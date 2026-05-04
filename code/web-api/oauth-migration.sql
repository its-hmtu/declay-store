-- Migration script to add OAuth support to users table
-- Run this script to add google_id and auth_provider columns

-- Add google_id column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Add auth_provider column (ENUM)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50);

-- Set default value for existing records
UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL;

-- Make password nullable for OAuth users
ALTER TABLE users
ALTER COLUMN password DROP NOT NULL;

-- Create index on google_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
