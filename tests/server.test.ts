import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { test } from 'node:test';
import { buildServer } from '../src/server.js';
import { FileScanStore } from '../src/store.js';

async function setup() {
  const directory = await mkdtemp(join(tmpdir(),'apf-test-'));
  const server = buildServer(new FileScanStore(directory));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing HTTP listener');
  const base = `http://127.0.0.1:${address.port}`;
  return {
    directory, base,
    async cleanup(){ await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); await rm(directory,{recursive:true,force:true}); }
  };
}

const valid = {nodes:[{id:'1',name:'Manual Trigger',type:'n8n-nodes-base.manualTrigger'},{id:'2',name:'Set',type:'n8n-nodes-base.set'}],connections:{'Manual Trigger':{main:[[{node:'Set',type:'main',index:0}]]}}};
const request = (base:string, body:unknown) => fetch(`${base}/api/scans`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({workflow:body})});

test('health and rules are available', async () => {
  const ctx=await setup();
  try {
    assert.equal((await fetch(`${ctx.base}/api/health`)).status,200);
    const res=await fetch(`${ctx.base}/api/rules`);
    assert.ok(((await res.json()) as {rules:unknown[]}).rules.length>10);
  } finally {await ctx.cleanup();}
});

test('scan/create/list/read/report/delete lifecycle', async () => {
  const ctx=await setup();
  try {
    const response=await request(ctx.base, valid);
    assert.equal(response.status,201);
    const id=((await response.json()) as {scan:{id:string}}).scan.id;
    assert.equal((await fetch(`${ctx.base}/api/scans/${id}`)).status,200);
    const list=((await (await fetch(`${ctx.base}/api/scans`)).json()) as {scans:unknown[]}).scans;
    assert.equal(list.length,1);
    const report=await (await fetch(`${ctx.base}/api/scans/${id}/report.md`)).text();
    assert.match(report,/AgentPreflight Scan Report/);
    const stored=await readFile(join(ctx.directory,`${id}.json`),'utf8');
    assert.ok(!stored.includes('"connections":{')); // raw workflow omitted
    assert.equal((await fetch(`${ctx.base}/api/scans/${id}`,{method:'DELETE'})).status,200);
    assert.equal((await fetch(`${ctx.base}/api/scans/${id}`)).status,404);
    assert.deepEqual(await readdir(ctx.directory),[]);
  } finally {await ctx.cleanup();}
});

test('compare scans detects fixed findings', async () => {
  const ctx=await setup();
  try {
    const broken={...valid, nodes:[...valid.nodes,{id:'3',name:'Isolated',type:'n8n-nodes-base.set'}]};
    const b=((await (await request(ctx.base,broken)).json()) as {scan:{id:string}}).scan.id;
    const a=((await (await request(ctx.base,valid)).json()) as {scan:{id:string}}).scan.id;
    const response=await fetch(`${ctx.base}/api/compare`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({before:b,after:a})});
    assert.equal(response.status,200);
    const json=await response.json() as {comparison:{summary:{resolvedFindings:number}}};
    assert.ok(json.comparison.summary.resolvedFindings>=1);
  } finally {await ctx.cleanup();}
});

test('invalid JSON, workflow shape, content type, and payload length return safe errors', async () => {
  const ctx=await setup();
  try {
    assert.equal((await fetch(`${ctx.base}/api/scans`,{method:'POST',body:'x',headers:{'content-type':'text/plain'}})).status,415);
    assert.equal((await fetch(`${ctx.base}/api/scans`,{method:'POST',body:'{no',headers:{'content-type':'application/json'}})).status,400);
    assert.equal((await request(ctx.base, {wat:1})).status,400);
    assert.equal((await fetch(`${ctx.base}/api/scans?limit=999`)).status,400);
    assert.equal((await request(ctx.base,{nodes:[],secrets:'sk-verysecret'})).status,201);
    const tooLarge='x'.repeat(2*1024*1024+100);
    const response=await fetch(`${ctx.base}/api/scans`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({workflow:tooLarge})});
    assert.equal(response.status,413);
  } finally {await ctx.cleanup();}
});


test('reference web UI, JavaScript, and demo fixture are served with safe headers', async () => {
  const ctx = await setup();
  try {
    const root = await fetch(ctx.base + '/');
    assert.equal(root.status, 200);
    assert.match(root.headers.get('content-security-policy') ?? '', /script-src 'self'/);
    assert.match(await root.text(), /Ship workflows/);
    const script = await fetch(ctx.base + '/app.js');
    assert.equal(script.status, 200);
    assert.match(await script.text(), /function renderGraph/);
    const css = await fetch(ctx.base + '/styles.css');
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type') ?? '', /text\/css/);
    const example = await fetch(ctx.base + '/fixtures/demo-workflow.json');
    assert.equal(example.status, 200);
    const workflow = await example.json() as { nodes: unknown[] };
    assert.equal(workflow.nodes.length, 6);
    const response = await request(ctx.base, workflow);
    assert.equal(response.status, 201);
    const result = await response.json() as { scan: { summary: { errors:number; warnings:number; info:number } } };
    assert.deepEqual([result.scan.summary.errors, result.scan.summary.warnings, result.scan.summary.info], [2, 3, 1]);
  } finally { await ctx.cleanup(); }
});
