import { describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";

const saved = {
  home_headline: "Custom saved brand",
  header_tagline: "Custom saved tagline",
  header_layout: "centred",
  "cms:nav_header": JSON.stringify({ links: [{ label: "Owner link", url: "/research", visible: true }] }),
};
let missing = false;
let failing = false;
mock.module("../src/lib/catalog.functions", () => ({
  getSiteContent: async () => { if (failing) throw new Error("Offline"); return missing ? {} : saved; },
  listSiteLinks: async () => { if (failing) throw new Error("Offline"); return missing ? [] : [{ id: "public-link", label: "Research", url: "/research", sort_order: 1 }]; },
}));
const { loadSiteChrome, dehydrateSiteChrome, hydrateSiteChrome, siteContentQuery, siteLinksQuery } = await import("../src/lib/site-chrome-query");
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("shared chrome first-render parity", () => {
  test("saved custom branding and links survive JSON transport before the first client observer", async () => {
    const server = client();
    await loadSiteChrome(server);
    const browser = client();
    hydrateSiteChrome(browser, JSON.parse(JSON.stringify(dehydrateSiteChrome(server))));
    const firstContent = new QueryObserver(browser, siteContentQuery).getCurrentResult().data;
    const firstLinks = new QueryObserver(browser, siteLinksQuery).getCurrentResult().data;
    expect(firstContent).toEqual(saved);
    expect(firstContent).toEqual(server.getQueryData(siteContentQuery.queryKey));
    expect(firstLinks).toEqual(server.getQueryData(siteLinksQuery.queryKey));
    server.clear(); browser.clear();
  });
  test("missing CMS preserves identical empty inputs for existing fallback rules", async () => {
    missing = true;
    try {
      const server = client(); const browser = client();
      await loadSiteChrome(server);
      hydrateSiteChrome(browser, dehydrateSiteChrome(server));
      expect(new QueryObserver(browser, siteContentQuery).getCurrentResult().data).toEqual({});
      expect(new QueryObserver(browser, siteLinksQuery).getCurrentResult().data).toEqual([]);
      server.clear(); browser.clear();
    } finally { missing = false; }
  });
  test("failed reads transfer a consistent fallback without overwriting saved data", async () => {
    failing = true;
    try {
      const server = client(); const browser = client();
      await loadSiteChrome(server);
      hydrateSiteChrome(browser, dehydrateSiteChrome(server));
      expect(browser.getQueryData(siteContentQuery.queryKey)).toEqual({});
      expect(browser.getQueryData(siteLinksQuery.queryKey)).toEqual([]);
      expect(saved.home_headline).toBe("Custom saved brand");
      server.clear(); browser.clear();
    } finally { failing = false; }
  });
  test("transfer excludes member and commerce caches and isolates requests", async () => {
    const server = client();
    await loadSiteChrome(server);
    server.setQueryData(["member"], { private: true });
    server.setQueryData(["cart-quote"], { total: 123 });
    const browser = client();
    hydrateSiteChrome(browser, dehydrateSiteChrome(server));
    expect(browser.getQueryData(["member"])).toBeUndefined();
    expect(browser.getQueryData(["cart-quote"])).toBeUndefined();
    expect(client().getQueryData(siteContentQuery.queryKey)).toBeUndefined();
    server.clear(); browser.clear();
  });
});