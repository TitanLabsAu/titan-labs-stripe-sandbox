import{describe,test,expect}from'bun:test';
import fixtures from './fixtures/catalogue-theme-sources.json';
import{productLightPhoto,productDarkPhoto,usesNeutralEquipmentTone}from'../src/lib/theme-image-rules';
import{optimizedProductImage}from'../src/lib/product-image-delivery';
import{usesRangeArtwork}from'../src/lib/range-artwork';
describe('active catalogue artwork coverage',()=>{
 test('every active product and assigned variant has a distinct light/dark pair or coordinated Range artwork',()=>{
  expect(fixtures.length).toBe(41);
  for(const p of fixtures){
   if(usesRangeArtwork(p as any))continue;
   for(const [id,source] of [[undefined,p.image],...p.variants.map(v=>[v.image ? v.id : undefined,v.image || p.image])]){
    const src=optimizedProductImage(source!);
    const light=productLightPhoto(p.slug,src,id);const dark=productDarkPhoto(p.slug,src);
    expect(light,`${p.slug} ${id||'main'} light`).toBeTruthy();expect(dark).toBeTruthy();expect(light).not.toBe(dark);
   }
  }
 });
 test('disposable pens including source-bound size variants use new navy/gold pairs',()=>{
  for(const p of fixtures.filter(p=>p.slug.endsWith('-disposable-pen')||p.slug==='reta-30')){
   expect(productLightPhoto(p.slug,p.image,'size-option')).toBe('/images/approved-products-v1/disposable-pen-light.webp');
   expect(productDarkPhoto(p.slug,p.image)).toBe('/images/approved-products-v1/disposable-pen-dark.webp');
   expect(productLightPhoto(p.slug,'/api/public/product-image?path=new-admin-upload.png','size-option')).toBeNull();
  }
 });
 test('physical case and pen colours never receive neutral equipment tint',()=>{
  for(const p of fixtures.filter(p=>p.catalogueSection==='pens'||p.slug==='travel-case-with-ice-pack')){
   expect(usesNeutralEquipmentTone(p.slug,p.image)).toBe(false);
   for(const v of p.variants.filter(v=>v.image))expect(usesNeutralEquipmentTone(p.slug,v.image!)).toBe(false);
  }
  expect(usesNeutralEquipmentTone('bac-water','/api/public/product-image?path=new-admin-upload.png')).toBe(false);
 });
});
