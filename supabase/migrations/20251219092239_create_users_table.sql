/*
  # Create Users Table

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique identifier for each user
      - `email` (text, unique, not null) - User's email address
      - `password` (text, not null) - User's hashed password (for demo, storing plain text)
      - `name` (text, not null) - User's full name
      - `role` (text, default 'user') - User's role (admin, user, etc.)
      - `created_at` (timestamptz) - Timestamp when user was created
      - `updated_at` (timestamptz) - Timestamp when user was last updated

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read their own data
    - Add policy for users to update their own data

  3. Dummy Data
    - Admin user: admin@example.com / admin123
    - Regular user: user@example.com / user123
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'user' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert dummy users for testing
INSERT INTO users (email, password, name, role) VALUES
  ('admin@example.com', 'admin123', 'Admin User', 'admin'),
  ('user@example.com', 'user123', 'Regular User', 'user')
ON CONFLICT (email) DO NOTHING;