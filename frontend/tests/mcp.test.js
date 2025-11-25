const { spawn } = require('child_process');
const path = require('path');

const SERVER_PORT = 3002;
const SERVER_CWD = path.resolve(__dirname, '..');
const SERVER_CMD = 'node';
const SERVER_ARGS = ['server.js'];

function waitForHealth(url, timeout = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      fetch(url)
        .then((res) => {
          if (res.ok) return resolve(true);
          throw new Error('not ok');
        })
        .catch(() => {
          if (Date.now() - start > timeout) return reject(new Error('timeout waiting for health'));
          setTimeout(poll, 300);
        });
    })();
  });
}

let proc = null;

beforeAll(async () => {
  proc = spawn(SERVER_CMD, SERVER_ARGS, {
    cwd: SERVER_CWD,
    env: Object.assign({}, process.env, { PORT: String(SERVER_PORT), NODE_ENV: 'production' }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout.on('data', (d) => process.stdout.write(`[srv] ${d}`));
  proc.stderr.on('data', (d) => process.stderr.write(`[srv-err] ${d}`));

  await waitForHealth(`http://localhost:${SERVER_PORT}/mcp/health`, 60000);
}, 30000);

afterAll(() => {
  if (proc) proc.kill();
});

test('MCP health and context endpoints respond correctly', async () => {
  const health = await fetch(`http://localhost:${SERVER_PORT}/mcp/health`);
  expect(health.ok).toBe(true);
  const hjson = await health.json();
  expect(hjson.status).toBe('ok');

  const resp = await fetch(`http://localhost:${SERVER_PORT}/mcp/v1/context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'ci' }),
  });
  expect(resp.ok).toBe(true);
  const j = await resp.json();
  expect(j.ok).toBe(true);
});
