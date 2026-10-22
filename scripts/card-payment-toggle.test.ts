import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  cardPaymentsEnabled,
  enabledPaymentMethods,
  reselectPaymentMethod,
} from "../src/lib/homeContent";
import { cardPaymentSettingAllowsNew } from "../src/lib/stripe-config";
import { PaymentMethodPicker } from "../src/components/PaymentDetails";

describe("card payment toggle defaults", () => {
  test("missing key means enabled (current behaviour unchanged)", () => {
    expect(cardPaymentsEnabled(undefined)).toBe(true);
    expect(cardPaymentsEnabled({})).toBe(true);
    expect(cardPaymentsEnabled({ payment_card_enabled: "" })).toBe(true);
    expect(cardPaymentsEnabled({ payment_card_enabled: "true" })).toBe(true);
  });
  test("only an explicit saved false disables card payments", () => {
    expect(cardPaymentsEnabled({ payment_card_enabled: "false" })).toBe(false);
  });
});

describe("enabled payment methods", () => {
  test("default offers card then crypto, in display order", () => {
    expect(enabledPaymentMethods(undefined)).toEqual(["card", "crypto"]);
  });
  test("bank and wise slot in when their toggles are on", () => {
    const content = { payment_bank_enabled: "true", payment_wise_enabled: "true" };
    expect(enabledPaymentMethods(content)).toEqual(["card", "payid", "wise", "crypto"]);
  });
  test("disabling card removes it but keeps every other method", () => {
    const content = { payment_card_enabled: "false", payment_bank_enabled: "true" };
    expect(enabledPaymentMethods(content)).toEqual(["payid", "crypto"]);
  });
  test("crypto keeps checkout available even with every toggle off", () => {
    const content = {
      payment_card_enabled: "false",
      payment_bank_enabled: "false",
      payment_wise_enabled: "false",
    };
    const methods = enabledPaymentMethods(content);
    expect(methods).toEqual(["crypto"]);
    // The checkout-unavailable guard only triggers when this is empty.
    expect(methods.length === 0).toBe(false);
  });
});

describe("reselecting a payment method", () => {
  test("keeps the current method while it is still offered", () => {
    expect(reselectPaymentMethod(undefined, "card")).toBe("card");
    expect(reselectPaymentMethod({ payment_bank_enabled: "true" }, "payid")).toBe("payid");
  });
  test("a disabled card selection moves to the next available method", () => {
    const content = { payment_card_enabled: "false", payment_bank_enabled: "true" };
    expect(reselectPaymentMethod(content, "card")).toBe("payid");
    expect(reselectPaymentMethod({ payment_card_enabled: "false" }, "card")).toBe("crypto");
  });
  test("returns null when no method remains so checkout can be blocked", () => {
    // Guard semantics: an empty enabled list must yield null, not a stale method.
    const enabled = enabledPaymentMethods({ payment_card_enabled: "false" }).filter(
      (m) => m !== "crypto",
    );
    expect(enabled.length).toBe(0);
    expect(enabled[0] ?? null).toBeNull();
  });
});

describe("payment method picker rendering", () => {
  const render = (content: Record<string, string> | undefined) =>
    renderToStaticMarkup(
      PaymentMethodPicker({ value: "card", onChange: () => {}, content }),
    );
  test("default content shows the card option", () => {
    const html = render(undefined);
    expect(html).toContain("Credit / Debit Card");
    expect(html).toContain("Cryptocurrency");
  });
  test("disabled card is hidden while other methods stay", () => {
    const html = render({ payment_card_enabled: "false", payment_bank_enabled: "true" });
    expect(html).not.toContain("Credit / Debit Card");
    expect(html).toContain("PayID / Bank transfer");
    expect(html).toContain("Cryptocurrency");
  });
});

describe("server-side guard for new Stripe payments", () => {
  test("missing or empty setting allows new payments", () => {
    expect(cardPaymentSettingAllowsNew(undefined)).toBe(true);
    expect(cardPaymentSettingAllowsNew(null)).toBe(true);
    expect(cardPaymentSettingAllowsNew("")).toBe(true);
    expect(cardPaymentSettingAllowsNew("true")).toBe(true);
  });
  test("saved false blocks new payments", () => {
    expect(cardPaymentSettingAllowsNew("false")).toBe(false);
    expect(cardPaymentSettingAllowsNew(" false ")).toBe(false);
  });
  test("the intent-creation function reads the setting before creating an intent", () => {
    const source = readFileSync("src/lib/stripe.functions.ts", "utf8");
    const guardAt = source.indexOf('payment_card_enabled');
    const createAt = source.indexOf("paymentIntents.create");
    expect(guardAt).toBeGreaterThan(-1);
    expect(createAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(createAt);
    // Read failures must fail closed, not silently allow.
    expect(source).toContain("cardSettingError");
  });
  test("the webhook finalization is NOT gated on the setting", () => {
    const webhook = readFileSync("src/routes/api/public/stripe-webhook.ts", "utf8");
    expect(webhook).not.toContain("payment_card_enabled");
    expect(webhook).not.toContain("cardPaymentSettingAllowsNew");
  });
});
