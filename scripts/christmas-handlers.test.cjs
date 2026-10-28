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
const christmas = compile("src/lib/christmas.ts", { zod: require("zod") });
const gate = {};
const builder = () => {
  let validator = (x) => x,
    protectedFn = false;
  const b = {
    middleware(ms) {
      protectedFn = ms.includes(gate);
      return b;
    },
    inputValidator(fn) {
      validator = fn;
      return b;
    },
    handler(fn) {
      return async (args) => {
        if (protectedFn && !args.context?.userId)
          throw Error("Unauthenticated");
        return fn({ ...args, data: validator(args.data) });
      };
    },
  };
  return b;
};
const mocks = {
  "@tanstack/react-start": { createServerFn: builder },
  "@/integrations/supabase/auth-middleware": { requireSupabaseAuth: gate },
  "@/lib/christmas": christmas,
};
for (const p of [
  "catalogue-sections",
  "promotion-banners",
  "pen-cases",
  "product-certificates",
  "storefrontContent",
  "products",
  "order-reference",
  "manual-payment",
  "optional-equipment",
])
  mocks["@/lib/" + p] = {};
const save = compile(
  "src/lib/admin.functions.ts",
  mocks,
).adminSaveChristmasSettings;
let stored,
  writes = 0,
  race = false;
function db(admin) {
  return {
    rpc: async () => ({ data: admin, error: null }),
    from(table) {
      assert.equal(table, "site_content");
      return {
        select() {
          return {
            eq(_key, key) {
              assert.equal(key, christmas.CHRISTMAS_KEY);
              return {
                maybeSingle: async () => ({
                  data: stored === undefined ? null : { body: stored },
                  error: null,
                }),
              };
            },
          };
        },
        insert: async (row) => {
          assert.equal(row.key, christmas.CHRISTMAS_KEY);
          writes++;
          stored = row.body;
          return { error: null };
        },
        update(row) {
          const filters = {};
          return {
            eq(key, value) {
              filters[key] = value;
              return this;
            },
            select: async () => {
              assert.equal(filters.key, christmas.CHRISTMAS_KEY);
              if (race || filters.body !== stored)
                return { data: [], error: null };
              writes++;
              stored = row.body;
              return { data: [{ key: christmas.CHRISTMAS_KEY }], error: null };
            },
          };
        },
      };
    },
  };
}
(async () => {
  const call = (settings, expectedRaw, admin = true, userId = "admin") =>
    save({
      data: { settings, expectedRaw },
      context: { supabase: db(admin), userId },
    });
  await assert.rejects(
    () => call(christmas.CHRISTMAS_DEFAULTS, undefined, true, ""),
    /Unauthenticated/,
  );
  await assert.rejects(
    () => call(christmas.CHRISTMAS_DEFAULTS, undefined, false),
    /Forbidden/,
  );
  assert.equal(writes, 0);
  await assert.rejects(() =>
    call(
      { ...christmas.CHRISTMAS_DEFAULTS, intervalMin: 300, intervalMax: 20 },
      undefined,
    ),
  );
  assert.equal(writes, 0);
  await call({ ...christmas.CHRISTMAS_DEFAULTS, enabled: true }, undefined);
  assert.equal(writes, 1);
  const first = stored;
  assert.equal(JSON.parse(first).enabled, true);
  await assert.rejects(
    () => call(christmas.CHRISTMAS_DEFAULTS, undefined),
    /changed/,
  );
  assert.equal(writes, 1);
  race = true;
  await assert.rejects(
    () => call(christmas.CHRISTMAS_DEFAULTS, first),
    /changed/,
  );
  assert.equal(writes, 1);
  race = false;
  await call(christmas.CHRISTMAS_DEFAULTS, first);
  assert.equal(writes, 2);
  assert.equal(JSON.parse(stored).enabled, false);
  console.log(
    "PASS Christmas actual handler: auth, admin role, timer validation, insert, stale/racing saves, and switch-off; only isolated site_content writes.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
