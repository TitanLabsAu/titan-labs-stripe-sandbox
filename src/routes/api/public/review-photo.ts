import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/review-photo")({ server: { handlers: {
  GET: async ({ request }) => {
    const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
    if (!id.success) return new Response("Photo not found", { status: 404 });
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: photo } = await db.from("review_photo_uploads").select("storage_path,mime_type,review_id").eq("id", id.data).eq("ready", true).single();
    if (!photo?.review_id) return new Response("Photo not found", { status: 404 });
    const { data: review } = await db.from("customer_reviews").select("id").eq("id", photo.review_id).eq("published", true).eq("archived", false).single();
    if (!review) return new Response("Photo not found", { status: 404 });
    const { data: blob, error } = await db.storage.from("review-photos").download(photo.storage_path);
    if (error || !blob) return new Response("Photo not found", { status: 404 });
    return new Response(blob, { headers: { "Content-Type": photo.mime_type, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  },
} } });