/*
  # Add public policies for transactions and nano_payments

  1. Security Updates
    - Add public policies for transactions table
    - Add public policies for nano_payments table
    - These are needed for the application to function properly
*/

-- Add public policies for transactions
CREATE POLICY "Allow public insert to transactions"
  ON transactions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public read access to transactions"
  ON transactions
  FOR SELECT
  TO public
  USING (true);

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

-- Enable RLS on nano_payments
ALTER TABLE nano_payments ENABLE ROW LEVEL SECURITY;

-- Add public policies for nano_payments
CREATE POLICY "Public insert access for nano_payments"
  ON nano_payments
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public read access for nano_payments"
  ON nano_payments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public update access for nano_payments"
  ON nano_payments
  FOR UPDATE
  TO public
  USING (true);

-- Add indexes for nano_payments
CREATE INDEX IF NOT EXISTS idx_nano_payments_request_id ON nano_payments(request_id);
CREATE INDEX IF NOT EXISTS idx_nano_payments_from_address ON nano_payments(from_address);
CREATE INDEX IF NOT EXISTS idx_nano_payments_status ON nano_payments(status);