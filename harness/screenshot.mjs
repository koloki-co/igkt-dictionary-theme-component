import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createMockForumServer } from "./mock-forum.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const themeRoot = join(here, "..");
const forumShotDir = join(themeRoot, "..", "igkt-dictionary-forum-data", "screenshots");
const sampleShotDir = join(themeRoot, "screenshots");
const chromePath = process.env.CHROME_PATH || "/usr/bin/google-chrome";

const useForum = process.argv.includes("--forum") || process.env.IGKT_SHOT_DATA === "forum";
const outDir = useForum ? forumShotDir : sampleShotDir;

const { base, close } = await createMockForumServer({ listen: true });
const pageUrl = useForum
  ? `${base}/harness/index.html?topic=99999`
  : `${base}/harness/index.html`;
console.log("serving", pageUrl);

const { default: puppeteer } = await import(
  pathToFileURL("/tmp/igkt-shot/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js").href
);

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

async function shot(page, name) {
  const dest = join(outDir, name);
  await page.screenshot({ path: dest, type: "png" });
  console.log("wrote", dest);
}

try {
  await mkdir(outDir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.goto(pageUrl, { waitUntil: "networkidle0", timeout: 30000 });
  await page.waitForSelector(".igkt-dictionary__table tbody tr", { timeout: 15000 });
  try {
    await page.evaluate(() => document.fonts.ready);
  } catch (e) {
    // Font loading is best-effort; Arial is the CSS fallback.
  }
  await shot(page, "desktop.png");

  await page.select("#from", "sv");
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".igkt-dictionary__letters button")].some((b) => b.textContent === "Å")
  );
  await shot(page, "desktop-sv.png");

  await page.select("#from", "en");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.waitForSelector(".igkt-dictionary__table tbody tr");
  await shot(page, "mobile.png");
} finally {
  await browser.close();
  await close();
}
