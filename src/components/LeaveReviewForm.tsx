import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
  const submit=useMutation({mutationFn:()=>submitCustomerReview({data:form})});
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
        <div className="hidden" aria-hidden="true"><label htmlFor="review-website">Website</label><input id="review-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></div>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1 h-4 w-4 shrink-0" checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})}/><span>{c.consent}</span></label>
        {submit.isError ? <p role="alert" className="text-sm text-destructive">{submit.error instanceof Error ? submit.error.message : "Could not submit your review. Please try again."}</p> : null}
        <Button type="submit" className="font-bold uppercase" disabled={submit.isPending}>{submit.isPending ? "Submitting…" : c.submit_label}</Button>
      </fieldset>
    </form>}
  </section>;
}
