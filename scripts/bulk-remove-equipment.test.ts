import { expect, test } from "bun:test";
import { planBulkOptionalEquipment } from "../src/lib/optional-equipment";
const target = {id:"p1",slug:"retatrutide",name:"Retatrutide",catalogue_section:"range",starter_kit_enabled:true,optional_equipment:null};
const entry = {slug:"range-starter-kit",variantIds:null};
test("removes a built-in default and saves an explicit empty list",()=>{
 const [row]=planBulkOptionalEquipment(entry,[target],"remove");
 expect(row!.action).toBe("remove");expect(row!.after).toEqual([]);
 expect(planBulkOptionalEquipment(entry,[{...target,optional_equipment:row!.after}],"remove")[0]!.action).toBe("not-offered");
});
test("removing a custom add-on preserves other scopes and order",()=>{
 const other={slug:"wipes",variantIds:["pack15"],parentVariantIds:["20mg"]};
 const tail={slug:"travel-case-with-ice-pack",variantIds:null,parentVariantIds:null};
 const original=[other,{...entry,parentVariantIds:null},tail];
 const [row]=planBulkOptionalEquipment(entry,[{...target,optional_equipment:original}],"remove");
 expect(row!.after).toEqual([other,tail]);expect(original).toHaveLength(3);
});
test("not offered and ineligible targets remain unchanged",()=>{
 const rows=planBulkOptionalEquipment(entry,[{...target,starter_kit_enabled:false},{...target,catalogue_section:"equipment"}],"remove");
 expect(rows.map(r=>r.action)).toEqual(["not-offered","not-eligible"]);
});
test("removing a pen default only removes that kit",()=>{
 const [row]=planBulkOptionalEquipment({slug:"pen-starter-kit",variantIds:null},[{...target,catalogue_section:"pens"}],"remove");
 expect(row!.action).toBe("remove");expect(row!.after).toEqual([]);
});
test("add remains the backwards-compatible default operation",()=>{
 const [row]=planBulkOptionalEquipment({slug:"wipes",variantIds:null},[target]);
 expect(row!.action).toBe("add");expect(row!.after.map(r=>r.slug)).toEqual(["range-starter-kit","wipes"]);
});
