import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { RULES, RULE_INDEX } from './rules.js';
import { ScanInputError, type N8nNode, type N8nWorkflow, type ScanIssue, type ScanResult } from './types.js';

export const ENGINE_VERSION = '0.1.0';
export const MAX_NODES = 20_000;
export const MAX_EDGES = 200_000;
export const MAX_ISSUES = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

// Labels are user-controlled. Remove common access tokens and trim to avoid leaking them in reports.
// This is a defense-in-depth heuristic, not a guarantee of secret removal.
function safeLabel(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.slice(0, 120)
    .replace(/\b(?:Bearer\s+)[\w.\-+/=]+/gi, '[redacted]')
    .replace(/\b(?:sk-[A-Za-z0-9_\-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,}|AIza[A-Za-z0-9_\-]{18,})\b/g, '[redacted]')
    .replace(/[\r\n\t]/g, ' ');
  return cleaned;
}

function isTrigger(node: N8nNode): boolean {
  const type = asString(node.type) ?? '';
  return /(?:trigger|webhook|start)$/i.test(type) || type === 'n8n-nodes-base.manualTrigger';
}
function isNote(node: N8nNode): boolean {
  return asString(node.type)?.endsWith('.stickyNote') ?? false;
}
function paramsOf(node: N8nNode): Record<string, unknown> {
  return isRecord(node.parameters) ? node.parameters : {};
}

/** Parse a workflow export and perform offline static checks. Does NOT execute any nodes or expressions. */
export function analyzeWorkflow(input: unknown, disabledRuleIds: readonly string[] = []): ScanResult {
  const started = performance.now();
  const disabled = new Set(disabledRuleIds);
  if (!isRecord(input) || !Array.isArray(input.nodes)) {
    throw new ScanInputError('INVALID_WORKFLOW', 'Expected an n8n workflow object with a nodes array.');
  }
  const workflow = input as unknown as N8nWorkflow;
  if (workflow.nodes.length > MAX_NODES) {
    throw new ScanInputError('NODE_LIMIT', `Workflow exceeds the ${MAX_NODES} node safety limit.`, 413);
  }

  const issues: ScanIssue[] = [];
  const add = (ruleId: string, detail: Omit<ScanIssue, 'ruleId' | 'severity' | 'title'>): void => {
    if (disabled.has(ruleId) || issues.length >= MAX_ISSUES) return;
    const rule = RULE_INDEX.get(ruleId);
    if (!rule) return;
    issues.push({ ruleId, title: rule.title, severity: rule.severity, ...detail });
  };
  const nodes: N8nNode[] = [];
  const byName = new Map<string, number>();
  const ids = new Set<string>();

  workflow.nodes.forEach((raw, index) => {
    if (!isRecord(raw)) {
      add('AP001', { message: `Node entry ${index} is not an object.`, suggestion: 'Replace the entry with a valid n8n node object.', path: `nodes[${index}]` });
      return;
    }
    const node = raw as N8nNode;
    nodes.push(node);
    const id = asString(node.id);
    const name = asString(node.name);
    const type = asString(node.type);
    if (!id || !name || !type) {
      add('AP004', { message: `Node entry ${index} lacks a required ID, name, or type.`, suggestion: 'Supply nonempty string values for id, name, and type.', nodeId: id, nodeName: safeLabel(name), path: `nodes[${index}]` });
    }
    if (id && ids.has(id)) {
      add('AP002', { message: 'Multiple nodes use the same ID.', suggestion: 'Assign a unique ID to each node.', nodeId: id, nodeName: safeLabel(name), path: `nodes[${index}].id` });
    }
    if (id) ids.add(id);
    if (name && byName.has(name)) {
      add('AP003', { message: 'Multiple nodes share the same name; connections may be ambiguous.', suggestion: 'Rename nodes to use unique names.', nodeId: id, nodeName: safeLabel(name), path: `nodes[${index}].name` });
    }
    if (name && !byName.has(name)) byName.set(name, index);
    if (node.disabled === true && !isNote(node)) {
      add('AP009', { message: 'This node is disabled.', suggestion: 'Confirm the node is intentionally disabled.', nodeId: id, nodeName: safeLabel(name), path: `nodes[${index}].disabled` });
    }
    const params = paramsOf(node);
    if (typeof type === 'string' && /\.httpRequest$/i.test(type) && (params.ignoreSSLIssues === true || params.allowUnauthorizedCerts === true)) {
      add('AP011', { message: 'This HTTP Request node disables TLS certificate validation.', suggestion: 'Enable certificate verification for production traffic.', nodeId: id, nodeName: safeLabel(name), path: `nodes[${index}].parameters.ignoreSSLIssues` });
    }
    if (typeof type === 'string' && /\.executeCommand$/i.test(type)) {
      add('AP012', { message: 'This workflow can execute shell commands.', suggestion: 'Review command inputs, execution permissions and sandboxing.', nodeId: id, nodeName: safeLabel(name), path: `nodes[${index}].type` });
    }
    if (typeof type === 'string' && /\.webhook$/i.test(type) && (params.authentication === 'none' || params.authentication === undefined)) {
      add('AP013', { message: 'This Webhook node has no configured node-level authentication.', suggestion: 'Configure authentication or ensure upstream controls protect the endpoint.', nodeId: id, nodeName: safeLabel(name), path: `nodes[${index}].parameters.authentication` });
    }
    if (isRecord(node.credentials)) {
      for (const [key, cred] of Object.entries(node.credentials)) {
        if (!isRecord(cred) || (!asString(cred.id) && !asString(cred.name))) {
          add('AP015', { message: `Credential reference type ${safeLabel(key) ?? 'unknown'} lacks an ID or name.`, suggestion: 'Inspect the credential mapping in the target n8n instance. Offline scanning cannot verify whether credentials exist.', nodeId: id, nodeName: safeLabel(name), path: `nodes[${index}].credentials` });
        }
      }
    }
    // Never echo candidate values into results or log data.
    const suspectNames = /^(?:api[_-]?key|access[_-]?token|secret|client[_-]?secret|authorization)$/i;
    for (const [key, val] of Object.entries(params)) {
      if (suspectNames.test(key) && typeof val === 'string' && val.trim()) {
        add('AP016', { message: 'A configuration field may contain an embedded secret.', suggestion: 'Use credentials or environment-based secret injection instead.', nodeId: id, nodeName: safeLabel(name), path: `nodes[${index}].parameters.[redacted]` });
        break;
      }
    }
  });

  const inbound = new Map<string, number>();
  const outbound = new Map<string, number>();
  const neighbors = new Map<string, Set<string>>();
  let edgeCount = 0;
  if (workflow.connections !== undefined && !isRecord(workflow.connections)) {
    add('AP014', { message: 'The workflow connections field must be an object.', suggestion: 'Export a valid n8n workflow.', path: 'connections' });
  } else if (isRecord(workflow.connections)) {
    for (const [source, ports] of Object.entries(workflow.connections)) {
      if (!byName.has(source)) {
        add('AP005', { message: 'A connection references a source node not present in nodes.', suggestion: 'Remove the stale connection source or restore the source node.', path: 'connections' });
      }
      if (!isRecord(ports)) {
        add('AP014', { message: 'Connection source ports must be an object.', suggestion: 'Fix the connection data structure.', path: 'connections' });
        continue;
      }
      for (const [portName, outputIndices] of Object.entries(ports)) {
        if (!Array.isArray(outputIndices)) {
          add('AP014', { message: 'Connection port indices must be an array.', suggestion: 'Regenerate or fix the connection data structure.', path: 'connections' });
          continue;
        }
        for (const branches of outputIndices) {
          if (branches === null) continue; // n8n may encode unconnected ports as null
          if (!Array.isArray(branches)) {
            add('AP014', { message: 'Connection output branches must be arrays.', suggestion: 'Fix the connection branch structure.', path: 'connections' });
            continue;
          }
          for (const connection of branches) {
            edgeCount++;
            if (edgeCount > MAX_EDGES) throw new ScanInputError('EDGE_LIMIT', `Workflow exceeds the ${MAX_EDGES} connection safety limit.`, 413);
            if (!isRecord(connection) || !asString(connection.node) || !asString(connection.type) || typeof connection.index !== 'number' || !Number.isInteger(connection.index) || connection.index < 0) {
              add('AP014', { message: 'Connection target must have a node name, type and nonnegative integer index.', suggestion: 'Correct the target connection entry.', path: 'connections' });
              continue;
            }
            const target = connection.node as string;
            if (!byName.has(target)) {
              add('AP006', { message: 'Connection points to a node not present in the workflow.', suggestion: 'Remove the dangling connection or restore its target node.', nodeName: safeLabel(source), path: 'connections' });
              continue;
            }
            if (byName.has(source)) {
              outbound.set(source, (outbound.get(source) ?? 0) + 1);
              inbound.set(target, (inbound.get(target) ?? 0) + 1);
              const next = neighbors.get(source) ?? new Set<string>();
              next.add(target);
              neighbors.set(source, next);
            }
          }
        }
        void portName; // non-main ports (AI tool connections) are intentionally supported
      }
    }
  }

  const settings = workflow.settings;
  if (isRecord(settings) && typeof settings.timezone === 'string' && settings.timezone) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone }); }
    catch { add('AP010', { message: 'Workflow timezone is not a recognized IANA timezone.', suggestion: 'Use a valid IANA timezone such as UTC or Asia/Karachi.', path: 'settings.timezone' }); }
  }

  const triggers = nodes.filter(n => isTrigger(n) && n.disabled !== true).map(n => asString(n.name)).filter((x): x is string => !!x);
  const visited = new Set(triggers);
  const queue = [...triggers];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (!current) continue;
    for (const next of neighbors.get(current) ?? []) {
      if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  nodes.forEach(node => {
    const name = asString(node.name);
    if (!name || isNote(node)) return;
    const id = asString(node.id);
    if (!inbound.has(name) && !outbound.has(name) && !isTrigger(node)) {
      add('AP007', { message: 'The node has no connected incoming or outgoing edges.', suggestion: 'Connect it to the intended workflow path or remove it.', nodeId: id, nodeName: safeLabel(name) });
    } else if (triggers.length > 0 && !visited.has(name) && !isTrigger(node)) {
      add('AP008', { message: 'No path from an enabled trigger reaches this node.', suggestion: 'Check incoming connections and trigger configuration.', nodeId: id, nodeName: safeLabel(name) });
    }
  });

  const severityCount = (severity: ScanIssue['severity']) => issues.filter(i => i.severity === severity).length;
  const distinctRules = new Set(issues.map(i => i.ruleId));
  const rulesEvaluated = RULES.filter(rule => !disabled.has(rule.id)).length;
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    source: 'n8n',
    summary: {
      nodes: workflow.nodes.length,
      connections: edgeCount,
      errors: severityCount('error'),
      warnings: severityCount('warning'),
      info: severityCount('info'),
      rulesEvaluated,
      cleanRules: rulesEvaluated - distinctRules.size,
      durationMs: Math.round((performance.now() - started) * 100) / 100
    },
    issues
  };
}
