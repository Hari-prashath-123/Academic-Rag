-- =====================================================
-- Migration: 007_add_token_limit_and_reasoning_fields.sql
-- Purpose: Add per-user token limits, daily token usage,
--          and reasoning_details persistence for chat history.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE IF EXISTS public.chat_history
    ADD COLUMN IF NOT EXISTS reasoning_details jsonb;

CREATE TABLE IF NOT EXISTS public.user_token_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    daily_token_limit integer NOT NULL DEFAULT 20000,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_token_limits_user_id
    ON public.user_token_limits(user_id);

CREATE TABLE IF NOT EXISTS public.user_daily_token_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    usage_date date NOT NULL,
    tokens_used integer NOT NULL DEFAULT 0,
    request_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_daily_token_usage_user_date UNIQUE (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_token_usage_user_id
    ON public.user_daily_token_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_user_daily_token_usage_date
    ON public.user_daily_token_usage(usage_date);

CREATE INDEX IF NOT EXISTS idx_user_daily_token_usage_user_date
    ON public.user_daily_token_usage(user_id, usage_date);
