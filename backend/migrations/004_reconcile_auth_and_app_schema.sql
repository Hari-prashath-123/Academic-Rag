-- =====================================================
-- Migration: 004_reconcile_auth_and_app_schema.sql
-- Purpose: Reconcile existing databases to current RBAC/auth
--          and app table shape without destructive drops.
-- =====================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------
-- users: ensure required columns and constraints exist
-- -----------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'
        ) THEN
            ALTER TABLE public.users ADD COLUMN id uuid DEFAULT gen_random_uuid();
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
        ) THEN
            ALTER TABLE public.users ADD COLUMN email text;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
        ) THEN
            ALTER TABLE public.users ADD COLUMN password_hash text;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE public.users ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE public.users ADD COLUMN updated_at timestamptz;
        END IF;

        -- Force id/email/password_hash required for the current model.
        BEGIN
            ALTER TABLE public.users ALTER COLUMN id SET NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            ALTER TABLE public.users ALTER COLUMN password_hash SET NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        -- Ensure users primary key exists.
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'public.users'::regclass
              AND contype = 'p'
        ) THEN
            ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
        END IF;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- -----------------------------------------------------
-- roles and role_permissions and user_roles
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_name text NOT NULL,
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_name)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_name ON public.role_permissions(permission_name);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- -----------------------------------------------------
-- profiles: one-to-one with users
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    first_name text,
    last_name text,
    avatar_url text,
    phone text
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- -----------------------------------------------------
-- documents: reconcile legacy columns to current shape
--   Current model expects:
--   id, uploader_id, title, file_path, file_mime_type, uploaded_at
-- -----------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.documents') IS NULL THEN
        CREATE TABLE public.documents (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            uploader_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            title text NOT NULL,
            file_path text NOT NULL,
            file_mime_type text NOT NULL,
            uploaded_at timestamptz NOT NULL DEFAULT now()
        );
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploader_id'
        ) THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_by'
            ) THEN
                ALTER TABLE public.documents RENAME COLUMN uploaded_by TO uploader_id;
            ELSE
                ALTER TABLE public.documents ADD COLUMN uploader_id uuid;
            END IF;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_at'
        ) THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'upload_date'
            ) THEN
                ALTER TABLE public.documents RENAME COLUMN upload_date TO uploaded_at;
            ELSE
                ALTER TABLE public.documents ADD COLUMN uploaded_at timestamptz NOT NULL DEFAULT now();
            END IF;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'file_mime_type'
        ) THEN
            ALTER TABLE public.documents ADD COLUMN file_mime_type text;
            UPDATE public.documents
            SET file_mime_type = COALESCE(file_mime_type, 'application/octet-stream');
            ALTER TABLE public.documents ALTER COLUMN file_mime_type SET NOT NULL;
        END IF;

        BEGIN
            ALTER TABLE public.documents ALTER COLUMN title SET NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            ALTER TABLE public.documents ALTER COLUMN file_path SET NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            ALTER TABLE public.documents ALTER COLUMN uploader_id SET NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
            ALTER TABLE public.documents ALTER COLUMN uploaded_at SET NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_documents_uploader_id_users'
              AND conrelid = 'public.documents'::regclass
        ) THEN
            ALTER TABLE public.documents
            ADD CONSTRAINT fk_documents_uploader_id_users
            FOREIGN KEY (uploader_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_uploader_id ON public.documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents(uploaded_at);

-- -----------------------------------------------------
-- notes
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- chat_history
-- -----------------------------------------------------
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
