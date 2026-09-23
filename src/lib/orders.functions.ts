import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { kitPriceFor } from "@/lib/products";
import { computeTotals, type ShippingMethodKey } from "@/lib/pricing";

export type SubmitOrderItem = {
  slug: string;
  variantId?: string | null;
  pack?: "single" | "kit";
  quantity: number;
};

export type SubmitOrderInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postcode: string;
  notes?: string;
  paymentMethod: "payid" | "crypto";
  shippingMethod?: ShippingMethodKey;
  items: SubmitOrderItem[];
};

export type SubmittedOrder = {
  id: string;
  orderNumber: number;
  reference: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethod: "payid" | "crypto";
  shippingMethod: ShippingMethodKey;
};

function clean(value: string | undefined, max: number) {
  return (value ?? "").trim().slice(0, max);
}

export const submitOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SubmitOrderInput) => input)
  .handler(async ({ data, context }): Promise<SubmittedOrder> => {
    const items = (data.items ?? []).filter((i) => i.slug && i.quantity > 0).slice(0, 50);
    if (items.length === 0) throw new Error("Your order is empty.");

    const firstName = clean(data.firstName, 80);
    const lastName = clean(data.lastName, 80);
    const email = clean(data.email, 160);
    const phone = clean(data.phone, 30);
    const addressLine = clean(data.addressLine, 200);
    const city = clean(data.city, 80);
    const state = clean(data.state, 40);
    const postcode = clean(data.postcode, 12);

    if (!firstName || !lastName || !email || !phone) {
      throw new Error("Please add your name, email and contact number.");
    }
    if (!addressLine || !city || !state || !postcode) {
      throw new Error("Please complete your delivery address.");
    }

    const slugs = [...new Set(items.map((i) => i.slug))];
    const { data: products, error: productError } = await context.supabase
      .from("products")
      .select("slug, name, price, sale_price, kit_price, product_variants")
      .in("slug", slugs)
      .eq("active", true);
    if (productError) throw productError;

    const bySlug = new Map((products ?? []).map((p: any) => [p.slug, p]));

    let rawSubtotal = 0;
    let units = 0;
    const lines: {
      product_slug: string;
      product_name: string;
      unit_price: number;
      quantity: number;
      variant_label: string;
    }[] = [];

    for (const item of items) {
      const product = bySlug.get(item.slug);
      if (!product) throw new Error("One of the items is no longer available.");
      const variants = Array.isArray(product.product_variants) ? product.product_variants : [];
      const variant = variants.find((v: any) => String(v?.id) === String(item.variantId ?? "")) ?? null;
      const listPrice = Number(product.price);
      const sale = product.sale_price == null ? null : Number(product.sale_price);
      const basePrice = sale != null && sale > 0 && sale < listPrice ? sale : listPrice;
      const singlePrice = variant ? Number(variant.price) : basePrice;
      const pack = item.pack === "kit" ? "kit" : "single";
      const unitPrice =
        pack === "kit"
          ? kitPriceFor(singlePrice, variant?.kitPrice ?? product.kit_price)
          : singlePrice;
      const quantity = Math.min(99, Math.max(1, Math.floor(item.quantity)));
      const label = variant?.label ? String(variant.label) : "Single vial";

      rawSubtotal += unitPrice * quantity;
      units += quantity;
      lines.push({
        product_slug: product.slug,
        product_name: product.name,
        unit_price: unitPrice,
        quantity,
        variant_label: pack === "kit" ? `${label} · 10x Kit` : label,
      });
    }

    const paymentMethod =
      data.paymentMethod === "crypto" ? "crypto" : data.paymentMethod === "wise" ? "wise" : "payid";
    const shippingMethod: ShippingMethodKey =
      data.shippingMethod === "standard" ? "standard" : "express";

    const totals = computeTotals({
      subtotal: rawSubtotal,
      units,
      shippingMethod,
      paymentMethod,
    });

    const shippingAddress = [addressLine, city, `${state} ${postcode}`.trim()]
      .filter(Boolean)
      .join(", ");

    const discountNote =
      totals.discountTotal > 0
        ? `Discounts: Titan Stack ${totals.stackPercent}%${
            totals.cryptoPercent ? ` + crypto ${totals.cryptoPercent}%` : ""
          } (−$${totals.discountTotal.toFixed(2)})`
        : "";
    const shippingNote = `Shipping: ${
      shippingMethod === "standard" ? "Standard tracked (3-7 days)" : "Express + insurance (1-4 days)"
    }`;
    const notes = [clean(data.notes, 500), shippingNote, discountNote].filter(Boolean).join("\n");

    const { data: order, error } = await context.supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        status: "processing",
        subtotal: totals.itemsTotal,
        shipping: totals.shipping,
        total: totals.total,
        payment_method: paymentMethod,
        contact_name: `${firstName} ${lastName}`.trim(),
        contact_email: email,
        contact_phone: phone,
        shipping_address: shippingAddress,
        notes,
      })
      .select("id, order_number")
      .single();
    if (error) throw error;

    const { error: itemError } = await context.supabase
      .from("order_items")
      .insert(lines.map((line) => ({ ...line, order_id: order.id })));
    if (itemError) throw itemError;

    // Keep the saved profile in step with what they entered at checkout.
    await context.supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        address_line: addressLine,
        city,
        state,
        postcode,
        postal_address: shippingAddress,
      })
      .eq("id", context.userId);

    return {
      id: order.id as string,
      orderNumber: Number(order.order_number),
      reference: `TL-${order.order_number}`,
      subtotal: totals.subtotal,
      discount: totals.discountTotal,
      shipping: totals.shipping,
      total: totals.total,
      paymentMethod,
      shippingMethod,
    };
  });

export const saveOrderPaymentReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; reference: string }) => input)
  .handler(async ({ data, context }) => {
    const reference = clean(data.reference, 160);
    if (reference.length < 6) throw new Error("Please paste the full payment reference.");
    const { error } = await context.supabase
      .from("orders")
      .update({ payment_reference: reference })
      .eq("id", data.orderId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
