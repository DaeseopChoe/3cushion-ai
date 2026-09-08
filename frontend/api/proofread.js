/**
 * Vercel Serverless Function — POST /api/proofread
 * Server-only OpenAI proofreading for One-Point Lesson text.
 */

import { runProofread } from "./_lib/proofreadService.js";

const SAFE_ORIGINS = new Set([
  "https://www.3cushionai.com",
  "https://3cushionai.com",
]);

/**
 * Soft same-origin check. Never hard-blocks missing Origin (some clients omit it).
 * Blocks clearly foreign origins when present.
 * @param {import('http').IncomingMessage} req
 */
function isOriginAllowed(req) {
  const origin = String(req.headers.origin || "").trim();
  if (!origin) return true;
  if (SAFE_ORIGINS.has(origin)) return true;
  if (origin.endsWith(".vercel.app")) return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
    return true;
  }
  return false;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({
      error: { code: "METHOD", message: "POST만 지원합니다." },
    });
    return;
  }

  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.includes("application/json")) {
    res.status(415).json({
      error: {
        code: "VALIDATION",
        message: "Content-Type은 application/json이어야 합니다.",
      },
    });
    return;
  }

  if (!isOriginAllowed(req)) {
    res.status(403).json({
      error: { code: "ORIGIN", message: "허용되지 않은 요청입니다." },
    });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({
        error: { code: "VALIDATION", message: "요청 형식이 올바르지 않습니다." },
      });
      return;
    }
  }

  const result = await runProofread({ body });
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(200).json(result.data);
}
