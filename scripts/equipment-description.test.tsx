import { expect, test, mock } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Product } from "../src/lib/products";
let selected: string | null = null;
const kit = {slug:"range-starter-kit",name:"Range Starter Kit",price:20,image:"",alt:"",blurb:"",description:"Shared kit description",details:[],catalogueSection:"equipment",variants:[
 {id:"small",label:"Small Starter Kit",price:20,stock:20,description:"Small kit description — quantities and inclusions entered in Admin."},
 {id:"large",label:"Large Starter Kit",price:30,stock:20,description:"Large kit description — quantities and inclusions entered in Admin."},
]} as Product;
mock.module("../src/lib/useCatalog",()=>({useProducts:()=>({products:[kit]}),useSiteContent:()=>({data:{}})}));
mock.module("../src/lib/cart",()=>({useCart:()=>({items:selected?[{slug:kit.slug,variantId:selected,key:"owned",quantity:1}]:[],addItem:()=>{},removeItem:()=>{}})}));
mock.module("@tanstack/react-router",()=>({Link:({children,params,...props}:any)=><a href={`/product/${params.slug}`} className={props.className}>{children}</a>}));
mock.module("../src/lib/optional-equipment",()=>({optionalEquipmentFor:()=>[{product:kit,variantIds:["small","large"]}],equipmentOptionAvailability:()=>({canAdd:true}),ownedEquipmentLine:()=>selected?{variantId:selected,key:"owned"}:null}));
const {StarterKitOffer}=await import("../src/components/StarterKitOffer");
const parent={...kit,slug:"retatrutide",name:"Retatrutide"};
function render(){return renderToStaticMarkup(<StarterKitOffer product={parent}/>);}
test("add-on shows only the selected size description after its selector",()=>{
 selected=null;let html=render();expect(html).toContain(kit.variants![0]!.description!);expect(html).not.toContain(kit.variants![1]!.description!);expect(html.indexOf("</select>")).toBeLessThan(html.indexOf(kit.variants![0]!.description!));
 selected="large";html=render();expect(html).toContain(kit.variants![1]!.description!);expect(html).not.toContain(kit.variants![0]!.description!);
});
test("blank size description falls back to main product wording",()=>{selected="large";const old=kit.variants![1]!.description;kit.variants![1]!.description="";expect(render()).toContain("Shared kit description");kit.variants![1]!.description=old;});
