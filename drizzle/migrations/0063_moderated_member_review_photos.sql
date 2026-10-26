CREATE TABLE public.review_photo_uploads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, review_id uuid REFERENCES public.customer_reviews(id) ON DELETE SET NULL,
 storage_path text NOT NULL UNIQUE, mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
 byte_size integer NOT NULL CHECK(byte_size > 0 AND byte_size <= 5242880), ready boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(storage_path = user_id::text || '/' || id::text || CASE mime_type WHEN 'image/jpeg' THEN '.jpg' WHEN 'image/png' THEN '.png' ELSE '.webp' END)
);
GRANT SELECT ON public.review_photo_uploads TO anon, authenticated;
GRANT ALL ON public.review_photo_uploads TO service_role;
ALTER TABLE public.review_photo_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY review_photo_visible ON public.review_photo_uploads FOR SELECT TO anon, authenticated USING (ready AND review_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.customer_reviews r WHERE r.id=review_id AND r.published AND NOT r.archived));
CREATE POLICY review_photo_owner_admin ON public.review_photo_uploads FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY review_photo_storage_owner_admin ON storage.objects FOR SELECT TO authenticated USING(bucket_id='review-photos' AND EXISTS(SELECT 1 FROM public.review_photo_uploads p WHERE p.storage_path=name AND (p.user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE OR REPLACE FUNCTION public.submit_member_photo_review(_user_id uuid, _review jsonb, _photo_ids uuid[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid; n integer; p public.review_photo_uploads; BEGIN
 IF _user_id IS NULL OR cardinality(_photo_ids) NOT BETWEEN 1 AND 5 OR (SELECT count(DISTINCT x) FROM unnest(_photo_ids) x) <> cardinality(_photo_ids) THEN RAISE EXCEPTION 'Choose one to five owned photos'; END IF;
 IF length(trim(_review->>'reviewer_name')) NOT BETWEEN 1 AND 120 OR length(trim(_review->>'review_text')) NOT BETWEEN 10 AND 2000 OR length(coalesce(_review->>'location',''))>120 THEN RAISE EXCEPTION 'Invalid review'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('photo-review:'||_user_id::text,0));
 FOR p IN SELECT * FROM public.review_photo_uploads WHERE id=ANY(_photo_ids) ORDER BY id FOR UPDATE LOOP
  IF p.user_id<>_user_id OR p.review_id IS NOT NULL OR NOT p.ready THEN RAISE EXCEPTION 'Photo unavailable'; END IF;
 END LOOP;
 SELECT count(*) INTO n FROM public.review_photo_uploads WHERE id=ANY(_photo_ids) AND user_id=_user_id AND ready AND review_id IS NULL;
 IF n<>cardinality(_photo_ids) THEN RAISE EXCEPTION 'Photo unavailable'; END IF;
 IF (SELECT count(*) FROM public.review_photo_uploads WHERE user_id=_user_id AND review_id IS NOT NULL AND created_at>now()-interval '1 hour')>=15 THEN RAISE EXCEPTION 'Please wait before submitting another review'; END IF;
 INSERT INTO public.customer_reviews(reviewer_name,review_text,location,published,featured,archived,rating,sort_order) VALUES(trim(_review->>'reviewer_name'),trim(_review->>'review_text'),nullif(trim(_review->>'location'),''),false,false,false,NULL,0) RETURNING id INTO rid;
 UPDATE public.review_photo_uploads SET review_id=rid WHERE id=ANY(_photo_ids);
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.submit_member_photo_review(uuid,jsonb,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_member_photo_review(uuid,jsonb,uuid[]) TO service_role;
CREATE OR REPLACE FUNCTION public.claim_review_photo_cleanup(_user_id uuid,_ids uuid[]) RETURNS SETOF text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RETURN QUERY DELETE FROM public.review_photo_uploads WHERE user_id=_user_id AND id=ANY(_ids) AND review_id IS NULL RETURNING storage_path;
END $$;
REVOKE ALL ON FUNCTION public.claim_review_photo_cleanup(uuid,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_review_photo_cleanup(uuid,uuid[]) TO service_role;