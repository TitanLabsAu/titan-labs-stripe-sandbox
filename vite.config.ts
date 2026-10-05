// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Load all env vars (including non-VITE_ server-only ones) into process.env for
// server routes. These are NOT injected into the client bundle.
const serverEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [{
      name: "titan-public-sitemap", apply: "build",
      async buildStart() {
        const origin = "https://titanlabsaus.com";
        const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) throw new Error("Public sitemap configuration unavailable");
        const read = async (table: string, filter: string) => {
          const headers: Record<string,string> = {apikey:key};
          if (!key.startsWith("sb_")) headers["Authorization"] = `Bearer ${key}`;
          const response = await fetch(`${url}/rest/v1/${table}?select=slug&${filter}&limit=10000`,{headers,signal:AbortSignal.timeout(20000)});
          if (!response.ok) throw new Error(`Public sitemap read failed: ${table} (${response.status})`);
          return await response.json() as {slug:string}[];
        };
        const [products,research] = await Promise.all([read("products","active=eq.true"),read("research_entries","published=eq.true")]);
        const paths=["/","/range","/pen-guide","/pens","/calculator","/certificates","/reviews","/referrals","/contact","/research","/terms","/privacy",...products.map(p=>`/product/${encodeURIComponent(p.slug)}`),...research.map(e=>`/research/${encodeURIComponent(e.slug)}`)];
        const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map(p=>`<url><loc>${origin}${p}</loc></url>`).join("")}</urlset>`;
        await writeFile(path.resolve(import.meta.dirname,"public/sitemap.xml"),xml);
      },
    }],
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(import.meta.dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(import.meta.dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(import.meta.dirname, "node_modules/entities"),
      },
    },
  },
});

