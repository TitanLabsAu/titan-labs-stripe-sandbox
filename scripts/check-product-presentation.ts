import assert from 'node:assert/strict';
import {productDisplayName,productDisplaySize,relatedProductPresentation} from '../src/lib/product-presentation';
import {usesBacWaterArtwork,rangeLabelDetails} from '../src/lib/range-artwork';
import {productLightPhoto,productDarkPhoto,usesNeutralEquipmentTone} from '../src/lib/theme-image-rules';
import pairs from '../src/lib/product-theme-pairs.json';
import {existsSync} from 'node:fs';
let checks=0;const check=(f:()=>void)=>{f();checks++};
check(()=>assert.equal(productDisplayName({name:'Cagrilintide 5mg',catalogueSection:'range'}),'Cagrilintide'));
check(()=>assert.equal(productDisplayName({name:'3ml Luer Lock Syringe',catalogueSection:'equipment'}),'3ml Luer Lock Syringe'));
check(()=>assert.equal(productDisplaySize({slug:'klow-80mg'},{label:'80'}),'80mg'));
check(()=>assert.equal(productDisplaySize({slug:'5-amino-1mq'},{label:'20'}),'20'));
check(()=>assert.equal(rangeLabelDetails({name:'KLOW',slug:'klow-80mg'},{label:'80'}).strength,'80mg'));
check(()=>assert(usesBacWaterArtwork({slug:'bac-water',image:'/api/public/product-image?path=catalogue-v3%2Fbac-water.png'})));
check(()=>assert(!usesBacWaterArtwork({slug:'bac-water',image:'/api/public/product-image?path=bac-water%2Fnew-upload.png'})));
for(const p of pairs.filter(p=>p.dark.startsWith('/images/catalogue-polish-v2/'))){
 check(()=>assert.equal(productDarkPhoto(p.slug,p.source),p.dark));
 check(()=>assert.equal(productLightPhoto(p.slug,p.source,'selected'),p.light));
 check(()=>assert.equal(productLightPhoto(p.slug,'/api/public/product-image?path=new-upload.png','selected'),null));
 check(()=>assert.equal(usesNeutralEquipmentTone(p.slug,p.source),false));
 for(const photo of [p.light,p.dark])check(()=>assert(existsSync('public'+photo),photo));
 if('legacyLight'in p)check(()=>assert.equal(productLightPhoto(p.slug,p.source,undefined,[],[],[{source:p.source,image:p.legacyLight}]),p.light));
 check(()=>assert.equal(productLightPhoto(p.slug,p.source,undefined,[],[],[{source:p.source,image:'/custom-approved-light.webp'}]),'/custom-approved-light.webp'));
}
const p:any={slug:'sample',name:'Sample',price:50,catalogueSection:'range',variants:[{id:'sold',label:'10mg',price:50,stock:0},{id:'available',label:'20mg',price:120,salePrice:100,stock:5}]};
check(()=>{const r=relatedProductPresentation(p);assert.equal(r.variant?.id,'available');assert.equal(r.option.variantId,r.variant?.id);assert.equal(r.option.unitPrice,100)});
console.log(`${checks} presentation, source-identity and pricing assertions passed`);
