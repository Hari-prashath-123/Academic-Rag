-- Create advisor-student mapping and course-wise material tables

CREATE TABLE IF NOT EXISTS public.advisor_student_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_advisor_student UNIQUE (advisor_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_advisor_student_mappings_advisor_id
    ON public.advisor_student_mappings(advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_student_mappings_student_id
    ON public.advisor_student_mappings(student_id);

CREATE TABLE IF NOT EXISTS public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    semester text,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses(code);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'materialtype') THEN
        CREATE TYPE materialtype AS ENUM ('pdf', 'notes', 'question_paper');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.course_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title text NOT NULL,
    material_type materialtype NOT NULL,
    file_path text NOT NULL,
    file_size integer,
    uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    uploaded_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_course_materials_course_id
    ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_material_type
    ON public.course_materials(material_type);
