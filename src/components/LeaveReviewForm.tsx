import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cleanupReviewPhotos, submitMemberPhotoReview, uploadReviewPhoto } from "@/lib/review-photos.functions";
import { validateSelectedPhotos } from "@/lib/review-photos";
import { validatePublicReview } from "@/lib/reviews";
import { submitCustomerReview } from "@/lib/reviews.functions";
import { cmsValues } from "@/lib/storefrontContent";
import { useSiteContent } from "@/lib/useCatalog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export function LeaveReviewForm() {
  const c=cmsValues(useSiteContent().data,"review_submission");
  const [form,setForm]=useState({reviewer_name:"",location:"",review_text:"",website:"",consent:false});
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useServerFn(uploadReviewPhoto);
  const cleanup = useServerFn(cleanupReviewPhotos);
  const submitPhotos = useServerFn(submitMemberPhotoReview);
  const submitText = useServerFn(submitCustomerReview);
  useEffect(() => () => photos.forEach(p => URL.revokeObjectURL(p.url)), [photos]);
  const submit=useMutation({mutationFn:async()=>{
    validatePublicReview(form);
    if (!photos.length) return submitText({data:form});
    const ids: string[] = [];
    setProgress(0); setPhotoError("");
    try {
      for (const p of photos) {
        const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] ?? ""); reader.onerror = () => reject(new Error("Could not read photo")); reader.readAsDataURL(p.file); });
        const result = await upload({data:{mime:p.file.type,base64}}); ids.push(result.id);
        setProgress(Math.round(ids.length / photos.length * 100));
      }
      const result = await submitPhotos({data:{review:form,photoIds:ids}});
      setPhotos([]); return result;
    } catch (error) {
      if (ids.length) { try { await cleanup({data:ids}); } catch { setPhotoError("Unused photos could not be removed. Please try again later."); } }
      throw error;
    }
  }});
  return <section id="leave-review" className="mt-10 scroll-mt-8 rounded-2xl border border-primary/35 bg-card p-6 sm:p-8" aria-labelledby="leave-review-title">
    <h2 id="leave-review-title" className="font-display text-2xl font-bold uppercase">{c.heading}</h2>
    <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{c.intro}</p>
    {submit.isSuccess ? <div role="status" className="mt-6 rounded-xl border border-primary/35 p-5"><p>{c.success}</p><Button type="button" variant="outline" className="mt-4" onClick={()=>{submit.reset();setForm({reviewer_name:"",location:"",review_text:"",website:"",consent:false});}}>Write another review</Button></div> : <form className="mt-6 space-y-5" onSubmit={e=>{e.preventDefault();submit.mutate();}}>
      <fieldset disabled={submit.isPending} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div><Label htmlFor="customer-review-name">Name</Label><Input id="customer-review-name" autoComplete="name" required maxLength={120} value={form.reviewer_name} onChange={e=>setForm({...form,reviewer_name:e.target.value})}/><p className="mt-1 text-xs text-muted-foreground">Use the name you are comfortable displaying publicly.</p></div>
          <div><Label htmlFor="customer-review-location">Location (optional)</Label><Input id="customer-review-location" placeholder="e.g. Melbourne, VIC" maxLength={120} value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
        </div>
        <div><Label htmlFor="customer-review-text">Your review</Label><Textarea id="customer-review-text" rows={5} required minLength={10} maxLength={2000} value={form.review_text} onChange={e=>setForm({...form,review_text:e.target.value})}/><p className="mt-1 text-xs text-muted-foreground">Share your experience with our service or products. Please leave out private contact or order details.</p></div>
        <div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" aria-label="Review photos" onChange={e => {
            const files = Array.from(e.target.files ?? []); e.target.value = "";
            try { validateSelectedPhotos(files, photos.length); setPhotoError(""); setPhotos(p => [...p, ...files.map(file => ({file,url:URL.createObjectURL(file)}))]); } catch (error) { setPhotoError(error instanceof Error ? error.message : "Could not select photos"); }
          }} />
          <Button type="button" variant="outline" disabled={photos.length >= 5} onClick={async () => { const {data} = await supabase.auth.getUser(); if (!data.user) {setPhotoError("Sign in to attach delivery or product photos."); return;} inputRef.current?.click(); }}><ImagePlus className="mr-2 h-4 w-4" /> Add Image</Button>
          <p className="mt-2 text-xs text-muted-foreground">Up to 5 JPG, PNG or WebP photos, 5 MB each. Photos appear publicly only after review approval.</p>
          <div className="mt-3 flex flex-wrap gap-3">{photos.map((p,i) => <div key={p.url} className="relative h-24 w-24"><img src={p.url} alt={`Selected review photo ${i+1}`} className="h-full w-full rounded-md object-cover" /><Button type="button" size="icon" variant="secondary" className="absolute right-0 top-0 h-7 w-7" aria-label={`Remove photo ${i+1}`} onClick={() => setPhotos(list => list.filter(x => x !== p))}><X className="h-4 w-4" /></Button></div>)}</div>
          {photoError ? <p role="alert" className="mt-2 text-sm text-destructive">{photoError}{photoError.startsWith("Sign in") ? <a href="/auth" className="ml-2 underline">Sign in</a> : null}</p> : null}
          {submit.isPending && photos.length ? <div className="mt-3" role="status"><progress aria-label="Photo upload progress" className="w-full" max={100} value={progress} /><p className="text-xs text-muted-foreground">Photos uploaded: {progress}%</p></div> : null}
        </div>
        <div className="hidden" aria-hidden="true"><label htmlFor="review-website">Website</label><input id="review-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></div>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1 h-4 w-4 shrink-0" checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})}/><span>{c.consent}</span></label>
        {submit.isError ? <p role="alert" className="text-sm text-destructive">{submit.error instanceof Error ? submit.error.message : "Could not submit your review. Please try again."}</p> : null}
        <Button type="submit" className="font-bold uppercase" disabled={submit.isPending}>{submit.isPending ? "Submitting…" : c.submit_label}</Button>
      </fieldset>
    </form>}
  </section>;
}
