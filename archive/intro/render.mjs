// Render intro/index.html to intro/heyg-intro.mp4 at 1920x1080 / 60fps / 20s.
// Frame-by-frame deterministic capture using Puppeteer, then ffmpeg encode.

import puppeteer from "puppeteer";
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FPS = 60;
const DURATION = 20; // seconds
const TOTAL_FRAMES = FPS * DURATION; // 1200
const FRAMES_DIR = path.join(__dirname, "frames");
const OUT_PATH = path.join(__dirname, "heyg-intro.mp4");
const HTML_PATH = "file://" + path.join(__dirname, "index.html") + "?render=1";

if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true });
mkdirSync(FRAMES_DIR, { recursive: true });

console.log("→ Launching headless Chrome at 1920x1080…");
const browser = await puppeteer.launch({
  headless: "new",
  args: [
    "--no-sandbox",
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=metal",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1920,1080",
  ],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(HTML_PATH, { waitUntil: "networkidle0" });

// Give fonts a moment to settle (Playfair italic loads async via Google Fonts).
await page.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 600));

// Sanity check: make sure render-mode setTime is wired up.
await page.waitForFunction(() => window.__ready === true, { timeout: 5000 });

console.log(`→ Capturing ${TOTAL_FRAMES} frames…`);
for (let f = 0; f < TOTAL_FRAMES; f++) {
  const t = f / FPS;
  await page.evaluate((tt) => window.setTime(tt), t);
  const out = path.join(FRAMES_DIR, `frame_${String(f).padStart(5, "0")}.png`);
  await page.screenshot({ path: out, type: "png", omitBackground: false, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  if (f % 60 === 0) console.log(`  ${String(f).padStart(4)} / ${TOTAL_FRAMES}`);
}

await browser.close();
console.log("→ Encoding with ffmpeg…");

await new Promise((resolve, reject) => {
  const args = [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(FRAMES_DIR, "frame_%05d.png"),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "16",
    "-preset", "slow",
    "-movflags", "+faststart",
    OUT_PATH,
  ];
  const p = spawn("ffmpeg", args, { stdio: "inherit" });
  p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg exit " + code))));
});

console.log(`✓ Wrote ${OUT_PATH}`);
console.log("  (You can delete intro/frames/ once happy with the MP4.)");
