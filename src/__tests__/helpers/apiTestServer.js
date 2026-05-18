import { spawn } from "child_process";
import { beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import net from "net";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..", "..", "..");
const defaultAuthHeader = `Basic ${Buffer.from("admin:change-me").toString("base64")}`;
const pinAuthHeader = `Basic ${Buffer.from("admin:1234").toString("base64")}`;

function withAuth(rawFetch, authHeader, input, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", authHeader);
  return rawFetch(input, {
    ...init,
    headers,
  });
}

export function setupApiTestServer() {
  const rawFetch = globalThis.fetch.bind(globalThis);
  let serverProcess;
  let testDbDir;
  let testDbPath;
  let baseURL;

  async function getAvailablePort() {
    return new Promise((resolve, reject) => {
      const server = net.createServer();

      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          server.close(() => reject(new Error("No se pudo obtener un puerto disponible")));
          return;
        }

        const { port } = address;
        server.close((closeError) => {
          if (closeError) {
            reject(closeError);
            return;
          }

          resolve(port);
        });
      });

      server.on("error", reject);
    });
  }

  async function waitForServer(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await rawFetch(`${baseURL}/health`);
        if (response.ok) return;
      } catch (_error) {
        // El servidor aún no está listo.
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error("Servidor no respondió después de 3 segundos");
  }

  beforeAll(async () => {
    testDbDir = await mkdtemp(path.join(os.tmpdir(), "control-finanzas-test-"));
    testDbPath = path.join(testDbDir, "finance.db");
    const port = await getAvailablePort();
    baseURL = `http://127.0.0.1:${port}`;

    await new Promise((resolve, reject) => {
      serverProcess = spawn("node", ["finance-server.js"], {
        cwd: projectRoot,
        stdio: "pipe",
        env: {
          ...process.env,
          ALLOWED_ORIGINS: "http://allowed.local",
          BASIC_AUTH_USER: "admin",
          BASIC_AUTH_PASSWORD: "change-me",
          BASIC_AUTH_PIN: "1234",
          DATABASE_PATH: testDbPath,
          PORT: String(port),
        },
      });

      serverProcess.on("error", reject);
      waitForServer().then(resolve).catch(reject);
    });
  });

  afterAll(async () => {
    if (serverProcess) {
      await new Promise((resolve) => {
        serverProcess.kill();
        serverProcess.on("exit", resolve);
      });
    }

    if (testDbDir) {
      await rm(testDbDir, { recursive: true, force: true });
    }
  });

  return {
    url: (relativePath) => `${baseURL}${relativePath}`,
    apiFetch: (relativePath, init = {}) =>
      withAuth(rawFetch, defaultAuthHeader, `${baseURL}${relativePath}`, init),
    pinFetch: (relativePath, init = {}) =>
      withAuth(rawFetch, pinAuthHeader, `${baseURL}${relativePath}`, init),
    rawFetch: (relativePath, init = {}) => rawFetch(`${baseURL}${relativePath}`, init),
    getTestDbPath: () => testDbPath,
  };
}