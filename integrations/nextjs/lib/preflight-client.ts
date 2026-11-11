/** Optional drop-in client for existing AgentPreflight React pages. */
export type Severity = 'error' | 'warning' | 'info';
export interface Issue {
  ruleId: string;
  severity: Severity;
  title: string;
  message: string;
  suggestion: string;
  nodeId?: string;
  nodeName?: string;
  path?: string;
}
export interface Scan {
  id: string;
  createdAt: string;
  engineVersion: string;
  source: 'n8n';
  summary: {
    nodes: number; connections: number; errors: number; warnings: number;
    info: number; rulesEvaluated: number; cleanRules: number; durationMs: number;
  };
  issues: Issue[];
}
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/preflight${path}`, {
    cache: 'no-store',
    ...init,
    headers: { ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers }
  });
  const data = await response.json();
  if (!response.ok) throw new ApiError(response.status, data.error?.message ?? 'Request failed');
  return data as T;
}
export const preflight = {
  health: () => api<{status:string;version:string}>('/health'),
  rules: () => api<{rules:Array<{id:string;title:string;severity:Severity;description:string}>}>('/rules'),
  scan: (workflow: unknown, disabledRuleIds: string[] = []) => api<{scan:Scan}>('/scans', {method:'POST',body:JSON.stringify({ workflow, disabledRuleIds })}),
  history: (limit = 20) => api<{scans:Scan[]}>(`/scans?limit=${encodeURIComponent(limit)}`),
  getScan: (id: string) => api<{scan:Scan}>(`/scans/${encodeURIComponent(id)}`),
  deleteScan: (id: string) => api<{deleted:boolean;id:string}>(`/scans/${encodeURIComponent(id)}`, {method:'DELETE'}),
  compare: (before: string, after: string) => api<{comparison:unknown}>('/compare', {method:'POST',body:JSON.stringify({before,after})}),
  reportUrl: (id: string) => `/api/preflight/scans/${encodeURIComponent(id)}/report.md`
};
