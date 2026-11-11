# Contributing to AgentPreflight

Thanks for considering a contribution. The goal is an understandable, trustworthy tool for workflow preflight checks.

## Local development

Requires Node.js 22+ and npm.

```bash
npm install
npm run typecheck
npm test
npm run dev
```

The browser app is served at `http://127.0.0.1:8787`. Run the CLI with `node dist/src/cli.js scan fixtures/demo-workflow.json` after `npm run build`.

## Good contribution types

- A reproducible false positive or missed issue with a **minimal, fully anonymized** n8n export.
- New static validation rule with documented scope, rule ID, suggestion, and tests.
- Improvements to accessibility, responsive layout, or rule explanations.
- Security-hardening fixes or tests that do not run workflow expressions.
- Better documentation, Windows setup instructions, and examples.

## Coding guidelines

- Keep `analyzeWorkflow` deterministic and offline. Never run n8n node code or expressions in static analysis.
- Keep HTTP, CLI, persistence, and rule engine concerns separate.
- Use strict TypeScript; avoid broad `any` and hidden network calls.
- New rules should have stable IDs and tests for valid and invalid cases.
- Avoid logging raw workflow JSON, credentials, or token-like parameters.
- Report known limitations and false positives instead of overstating detection accuracy.

## How to submit a pull request

1. Open or find an issue describing the intended behavior.
2. Fork the repository and create a focused branch.
3. Add or update fixture-driven tests.
4. Run `npm test` and `npm run typecheck`.
5. Update README/docs if user-visible behavior changes.
6. Explain the problem, solution, test result, and any privacy/security impact in the PR.

**Do not attach production workflow JSON** without removing service endpoints, personal information, credentials, customer names, tokens, and private identifiers. If you find a vulnerability, follow [SECURITY.md](SECURITY.md) instead of opening a public exploit issue.
