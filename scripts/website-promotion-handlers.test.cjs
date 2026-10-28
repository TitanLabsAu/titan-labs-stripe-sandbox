const fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript"),
  assert = require("node:assert/strict");
function compile(file, mocks) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      Error,
      JSON,
      require: (p) => {
        if (p in mocks) return mocks[p];
        throw Error(p);
      },
    },
  );
  return exports;
}
const rules = compile("src/lib/website-promotion.ts", {
  zod: require("zod"),
  "./variant-promotions": { promotedPrice: (r, s) => (s > 0 && s < r ? s : r) },
});
const gate = {};
const builder = () => {
  let validator = (x) => x,
    auth = false;
  const b = {
    middleware(ms) {
      auth = ms.includes(gate);
      return b;
    },
    inputValidator(fn) {
      validator = fn;
      return b;
    },
    handler(fn) {
      return (a) => {
        if (auth && !a.context?.userId)
          return Promise.reject(Error("Unauthenticated"));
        return Promise.resolve().then(() =>
          fn({ ...a, data: validator(a.data) }),
        );
      };
    },
  };
  return b;
};
const save = compile("src/lib/website-promotion.functions.ts", {
  "@tanstack/react-start": { createServerFn: builder },
  "@/integrations/supabase/auth-middleware": { requireSupabaseAuth: gate },
  "./website-promotion": rules,
}).adminSaveWebsitePromotion;
let stored,
  writes = 0,
  race = false;
const id = "12345678-1234-4234-8234-123456789001";
function db(admin = true) {
  return {
    rpc: async () => ({ data: admin, error: null }),
    from(table) {
      if (table === "products")
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: { id }, error: null }),
        };
      assert.equal(table, "site_content");
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: async () => ({
          data: stored === undefined ? null : { body: stored },
          error: null,
        }),
        insert: async (row) => {
          stored = row.body;
          writes++;
          return { error: null };
        },
        update(row) {
          const filters = {};
          return {
            eq(k, v) {
              filters[k] = v;
              return this;
            },
            select: async () => {
              if (race || filters.body !== stored)
                return { data: [], error: null };
              stored = row.body;
              writes++;
              return {
                data: [{ key: rules.WEBSITE_PROMOTION_KEY }],
                error: null,
              };
            },
          };
        },
      };
    },
  };
}
(async () => {
  const call = (data, admin = true, userId = "admin") =>
    save({ data, context: { supabase: db(admin), userId } });
  const settings = rules.validateWebsitePromotion({
    enabled: true,
    percent: 20,
  });
  await assert.rejects(
    () => call({ settings, expectedRaw: undefined }, true, ""),
    /Unauthenticated/,
  );
  await assert.rejects(
    () => call({ settings, expectedRaw: undefined }, false),
    /Forbidden/,
  );
  await assert.rejects(() =>
    call({ settings: { ...settings, percent: 100 }, expectedRaw: undefined }),
  );
  assert.equal(writes, 0);
  await call({ settings, expectedRaw: undefined });
  assert.equal(JSON.parse(stored).enabled, true);
  await call({ eligibility: { id, included: false }, expectedRaw: stored });
  assert.deepEqual(JSON.parse(stored).excludedProductIds, [id]);
  const before = stored;
  await assert.rejects(
    () => call({ settings, expectedRaw: undefined }),
    /changed/,
  );
  assert.equal(stored, before);
  race = true;
  await assert.rejects(
    () => call({ settings, expectedRaw: stored }),
    /changed/,
  );
  race = false;
  await call({
    settings: { ...settings, enabled: false, excludedProductIds: [] },
    expectedRaw: stored,
  });
  assert.deepEqual(JSON.parse(stored).excludedProductIds, [id]);
  assert.equal(JSON.parse(stored).enabled, false);
  await call({ eligibility: { id, included: true }, expectedRaw: stored });
  assert.deepEqual(JSON.parse(stored).excludedProductIds, []);
  console.log(
    "PASS website promotion handlers: auth, validation, concurrency, exclusions, global save preserves eligibility, and re-inclusion.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
