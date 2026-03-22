-- =============================================
-- Migration: 003_create_auth_and_app_tables.sql
-- Purpose: Create authentication and app core tables
-- Tables: users, roles, role_permissions, user_roles,
--         profiles, documents, notes, chat_history
-- =============================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- users
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- =============================================
-- roles
-- =============================================
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

-- =============================================
-- role_permissions
-- =============================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_name text NOT NULL,
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_name)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_name ON public.role_permissions(permission_name);

-- =============================================
-- user_roles (many-to-many between users and roles)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- =============================================
-- profiles (one-to-one with users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    first_name text,
    last_name text,
    avatar_url text,
    phone text
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- =============================================
-- documents (staff uploaded)
-- =============================================
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    file_path text NOT NULL,
    file_mime_type text NOT NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_uploader_id ON public.documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents(uploaded_at);

-- =============================================
-- notes
-- =============================================
CREATE TABLE IF NOT EXISTS public.notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notes_author_id ON public.notes(author_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at);

-- =============================================
-- chat_history
-- =============================================
CREATE TABLE IF NOT EXISTS public.chat_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id text NOT NULL,
    message_role text NOT NULL CHECK (message_role IN ('user', 'assistant')),
    message_content text NOT NULL,
    timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON public.chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON public.chat_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_session_time
    ON public.chat_history(user_id, session_id, timestamp DESC);
