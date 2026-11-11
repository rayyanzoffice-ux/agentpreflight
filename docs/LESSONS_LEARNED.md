# Engineering lessons demonstrated by AgentPreflight

This is a technical case study of decisions and tradeoffs in v0.1.0, not a claim that one developer has personally mastered every topic.

## 1. A useful developer tool needs a deterministic core

Rather than ask an LLM to guess whether a workflow is broken, the prototype parses n8n JSON and applies 16 explicit rules. Every finding has a stable rule ID, severity, message, and suggested action. This makes behavior easier to test, reproduce, and review in pull requests.

**Lesson:** explainable, predictable checks often make a better first version than non-deterministic AI features.

## 2. Graphs matter in automation systems

Visual editors are graphs, not just JSON objects. The analyzer constructs a directed graph from n8n connection references and checks source/target validity, isolated nodes, and reachability from known triggers. Its traversal follows connected nodes rather than guessing based on screen position.

**Lesson:** graph modeling, map/set data structures, and traversal algorithms are directly useful in developer infrastructure. **Limitation:** real workflows may have specialized triggers or valid disconnected components, so reachability warnings are deliberately non-fatal heuristics.

## 3. Shared logic reduces product inconsistency

The browser calls the API, while the CLI calls the same `analyzeWorkflow` function directly. Both produce equivalent diagnostics; the CLI adds configurable exit behavior for local automation or CI.

**Lesson:** isolate domain logic from delivery surfaces and avoid building separate rule systems for each product interface.

## 4. Security and privacy influence architecture early

This release intentionally avoids executing uploaded workflow nodes and doesn't store raw workflow JSON. The HTTP server has a 2 MiB request cap and binds to loopback by default. Stored diagnostics can still expose user-supplied names, IDs, and paths; best-effort redaction is **not** a privacy guarantee.

**Lesson:** reduce exposure by default, document what data remains sensitive, and never market a static analyzer as a full security scanner.

## 5. Good tests include failure modes

Automated tests cover valid and invalid inputs, dangling connections, malformed graphs, CLI exit codes, report lifecycle, and scan comparisons. The demo fixture includes intentionally faulty configuration so developers can reproduce the findings themselves.

**Lesson:** a visible failing example often builds more confidence than a polished but untestable success animation.

## 6. Developer experience drives adoption

The same codebase offers a local dashboard, CLI, HTTP API, fixture examples, Docker Compose, and GitHub-ready documentation. Users can try it without creating an account or buying API credits.

**Lesson:** installation, reproducible examples, actionable error messages, and honest limitations are as important as new features.

## 7. Know when *not* to add infrastructure

A file-based report store and dependency-light server are appropriate for a local single-user prototype. They are **not** sufficient for multi-user production hosting. Such a system would need stronger resource isolation, authentication, persistent transactional storage, abuse protection, and operational observability.

**Lesson:** choose the smallest architecture that solves the current problem while making future limits explicit.

## What an interviewer can inspect

- A real rule engine with named rules and test fixtures.
- Graph traversal and validation of untrusted JSON.
- API design and clear typed result contracts.
- Storage, privacy and operational tradeoffs.
- Repeatable build/test tooling and CI guidance.
- A screenshot backed by a working app, not fabricated marketing metrics.

**Suggested follow-up measurements:** benchmark scan latency against node/edge counts, characterize false-positive rate using real anonymized n8n exports, measure memory usage under malformed inputs, and publish regression fixtures for every reported bug. These are next steps, not completed benchmarks.
