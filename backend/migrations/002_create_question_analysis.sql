-- Create question_analysis table
CREATE TABLE IF NOT EXISTS public.question_analysis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES public.documents(id) NOT NULL,
    question_number text,
    question_text text NOT NULL,
    marks double precision,
    co_mapping jsonb,
    bloom_level text,
    unit text,
    difficulty text,
    analyzed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_analysis_document ON public.question_analysis(document_id);
