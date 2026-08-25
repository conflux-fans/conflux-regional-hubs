import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

export async function startNextTestServer(environment = {}) {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const nextCli = path.join(projectRoot, "node_modules/next/dist/bin/next");
  const output = [];
  const processHandle = spawn(process.execPath, [nextCli, "start", "-p", String(port)], {
    cwd: projectRoot,
    detached: true,
    env: { ...process.env, ...environment },
    stdio: ["ignore", "pipe", "pipe"],
  });
  processHandle.stdout.on("data", (chunk) => output.push(String(chunk)));
  processHandle.stderr.on("data", (chunk) => output.push(String(chunk)));

  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Next test server exited early.\n${output.join("")}`);
    }
    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.status > 0) {
        return {
          origin,
          async stop() {
            if (processHandle.exitCode !== null) return;
            const exited = new Promise((resolve) => processHandle.once("exit", resolve));
            process.kill(-processHandle.pid, "SIGTERM");
            await exited;
          },
        };
      }
    } catch {
      // The server has not started listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const exited = new Promise((resolve) => processHandle.once("exit", resolve));
  process.kill(-processHandle.pid, "SIGTERM");
  await exited;
  throw new Error(`Next test server did not become ready.\n${output.join("")}`);
}
