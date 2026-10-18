import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/n8n-gateway.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {callGateway,validateLocalRequest}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('local proxy rejects remote host, cross-origin and non-JSON requests',()=>{
  assert.ok(validateLocalRequest(new Request('https://example.com/api/talentflow')));
  assert.ok(validateLocalRequest(new Request('http://localhost/api/talentflow',{headers:{origin:'https://example.com'}})));
  assert.ok(validateLocalRequest(new Request('http://localhost/api/talentflow',{method:'POST',body:'hello'})));
  assert.equal(validateLocalRequest(new Request('http://localhost/api/talentflow',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:'{}'})),null);
});
test('proxy authenticates n8n requests, replaces client token, validates envelope and fails closed',async()=>{
  const previous={base:process.env.N8N_BASE_URL,secret:process.env.N8N_WEBHOOK_SECRET,mode:process.env.N8N_MODE,fetch:globalThis.fetch};
  process.env.N8N_BASE_URL='https://unit-test.example.com';process.env.N8N_WEBHOOK_SECRET='test-secret-'.repeat(6);process.env.N8N_MODE='mock';
  try {
    let seen;
    globalThis.fetch=async(url,options)=>{seen={url,options};return Response.json({ok:true,version:'talentflow-v2',result:{jobs:[]}});};
    const result=await callGateway({action:'snapshot',sessionToken:'attacker-chosen'});
    assert.equal(result.ok,true);assert.equal(seen.url,'https://unit-test.example.com/webhook/talentflow-v2');
    assert.equal(seen.options.headers['x-talentflow-secret'],process.env.N8N_WEBHOOK_SECRET);assert.equal(seen.options.redirect,'manual');
    assert.match(JSON.parse(seen.options.body).sessionToken,/^[a-f0-9]{64}$/);
    for(const [status,body,pattern] of [[404,{},/Publish/],[200,{ok:false,error:'Validation failure'},/Validation failure/],[200,{ok:true,version:'old',result:{}},/ناسازگار/],[302,{},/هدایت/]]) {
      globalThis.fetch=async()=>Response.json(body,{status});await assert.rejects(callGateway({action:'snapshot'}),pattern);
    }
    process.env.N8N_WEBHOOK_SECRET='';await assert.rejects(callGateway({action:'snapshot'}),/setup/);
    process.env.N8N_WEBHOOK_SECRET='x'.repeat(64);process.env.N8N_MODE='live';await assert.rejects(callGateway({action:'snapshot'}),/mock/);
  } finally {
    for(const [key,value] of [['N8N_BASE_URL',previous.base],['N8N_WEBHOOK_SECRET',previous.secret],['N8N_MODE',previous.mode]])if(value===undefined)delete process.env[key];else process.env[key]=value;
    globalThis.fetch=previous.fetch;
  }
});

test('Python backend selection uses local API, preserves the envelope, and rejects remote endpoints',async()=>{
  const names=['TALENTFLOW_BACKEND','TALENTFLOW_PYTHON_URL','TALENTFLOW_API_KEY'];
  const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));
  const originalFetch=globalThis.fetch;
  try {
    process.env.TALENTFLOW_BACKEND='python';
    process.env.TALENTFLOW_PYTHON_URL='http://127.0.0.1:8000';
    process.env.TALENTFLOW_API_KEY='test-only-'.repeat(6);
    let seen;
    globalThis.fetch=async(url,options)=>{seen={url,options};return Response.json({ok:true,version:'talentflow-v2',backend:'python-sqlite',result:{jobs:[]}});};
    assert.equal((await callGateway({action:'snapshot'})).backend,'python-sqlite');
    assert.equal(seen.url,'http://127.0.0.1:8000/api/talentflow');
    assert.equal(seen.options.headers['x-talentflow-secret'],process.env.TALENTFLOW_API_KEY);
    process.env.TALENTFLOW_PYTHON_URL='https://example.com';
    await assert.rejects(callGateway({action:'snapshot'}),/loopback/);
    process.env.TALENTFLOW_BACKEND='typo';
    await assert.rejects(callGateway({action:'snapshot'}),/TALENTFLOW_BACKEND/);
  } finally {
    for(const name of names)if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];
    globalThis.fetch=originalFetch;
  }
});
