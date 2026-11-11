export type Severity = 'error' | 'warning' | 'info';
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface ScanIssue {
  ruleId: string;
  severity: Severity;
  title: string;
  message: string;
  suggestion: string;
  nodeId?: string;
  nodeName?: string;
  path?: string;
}

export interface ScanResult {
  id: string;
  createdAt: string;
  engineVersion: string;
  source: 'n8n';
  summary: {
    nodes: number;
    connections: number;
    errors: number;
    warnings: number;
    info: number;
    rulesEvaluated: number;
    cleanRules: number;
    durationMs: number;
  };
  issues: ScanIssue[];
}

export interface ScanRule {
  id: string;
  severity: Severity;
  title: string;
  description: string;
}

export interface N8nNode {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  typeVersion?: unknown;
  disabled?: unknown;
  parameters?: unknown;
  credentials?: unknown;
  webhookId?: unknown;
  [key: string]: unknown;
}

export interface N8nWorkflow {
  name?: unknown;
  nodes: unknown[];
  connections?: unknown;
  settings?: unknown;
  active?: unknown;
  [key: string]: unknown;
}

export class ScanInputError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
    this.name = 'ScanInputError';
  }
}
