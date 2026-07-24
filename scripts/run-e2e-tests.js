import { execSync } from "node:child_process";
import { spawn } from "node:child_process";
import https from "node:https";
import { join } from "node:path";

const PORT = process.env.PORT || 8888;
const TIMEOUT = 60000;

let serverProcess;

function cleanup() {
  if (serverProcess) {
    try {
      serverProcess.kill("SIGTERM");
    } catch {
      // Server already stopped
    }
  }
}

console.log(`Building client...`);
execSync("npm run build:client", { stdio: "inherit" });

console.log(`Starting server on port ${PORT}...`);
serverProcess = spawn("node", ["src/server.js"], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(PORT) },
});

// Wait for server to be ready (ignore cert errors for health check)
const waitPromise = new Promise((resolve, reject) => {
  const start = Date.now();
  const check = () => {
    const req = https.get(`https://localhost:${PORT}/`, { rejectUnauthorized: false }, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        setTimeout(check, 200);
      }
    });
    req.on("error", () => {
      if (Date.now() - start > TIMEOUT) {
        reject(new Error(`Server did not start within ${TIMEOUT}ms`));
      } else {
        setTimeout(check, 200);
      }
    });
    req.end();
  };
  check();
});

waitPromise
  .then(() => {
    console.log(`Server is ready, running e2e tests...`);
    try {
      execSync("npx playwright test", { stdio: "inherit" });
    } finally {
      cleanup();
    }
  })
  .catch((err) => {
    console.error(`Error: ${err.message}`);
    cleanup();
    process.exit(1);
  });

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
