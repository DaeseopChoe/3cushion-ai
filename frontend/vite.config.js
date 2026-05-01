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
      server.middlewares.use("/__debug/ingest", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        console.log("INGEST HIT");
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").trim();
          const logFile = path.resolve(__dirname, "../debug-6a4663.log");
          try {
            // 재시작 시에도 기존 로그 유지: truncate 금지. 없을 때만 append로 빈 파일 생성
            if (!fs.existsSync(logFile)) {
              fs.appendFileSync(logFile, "", "utf8");
            }
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
