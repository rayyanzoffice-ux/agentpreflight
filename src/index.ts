import { resolve } from 'node:path';
import { buildServer } from './server.js';
import { FileScanStore } from './store.js';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const directory = resolve(process.env.DATA_DIR || './.agentpreflight-data');
const server = buildServer(new FileScanStore(directory));
server.listen(port, host, () => {
  console.log(`AgentPreflight backend running on http://${host}:${port}`);
  if (host !== '127.0.0.1' && host !== '::1' && host !== 'localhost') {
    console.warn('WARNING: API does not implement authentication. Restrict access via a trusted reverse proxy or bind to loopback.');
  }
});
process.once('SIGINT', () => server.close());
process.once('SIGTERM', () => server.close());
