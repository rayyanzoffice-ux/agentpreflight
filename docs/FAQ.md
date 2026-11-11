# FAQ

**What is AgentPreflight?** A local-first static analyzer for exported n8n workflows, with a dashboard, CLI, and HTTP API.

**Who is it for?** n8n creators, automation engineers, AI-agent builders, teams reviewing workflow JSON in code review, and developers learning tooling fundamentals.

**What problem does it solve?** It identifies structural and configuration issues such as dangling connections, unreachable nodes and suspicious settings before deployment.

**Does it need AI credits?** No. There is no LLM dependency in v0.1.0.

**Does it send my workflow to a cloud server?** Not by default. The included UI sends JSON to the HTTP API running on the same self-hosted machine. Never upload sensitive workflows to an untrusted instance.

**Are credentials safe?** The engine doesn't execute workflow code, but diagnostics and logs may contain user-supplied names or paths. Secret detection/redaction is heuristic. This tool is not a secret manager or complete security audit.

**Can it verify if my n8n credentials exist?** No. It only checks certain credential reference shapes in offline JSON.

**Does it execute nodes or contact external APIs?** No. Static analysis only.

**Can it scan an n8n export without n8n installed?** Yes. Export JSON from another n8n machine and analyze it locally.

**Why do I see warnings in a working workflow?** Reachability and security checks are heuristics; some patterns are intentional. Read rule guidance and review the affected node.

**Does it have a public hosted demo?** Not in this release. A local working demo is included and documented with screenshots.

**Can I deploy it to the public internet?** Do not publish the unauthenticated prototype. Add authorization, rate limiting, data isolation, and operational controls first.

**What is the tech stack?** TypeScript, Node.js HTTP, a lightweight browser reference UI, Docker, and Node's test runner. The independent pre-existing Next.js frontend was not supplied, so it is not claimed as integrated here.

**Where are scans saved?** `.agentpreflight-data/` for Node.js or the dedicated `agentpreflight-data` Docker volume. Raw uploaded workflow JSON is not stored by the server.

**Is the project MIT-licensed?** Yes; see [LICENSE](../LICENSE).

**How can I contribute?** Open an issue with a minimal anonymized fixture and expected diagnostics, or submit a tested pull request according to [CONTRIBUTING.md](../CONTRIBUTING.md).
