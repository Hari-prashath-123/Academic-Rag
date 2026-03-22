-- Alter user_roles table to add id column and change primary key
-- This allows a user to have multiple roles

BEGIN;

-- Add id column with default UUID
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- Drop the old composite primary key
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_pkey;

-- Add new id as primary key
ALTER TABLE public.user_roles 
ADD PRIMARY KEY (id);

-- Add unique constraint on (user_id, role_id)
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_role_id_unique UNIQUE (user_id, role_id);

-- Add index on user_id if not exists
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Re-add index on role_id if not exists  
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

COMMIT;
