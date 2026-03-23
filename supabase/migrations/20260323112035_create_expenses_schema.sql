/*
  # Create Expense Tracking Schema

  1. New Tables
    - `expenses`
      - `id` (uuid, primary key) - Unique identifier for each expense
      - `user_id` (uuid, foreign key) - References auth.users
      - `date` (date) - Date of the expense
      - `amount` (decimal) - Amount spent
      - `category` (text) - Expense category (Food, Transport, Shopping, etc.)
      - `source` (text) - Payment source (Credit Card, Cash, UPI, etc.)
      - `description` (text) - Optional description of the expense
      - `created_at` (timestamptz) - Timestamp when record was created
      - `updated_at` (timestamptz) - Timestamp when record was last updated
  
  2. Security
    - Enable RLS on `expenses` table
    - Add policy for authenticated users to view their own expenses
    - Add policy for authenticated users to insert their own expenses
    - Add policy for authenticated users to update their own expenses
    - Add policy for authenticated users to delete their own expenses
  
  3. Indexes
    - Index on user_id for faster queries
    - Index on date for time-based filtering
    - Index on category for analytics
  
  4. Notes
    - All financial data is scoped to the authenticated user
    - No user can access another user's expense data
    - Amount uses DECIMAL(10,2) for precise currency calculations
*/

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  category text NOT NULL,
  source text,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for SELECT
CREATE POLICY "Users can view their own expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for INSERT
CREATE POLICY "Users can insert their own expenses"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for UPDATE
CREATE POLICY "Users can update their own expenses"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for DELETE
CREATE POLICY "Users can delete their own expenses"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();