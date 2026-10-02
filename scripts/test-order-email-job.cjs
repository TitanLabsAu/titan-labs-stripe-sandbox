const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const js = ts.transpileModule(fs.readFileSync('src/lib/order-email-retry.server.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;
async function authenticate(header, secret, managed = false) {
  const exports = {};
  vm.runInNewContext(js, {exports, Response, process: {env: {AUSPOST_CRON_SECRET: secret}}, require(path) {
    if (path === '@/integrations/supabase/cron-auth') return {authenticateCronRequest: async () => managed ? null : new Response('Unauthorized', {status: 401})};
    if (path === 'node:crypto') return require(path);
    throw new Error('Authentication must not invoke email workers');
  }});
  return exports.authenticateOrderEmailJob(new Request('https://example.test/api/public/order-email-retry', {headers: header ? {authorization: header} : {}}));
}
(async () => {
  assert.equal(await authenticate('Bearer managed', 'existing-job-key', true), null);
  assert.equal(await authenticate('Bearer existing-job-key', 'existing-job-key'), null);
  for (const header of [null, 'Bearer wrong', 'Bearer existing-job-key,extra', 'Basic existing-job-key', 'Bearer existing-job-key extra']) {
    assert.equal((await authenticate(header, 'existing-job-key')).status, 401);
  }
  assert.equal((await authenticate('Bearer existing-job-key', undefined)).status, 401);
  console.log('Order email job authentication checks passed; no emails sent');
})().catch(error => {console.error(error); process.exitCode = 1});
