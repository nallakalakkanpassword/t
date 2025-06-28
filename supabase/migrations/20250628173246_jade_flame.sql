/*
  # Fix migration - Add missing policies and tables

  1. New Tables
    - `nano_payments` (if not exists)
      - Payment tracking for nano cryptocurrency
      - Includes request tracking, addresses, amounts, status
  
  2. Security Updates
    - Add public policies for transactions (if not exists)
    - Add public policies for nano_payments
    - Ensure proper indexing for performance

  3. Changes
    - Use IF NOT EXISTS pattern for policies
    - Add comprehensive nano_payments table
    - Add performance indexes
*/

-- Add public policies for transactions (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Allow public insert to transactions'
  ) THEN
    CREATE POLICY "Allow public insert to transactions"
      ON transactions
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Allow public read access to transactions'
  ) THEN
    CREATE POLICY "Allow public read access to transactions"
      ON transactions
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Create nano_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS nano_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text UNIQUE NOT NULL,
  from_address text NOT NULL,
  to_address text NOT NULL,
  amount numeric(20,6) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'returned')),
  nano_hash text,
  return_hash text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  returned_at timestamptz
);

-- Enable RLS on nano_payments (only if table exists and RLS not already enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nano_payments') THEN
    ALTER TABLE nano_payments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add public policies for nano_payments (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nano_payments' 
    AND policyname = 'Public insert access for nano_payments'
  ) THEN
    CREATE POLICY "Public insert access for nano_payments"
      ON nano_payments
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nano_payments' 
    AND policyname = 'Public read access for nano_payments'
  ) THEN
    CREATE POLICY "Public read access for nano_payments"
      ON nano_payments
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nano_payments' 
    AND policyname = 'Public update access for nano_payments'
  ) THEN
    CREATE POLICY "Public update access for nano_payments"
      ON nano_payments
      FOR UPDATE
      TO public
      USING (true);
  END IF;
END $$;

-- Add indexes for nano_payments (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_nano_payments_request_id ON nano_payments(request_id);
CREATE INDEX IF NOT EXISTS idx_nano_payments_from_address ON nano_payments(from_address);
CREATE INDEX IF NOT EXISTS idx_nano_payments_status ON nano_payments(status);