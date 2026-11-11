#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { analyzeWorkflow } from './engine/analyze.js';
import { ScanInputError } from './engine/types.js';
import { toMarkdown } from './report.js';

function help(): void {
  process.stdout.write(`AgentPreflight CLI v0.1.0\n\nUsage:\n  agentpreflight scan workflow.json [--format text|json|markdown] [--fail-on error|warning|never]\n  agentpreflight --help\n\nRuns local, offline n8n workflow checks. Does not execute workflows.\n`);
}
async function main(args: string[]): Promise<number> {
  if (!args.length || args.includes('--help') || args.includes('-h')) { help(); return 0; }
  if (args[0] !== 'scan' || !args[1]) { help(); return 2; }
  const filename = args[1];
  const option = (name: string, fallback: string): string => {
    const i = args.indexOf(name);
    return i === -1 ? fallback : args[i + 1] ?? '';
  };
  const format = option('--format', 'text');
  const failOn = option('--fail-on', 'error');
  if (!['text','json','markdown'].includes(format) || !['error','warning','never'].includes(failOn)) {
    process.stderr.write('Invalid --format or --fail-on option.\n');
    return 2;
  }
  try {
    const file = await stat(filename);
    if (file.size > 2 * 1024 * 1024) throw new ScanInputError('PAYLOAD_TOO_LARGE', 'File exceeds 2 MiB.', 413);
    const raw = await readFile(filename, 'utf8');
    let workflow: unknown;
    try { workflow = JSON.parse(raw) as unknown; }
    catch { throw new ScanInputError('INVALID_JSON', 'File contains invalid JSON.'); }
    const scan = analyzeWorkflow(workflow);
    if (format === 'json') process.stdout.write(JSON.stringify(scan, null, 2) + '\n');
    else if (format === 'markdown') process.stdout.write(toMarkdown(scan));
    else {
      process.stdout.write(`AgentPreflight: ${scan.summary.nodes} nodes, ${scan.summary.connections} connections\n`);
      process.stdout.write(`${scan.summary.errors} errors · ${scan.summary.warnings} warnings · ${scan.summary.info} info\n`);
      for (const issue of scan.issues) process.stdout.write(`  [${issue.severity.toUpperCase()}] ${issue.ruleId} ${issue.title}${issue.nodeName ? ` (${issue.nodeName})` : ''}\n`);
    }
    return failOn === 'never' ? 0 : scan.summary.errors > 0 || (failOn === 'warning' && scan.summary.warnings > 0) ? 1 : 0;
  } catch (error) {
    if (error instanceof ScanInputError) process.stderr.write(`${error.code}: ${error.message}\n`);
    else process.stderr.write('Could not read or analyze workflow file.\n');
    return 2;
  }
}

process.exitCode = await main(process.argv.slice(2));
