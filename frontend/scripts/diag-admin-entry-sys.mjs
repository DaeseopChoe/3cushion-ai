/**
 * ADMIN 진입 직후 shotType trace (Search 없음).
 */
import { chromium } from "playwright";

const BASE = process.env.DIAG_URL || "http://localhost:5174/";
const TAG =
  /\[ADMIN_ENTRY_SYS\]|\[EMPTY_ADMIN_SYS_CREATED\]|\[ADMIN_SYS_FROM_SLOT\]|\[ADMIN_SYS_FROM_RECALL\]|\[SYNC_ADMIN_SYS\]/;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const captured = [];

page.on("console", (msg) => {
  const text = msg.text();
  if (TAG.test(text)) captured.push(text);
});

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.keyboard.press("Control+Shift+R");
await page.waitForTimeout(1200);
await page.keyboard.press("Control+Shift+A");
await page.waitForTimeout(2000);

console.log("=== ADMIN ENTRY (no Search) ===");
for (const line of captured) {
  console.log(line);
  console.log("---");
}
console.log(`=== COUNT: ${captured.length} ===`);

await browser.close();
