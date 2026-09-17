import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "node:fs";
import { cpSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_DATASET_DIR = path.resolve(__dirname, "../dataset");

/**
 * Dev-only: POST /api/proofread via the same serverless service module.
 * Server-only env comes from Vite loadEnv (.env.local) — never VITE_* / import.meta.env.
 * @param {Record<string, string>} serverEnv
 */
function proofreadApiDevMiddleware(serverEnv) {
  return {
    name: "proofread-api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] || "";
        if (url !== "/api/proofread") return next();
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              error: { code: "METHOD", message: "POST만 지원합니다." },
            })
          );
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const raw = Buffer.concat(chunks).toString("utf8");
          let body = {};
          try {
            body = raw ? JSON.parse(raw) : {};
          } catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(
              JSON.stringify({
                error: {
                  code: "VALIDATION",
                  message: "요청 형식이 올바르지 않습니다.",
                },
              })
            );
            return;
          }

          const { runProofread } = await import("./api/_lib/proofreadService.js");
          const result = await runProofread({ body, env: serverEnv });
          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          if (!result.ok) {
            res.end(JSON.stringify({ error: result.error }));
            return;
          }
          res.end(JSON.stringify(result.data));
        } catch (err) {
          console.error("[proofread-api-dev]", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              error: {
                code: "INTERNAL",
                message: "교정 요청에 실패했습니다. 다시 시도해 주세요.",
              },
            })
          );
        }
      });
    },
  };
}

/**
 * Dev-only: POST /api/publish-dataset — repo-relative Phase 4-A publisher.
 * Not registered for production / Vercel. No arbitrary path or shell.
 * @param {string} datasetRoot
 */
function publishDatasetApiDevMiddleware(datasetRoot) {
  const MAX_BODY = 1_000_000;
  return {
    name: "publish-dataset-api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] || "";
        if (url !== "/api/publish-dataset") return next();

        const sendJson = (status, body) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(body));
        };

        if (req.method !== "POST") {
          sendJson(405, {
            ok: false,
            reason: "METHOD",
            issues: ["POST만 지원합니다."],
          });
          return;
        }

        const origin = String(req.headers.origin || "").trim();
        if (
          origin &&
          !origin.startsWith("http://localhost:") &&
          !origin.startsWith("http://127.0.0.1:") &&
          !origin.startsWith("http://[::1]:")
        ) {
          sendJson(403, {
            ok: false,
            reason: "ORIGIN_FORBIDDEN",
            issues: ["local-dev-origins-only"],
          });
          return;
        }

        try {
          const chunks = [];
          let total = 0;
          for await (const chunk of req) {
            total += chunk.length;
            if (total > MAX_BODY) {
              sendJson(413, {
                ok: false,
                reason: "BODY_TOO_LARGE",
                issues: [`max:${MAX_BODY}`],
              });
              return;
            }
            chunks.push(chunk);
          }
          const rawText = Buffer.concat(chunks).toString("utf8");
          let body = {};
          try {
            body = rawText ? JSON.parse(rawText) : {};
          } catch {
            sendJson(400, {
              ok: false,
              reason: "body-json-invalid",
              issues: ["JSON parse failed"],
            });
            return;
          }

          const mod = await server.ssrLoadModule(
            "/src/domain/repoPublish/publishDatasetToRepo.ts"
          );
          const handled = mod.handleLocalPublishHttpBody({
            datasetRoot,
            body,
          });
          sendJson(handled.statusCode, handled.body);
        } catch (err) {
          console.error("[publish-dataset-api-dev]", err);
          sendJson(500, {
            ok: false,
            reason: "INTERNAL",
            issues: [
              err instanceof Error ? err.message : "publish middleware failed",
            ],
          });
        }
      });
    },
  };
}

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
      fs.mkdirSync(outDir, { recursive: true });
      cpSync(REPO_DATASET_DIR, outDir, { recursive: true });
      console.log(`[Vite] Copied dataset from ${REPO_DATASET_DIR} to ${outDir}`);
    },
  };
}

export default defineConfig(({ mode }) => {
  // "" prefix → load all keys from .env* (including OPENAI_*), not only VITE_*.
  // Used only by Node-side proofread middleware; never injected into client bundle.
  const serverEnv = loadEnv(mode, __dirname, "");

  return {
    plugins: [
      react(),
      publishedDatasetStatic(),
      proofreadApiDevMiddleware(serverEnv),
      publishDatasetApiDevMiddleware(REPO_DATASET_DIR),
    ],

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
  };
});
