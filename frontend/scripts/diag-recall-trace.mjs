/**
 * ADMIN Search → Recall console trace capture.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.DIAG_URL || "http://localhost:5174/";
const TAGS =
  /\[ADMIN_SYS_FROM_RECALL\]|\[EMPTY_ADMIN_SYS_CREATED\]|\[SYNC_ADMIN_SYS\]|\[RECALL_READ\]|\[ADMIN_PUBLISHED_RECALL\]|\[ADMIN_INPUT_SESSION\]|\[RECALL_APPLY\]|모드 전환|해당 데이터 없음|먼저 타겟볼/;

const captured = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

page.on("console", (msg) => {
  const text = msg.text();
  if (TAGS.test(text)) captured.push({ ts: Date.now(), text });
});

page.on("dialog", async (d) => {
  const text = `[DIALOG] ${d.message()}`;
  captured.push({ ts: Date.now(), text });
  await d.accept();
});

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

await page.keyboard.press("Control+Shift+A");
await page.waitForTimeout(600);

// Red ball (second) — dispatch dblclick so handleBallDoubleClickForTarget fires
await page.waitForSelector('circle[fill="#f87171"]', { timeout: 10000 });
await page.evaluate(() => {
  const el = document.querySelector('circle[fill="#f87171"]');
  if (!el) throw new Error("red ball not found");
  el.dispatchEvent(
    new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window })
  );
});
await page.waitForTimeout(800);

await page.locator('button:has-text("Search")').first().click();
await page.waitForTimeout(2000);

await page.locator('button:has-text("Recall")').first().click({ timeout: 10000 });
await page.waitForTimeout(2000);

const outPath = new URL("./diag-recall-captured.log", import.meta.url);
const lines = captured.map((r) => r.text).join("\n\n---\n\n");
fs.writeFileSync(outPath, lines, "utf8");

console.log("=== SEARCH→RECALL DIAG (chronological) ===");
for (const row of captured) {
  console.log(row.text);
  console.log("---");
}
console.log(`=== COUNT: ${captured.length} ===`);

await browser.close();
