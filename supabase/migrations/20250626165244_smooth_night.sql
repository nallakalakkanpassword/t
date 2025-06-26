/*
  # Royal Cats T - Initial Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `balance` (numeric)
      - `created_at` (timestamp)
    
    - `groups`
      - `id` (uuid, primary key)
      - `name` (text)
      - `members` (text array)
      - `created_by` (text)
      - `created_at` (timestamp)
    
    - `messages`
      - `id` (uuid, primary key)
      - `sender` (text)
      - `recipient` (text, nullable)
      - `group_id` (uuid, nullable)
      - `content` (text)
      - `timestamp` (timestamp)
      - `attached_coins` (jsonb)
      - `two_letters` (jsonb)
      - `likes` (text array)
      - `dislikes` (text array)
      - `timer` (integer)
      - `timer_started` (timestamp)
      - `like_dislike_timer` (integer)
      - `like_dislike_timer_started` (timestamp)
      - `percentage` (numeric, nullable)
      - `reviewers` (text array)
      - `reviewer_actions` (jsonb)
      - `reviewer_timer` (integer, nullable)
      - `current_reviewer_index` (integer)
      - `reviewer_timers` (jsonb)
      - `is_timer_expired` (boolean)
      - `is_like_dislike_timer_expired` (boolean)
      - `coin_attachment_mode` (text)
      - `game_result` (jsonb, nullable)
      - `user_percentages` (jsonb)
      - `reviewer_permissions` (jsonb)
      - `is_public` (boolean)
      - `forwarded_from` (uuid, nullable)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `from_user` (text)
      - `to_user` (text)
      - `amount` (numeric)
      - `timestamp` (timestamp)
      - `type` (text)
    
    - `public_messages`
      - `id` (uuid, primary key)
      - `message_id` (uuid)
      - `made_public_by` (text)
      - `made_public_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  balance numeric DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  members text[] NOT NULL DEFAULT '{}',
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender text NOT NULL,
  recipient text,
  group_id uuid REFERENCES groups(id),
  content text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  attached_coins jsonb DEFAULT '{}',
  two_letters jsonb DEFAULT '{}',
  likes text[] DEFAULT '{}',
  dislikes text[] DEFAULT '{}',
  timer integer DEFAULT 5,
  timer_started timestamptz DEFAULT now(),
  like_dislike_timer integer DEFAULT 3,
  like_dislike_timer_started timestamptz DEFAULT now(),
  percentage numeric,
  reviewers text[] DEFAULT '{}',
  reviewer_actions jsonb DEFAULT '{}',
  reviewer_timer integer,
  current_reviewer_index integer DEFAULT 0,
  reviewer_timers jsonb DEFAULT '[]',
  is_timer_expired boolean DEFAULT false,
  is_like_dislike_timer_expired boolean DEFAULT false,
  coin_attachment_mode text DEFAULT 'different',
  game_result jsonb,
  user_percentages jsonb DEFAULT '{}',
  reviewer_permissions jsonb DEFAULT '{}',
  is_public boolean DEFAULT false,
  forwarded_from uuid REFERENCES messages(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user text NOT NULL,
  to_user text NOT NULL,
  amount numeric NOT NULL,
  timestamp timestamptz DEFAULT now(),
  type text NOT NULL
);

-- Public messages table
CREATE TABLE IF NOT EXISTS public_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id),
  made_public_by text NOT NULL,
  made_public_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (username = current_setting('app.current_user', true));

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (username = current_setting('app.current_user', true));

-- Groups policies
CREATE POLICY "Users can read groups they belong to"
  ON groups
  FOR SELECT
  TO authenticated
  USING (current_setting('app.current_user', true) = ANY(members));

CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = current_setting('app.current_user', true));

CREATE POLICY "Group creators can update groups"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (created_by = current_setting('app.current_user', true));

-- Messages policies
CREATE POLICY "Users can read their messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    sender = current_setting('app.current_user', true) OR
    recipient = current_setting('app.current_user', true) OR
    current_setting('app.current_user', true) = ANY(reviewers) OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = messages.group_id 
      AND current_setting('app.current_user', true) = ANY(groups.members)
    ))
  );

CREATE POLICY "Users can create messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender = current_setting('app.current_user', true));

CREATE POLICY "Users can update their messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    sender = current_setting('app.current_user', true) OR
    recipient = current_setting('app.current_user', true) OR
    current_setting('app.current_user', true) = ANY(reviewers) OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = messages.group_id 
      AND current_setting('app.current_user', true) = ANY(groups.members)
    ))
  );

-- Transactions policies
CREATE POLICY "Users can read their transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    from_user = current_setting('app.current_user', true) OR
    to_user = current_setting('app.current_user', true)
  );

CREATE POLICY "Users can create transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (from_user = current_setting('app.current_user', true));

-- Public messages policies
CREATE POLICY "Anyone can read public messages"
  ON public_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can make their messages public"
  ON public_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (made_public_by = current_setting('app.current_user', true));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_users ON transactions(from_user, to_user);
CREATE INDEX IF NOT EXISTS idx_public_messages_message_id ON public_messages(message_id);