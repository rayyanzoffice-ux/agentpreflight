# Validation rules — v0.1.0

These **16 built-in checks** are deterministic static heuristics. Finding severity reflects the default rule configuration; it does not certify runtime safety.

| Rule | Severity | Title | What it checks |
| --- | --- | --- | --- |
| `AP001` | error | Invalid node record | Every workflow node must be an object. |
| `AP002` | error | Duplicate node ID | Node identifiers must be unique. |
| `AP003` | error | Duplicate node name | Connection references rely on unique node names. |
| `AP004` | error | Missing node identity | Nodes require a nonempty name, ID, and type. |
| `AP005` | error | Unknown connection source | A connection source must refer to an existing node. |
| `AP006` | error | Unknown connection target | A connection target must refer to an existing node. |
| `AP007` | warning | Isolated node | Executable nodes with no incoming or outgoing connections may be unused. |
| `AP008` | warning | Unreachable node | Nodes not reachable from a known trigger may not execute. |
| `AP009` | info | Disabled node | Disabled nodes will not execute normally. |
| `AP010` | error | Invalid timezone | Explicit workflow timezone must be supported by the runtime. |
| `AP011` | warning | TLS certificate verification disabled | HTTP nodes disabling certificate verification may expose traffic to interception. |
| `AP012` | warning | Command execution node | Execute Command nodes can run operating-system commands; review before deployment. |
| `AP013` | warning | Webhook without authentication | Public webhooks without authentication need deliberate access controls. |
| `AP014` | error | Malformed connection | Connection entries must follow n8n connection structure. |
| `AP015` | warning | Unrecognized credential reference | Credential references missing expected identifiers deserve manual review; they cannot be verified offline. |
| `AP016` | warning | Potential embedded secret | Configuration contains a key or token-like value. Values are not retained or reported. |

## Suppress a rule per scan

The `POST /api/scans` API accepts `disabledRuleIds: ["AP007"]`. The CLI currently does not expose rule-specific suppression. Use this override only when you understand the associated risk.

## How to interpret results

- **Error:** the export has a structural inconsistency or invalid explicit metadata likely to need correction.
- **Warning:** a possible runtime or security concern that deserves manual review.
- **Info:** a noteworthy state that might be entirely intentional.

Some nodes may be deliberately disconnected or triggered by platform-specific behavior. TLS, webhook and embedded-secret checks are not a comprehensive security assessment.
