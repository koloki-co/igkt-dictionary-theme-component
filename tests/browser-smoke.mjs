// SPDX-FileCopyrightText: 2026 Niclas Andersson and contributors
// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_ENTRY ? resolve(process.env.PLAYWRIGHT_ENTRY) : "playwright");
const base = new URL(process.env.DISCOURSE_URL ?? "http://localhost:3000/");
assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Use an isolated loopback Discourse instance");
const topic = process.env.DICTIONARY_TOPIC_ID;
assert(/^\d+$/.test(topic ?? ""), "Set DICTIONARY_TOPIC_ID to the theme's configured topic ID");
const dictionary = new URL("dictionary", base).href;
const fixture = [
  { id: "demo-star", terms: { en: ["star"], ar: ["نجمة"] }, notes: ["Invented example note"], sources: { en: { star: ["demo"] } } },
  { id: "demo-moon", terms: { en: ["moon"], ar: ["قمر"] } },
];
const raw = ["```dictionary", '{"v":1,"part":1,"parts":1}', ...fixture.map((entry) => JSON.stringify(entry)), "```"].join("\n");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(12_000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(`${base.origin}/**/t/${topic}.json`, (route) => route.fulfill({ json: { posts_count: 1, post_stream: { posts: [{ post_number: 1 }] } } }));
    await page.route(`${base.origin}/**/raw/${topic}/1`, (route) => route.fulfill({ contentType: "text/plain", body: raw }));
    assert.equal((await page.goto(dictionary)).status(), 200);
    const table = page.getByRole("table");
    const star = table.getByRole("cell", { name: /star/ });
    const moon = table.getByRole("cell", { name: /moon/ });
    await star.waitFor();
    await moon.waitFor();
    assert.equal((await page.reload()).status(), 200);
    await star.waitFor();
    await table.getByRole("columnheader", { name: "English" }).waitFor();
    const arabic = table.locator('bdi[lang="ar"]').filter({ hasText: "نجمة" });
    assert.equal(await arabic.evaluate((element) => getComputedStyle(element).direction), "rtl");
    await star.getByRole("link", { name: "Invented catalogue" }).waitFor();
    const search = page.getByRole("searchbox");
    await search.fill("نجمة");
    await moon.waitFor({ state: "hidden" });
    await star.waitFor();
    await search.clear();
    const notes = star.getByRole("button", { name: /show notes/i });
    await notes.focus();
    await page.keyboard.press("Enter");
    await table.getByText("Invented example note").waitFor();
    const expanded = star.getByRole("button", { name: /hide notes/i });
    assert.equal(await expanded.getAttribute("aria-expanded"), "true");
    assert.equal(await expanded.evaluate((element) => document.activeElement === element), true);
    await page.getByRole("button", { name: "Back to forum", exact: true }).press("Enter");
    await page.waitForURL(base.href);
    const book = page.getByRole("button", { name: "Dictionary", exact: true });
    await book.click();
    await page.waitForURL(dictionary);
    await star.waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: navigation, search, credits, RTL text and accessible table and notes controls`);
    await page.close();
  }
} finally {
  await browser.close();
}
