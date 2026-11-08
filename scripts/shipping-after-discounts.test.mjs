import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(resolve('.shipping-test-'));
try {
 const out=join(dir,'pricing.mjs');
 await build({entryPoints:['src/lib/order-pricing.ts'],bundle:true,platform:'node',format:'esm',outfile:out});
 const {quoteOrder,DEFAULT_PRICING_SETTINGS}=await import(pathToFileURL(out));
 const settings={...DEFAULT_PRICING_SETTINGS,multibuyTiers:[],firstOffer:{...DEFAULT_PRICING_SETTINGS.firstOffer,combineCode:true}};
 const code={code:'EMMA10',kind:'referral',discountType:'percent',value:10,minSpendCents:0,combineMultibuy:true,combineCrypto:true,combineCredit:true};
 const line=(cents)=>({unitCents:cents,baseCents:cents,quantity:1,multibuyEligible:false});
 for(const paymentMethod of ['payid','card','crypto']) for(const shippingMethod of ['standard','express']) {
  const input={lines:[line(22000),line(2000)],paymentMethod,shippingMethod,firstOfferEligible:true,code};
  // Isolate the two reported discounts for every payment provider.
  const q=quoteOrder(input,{...settings,cryptoPercent:0});
  assert.equal(q.firstOfferCents,2400);assert.equal(q.codeCents,2160);
  assert.equal(q.merchandiseCents,19440);
  assert.equal(q.shippingCents,shippingMethod==='standard'?1000:2000);
  assert.equal(q.totalCents,19440+q.shippingCents);
  assert.equal(q.freeShippingCents,0);assert.equal(q.remainingForFreeShippingCents,560);
 }
 for(const cents of [19999,20000,20001]) {
  const q=quoteOrder({lines:[line(cents)],paymentMethod:'card',shippingMethod:'express'},settings);
  assert.equal(q.shippingCents,cents<20000?2000:0);
  assert.equal(q.remainingForFreeShippingCents,Math.max(0,20000-cents));
 }
 for(const extra of [{foundationPercent:5},{creditUnits:1,availableCreditUnits:1},{club:{type:'percent',percent:10,maxCapPercent:20}}]) {
  const q=quoteOrder({lines:[line(20500)],paymentMethod:'card',shippingMethod:'express',...extra},settings);
  assert.ok(q.merchandiseCents<20000);assert.equal(q.shippingCents,2000);
 }
 const club=quoteOrder({lines:[line(10000)],paymentMethod:'card',shippingMethod:'express',club:{type:'percent',percent:10,maxCapPercent:20,freeShipping:true}},settings);
 assert.equal(club.shippingCents,0);assert.equal(club.clubFreeShipping,true);
 const empty=quoteOrder({lines:[],paymentMethod:'card',shippingMethod:'express'},settings);
 assert.equal(empty.totalCents,0);assert.equal(empty.freeShippingCents,0);
 console.log('Shipping uses final discounted merchandise across payment methods; $200 boundaries, rewards, Foundation, Club and explicit Club shipping waiver pass.');
} finally {rmSync(dir,{recursive:true,force:true});}
