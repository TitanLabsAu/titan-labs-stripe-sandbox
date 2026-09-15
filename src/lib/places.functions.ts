import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) {
    throw new Error("Address lookup is not configured.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
  };
}

async function assertOk(response: Response) {
  if (response.ok) return;
  const body = await response.text();
  console.error(`Places gateway failed [${response.status}]: ${body}`);
  throw new Error(`Address lookup failed [${response.status}].`);
}

export type AddressSuggestion = { placeId: string; label: string };

export const suggestAddresses = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string; sessionToken: string }) =>
    z
      .object({
        query: z.string().trim().min(3).max(200),
        sessionToken: z.string().trim().min(8).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<AddressSuggestion[]> => {
    const response = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
      method: "POST",
      headers: {
        ...gatewayHeaders(),
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
      },
      body: JSON.stringify({
        input: data.query,
        sessionToken: data.sessionToken,
        includedRegionCodes: ["au"],
        includedPrimaryTypes: ["street_address", "subpremise", "premise", "postal_code", "route"],
      }),
    });
    await assertOk(response);
    const json = (await response.json()) as {
      suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string } } }>;
    };
    return (json.suggestions ?? [])
      .slice(0, 5)
      .map((s) => ({
        placeId: s.placePrediction?.placeId ?? "",
        label: s.placePrediction?.text?.text ?? "",
      }))
      .filter((s) => s.placeId && s.label);
  });

export type ResolvedAddress = {
  address_line: string;
  city: string;
  state: string;
  postcode: string;
  formatted: string;
};

export const resolveAddress = createServerFn({ method: "POST" })
  .inputValidator((input: { placeId: string; sessionToken: string }) =>
    z
      .object({
        placeId: z.string().trim().min(3).max(300),
        sessionToken: z.string().trim().min(8).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ResolvedAddress> => {
    const response = await fetch(
      `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(data.placeId)}?sessionToken=${encodeURIComponent(data.sessionToken)}`,
      {
        method: "GET",
        headers: {
          ...gatewayHeaders(),
          "X-Goog-FieldMask": "formattedAddress,addressComponents",
        },
      },
    );
    await assertOk(response);
    const json = (await response.json()) as {
      formattedAddress?: string;
      addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
    };
    const parts = json.addressComponents ?? [];
    const find = (type: string, short = false) => {
      const c = parts.find((p) => p.types?.includes(type));
      return (short ? (c?.shortText ?? c?.longText) : (c?.longText ?? c?.shortText)) ?? "";
    };
    const subpremise = find("subpremise");
    const streetNumber = find("street_number");
    const route = find("route");
    const street = [streetNumber, route].filter(Boolean).join(" ");
    const addressLine = [subpremise ? `${subpremise}/` : "", street].join("").trim();

    return {
      address_line: addressLine || (json.formattedAddress ?? "").split(",")[0]?.trim() || "",
      city: find("locality") || find("postal_town") || find("administrative_area_level_2"),
      state: find("administrative_area_level_1", true),
      postcode: find("postal_code"),
      formatted: json.formattedAddress ?? "",
    };
  });
