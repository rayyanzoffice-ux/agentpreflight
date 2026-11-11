# GitHub publishing and launch kit

The packaged source is ready to **upload**, but no GitHub repository or public deployment has been created automatically.

## Recommended GitHub profile details

**Repository owner:** your GitHub account or organization.

**Repository name:** `agentpreflight`

**Repository display title:** **AgentPreflight — Catch broken AI workflows before production**

**Description (copy/paste):**

> Local-first, open-source preflight checks for n8n workflows. Visualize broken connections, risky configs, and diagnostics with a dashboard, CLI & Docker.

**Topics** (add these to the GitHub repository under About):

`n8n`, `workflow-validation`, `ai-agents`, `developer-tools`, `static-analysis`, `typescript`, `automation`, `self-hosted`, `cli`, `devops`, `workflow-automation`, `open-source`

**Website:** Leave blank until a real working demo is deployed. Don't invent a public demo URL.

**Visibility:** Public, if you have reviewed the source and are ready to publish it.

**License:** MIT.

**Suggested initial GitHub release:** `v0.1.0 — Local Preflight MVP`.

## Publish using Git

1. Create a new **public** repository called `agentpreflight` on GitHub. Initialize it **without** a README, since the ZIP contains one.
2. Extract the provided release ZIP and open a terminal **inside the extracted project root**.
3. Run:

```bash
git init
git branch -M main
git add .
git commit -m "feat: launch AgentPreflight v0.1.0 local preflight analyzer"
git remote add origin https://github.com/YOUR_USERNAME/agentpreflight.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. If Git requests authentication, use your normal GitHub credentials or Git Credential Manager. Do not embed tokens in the remote URL.

4. Add the description and topics above in the repository's **About** settings.
5. Check that **Actions → Backend CI** completes successfully.
6. Read README and click screenshots to ensure repository-relative image links resolve.
7. Under **Releases → Draft a new release**, tag `v0.1.0`; attach `agentpreflight-v0.1.0-source.zip` as an optional source package. GitHub also provides source archives for tags automatically.

### Optional protection settings

- Enable Dependabot alerts and secret scanning if available.
- Protect `main` with pull request review and passing checks when the project has maintainers.
- Add issue labels: `bug`, `enhancement`, `documentation`, `good first issue`, `help wanted`, `security`, `n8n`.
- Enable Discussions for support and design proposals once community traffic justifies it.

## Release notes template

**AgentPreflight v0.1.0 — Local Preflight MVP**

> Analyze exported n8n workflows before deployment. This release adds 16 deterministic static rules, actionable diagnostics, a responsive local web dashboard, JSON/Markdown reports, a CLI, and Docker Compose self-hosting.
>
> **Scope:** static analysis only. No workflow execution, live credential verification, MCP adapter, or publicly hosted API is included. The backend is designed for loopback/private access.

**Install:** `npm install && npm run dev`, or `docker compose up --build -d`.

**Try it:** open `http://127.0.0.1:8787` and click **Run example scan**.

**Contribute:** add anonymized fixtures, bug reports, or tested rules.

## Demo and screenshot strategy

The README embeds an authentic screenshot at `screenshots/agentpreflight-dashboard.png`. The visual is reproducible using the provided sample JSON. A **running public demo** needs an actual hosting deployment and abuse controls; it is **not live yet**.

Do not publish a GitHub Pages URL as a working backend unless you've built a browser-only demo or deployed the API separately behind an appropriate security boundary.

## Distribution plan (non-spammy)

- Publish a short 30–60-second screen recording of the real example scan and include one-command installation in the caption.
- Share a technical write-up: how n8n connections become a graph and how the rules identify broken edges.
- Ask for constructive feedback from n8n users, CI/CD developers, and open-source communities; respect each community's posting rules.
- Turn bugs into regression tests with minimized anonymized workflow fixtures.
- Add genuine contributor acknowledgments, release notes, and project metrics **only after they exist**.

**Measure:** unique GitHub contributors, reproducible issue reports, successful installs, bug-to-fix turnaround, test coverage, repeat usage, and authentic stars. Stars aren't guaranteed and shouldn't be purchased or fabricated.

## Job portfolio presentation

**Portfolio headline:** Built AgentPreflight, an MIT-licensed, local-first n8n workflow analyzer with a shared TypeScript validation engine, interactive dashboard, CLI, HTTP API, and Docker deployment.

**Technical narrative:** Designed graph parsing and reachability heuristics, deterministic diagnostics, privacy-aware storage, automated regression fixtures, and local API integrations. Documented security boundaries and avoided executing user workflows.

Keep job application claims tied to verifiable commits, tests, and real adoption. See [engineering lessons](LESSONS_LEARNED.md).
