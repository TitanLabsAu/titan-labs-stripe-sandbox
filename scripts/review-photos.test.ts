import { describe, expect, test } from "bun:test";
import { photoIdsSchema, photoUploadSchema, REVIEW_PHOTO_MAX_BYTES, validatePhotoBytes, validateSelectedPhotos } from "../src/lib/review-photos";
import { DEFAULT_PRICING_SETTINGS, quoteOrder } from "../src/lib/order-pricing";
import { adminCodeSchema } from "../src/lib/referral-code-input";

describe("member review photo validation", () => {
  test("allows five photos and rejects six", () => {
    const file = { type: "image/jpeg", size: 100 };
    expect(() => validateSelectedPhotos(Array(5).fill(file))).not.toThrow();
    expect(() => validateSelectedPhotos(Array(6).fill(file))).toThrow("5 photos");
    expect(() => validateSelectedPhotos([file], 5)).toThrow("5 photos");
  });
  test("5 MB is accepted, larger and empty files rejected", () => {
    expect(() => validateSelectedPhotos([{ type: "image/png", size: 5242880 }])).not.toThrow();
    expect(() => validateSelectedPhotos([{ type: "image/png", size: 5242881 }])).toThrow("5 MB");
    expect(() => validateSelectedPhotos([{ type: "image/png", size: 0 }])).toThrow();
    expect(REVIEW_PHOTO_MAX_BYTES).toBe(5242880);
  });
  test("rejects executable and SVG types regardless of extension", () => {
    for (const type of ["text/html", "image/svg+xml", "application/javascript", "application/octet-stream"]) expect(() => validateSelectedPhotos([{type,size:100}])).toThrow();
  });
  test("validates real image headers and MIME agreement", () => {
    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAY0lEQVR4nO3PQQ3AIADAQMAAJtGJtongcVnSU9DOfe74s6UDXjWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgfb16AbEWf+DuAAAAAElFTkSuQmCC"), c => c.charCodeAt(0));
    expect(validatePhotoBytes(bytes, "image/png").mime).toBe("image/png");
    expect(() => validatePhotoBytes(bytes, "image/jpeg")).toThrow();
    expect(() => validatePhotoBytes(bytes, "text/html")).toThrow();
    expect(() => validatePhotoBytes(new TextEncoder().encode('<script>alert(1)</script>'), "image/png")).toThrow();
    expect(() => validatePhotoBytes(new Uint8Array(5242881), "image/png")).toThrow("5 MB");
  });
  test("IDs cannot contain paths or duplicate an attachment", () => {
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect(photoIdsSchema.parse([id])).toEqual([id]);
    expect(() => photoIdsSchema.parse([id,id])).toThrow();
    expect(() => photoIdsSchema.parse(["../somebody/file.png"])).toThrow();
    expect(() => photoUploadSchema.parse({mime:"image/png",base64:"abc",path:"../admin"})).not.toThrow();
    expect(photoUploadSchema.parse({mime:"image/png",base64:"abc",path:"../admin"})).not.toHaveProperty("path");
  });
});

describe("10% referral default preserves independent rewards", () => {
  test("full Admin custom edit keeps ID, fixed amount, exact expiry and combination flags", () => {
    const id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const input={id,code:"Renamed_Code",code_kind:"referral",discount_type:"fixed",value:17,maxUses:42,expiresAt:"2026-12-01",expiresAtISO:"2026-12-01T12:13:14.000Z",userId:null,note:"custom",min_spend:150,combine_multibuy:false,combine_crypto:true,combine_credit:false,active:false};
    expect(adminCodeSchema.parse(input)).toEqual({...input,code:"RENAMED_CODE"});
    expect(() => adminCodeSchema.parse({...input,id:"../victim"})).toThrow();
    expect(() => adminCodeSchema.parse({...input,value:Infinity})).toThrow();
    expect(() => adminCodeSchema.parse({...input,discount_type:"percent",value:101})).toThrow();
    expect(() => adminCodeSchema.parse({...input,code_kind:"member",userId:null})).toThrow();
  });
  test("10% customer code produces concrete discount without changing reward threshold", () => {
    const quote = quoteOrder({shippingMethod:"standard",paymentMethod:"payid",lines:[{unitCents:10000,baseCents:10000,quantity:1}],code:{code:"CUSTOM10",kind:"referral",discountType:"percent",value:10,minSpendCents:0,combineMultibuy:true,combineCrypto:true,combineCredit:true}}, DEFAULT_PRICING_SETTINGS);
    expect(quote.codeCents).toBe(1000);
    expect(DEFAULT_PRICING_SETTINGS.rewardEvery).toBe(5);
    expect(DEFAULT_PRICING_SETTINGS.rewardPercent).toBe(10);
    expect(DEFAULT_PRICING_SETTINGS.combinedCapPercent).toBe(20);
  });
});