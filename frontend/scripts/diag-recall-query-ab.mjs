/**
 * Case A vs Case B — RECALL_QUERY_DEBUG / RECALL_SPATIAL_RESULT capture.
 */
import { chromium } from "playwright";

const BASE = process.env.DIAG_URL || "http://localhost:5174/";
const TAG =
  /\[RECALL_QUERY_DEBUG\]|\[RECALL_SPATIAL_RESULT\]|\[ADMIN_PUBLISHED_RECALL\]/;

async function runCase(browser, label, { doSearch }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const captured = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (TAG.test(text)) captured.push(text);
  });
  page.on("dialog", (d) => {
    captured.push(`[DIALOG] ${d.message()}`);
    void d.accept();
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.keyboard.press("Control+Shift+R");
  await page.waitForTimeout(1200);
  await page.keyboard.press("Control+Shift+A");
  await page.waitForTimeout(500);

  await page.waitForSelector('circle[fill="#f87171"]', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.querySelector('circle[fill="#f87171"]');
    if (!el) throw new Error("red ball not found");
    el.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window })
    );
  });
  await page.waitForTimeout(600);

  if (doSearch) {
    await page.locator('button:has-text("Search")').first().click();
    await page.waitForTimeout(2500);
  }

  await page.locator('button:has-text("Recall")').first().click({ timeout: 10000 });
  await page.waitForTimeout(2000);

  await page.close();
  return { label, captured };
}

const browser = await chromium.launch({ headless: true });
const caseA = await runCase(browser, "Case A (Recall only)", { doSearch: false });
const caseB = await runCase(browser, "Case B (Search then Recall)", { doSearch: true });
await browser.close();

for (const { label, captured } of [caseA, caseB]) {
  console.log(`\n========== ${label} ==========`);
  for (const line of captured) {
    console.log(line);
    console.log("---");
  }
  if (!captured.length) console.log("(no matching logs)");
}
