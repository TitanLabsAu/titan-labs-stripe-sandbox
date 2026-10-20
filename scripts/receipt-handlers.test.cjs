const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict');
function compile(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports, Error, Date, crypto: require('node:crypto').webcrypto, TextEncoder, process:{env:{}}, require:p => {if (p in mocks) return mocks[p]; throw new Error(p);}});
  return exports;
}
const model = compile('src/lib/order-receipt.ts', {});
const capabilities = compile('src/lib/guest-capability.ts', {});
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
async function scenario({userId='owner', admin=false, guest=false, cookie='a'.repeat(43), expired=false, wrong=false}={}) {
  const queries=[];
  const row={id, user_id:guest?null:'owner', guest_session_id:'session-a', created_at:'2026-10-20T08:00:00Z',status:'processing',subtotal:100,shipping:10,total:110,
    notes:'PRIVATE',payment_transaction_id:'SECRET',credit_reservation_id:'PRIVATE',pricing_snapshot:{settings:{private:'SECRET'},quote:{itemsCents:10000,firstOfferCents:0,provider_token:'SECRET'}},
    order_items:[{product_name:'Fictional',quantity:1,unit_price:100,private_note:'SECRET'}]};
  const tokenHash = await capabilities.hashGuestToken('a'.repeat(43));
  const db={from(table){const filters=[]; const q={select(columns){queries.push({table,columns,filters});return q;},eq(k,v){filters.push([k,v]);return q;},is(k,v){filters.push([k,v]);return q;},async maybeSingle(){
    if(table==='guest_checkout_sessions') return {data: filters.some(([k,v])=>k==='token_hash'&&v===tokenHash) ? {id:wrong?'session-b':'session-a',expires_at:expired?'2020-01-01T00:00:00Z':'2099-01-01T00:00:00Z'}:null};
    return {data:filters.every(([k,v])=>row[k]===v)?row:null};
  }};return q;},rpc:async()=>({data:admin,error:null})};
  const buyer=compile('src/lib/checkout-buyer.server.ts',{
    '@tanstack/react-start/server':{getCookie:()=>cookie,getRequest:()=>({headers:new Headers()}),setCookie:()=>{throw new Error('unexpected write');}},
    '@supabase/supabase-js':{createClient:()=>{throw new Error('no bearer');}},
    '@/lib/guest-capability':capabilities,'@/integrations/supabase/client.server':{supabaseAdmin:db},
  });
  const gate={authenticated:true};
  const builder=()=>{let validator=x=>x, protectedFn=false;const b={middleware(ms){protectedFn=ms.includes(gate);return b;},inputValidator(fn){validator=fn;return b;},handler(fn){return async args=>{if(protectedFn&&!args.context?.userId)throw new Error('Unauthenticated');return fn({...args,data:validator(args.data)});};}};return b;};
  const handlers=compile('src/lib/receipt.functions.ts',{'@tanstack/react-start':{createServerFn:builder},'@/integrations/supabase/auth-middleware':{requireSupabaseAuth:gate},
    './order-receipt':model,'./checkout-buyer.server':buyer,'@/integrations/supabase/client.server':{supabaseAdmin:db}});
  return {run:()=> (guest?handlers.getGuestOrderReceipt:handlers.getOrderReceipt)({data:{orderId:id},context:{supabase:db,userId}}),queries};
}
(async()=>{
  await assert.rejects((await scenario({userId:'intruder'})).run,/access denied/);
  await assert.rejects((await scenario({userId:''})).run,/Unauthenticated/);
  const admin=await (await scenario({userId:'administrator',admin:true})).run(); assert.equal(admin.order.total,110);
  const owner=await scenario(); const result=await owner.run(); assert.equal(result.order.order_items[0].product_name,'Fictional');
  assert.doesNotMatch(JSON.stringify(result),/SECRET|PRIVATE|user_id|guest_session_id|provider_token|settings|reservation/);
  assert.doesNotMatch(owner.queries[0].columns,/notes|transaction|provider|reservation|payment_reference/);
  assert.equal((await (await scenario({guest:true})).run()).order.total,110);
  await assert.rejects((await scenario({guest:true,wrong:true})).run,/access denied/);
  await assert.rejects((await scenario({guest:true,expired:true})).run);
  await assert.rejects((await scenario({guest:true,cookie:'b'.repeat(43)})).run);
  console.log('Actual receipt handlers: owner/Admin allowed; cross-member, signed-out, wrong/expired guest cookies denied; response allowlist verified');
})().catch(e=>{console.error(e);process.exitCode=1;});