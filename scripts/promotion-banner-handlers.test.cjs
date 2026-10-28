const fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript'), assert=require('node:assert/strict');
function compile(file,mocks){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Error,JSON,require:p=>{if(p in mocks)return mocks[p];throw Error(p)}});return exports;}
const banners=compile('src/lib/promotion-banners.ts',{'zod':require('zod')});
const gate={};const builder=()=>{let validator=x=>x,protectedFn=false;const b={middleware(ms){protectedFn=ms.includes(gate);return b},inputValidator(fn){validator=fn;return b},handler(fn){return async args=>{if(protectedFn&&!args.context?.userId)throw Error('Unauthenticated');return fn({...args,data:validator(args.data)})}}};return b};
const mocks={'@/lib/christmas':compile('src/lib/christmas.ts',{'zod':require('zod')}),'@tanstack/react-start':{createServerFn:builder},'@/integrations/supabase/auth-middleware':{requireSupabaseAuth:gate},'@/lib/promotion-banners':banners,'@/lib/pen-cases':{PEN_CASES_KEY:'pen_case_options',serialisePenCases:JSON.stringify,validatePenCasesAgainst:s=>s,parsePenCases:()=>({cases:[]})}};
for(const p of ['@/lib/catalogue-sections','@/lib/product-certificates','@/lib/storefrontContent','@/lib/products','@/lib/order-reference','@/lib/manual-payment','@/lib/optional-equipment','@/integrations/supabase/types'])mocks[p]={};
const fn=compile('src/lib/admin.functions.ts',mocks).adminSaveContent;
let stored, writes=0;
const db=admin=>({rpc:async()=>({data:admin,error:null}),from(table){assert.equal(table,'site_content');return {upsert:async row=>{writes++;stored=row;return {error:null}}}}});
const body=JSON.stringify({options:[{id:'custom-review',label:'LIMITED',background:'#006DA8',text:'#FFFFFF'}],assignments:{'demo::blue':'custom-review'}});
(async()=>{
 await assert.rejects(()=>fn({data:{key:banners.PROMOTION_BANNERS_KEY,body},context:{supabase:db(true),userId:''}}),/Unauthenticated/);
 await assert.rejects(()=>fn({data:{key:banners.PROMOTION_BANNERS_KEY,body},context:{supabase:db(false),userId:'ordinary'}}),/Forbidden/);
 assert.equal(writes,0);
 await fn({data:{key:banners.PROMOTION_BANNERS_KEY,body},context:{supabase:db(true),userId:'admin'}});
 assert.equal(writes,1);assert.equal(banners.parseBannerSettings(stored.body).assignments['demo::blue'],'custom-review');
 await assert.rejects(()=>fn({data:{key:banners.PROMOTION_BANNERS_KEY,body:JSON.stringify({options:[],assignments:{'demo':'invalid'}})},context:{supabase:db(true),userId:'admin'}}));assert.equal(writes,1);
 console.log('PASS actual save handler: signed-out/non-admin denied before writes; isolated admin save/read; invalid payload rejected; only site-content touched');
})().catch(e=>{console.error(e);process.exitCode=1});
