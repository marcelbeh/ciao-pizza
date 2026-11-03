import fs from "node:fs";
import assert from "node:assert/strict";
const root = new URL("../public/", import.meta.url);
for (const [file, size] of [
  ["apple-touch-icon.png", 180],
  ["icons/icon-192.png", 192],
  ["icons/icon-512.png", 512],
  ["icons/icon-maskable-512.png", 512],
  ["favicon-32.png", 32],
]) {
  const b = fs.readFileSync(new URL(file, root));
  assert.equal(
    b.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    file + ": PNG signature",
  );
  assert.equal(b.toString("ascii", 12, 16), "IHDR");
  assert.equal(b.readUInt32BE(16), size, file + ": width");
  assert.equal(b.readUInt32BE(20), size, file + ": height");
  assert.equal(b.toString("ascii", b.length - 8, b.length - 4), "IEND");
  assert(b.length < 100000, file + ": size budget");
}
for (const file of [
  "brand/ciao-logo.svg",
  "brand/ciao-logo-dark.svg",
  "brand/ciao-wordmark.svg",
  "brand/ciao-wordmark-dark.svg",
  "brand/ciao-app-icon.svg",
  "brand/ciao-app-icon-maskable.svg",
  "favicon.svg",
]) {
  const svg = fs.readFileSync(new URL(file, root), "utf8");
  assert.match(svg, /<svg\s/);
  assert.match(svg, /viewBox="0 0 /);
  assert.match(svg, /<path\s/);
  assert(
    !/<(?:image|script|foreignObject|text)\b|(?:href|src)\s*=/i.test(svg),
    file + ": independent vector paths only",
  );
}
for (const [file, limit] of [
  ["brand/dough-hero.webp", 110000],
  ["brand/dough-hero-small.webp", 35000],
]) {
  const b = fs.readFileSync(new URL(file, root));
  assert.equal(b.toString("ascii", 0, 4), "RIFF");
  assert.equal(b.toString("ascii", 8, 12), "WEBP");
  assert(b.length < limit, file + ": image budget");
}
const font = fs.readFileSync(new URL("fonts/playball-latin.woff2", root));
assert.equal(font.toString("ascii", 0, 4), "wOF2");
assert(font.length < 40000);
for (const file of ["Playball-OFL.txt", "Lato-OFL.txt"])
  assert.match(
    fs.readFileSync(new URL("../docs/brand/" + file, import.meta.url), "utf8"),
    /SIL OPEN FONT LICENSE/,
  );
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(html, /%BASE_URL%apple-touch-icon.png/);
assert.match(html, /%BASE_URL%favicon.svg/);
const config = fs.readFileSync(
  new URL("../vite.config.ts", import.meta.url),
  "utf8",
);
for (const word of [
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "webp",
  "woff2",
  "/ciao-pizza/",
])
  assert(config.includes(word), word + ": manifest/cache");
console.log(
  "Branding: SVGs, PNG dimensions, WebP/font budgets, licenses and PWA links verified.",
);
