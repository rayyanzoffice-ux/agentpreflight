import type { ScanResult } from './engine/types.js';

export function toMarkdown(result: ScanResult): string {
  const s = result.summary;
  const lines = [
    '# AgentPreflight Scan Report',
    '',
    `- Scan ID: \`${result.id}\``,
    `- Created: ${result.createdAt}`,
    `- Source: ${result.source}`,
    `- Engine: ${result.engineVersion}`,
    `- Nodes: ${s.nodes}`,
    `- Connections: ${s.connections}`,
    `- Errors: ${s.errors}; Warnings: ${s.warnings}; Info: ${s.info}`,
    '',
    '## Diagnostics',
    ''
  ];
  if (!result.issues.length) lines.push('No issues detected by the enabled static rules.', '');
  for (const issue of result.issues) {
    lines.push(`### ${issue.ruleId} — ${issue.title}`, '', `- Severity: ${issue.severity}`);
    if (issue.nodeId) lines.push(`- Node ID: \`${issue.nodeId.replaceAll('`', '')}\``);
    if (issue.nodeName) lines.push(`- Node: ${issue.nodeName.replace(/[\r\n#*`]/g, ' ')}`);
    if (issue.path) lines.push(`- Path: \`${issue.path}\``);
    lines.push('', issue.message, '', `**Suggested fix:** ${issue.suggestion}`, '');
  }
  lines.push('---', '', 'Static analysis only: does not verify credential existence or execute external actions.', '');
  return lines.join('\n');
}

export function compareScans(before: ScanResult, after: ScanResult) {
  const signature = (issue: ScanResult['issues'][number]) => `${issue.ruleId}:${issue.nodeId ?? ''}:${issue.path ?? ''}`;
  const oldSet = new Set(before.issues.map(signature));
  const newSet = new Set(after.issues.map(signature));
  return {
    before: before.id,
    after: after.id,
    summary: {
      errorsDelta: after.summary.errors - before.summary.errors,
      warningsDelta: after.summary.warnings - before.summary.warnings,
      newFindings: [...newSet].filter(x => !oldSet.has(x)).length,
      resolvedFindings: [...oldSet].filter(x => !newSet.has(x)).length
    },
    newIssues: after.issues.filter(x => !oldSet.has(signature(x))),
    resolvedIssues: before.issues.filter(x => !newSet.has(signature(x)))
  };
}
