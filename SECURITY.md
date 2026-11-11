# Security policy

## Supported versions

AgentPreflight **v0.1.0** is a local single-user prototype, not a production-hardened public service. Security-related bug reports are welcome, but public network exposure is not supported.

## Boundaries

- Runs deterministic static checks, **not** workflow or expression execution.
- The included service binds to `127.0.0.1` unless reconfigured. Docker Compose also publishes only to host loopback.
- Scans use a 2 MiB body cap, a 20,000-node cap, a 200,000-edge cap, and a 10,000-diagnostic cap.
- Raw uploaded workflow JSON is **not saved to disk** by the backend.
- Stored scan **results** can contain node names, IDs, and paths. These may be sensitive even after best-effort token redaction.
- The HTTP API has **no authentication, authorization, multi-tenancy, rate limiting, or production abuse protection**.
- The current analyzer does **not** establish whether credential references exist, secrets are absent, live APIs are reachable, or workflows are safe to execute.

**Never expose this prototype to untrusted internet clients.** Do not upload private workflows to instances you do not control.

## Reporting a vulnerability

Please do **not** post an exploit, token, or private workflow in a public issue. Use GitHub's **Report a vulnerability** / private vulnerability reporting feature if enabled on the published repository. If that private reporting channel is not available, request a secure contact route without revealing exploit details publicly.

Provide a minimal, non-sensitive reproduction, impact, affected version, and expected mitigation once a private channel is agreed.

No guaranteed response window or bug bounty is currently offered.
