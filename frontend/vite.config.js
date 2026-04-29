import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** DEV: browser debug fetch → workspace NDJSON (debug-6a4663.log) for Cursor */
function debugIngestToWorkspaceLog() {
  return {
    name: "debug-ingest-ndjson",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const u = req.url?.split("?")[0] ?? "";
        if (u !== "/__debug/ingest" || req.method !== "POST") {
          return next();
        }
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").trim();
          const logFile = path.resolve(__dirname, "../debug-6a4663.log");
          try {
            if (body) fs.appendFileSync(logFile, body + "\n", "utf8");
          } catch (e) {
            console.warn("[debug-ingest] write failed", e);
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), debugIngestToWorkspaceLog()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: true,

    /* 🔑 이 줄이 핵심 */
    allowedHosts: [
      ".trycloudflare.com",
    ],
  },
});
