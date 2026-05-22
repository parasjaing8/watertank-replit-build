#!/usr/bin/env node
/**
 * Replit startup script: builds static Expo bundles then starts the server.
 * PORT is set to 5000 for Replit's webview.
 */

const { spawn } = require("child_process");
const path = require("path");

const PORT = process.env.PORT || "5000";

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      cwd: __dirname,
      env: { ...process.env, ...env },
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  console.log("=== WaterTank: Building static Expo bundles ===");
  await run("node", [path.join(__dirname, "scripts", "build.js")]);

  console.log("=== WaterTank: Starting server on port", PORT, "===");
  const server = spawn("node", [path.join(__dirname, "server", "serve.js")], {
    stdio: "inherit",
    cwd: __dirname,
    env: { ...process.env, PORT },
  });

  server.on("error", (err) => {
    console.error("Server failed:", err);
    process.exit(1);
  });

  process.on("SIGTERM", () => server.kill("SIGTERM"));
  process.on("SIGINT", () => server.kill("SIGINT"));
}

main().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
