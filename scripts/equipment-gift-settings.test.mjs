import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import * as helpers from '../src/lib/equipment-gifts.ts';
const source = stripTypeScriptTypes(readFileSync('src/lib/equipment-gifts.functions.ts','utf8')).replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*/gm,'').replace(/export /g,'');
const createServerFn = () => { const fn={middleware:()=>fn,inputValidator:()=>fn,handler:h=>h}; return fn; };
const deps = {...helpers, createServerFn, requireSupabaseAuth:{}};
const functions = new Function(...Object.keys(deps), source+'\nreturn {adminGetEquipmentGifts,adminSaveEquipmentGifts};')(...Object.values(deps));
const rule = { ...helpers.DEFAULT_STORAGE_RULE, id:'wipes', giftSlug:'wipe', giftVariantId:null, minimumQuantity:1, targets:[{slug:'pen',variantId:'blue'}], sections:[] };
function fixture(raw=null, isAdmin=true) {
  let saved=raw, race=false;
  const db = { userId:'admin', get raw(){return saved}, change(){race=true},
    async rpc(){return {data:isAdmin}},
    from(table){
      let action='read', values, conditions=[];
      const q={select:()=>q,eq:(key,value)=>{conditions.push([key,value]);return q},in:()=>q,
        update:value=>{action='update';values=value;return q},insert:value=>{action='insert';values=value;return q},
        async maybeSingle(){return {data:saved===null?null:{body:saved}}},
        then(resolve,reject){let result;
          if(table==='products') result={data:[{slug:'wipe',catalogue_section:'equipment',product_variants:[]},{slug:'pen',catalogue_section:'pens',product_variants:[{id:'blue'}]}]};
          else if(action==='update') { if(race) saved='[]'; if(conditions.some(([key,v])=>key==='body'&&v!==saved)) result={data:[]}; else {saved=values.body;result={data:[{key:helpers.EQUIPMENT_GIFTS_KEY}]}} }
          else if(action==='insert') {if(saved!==null) result={error:{code:'23505'}}; else {saved=values.body;result={data:null}}}
          else result={data:null};
          return Promise.resolve(result).then(resolve,reject);
        }
      }; return q;
    }
  }; return {db,context:{supabase:db,userId:'admin'}};
}
test('non-admin cannot read or save offer rules',async()=>{
 const f=fixture(null,false);
 await assert.rejects(()=>functions.adminGetEquipmentGifts({context:f.context}),/Forbidden/);
 await assert.rejects(()=>functions.adminSaveEquipmentGifts({context:f.context,data:{productSlug:'wipe',rules:[rule],expectedRaw:null}}),/Forbidden/);
 assert.equal(f.db.raw,null);
});
test('saving one product preserves other offers including the original storage default',async()=>{
 const f=fixture();
 const result=await functions.adminSaveEquipmentGifts({context:f.context,data:{productSlug:'wipe',rules:[rule],expectedRaw:null}});
 assert.equal(result.rules.length,2);assert.equal(result.rules[0].id,helpers.DEFAULT_STORAGE_RULE.id);
 assert.equal(JSON.parse(f.db.raw)[1].id,'wipes');
});
test('saved settings round trip; disabling a product leaves other offers unchanged',async()=>{
 const original=JSON.stringify([helpers.DEFAULT_STORAGE_RULE,rule]),f=fixture(original);
 const loaded=await functions.adminGetEquipmentGifts({context:f.context});assert.equal(loaded.raw,original);
 const result=await functions.adminSaveEquipmentGifts({context:f.context,data:{productSlug:'wipe',rules:[{...rule,enabled:false}],expectedRaw:original}});
 assert.deepEqual(result.rules[0],helpers.DEFAULT_STORAGE_RULE);assert.equal(result.rules[1].enabled,false);
});
test('stale or racing writes cannot overwrite another save',async()=>{
 const raw=JSON.stringify([helpers.DEFAULT_STORAGE_RULE]);
 let f=fixture(raw);
 await assert.rejects(()=>functions.adminSaveEquipmentGifts({context:f.context,data:{productSlug:'wipe',rules:[rule],expectedRaw:null}}),/changed/);assert.equal(f.db.raw,raw);
 f=fixture(raw);f.db.change();
 await assert.rejects(()=>functions.adminSaveEquipmentGifts({context:f.context,data:{productSlug:'wipe',rules:[rule],expectedRaw:raw}}),/changed/);assert.equal(f.db.raw,'[]');
});
test('an equipment editor cannot modify another equipment product offer',async()=>{
 const f=fixture();
 await assert.rejects(()=>functions.adminSaveEquipmentGifts({context:f.context,data:{productSlug:'wipe',rules:[helpers.DEFAULT_STORAGE_RULE],expectedRaw:null}}),/this Equipment/);
 assert.equal(f.db.raw,null);
});
test('unknown target options are rejected and nothing is saved',async()=>{
 const f=fixture();
 await assert.rejects(()=>functions.adminSaveEquipmentGifts({context:f.context,data:{productSlug:'wipe',rules:[{...rule,targets:[{slug:'pen',variantId:'missing'}]}],expectedRaw:null}}),/no longer exists/);assert.equal(f.db.raw,null);
});
