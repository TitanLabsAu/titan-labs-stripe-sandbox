import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const folder=mkdtempSync(resolve('.lipo-preview-test-'));
const outfile=join(folder,'preview.mjs');
try {
await build({entryPoints:['src/components/ProductThemePhotoEditor.tsx'],bundle:true,format:'esm',platform:'node',packages:'external',outfile,plugins:[{name:'mock-data',setup(b){b.onResolve({filter:/^@\/lib\/(useCatalog|admin.functions)$/},()=>({path:'mocks',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({loader:'js',contents:'export const useProducts=()=>({products:[]});export const useSiteContent=()=>({data:{}});export const adminSaveStorefrontSection=async()=>({});'}));}}]});
const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');const {ProductThemePhotoEditor}=await import(pathToFileURL(outfile).href);
const html=renderToStaticMarkup(React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(ProductThemePhotoEditor,{id:'inactive-lipo',slug:'lipo-b',image:'/images/product-theme/lipo-b-dark.webp',variants:[],upload:async()=>'',preview:{name:'Lipo-B',catalogueSection:'range',subDescription:'25/50/50/1mg/ml'}})));
assert.match(html,/Storefront artwork in both themes/);assert.ok((html.match(/LIPO-B/g)||[]).length>=2);assert.ok((html.match(/25\/50\/50\/1mg\/ml/g)||[]).length>=2);assert.match(html,/branded-display-scene.webp/);assert.match(html,/branded-display-light.webp/);assert.doesNotMatch(html,/alt="Current product photo"/);
console.log('Inactive Lipo-B Admin preview passed: shared branded light/dark artwork and full concentration, with no active catalogue row.');

} finally { rmSync(folder,{recursive:true,force:true}); }
