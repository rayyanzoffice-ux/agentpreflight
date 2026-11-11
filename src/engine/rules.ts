import type { ScanRule } from './types.js';

export const RULES: readonly ScanRule[] = [
  { id: 'AP001', severity: 'error', title: 'Invalid node record', description: 'Every workflow node must be an object.' },
  { id: 'AP002', severity: 'error', title: 'Duplicate node ID', description: 'Node identifiers must be unique.' },
  { id: 'AP003', severity: 'error', title: 'Duplicate node name', description: 'Connection references rely on unique node names.' },
  { id: 'AP004', severity: 'error', title: 'Missing node identity', description: 'Nodes require a nonempty name, ID, and type.' },
  { id: 'AP005', severity: 'error', title: 'Unknown connection source', description: 'A connection source must refer to an existing node.' },
  { id: 'AP006', severity: 'error', title: 'Unknown connection target', description: 'A connection target must refer to an existing node.' },
  { id: 'AP007', severity: 'warning', title: 'Isolated node', description: 'Executable nodes with no incoming or outgoing connections may be unused.' },
  { id: 'AP008', severity: 'warning', title: 'Unreachable node', description: 'Nodes not reachable from a known trigger may not execute.' },
  { id: 'AP009', severity: 'info', title: 'Disabled node', description: 'Disabled nodes will not execute normally.' },
  { id: 'AP010', severity: 'error', title: 'Invalid timezone', description: 'Explicit workflow timezone must be supported by the runtime.' },
  { id: 'AP011', severity: 'warning', title: 'TLS certificate verification disabled', description: 'HTTP nodes disabling certificate verification may expose traffic to interception.' },
  { id: 'AP012', severity: 'warning', title: 'Command execution node', description: 'Execute Command nodes can run operating-system commands; review before deployment.' },
  { id: 'AP013', severity: 'warning', title: 'Webhook without authentication', description: 'Public webhooks without authentication need deliberate access controls.' },
  { id: 'AP014', severity: 'error', title: 'Malformed connection', description: 'Connection entries must follow n8n connection structure.' },
  { id: 'AP015', severity: 'warning', title: 'Unrecognized credential reference', description: 'Credential references missing expected identifiers deserve manual review; they cannot be verified offline.' },
  { id: 'AP016', severity: 'warning', title: 'Potential embedded secret', description: 'Configuration contains a key or token-like value. Values are not retained or reported.' }
];

export const RULE_INDEX = new Map(RULES.map(rule => [rule.id, rule]));
