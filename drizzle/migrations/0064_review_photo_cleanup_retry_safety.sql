ALTER TABLE public.review_photo_uploads ADD COLUMN cleanup_claimed boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.claim_review_photo_cleanup(_user_id uuid,_ids uuid[]) RETURNS SETOF text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RETURN QUERY UPDATE public.review_photo_uploads SET cleanup_claimed=true,ready=false WHERE user_id=_user_id AND id=ANY(_ids) AND review_id IS NULL RETURNING storage_path;
END $$;
CREATE OR REPLACE FUNCTION public.review_photo_link_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.review_id IS NOT NULL AND (NEW.cleanup_claimed OR NOT NEW.ready) THEN RAISE EXCEPTION 'Photo unavailable'; END IF;
 IF NEW.review_id IS NOT NULL AND (TG_OP='INSERT' OR OLD.review_id IS DISTINCT FROM NEW.review_id) THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('review-photos:'||NEW.review_id::text,0));
  IF (SELECT count(*) FROM public.review_photo_uploads WHERE review_id=NEW.review_id AND id<>NEW.id)>=5 THEN RAISE EXCEPTION 'At most five photos per review'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_photo_link_guard BEFORE INSERT OR UPDATE ON public.review_photo_uploads FOR EACH ROW EXECUTE FUNCTION public.review_photo_link_guard();