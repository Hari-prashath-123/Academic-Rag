-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create colleges table
CREATE TABLE IF NOT EXISTS public.colleges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    address text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional: add index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_colleges_code ON public.colleges(code);
