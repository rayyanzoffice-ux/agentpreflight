# Changelog

## [0.1.0] — Initial local MVP (2026-11-12)

### Added
- Deterministic, local-first n8n workflow analysis with 16 documented rules.
- Node and connection graph validation, reachability heuristics, and actionable diagnostics.
- Self-hosted HTTP API with report storage, comparison, and Markdown export.
- Command-line interface with text, JSON, Markdown output and configurable exit codes.
- Responsive reference web UI with upload/editor, graph, findings, rule explorer, and scan history.
- Intentionally broken reproducible demo fixture and real UI screenshots.
- Dockerfile, Docker Compose, test suite, CI configuration, and contributor documentation.

### Security and limitations
- Local-only by default; no authentication, rate limiting, or public multi-tenant support.
- Static checks only; no workflow execution or live n8n credential verification.
- Original independently generated Next.js frontend has not been integrated.
