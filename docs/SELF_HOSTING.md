# Self-host AgentPreflight

AgentPreflight v0.1.0 includes a standalone web interface, HTTP API, CLI, and 16 offline validation rules. **No SaaS account or API key is required.**

## Download

Download the latest source archive from [GitHub Releases](https://github.com/rayyanzoffice-ux/agentpreflight/releases), choose **Code → Download ZIP** on the [public repository](https://github.com/rayyanzoffice-ux/agentpreflight), or clone it:

```bash
git clone https://github.com/rayyanzoffice-ux/agentpreflight.git
cd agentpreflight
```

This is the official public repository. The source code is MIT licensed. For troubleshooting, open a GitHub issue with a sanitized workflow fixture.

## Option A — Node.js (fastest)

**Requirements:** Node.js 22 or newer; npm; local filesystem access. Network is needed once to install npm development dependencies, but scanning workflows does not contact third-party services.

```bash
npm install
npm test
npm run dev
```

Visit **http://127.0.0.1:8787**.

From Windows PowerShell:

```powershell
node --version
npm --version
npm install
npm test
npm run dev
```

Leave the terminal running while using the app; press `Ctrl+C` to stop it. If port `8787` is occupied, use `PORT=9000 npm run dev` on Linux/macOS or `$env:PORT=9000; npm run dev` in PowerShell, then open the new port.

You can also run a production-built server with:

```bash
npm run build
npm start
```

### Configure storage

By default the server listens on `127.0.0.1:8787` and stores scan summaries and diagnostics in `.agentpreflight-data/` under your project directory.

| Variable | Default (Node.js) | Description |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Network interface; keep on loopback |
| `PORT` | `8787` | HTTP listener |
| `DATA_DIR` | `./.agentpreflight-data` | On-disk scan reports; not raw workflows |

The web frontend and API share the same origin, so browser CORS setup is unnecessary.

## Option B — Docker Compose (recommended for persistent local use)

**Requirements:** Docker Desktop or Docker Engine with Compose. On Windows, Docker Desktop should be running before the next command.

```bash
docker compose up --build -d
docker compose ps
```

Open **http://127.0.0.1:8787**. The Compose file explicitly binds port `8787` to the host loopback interface, and persists the scan-history directory in the `agentpreflight-data` volume.

```bash
# View server logs
docker compose logs -f

# Stop the app while preserving scan history
docker compose down

# Rebuild and restart after obtaining a new release
docker compose up --build -d
```

### Back up stored scan results

Scan reports are **potentially sensitive**, because node names and configuration paths can reveal internal systems. Copy the volume only to a trusted backup destination. For a Node.js install, back up `.agentpreflight-data/`. For Docker, inspect the volume with `docker volume ls` and use a trusted backup workflow that preserves permissions. Do not publish the data directory.

### Remove all saved history

In the web interface, open **Scan history** and delete reports individually. For a full local reset, stop the service before deleting its scan-data directory or the dedicated Docker volume. `docker compose down -v` deletes the Compose-managed persistent volume **irreversibly**.

## Option C — CLI-only usage

```bash
npm install
npm run build
node dist/src/cli.js scan fixtures/demo-workflow.json --fail-on never
```

Scan your own n8n JSON export:

```bash
node dist/src/cli.js scan /path/to/workflow.json --format markdown --fail-on error
```

The CLI exits with code `0` when the configured severity threshold is not met, `1` when findings meet the threshold, and `2` on usage or input error. It's suitable for local pre-commit or CI checks.

## Confirm the app is healthy

```bash
curl http://127.0.0.1:8787/api/health
```

Expected shape:

```json
{"status":"ok","service":"agentpreflight-backend","version":"0.1.0"}
```

On PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/health
```

## Security boundaries — important

**This release is for trusted local access.** There is no authentication, account separation, tenant isolation, rate limiting, or public upload hardening. Do not port-forward it to the open internet or deploy the Docker container with `-p 0.0.0.0:8787:8787`.

If you need remote access, prefer a private VPN or carefully configured, authenticated reverse proxy with request limiting, TLS, access control, and resource isolation. Those components are **not** included or verified in this repository.

The server does not store raw workflow JSON, but report labels may include user-controlled node names and IDs. Redaction is heuristic rather than a guarantee; do not submit secrets or private workflows to anyone else's instance. See [SECURITY.md](../SECURITY.md).

## Troubleshooting

- **`npm install` fails**: check that Node.js is 22+, npm can reach its package registry, and your firewall permits package downloads.
- **Address already in use (`EADDRINUSE`)**: choose another `PORT` or stop the existing server.
- **Docker isn't available on Windows**: start Docker Desktop, check `docker compose version`, and retry.
- **Health endpoint works but UI doesn't load**: run the app from the project root; the server serves `public/` and `fixtures/` relative to its working directory.
- **Imported workflow won't parse**: export JSON from n8n and verify the root object includes `nodes: []`.
- **Expected credentials are flagged as missing**: this scanner cannot verify credential existence; it only checks reference structure, and may report malformed references.
- **Local server reports API offline in browser**: open the actual server URL (`http://127.0.0.1:8787`), not the HTML file directly from disk.
