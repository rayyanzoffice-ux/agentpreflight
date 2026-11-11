# HTTP API reference (v0.1.0)

**Local origin:** `http://127.0.0.1:8787`. JSON request bodies use `Content-Type: application/json`.

| Method | Endpoint | Action |
| --- | --- | --- |
| `GET` | `/api/health` | Backend health and version |
| `GET` | `/api/rules` | Return the 16 built-in rule definitions |
| `POST` | `/api/scans` | Analyze an n8n workflow and persist redacted scan result |
| `GET` | `/api/scans?limit=20` | Get latest scan results; limit 1–100 |
| `GET` | `/api/scans/:id` | Read one stored result |
| `GET` | `/api/scans/:id/report.md` | Download Markdown report |
| `DELETE` | `/api/scans/:id` | Delete one report |
| `POST` | `/api/compare` | Compare two existing report IDs |

## Submit a scan

```http
POST /api/scans
Content-Type: application/json
```

```json
{
  "workflow": {
    "nodes": [],
    "connections": {},
    "settings": { "timezone": "UTC" }
  },
  "disabledRuleIds": []
}
```

Response `201`:

```json
{
  "scan": {
    "id": "<generated-uuid>",
    "createdAt": "<iso-8601-time>",
    "engineVersion": "0.1.0",
    "source": "n8n",
    "summary": {
      "nodes": 0,
      "connections": 0,
      "errors": 0,
      "warnings": 0,
      "info": 0,
      "rulesEvaluated": 16,
      "cleanRules": 16,
      "durationMs": 0.1
    },
    "issues": []
  }
}
```

Fields such as `id`, `createdAt`, and `durationMs` above are illustrative; they are generated per request.

## Compare scan reports

```json
{ "before": "<first-scan-id>", "after": "<second-scan-id>" }
```

Returns issue signatures newly present or resolved and deltas for errors and warnings. Comparison does not require original workflow JSON.

## Input and safety limits

- Request body maximum: **2 MiB**.
- Workflow node maximum: **20,000**.
- Connection count maximum: **200,000**.
- Diagnostic count maximum: **10,000**; additional findings are truncated.
- Scans are processed synchronously in the local Node.js process.
- Workflow JavaScript, expressions, and node definitions are **not executed**.
- No cross-origin browser access is enabled by default.

Input failures return JSON shaped like `{"error":{"code":"INVALID_JSON","message":"..."}}` with appropriate HTTP status codes. A scan result may contain workflow node names/IDs and should be kept private.

## Security warning

These endpoints are unauthenticated in v0.1.0 and should **not** be made publicly accessible. See [SECURITY.md](../SECURITY.md).
