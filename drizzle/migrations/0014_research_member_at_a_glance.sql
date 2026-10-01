ALTER TABLE public.research_entries
  ADD COLUMN at_a_glance text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.research_entries.at_a_glance IS
  'Member-facing plain-language overview derived only from the verified record; separate from verified scientific source fields.';

UPDATE public.research_entries
SET at_a_glance = btrim(summary || CASE evidence_status
  WHEN 'preclinical' THEN ' Studied mainly in laboratory or animal research. Human effectiveness has not been established.'
  WHEN 'limited_human' THEN ' Some human research exists, but the evidence is still limited and does not establish broad effects.'
  WHEN 'human_clinical' THEN ' Studied in humans, but findings should be understood in the context of the specific studies and populations.'
  WHEN 'established_clinical' THEN ' Supported by established clinical literature for specific studied or recognised contexts; this does not imply every claimed use is established.'
  WHEN 'mixed' THEN ' Human or other relevant findings are mixed, inconsistent or do not support a single clear conclusion.'
  WHEN 'insufficient' THEN ' There is not enough direct evidence to establish the claimed effect or formulation.'
  ELSE ''
END)
WHERE at_a_glance = '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_entries TO authenticated;
GRANT SELECT ON public.research_entries TO anon;
GRANT ALL ON public.research_entries TO service_role;