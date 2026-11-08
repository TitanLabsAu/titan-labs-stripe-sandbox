import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const folder=mkdtempSync(resolve('.product-panel-save-test-'));
const outfile=join(folder,'editor.mjs');
try {
const mock=String.raw`import {useQuery} from '@tanstack/react-query';
export function useSiteContent(){return useQuery({queryKey:['site-content'],queryFn:async()=>globalThis.savedContent,staleTime:Infinity})};
export const useProducts=()=>({products:[],getProduct:()=>undefined});
export const adminSaveStorefrontSection=async({data})=>{globalThis.panelCalls++;if(globalThis.failPanelSave)throw Error('Panel save test failure');const raw=JSON.stringify({items:data.changes.items});globalThis.savedContent={...globalThis.savedContent,'cms:product_information':raw};return{ok:true,raw}};
export const adminDeleteProduct=async()=>({});export const adminSetProductFlags=async()=>({});export const adminListProducts=async()=>[];export const adminSaveProduct=async()=>({ok:true});`;
const mocks=['WebsiteSaleProductToggle','EquipmentFreeGiftEditor','ProductThemePhotoEditor','ProductGalleryEditor','OptionalEquipmentEditor','BulkOptionalEquipment','HomeCategoryPhotoButton'];
await build({entryPoints:['src/components/AdminProducts.tsx'],bundle:true,format:'esm',platform:'node',packages:'external',outfile,plugins:[{name:'test-api',setup(b){b.onResolve({filter:/^@\/lib\/(useCatalog|admin.functions)$/},()=>({path:'data',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:mock,resolveDir:process.cwd(),loader:'js'}));for(const name of mocks){b.onResolve({filter:new RegExp(name+'$')},()=>({path:name,namespace:'component'}));}b.onLoad({filter:/.*/,namespace:'component'},args=>({contents:`export const ${args.path}=()=>null`,loader:'js'}));}}]});
const dom=new JSDOM('<div id="root"></div>',{url:'https://test.local'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.IS_REACT_ACT_ENVIRONMENT=true;Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
for(const name of ['HTMLFormElement','HTMLInputElement','HTMLTextAreaElement','Element','Node','DocumentFragment','MutationObserver','CustomEvent','Event','getComputedStyle'])globalThis[name]=dom.window[name];
const React=await import('react');const {createRoot}=await import('react-dom/client');const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');const {ProductEditor}=await import(pathToFileURL(outfile).href);
const draft={id:'product-id',slug:'lipo-b',name:'Lipo-B',price:'120',sale_price:'',promo_label:'',variants:[],image_url:'/photo.webp',alt:'Lipo-B',blurb:'',sub_description:'25/50/50/1mg/ml',description:'',details:'',protocol:'',recon_vial_mg:'',recon_water_ml:'',recon_dose_mg:'',recon_notes:'',categories:[],links:[],active:true,sort_order:'0',stock_quantity:'20',catalogue_section:'range',extra_catalogue_sections:[],starter_kit_enabled:false,unlimited_stock:false,optional_equipment:[],v2_pen_offer_enabled:false};
globalThis.savedContent={};globalThis.panelCalls=0;globalThis.failPanelSave=false;let parentSaves=0;
const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});const root=createRoot(document.getElementById('root'));
const render=async(key,showPromo=false)=>{await React.act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(ProductEditor,{key,showPromo,draft,setDraft:()=>{},saving:false,onSave:()=>{parentSaves++;assert.ok(globalThis.savedContent['cms:product_information'])}}))));await React.act(async()=>new Promise(r=>setTimeout(r,10)))};
const panel=()=>document.querySelector('section[aria-label="Product information panels"]');
const setText=async(node,value)=>React.act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(node,value);node.dispatchEvent(new window.Event('input',{bubbles:true}));});
await render('first');const inputs=[...panel().querySelectorAll('textarea')];assert.equal(inputs.length,4);
for(let i=0;i<4;i++)await setText(inputs[i],['Edited details','Edited included','Edited care','Edited shipping'][i]);
let button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Save product');await React.act(async()=>{button.click();await new Promise(r=>setTimeout(r,15))});assert.equal(parentSaves,1);assert.equal(globalThis.panelCalls,1);
await render('reopened');assert.deepEqual([...panel().querySelectorAll('textarea')].map(n=>n.value),['Edited details','Edited included','Edited care','Edited shipping']);
globalThis.failPanelSave=true;await setText(panel().querySelector('textarea'),'Keep my unsaved changes');button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Save product');await React.act(async()=>{button.click();await new Promise(r=>setTimeout(r,15))});assert.equal(parentSaves,1);assert.equal(panel().querySelector('textarea').value,'Keep my unsaved changes');assert.match(document.body.textContent,/Panel save test failure/);
globalThis.failPanelSave=false;button=[...panel().querySelectorAll('button')].find(b=>b.textContent==='Save information panels');await React.act(async()=>{button.click();await new Promise(r=>setTimeout(r,15))});assert.equal(parentSaves,1);assert.match(panel().textContent,/Information panels saved/);
await render('standalone-reopened');assert.equal(panel().querySelector('textarea').value,'Keep my unsaved changes');
// The same editor is used by Products and Home; only Home exposes promotion copy.
draft.variants=[{id:'20mg',label:'20mg',price:'170',salePrice:'150',promoLabel:'Hot product',hotProduct:true,stock:'20',image:'',contents:[]}];
await render('range-variant');
assert.equal(document.querySelector('input[aria-label^="Hot product:"]'),null);
assert.ok(!document.body.textContent.includes('Hot product — this size only'));
assert.ok(!document.body.textContent.includes('Promotion label for this size'));
assert.ok(document.body.textContent.includes('Sale price for this size (AUD)'));
assert.equal(draft.variants[0].hotProduct,true,'ordinary editing preserves saved membership');
await render('home-variant',true);
assert.equal(document.querySelector('input[aria-label^="Hot product:"]'),null);
assert.ok(document.body.textContent.includes('Promotion label for this size'));
await React.act(async()=>root.unmount());client.clear();console.log('Main Save product now persists all four panels before parent save; reopen retains edits; failed saves keep edits open; standalone save still persists and confirms success.');

} finally { rmSync(folder,{recursive:true,force:true}); }
