// Optional asset preparation with ImageMagick 7. App builds use committed assets.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
// Preserve the approved opaque oven icon background independently of the selected UI theme.
const background = "#090908";
const output = name => path.join(root, "public", name);
for (const directory of ["icons"]) mkdirSync(output(directory), { recursive: true });
function magick(args) {
  const result = spawnSync("magick", args, { stdio: "inherit" });
  if (result.status !== 0) throw Error("Asset preparation requires ImageMagick 7.");
}
const icon = path.join(root, "docs/brand/forno-app-icon.png");
for (const [name, size] of [
  ["icons/forno-oven-v1-192.png", 192], ["icons/forno-oven-v1-512.png", 512],
  ["icons/forno-oven-v1-maskable-512.png", 512], ["apple-touch-icon-oven-v1.png", 180],
  ["favicon-oven-v1-32.png", 32], ["favicon-oven-v1-64.png", 64],
]) {
  const artwork = name.includes("maskable") ? Math.round(size * .84) : size;
  magick([icon, "-resize", `${artwork}x${artwork}`, "-background", background,
    "-gravity", "center", "-extent", `${size}x${size}`, "-colorspace", "sRGB",
    "-alpha", "off", "-depth", "8", "-define", "png:color-type=2", "-strip", output(name)]);
}
// Conventional Safari discovery path in addition to the explicit, versioned link.
copyFileSync(output("apple-touch-icon-oven-v1.png"), output("apple-touch-icon.png"));
