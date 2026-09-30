CREATE TABLE public.research_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  summary text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  synonyms text[] NOT NULL DEFAULT '{}',
  molecular_formula text,
  sequence text,
  cas_number text,
  pubchem_cid text,
  research_findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX research_entries_published_sort_idx ON public.research_entries (published, sort_order);

GRANT SELECT ON public.research_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_entries TO authenticated;
GRANT ALL ON public.research_entries TO service_role;

ALTER TABLE public.research_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published research entries"
ON public.research_entries FOR SELECT TO anon, authenticated
USING (published = true);

CREATE POLICY "Admins can view all research entries"
ON public.research_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert research entries"
ON public.research_entries FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update research entries"
ON public.research_entries FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete research entries"
ON public.research_entries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER research_entries_updated_at
BEFORE UPDATE ON public.research_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();