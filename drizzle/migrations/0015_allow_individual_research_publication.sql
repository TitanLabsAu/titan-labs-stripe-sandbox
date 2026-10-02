CREATE OR REPLACE FUNCTION public.research_entries_publish_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  k text; st text; has boolean;
BEGIN
  FOREACH k IN ARRAY ARRAY['summary','context','mechanism','findings','identifiers','cross_reference','regulatory'] LOOP
    has := CASE k
      WHEN 'summary' THEN coalesce(btrim(NEW.summary),'') <> ''
      WHEN 'context' THEN EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.content) e WHERE e->>'heading'='Research context' AND coalesce(btrim(e->>'body'),'')<>'')
      WHEN 'mechanism' THEN EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.content) e WHERE e->>'heading'='Reported mechanism' AND coalesce(btrim(e->>'body'),'')<>'')
      WHEN 'findings' THEN jsonb_array_length(NEW.research_findings) > 0
      WHEN 'identifiers' THEN EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.content) e WHERE e->>'heading'='Composition' AND coalesce(btrim(e->>'body'),'')<>'')
        OR coalesce(NEW.molecular_formula,'')<>'' OR coalesce(NEW.cas_number,'')<>'' OR coalesce(NEW.pubchem_cid,'')<>'' OR coalesce(NEW.sequence,'')<>''
      WHEN 'cross_reference' THEN EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.content) e WHERE e->>'heading'='Cross-reference' AND coalesce(btrim(e->>'body'),'')<>'')
      WHEN 'regulatory' THEN EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.content) e WHERE e->>'heading'='Regulatory status' AND coalesce(btrim(e->>'body'),'')<>'')
    END;
    st := coalesce(NEW.claim_checks->>k, 'not_checked');
    IF has AND st = 'not_applicable' THEN
      RAISE EXCEPTION '"Not applicable" cannot be used for % because that section has content (entry %).', k, NEW.slug
        USING ERRCODE='P0001', HINT='research_claim_not_applicable';
    END IF;
    IF NEW.verification_status = 'verified' AND has AND st <> 'verified' THEN
      RAISE EXCEPTION 'Entry % cannot be Verified: the % check is "%".', NEW.slug, k, st
        USING ERRCODE='P0001', HINT='research_verified_blocked';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
