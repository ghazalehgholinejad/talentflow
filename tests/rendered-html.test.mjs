import assert from "node:assert/strict";
import test from "node:test";
import { Miniflare } from "miniflare";
import { fileURLToPath } from "node:url";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const runtime = new Miniflare({
    modules: true,
    scriptPath: fileURLToPath(new URL('../dist/server/index.js', import.meta.url)),
    modulesRoot: fileURLToPath(new URL('../dist/server', import.meta.url)),
    modulesRules: [{type:'ESModule',include:['**/*.js'],fallthrough:true}],
    compatibilityDate:'2026-04-01', compatibilityFlags:['nodejs_compat'],
    serviceBindings:{ASSETS:()=>new Response('Not found',{status:404})},
  });
  try {
    const response=await runtime.dispatchFetch('http://localhost/',{headers:{accept:'text/html'}});
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type')||'',/^text\/html\b/i);
    assert.match(await response.text(),developmentPreviewMeta);
  } finally { await runtime.dispose(); }
});
