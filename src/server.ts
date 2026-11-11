import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analyzeWorkflow } from './engine/analyze.js';
import { RULES } from './engine/rules.js';
import { ScanInputError } from './engine/types.js';
import type { ScanStore } from './store.js';
import { compareScans, toMarkdown } from './report.js';

// Allowlisted static paths avoid arbitrary filesystem reads and traversal.
const STATIC_FILES: Readonly<Record<string, [string, string]>> = {
  '/': ['public/index.html', 'text/html; charset=utf-8'],
  '/index.html': ['public/index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['public/styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['public/app.js', 'text/javascript; charset=utf-8'],
  '/favicon.svg': ['public/favicon.svg', 'image/svg+xml'],
  '/fixtures/demo-workflow.json': ['fixtures/demo-workflow.json', 'application/json; charset=utf-8'],
  '/fixtures/valid-workflow.json': ['fixtures/valid-workflow.json', 'application/json; charset=utf-8'],
  '/fixtures/broken-workflow.json': ['fixtures/broken-workflow.json', 'application/json; charset=utf-8']
};
export const MAX_REQUEST_BYTES = 2 * 1024 * 1024;

function json(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'",
    'referrer-policy': 'no-referrer'
  });
  res.end(data);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new ScanInputError('UNSUPPORTED_MEDIA_TYPE', 'Use application/json request bodies.', 415);
  }
  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new ScanInputError('PAYLOAD_TOO_LARGE', 'Request body exceeds the 2 MiB limit.', 413);
  }
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const part of req) {
    const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      throw new ScanInputError('PAYLOAD_TOO_LARGE', 'Request body exceeds the 2 MiB limit.', 413);
    }
    chunks.push(chunk);
  }
  if (!size) throw new ScanInputError('EMPTY_BODY', 'Expected a JSON request body.');
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
  catch { throw new ScanInputError('INVALID_JSON', 'The request body is not valid JSON.'); }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function buildServer(store: ScanStore): Server {
  return createHttpServer(async (req, res) => {
    // Always use the Next.js same-origin proxy when exposing the frontend publicly.
    // Direct cross-origin browser calls are deliberately not enabled.
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    const method = req.method ?? 'GET';
    try {
      const staticFile = STATIC_FILES[pathname];
      if (staticFile && (method === 'GET' || method === 'HEAD')) {
        const [path, contentType] = staticFile;
        const content = await readFile(resolve(process.cwd(), path));
        res.writeHead(200, {
          'content-type': contentType,
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'no-referrer',
          'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
        });
        return res.end(method === 'HEAD' ? undefined : content);
      }
      if (pathname === '/api/health' && method === 'GET') return json(res, 200, { status: 'ok', service: 'agentpreflight-backend', version: '0.1.0' });
      if (pathname === '/api/rules' && method === 'GET') return json(res, 200, { rules: RULES });
      if (pathname === '/api/scans' && method === 'POST') {
        const body = await readJson(req);
        if (!isRecord(body) || !('workflow' in body)) {
          throw new ScanInputError('INVALID_BODY', 'Expected { "workflow": <n8n export> } in request body.');
        }
        let disabledRuleIds: string[] = [];
        if (body.disabledRuleIds !== undefined) {
          if (!Array.isArray(body.disabledRuleIds) || body.disabledRuleIds.some(x => typeof x !== 'string')) {
            throw new ScanInputError('INVALID_BODY', 'disabledRuleIds must be an array of strings.');
          }
          disabledRuleIds = body.disabledRuleIds;
        }
        const result = analyzeWorkflow(body.workflow, disabledRuleIds);
        await store.save(result);
        return json(res, 201, { scan: result });
      }
      if (pathname === '/api/scans' && method === 'GET') {
        const params = new URL(req.url ?? '/', 'http://localhost').searchParams;
        const limitRaw = params.get('limit');
        const limit = limitRaw === null ? 20 : Number(limitRaw);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          throw new ScanInputError('INVALID_LIMIT', 'limit must be an integer from 1 to 100.');
        }
        const scans = await store.list(limit);
        // The history listing contains diagnostics but NEVER uploaded workflows.
        return json(res, 200, { scans });
      }
      if (pathname === '/api/compare' && method === 'POST') {
        const body = await readJson(req);
        if (!isRecord(body) || typeof body.before !== 'string' || typeof body.after !== 'string') {
          throw new ScanInputError('INVALID_BODY', 'Expected { "before": "scan-id", "after": "scan-id" }.');
        }
        const [before, after] = await Promise.all([store.get(body.before), store.get(body.after)]);
        if (!before || !after) return json(res, 404, { error: { code: 'SCAN_NOT_FOUND', message: 'One or both scans could not be found.' } });
        return json(res, 200, { comparison: compareScans(before, after) });
      }
      const match = pathname.match(/^\/api\/scans\/([0-9a-f-]{36})(?:\/(report\.md))?$/i);
      if (match && match[1]) {
        const id = match[1];
        if (method === 'DELETE' && !match[2]) {
          const deleted = await store.delete(id);
          return deleted ? json(res, 200, { deleted: true, id }) : json(res, 404, { error: { code: 'SCAN_NOT_FOUND', message: 'Scan not found.' } });
        }
        if (method === 'GET') {
          const result = await store.get(id);
          if (!result) return json(res, 404, { error: { code: 'SCAN_NOT_FOUND', message: 'Scan not found.' } });
          if (match[2]) {
            res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8', 'content-disposition': `attachment; filename="agentpreflight-${id}.md"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
            return res.end(toMarkdown(result));
          }
          return json(res, 200, { scan: result });
        }
      }
      return json(res, 404, { error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } });
    } catch (error) {
      if (error instanceof ScanInputError) {
        return json(res, error.status, { error: { code: error.code, message: error.message } });
      }
      // Never return raw exceptions or workflow data to callers.
      return json(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' } });
    }
  });
}
