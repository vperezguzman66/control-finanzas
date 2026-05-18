import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  let startPromise;
  let cleanupPromise;

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

  async function ensureServerStarted() {
    if (baseURL) return;
    if (startPromise) {
      await startPromise;
      return;
    }

    startPromise = (async () => {
      testDbDir = await mkdtemp(path.join(os.tmpdir(), "control-finanzas-test-"));
      testDbPath = path.join(testDbDir, "finance.db");
      const port = await getAvailablePort();
      baseURL = `http://127.0.0.1:${port}`;

      await new Promise((resolve, reject) => {
        let settled = false;
        let stderrOutput = "";

        const settle = (callback) => (value) => {
          if (settled) return;
          settled = true;
          callback(value);
        };

        const finishOk = settle(resolve);
        const finishError = settle(reject);

        try {
          serverProcess = spawn(process.execPath, ["finance-server.js"], {
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
        } catch (error) {
          finishError(new Error(`No se pudo iniciar el proceso del servidor de pruebas: ${error.message}`));
          return;
        }

        if (!serverProcess || typeof serverProcess.on !== "function") {
          finishError(new Error("No se pudo iniciar el proceso del servidor de pruebas"));
          return;
        }

        serverProcess.stderr?.on("data", (chunk) => {
          stderrOutput += chunk.toString();
        });

        serverProcess.once("error", (error) => {
          finishError(new Error(`Error al iniciar el servidor de pruebas: ${error.message}`));
        });

        waitForServer()
          .then(() => finishOk())
          .catch((error) => {
            const stderrInfo = stderrOutput.trim()
              ? `\nSalida de error del servidor:\n${stderrOutput.trim()}`
              : "";
            finishError(new Error(`${error.message}${stderrInfo}`));
          });
      });
    })().catch((error) => {
      startPromise = undefined;
      throw error;
    });

    await startPromise;
  }

  async function cleanup() {
    if (cleanupPromise) {
      await cleanupPromise;
      return;
    }

    cleanupPromise = (async () => {
      if (serverProcess && serverProcess.exitCode === null && !serverProcess.killed) {
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 1500);
          serverProcess.on("exit", () => {
            clearTimeout(timeout);
            resolve();
          });
          serverProcess.kill();
        });
      }

      if (testDbDir) {
        await rm(testDbDir, { recursive: true, force: true });
      }
    })();

    await cleanupPromise;
  }

  process.once("exit", () => {
    void cleanup();
  });

  return {
    url: async (relativePath) => {
      await ensureServerStarted();
      return `${baseURL}${relativePath}`;
    },
    apiFetch: async (relativePath, init = {}) => {
      await ensureServerStarted();
      return withAuth(rawFetch, defaultAuthHeader, `${baseURL}${relativePath}`, init);
    },
    pinFetch: async (relativePath, init = {}) => {
      await ensureServerStarted();
      return withAuth(rawFetch, pinAuthHeader, `${baseURL}${relativePath}`, init);
    },
    rawFetch: async (relativePath, init = {}) => {
      await ensureServerStarted();
      return rawFetch(`${baseURL}${relativePath}`, init);
    },
    getTestDbPath: () => testDbPath,
    shutdown: cleanup,
  };
}