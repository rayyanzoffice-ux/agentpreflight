# Roadmap

Status legend: **✅ Implemented**, **🔧 Next**, **💡 Proposed**.

## v0.1.0 — Local preflight MVP ✅

- Local HTTP service and standalone responsive web UI.
- n8n workflow upload and JSON editor.
- 16 static validation rules with severity and remediation suggestions.
- Basic actual node/connection graph visualization.
- Local scan history and comparison.
- JSON export, Markdown report endpoint, CLI output modes.
- Docker Compose local deployment, fixtures, unit tests, MIT license.

## v0.2 — Stronger analysis 🔧

- More n8n version-specific fixtures; explore trigger and AI tool-port edge cases.
- Rule suppression configuration in the web UI, and explain each heuristic.
- Graph layout improvements, keyboard accessibility, and large-workflow virtualization.
- Property-based and fuzz tests for malformed JSON and connection structure.
- Performance benchmarks and continuous regression tests.
- Redaction review and safer report field handling.

## v0.3 — Developer distribution 💡

- Publish a versioned npm CLI package (once a suitable name is available).
- GitHub Actions usage examples and SARIF output.
- Better report comparison and machine-readable baseline support.
- VS Code integration and configurable rule packs.

## v0.4 — Controlled testing 💡

- Mock external service responses for offline integration tests.
- Opt-in authenticated credential-reference checks against a controlled n8n instance.
- Isolated/sandboxed execution research with strict network and secret boundaries.

## Future adapters 💡

- MCP tool configuration validation.
- LangGraph workflow inspection through a separate adapter.
- Ecosystem collaboration to avoid duplicating existing linters.

Features are prioritized by contributor interest and reproducible real-world use cases. This roadmap does not imply promised timelines.
