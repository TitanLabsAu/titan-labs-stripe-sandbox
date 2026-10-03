import { describe, expect, test } from "bun:test";
import { sanitizeProductLinks, productCertificates, certificateTitle } from "../src/lib/product-certificates";
import type { Product } from "../src/lib/products";
const product = {name:"Retatrutide",variants:[{id:"10",label:"10mg",price:10},{id:"20",label:"20mg",price:20}],links:[]} as unknown as Product;
describe("product certificates",()=>{
 test("metadata survives JSON persistence, unsafe links rejected",()=>{
  const links=sanitizeProductLinks(JSON.parse(JSON.stringify([{label:"Report",url:" /report.pdf ",kind:"coa",strength:"20mg",batch:"A-1",variantId:"20"},{label:"bad",url:"javascript:alert(1)"},null])));
  expect(links).toEqual([{label:"Report",url:"/report.pdf",kind:"coa",strength:"20mg",batch:"A-1",variantId:"20"}]);
  expect(certificateTitle(product,links[0]!)).toBe("Retatrutide — 20mg — Batch A-1");
 });
 test("explicit documents and generic PDFs are not certificates",()=>{
  const links=[{label:"Manual",url:"/certificates/manual.pdf"},{label:"COA",url:"/report.pdf",kind:"document" as const},{label:"Instructions",url:"/report.pdf"},{label:"Document",url:"/report.pdf"}];
  expect(productCertificates({...product,links})).toEqual([]);
 });
 test("explicit COAs and legacy uploaded reports appear automatically",()=>{
  const links=[{label:"RT20",url:"/api/public/product-image?path=certificates%2Frt20.pdf"},{label:"Report",url:"https://lab.example/report",kind:"coa" as const},{label:"COA",url:"//evil.example"}];
  const reports=productCertificates({...product,links});
  expect(reports.length).toBe(2);
  expect(certificateTitle(product,reports[0]!)).toBe("Retatrutide — 20mg");
  expect(productCertificates({...product,links:[]})).toEqual([]);
 });
 test("ambiguous strength never inferred, explicit variant overrides short label",()=>{
  expect(certificateTitle({...product,variants:[...product.variants!,{id:"other20",label:"20mg pen",price:20}]},{label:"RT20",url:"/coa"})).toBe("Retatrutide — RT20");
  expect(certificateTitle(product,{label:"RT20",url:"/coa",variantId:"10"})).toBe("Retatrutide — 10mg");
 });
});
