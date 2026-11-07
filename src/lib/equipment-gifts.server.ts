import { EQUIPMENT_GIFTS_KEY, parseEquipmentGiftOffers } from "./equipment-gifts";
export async function readEquipmentGiftOffers(admin: any) {
  const { data, error } = await admin.from("site_content").select("body").eq("key", EQUIPMENT_GIFTS_KEY).maybeSingle();
  if (error) throw new Error("We couldn't confirm free equipment offers. Please try again.");
  return parseEquipmentGiftOffers(data?.body);
}
