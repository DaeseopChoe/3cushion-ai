import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "node:fs";
import { cpSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_DATASET_DIR = path.resolve(__dirname, "../dataset");

/** Serve repo-root dataset/ at /dataset (dev) and copy into dist on build. */
function publishedDatasetStatic() {
  const mimeFor = (filePath) => {
    if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
    return "application/octet-stream";
  };

  return {
    name: "published-dataset-static",
    configureServer(server) {
      server.middlewares.use("/dataset", (req, res, next) => {
        if (!req.url) return next();
        const rel = decodeURIComponent(req.url.split("?")[0] || "/");
        const normalized = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
        const filePath = path.join(REPO_DATASET_DIR, normalized);
        if (!filePath.startsWith(REPO_DATASET_DIR)) {
          res.statusCode = 403;
          res.end();
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader("Content-Type", mimeFor(filePath));
        res.end(fs.readFileSync(filePath));
      });
    },
    closeBundle() {
      if (!fs.existsSync(REPO_DATASET_DIR)) return;
      const outDir = path.resolve(__dirname, "dist/dataset");
      cpSync(REPO_DATASET_DIR, outDir, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), publishedDatasetStatic()],

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
