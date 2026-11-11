# Architecture and design decisions

AgentPreflight is intentionally small enough for contributors to understand without a large framework or paid service.

## Modules

```text
public/                 Browser reference application (HTML, CSS, JavaScript)
fixtures/               Reproducible n8n inputs, including intentionally broken sample
src/engine/analyze.ts    Pure/static graph analysis + diagnostics
src/engine/rules.ts      Rule metadata and identifiers
src/engine/types.ts      Workflow, report, and error types
src/server.ts            HTTP API + same-origin static file serving
src/store.ts             JSON-file scan history (not raw workflows)
src/report.ts            Markdown export and scan comparisons
src/cli.ts               CLI using the same scan engine
src/index.ts             Local service entry point
integrations/nextjs/     Optional Next.js App Router proxy / typed client
tests/                   Engine, API, CLI unit tests
```

## Flow

1. A developer pastes or uploads an exported n8n workflow JSON.
2. The browser POSTs the JSON to the **local** `/api/scans` endpoint.
3. Input limits and structure are checked; an in-memory graph is built.
4. The engine emits deterministic issue objects: rule, severity, affected node/path, and actionable recommendation.
5. The file store saves **scan results** (no original raw workflow JSON).
6. The UI renders metrics, the workflow graph (from JSON still in the browser), and the findings; exports use stored results.
7. CLI callers run the **same** `analyzeWorkflow` implementation without HTTP or persistence.

## Implementation choices

- **Dependency-light Node.js HTTP server:** enough for the local prototype without a full web framework.
- **Shared rule engine:** avoids drift between CLI, API, and UI scan behavior.
- **Explicit finding IDs:** enables suppression, filters, future SARIF export, and CI policies.
- **Graph traversal:** a trigger-rooted traversal flags nodes not reachable through known connections. Reachability is heuristic because n8n has specialized triggers and unusual connection semantics.
- **Local persistence:** JSON reports support history, comparison, and export; the stored representation is intentionally smaller than the full workflow.
- **Same-origin UI + API:** no CORS requirement or external data service.

## Important limitations

- The reference web graph is **not** React Flow. It is a lightweight standalone interface so the backend demo works immediately. The original, separately developed Next.js/React frontend is not integrated in this archive.
- Static rules can emit false positives and do not imply runtime failure or security certification.
- Browser graph rendering is capped at the first 400 nodes; the engine has a separate 20,000-node safety limit.
- Secret-like labels are redacted heuristically, not comprehensively; node names or IDs may expose sensitive data.
- History is a local single-user JSON store; it is not a concurrent transactional database.
- No authentication, tenancy, rate limiting, sandbox execution, live credential verification, n8n synchronization, MCP support, or LangGraph support currently exists.

## Extension path

A future version can split `src/engine/` into an independent browser-compatible library, add a typed integration test layer, support more workflow formats behind adapters, and replace the demo UI with the original verified Next.js frontend. Keep the security boundary explicit: static inspection by default; live execution requires isolated infrastructure and opt-in authorization.
