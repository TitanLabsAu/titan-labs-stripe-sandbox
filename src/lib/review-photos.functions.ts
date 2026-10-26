import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { photoIdsSchema, photoUploadSchema, validatePhotoBytes } from "@/lib/review-photos";
import { validatePublicReview } from "@/lib/reviews";

export const uploadReviewPhoto = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(input => photoUploadSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64)) throw new Error("Invalid image");
    const bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0));
    const { extension } = validatePhotoBytes(bytes, data.mime);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { count, error: limitError } = await db.from("review_photo_uploads").select("id", { count: "exact", head: true }).eq("user_id", context.userId).gte("created_at", new Date(Date.now() - 3600000).toISOString());
    if (limitError || (count ?? 0) >= 25) throw new Error("Please wait before uploading more photos");
    const id = crypto.randomUUID();
    const path = `${context.userId}/${id}.${extension}`;
    const { error: rowError } = await db.from("review_photo_uploads").insert({ id, user_id: context.userId, storage_path: path, mime_type: data.mime, byte_size: bytes.length });
    if (rowError) throw new Error("Could not prepare photo upload");
    try {
      const { error } = await db.storage.from("review-photos").upload(path, bytes, { contentType: data.mime, upsert: false });
      if (error) throw error;
      const { error: readyError } = await db.from("review_photo_uploads").update({ ready: true }).eq("id", id);
      if (readyError) throw readyError;
      return { id };
    } catch {
      const { error: cleanupError } = await db.storage.from("review-photos").remove([path]);
      if (!cleanupError) await db.from("review_photo_uploads").delete().eq("id", id).eq("user_id", context.userId).is("review_id", null);
      throw new Error("Photo upload failed. Please try again");
    }
  });

export const cleanupReviewPhotos = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(input => photoIdsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: paths, error } = await db.rpc("claim_review_photo_cleanup", { _user_id: context.userId, _ids: data });
    if (error) throw new Error("Could not remove unused photos");
    if (paths?.length) {
      const { error: storageError } = await db.storage.from("review-photos").remove(paths);
      if (storageError) throw new Error("Photo cleanup could not finish. Please retry");
      const { error: deleteError } = await db.from("review_photo_uploads").delete().eq("user_id", context.userId).in("id", data).is("review_id", null).eq("cleanup_claimed", true);
      if (deleteError) throw new Error("Photo cleanup could not finish. Please retry");
    }
    return { ok: true };
  });

export const submitMemberPhotoReview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: { review: unknown; photoIds: string[] }) => ({ review: validatePublicReview(input.review), photoIds: photoIdsSchema.refine(ids => ids.length > 0, "Choose a photo").parse(input.photoIds) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: id, error } = await db.rpc("submit_member_photo_review", { _user_id: context.userId, _review: data.review, _photo_ids: data.photoIds });
    if (error) throw new Error("Your review could not be saved. Please retry");
    return { ok: true, id };
  });

export const getPrivateReviewPhoto = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.string().uuid().parse(input))
  .handler(async ({ data, context }) => {
    // RLS provides the owner/admin read boundary; no client-supplied paths.
    const { data: photo, error } = await context.supabase.from("review_photo_uploads").select("storage_path,user_id").eq("id", data).single();
    if (error || !photo) throw new Error("Photo unavailable");
    const { data: role } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (photo.user_id !== context.userId && !role) throw new Error("Photo unavailable");
    const { data: signed, error: signError } = await context.supabase.storage.from("review-photos").createSignedUrl(photo.storage_path, 300);
    if (signError || !signed) throw new Error("Photo unavailable");
    return { url: signed.signedUrl };
  });