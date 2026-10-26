import { z } from "zod";

export const adminCodeSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().transform(s => s.toUpperCase().replace(/\s+/g, "")).pipe(z.string().regex(/^[A-Z0-9_-]{3,32}$/, "Codes are 3–32 letters, numbers, - or _.")),
  code_kind: z.enum(["referral", "member"]), discount_type: z.enum(["percent", "fixed"]),
  value: z.number().finite().min(0).max(1_000_000),
  maxUses: z.number().int().positive().max(2147483647).nullable(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  expiresAtISO: z.string().datetime({offset:true}).nullable().optional(),
  userId: z.string().uuid().nullable(), note: z.string().max(200).nullable().optional(),
  min_spend: z.number().finite().min(0).max(20_000_000),
  combine_multibuy: z.boolean(), combine_crypto: z.boolean(), combine_credit: z.boolean(), active: z.boolean().optional(),
}).superRefine((value, context) => {
  if (value.discount_type === "percent" && value.value > 100) context.addIssue({code:"custom",path:["value"],message:"Percentage can't exceed 100"});
  if (value.code_kind === "member" && !value.userId) context.addIssue({code:"custom",path:["userId"],message:"Member-only codes need a linked member"});
});