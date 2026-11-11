import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { analyzeWorkflow, MAX_NODES } from '../src/engine/analyze.js';
import { ScanInputError } from '../src/engine/types.js';

async function fixture(name: string) {
  const url = new URL(`../../fixtures/${name}`, import.meta.url);
  return JSON.parse(await readFile(url, 'utf8')) as unknown;
}

test('valid two-node n8n workflow produces zero diagnostics', async () => {
  const result = analyzeWorkflow(await fixture('valid-workflow.json'));
  assert.equal(result.summary.errors, 0);
  assert.equal(result.summary.warnings, 0);
  assert.equal(result.summary.nodes, 2);
  assert.equal(result.summary.connections, 1);
});

test('broken workflow detects unique IDs, dangling targets, isolated nodes, unsafe TLS, webhook auth, timezone', async () => {
  const result = analyzeWorkflow(await fixture('broken-workflow.json'));
  for (const code of ['AP002','AP006','AP007','AP010','AP011','AP013']) {
    assert.ok(result.issues.some(issue => issue.ruleId === code), `${code} not emitted`);
  }
});

test('rules can be disabled per scan', async () => {
  const result = analyzeWorkflow(await fixture('broken-workflow.json'), ['AP002','AP011']);
  assert.ok(!result.issues.some(i => i.ruleId === 'AP002' || i.ruleId === 'AP011'));
});

test('strict workflow root rejects arrays, blank payloads, invalid nodes', () => {
  for (const payload of [null, [], {}, {nodes: null}]) {
    assert.throws(() => analyzeWorkflow(payload), ScanInputError);
  }
});

test('node limit prevents huge workflow computations', () => {
  assert.throws(() => analyzeWorkflow({nodes: Array(MAX_NODES + 1).fill({})}), /safety limit/);
});

test('malformed connections do not crash and emit diagnostics', () => {
  const result = analyzeWorkflow({ nodes: [{id:'x',name:'A',type:'n8n-nodes-base.manualTrigger'}], connections: {A:{main:[[{node:'B',type:'main',index:0}],{}]}} });
  assert.ok(result.issues.some(i => i.ruleId === 'AP014'));
  assert.ok(result.issues.some(i => i.ruleId === 'AP006'));
});

test('unreachable but connected nodes are flagged when there is a trigger', () => {
  const nodes = [
    {id:'1',name:'Manual Trigger',type:'n8n-nodes-base.manualTrigger'},
    {id:'2',name:'A',type:'n8n-nodes-base.set'},
    {id:'3',name:'B',type:'n8n-nodes-base.set'}
  ];
  const connections = {A:{main:[[{node:'B',type:'main',index:0}]]}};
  const result = analyzeWorkflow({nodes,connections});
  assert.ok(result.issues.some(x => x.ruleId==='AP008' && x.nodeName==='A'));
});

test('secret-like configuration values never enter diagnostics or output', () => {
  const sensitive = 'mytopsecret-value-1234567890';
  const result = analyzeWorkflow({nodes:[{id:'1',name:'Key',type:'n8n-nodes-base.set',parameters:{apiKey:sensitive}}]});
  assert.ok(result.issues.some(i => i.ruleId==='AP016'));
  assert.ok(!JSON.stringify(result).includes(sensitive));
});

test('N8n AI tool connection ports are parsed', () => {
  const result = analyzeWorkflow({nodes:[
    {id:'1',name:'A',type:'n8n-nodes-base.manualTrigger'},
    {id:'2',name:'B',type:'@n8n/n8n-nodes-langchain.toolCalculator'}
  ],connections:{A:{ai_tool:[[{'node':'B','type':'ai_tool','index':0}]]}}});
  assert.equal(result.summary.connections, 1);
});

test('sticky notes do not emit isolated-node warnings', () => {
  const r = analyzeWorkflow({nodes:[{id:'note',name:'Note',type:'n8n-nodes-base.stickyNote'}]});
  assert.equal(r.summary.warnings, 0);
});
