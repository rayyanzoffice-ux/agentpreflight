import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
const cli = resolve('dist/src/cli.js');
const valid = resolve('fixtures/valid-workflow.json');
const broken = resolve('fixtures/broken-workflow.json');

test('CLI --help succeeds', () => {
  const run = spawnSync(process.execPath,[cli,'--help'],{encoding:'utf8'});
  assert.equal(run.status,0);
  assert.match(run.stdout,/AgentPreflight CLI/);
});
test('CLI reports valid workflow with exit zero', () => {
  const run = spawnSync(process.execPath,[cli,'scan',valid],{encoding:'utf8'});
  assert.equal(run.status,0);
  assert.match(run.stdout,/0 errors/);
});
test('CLI returns failure for bad workflow and machine-readable JSON', () => {
  const run = spawnSync(process.execPath,[cli,'scan',broken,'--format','json'],{encoding:'utf8'});
  assert.equal(run.status,1);
  const result = JSON.parse(run.stdout) as {issues:{ruleId:string}[]};
  assert.ok(result.issues.some(issue => issue.ruleId==='AP006'));
});
test('CLI --fail-on never allows diagnostics without failing build', () => {
  const run = spawnSync(process.execPath,[cli,'scan',broken,'--fail-on','never'],{encoding:'utf8'});
  assert.equal(run.status,0);
});
