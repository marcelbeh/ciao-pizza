// Optional asset preparation with ImageMagick 7. App builds use committed assets.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const css = readFileSync(path.join(root, "src/styles.css"), "utf8");
const color = name => {
  const value = css.match(new RegExp(String.raw`--${name}:\s*(#[a-fA-F0-9]{6})`))?.[1];
  if (!value) throw Error(`Missing design token: ${name}`);
  return value;
};
const background = color("background"), text = color("text");
const font = path.join(root, "public/fonts/inter-variable.ttf");
const output = name => path.join(root, "public", name);
for (const directory of ["icons", "splash"]) mkdirSync(output(directory), { recursive: true });
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

if (!process.argv.includes("--icons-only")) for (const [width, height, ratio] of [
  [375, 667, 2], [375, 812, 3], [390, 844, 3], [393, 852, 3],
  [402, 874, 3], [414, 896, 2], [414, 896, 3], [430, 932, 3], [440, 956, 3],
]) {
  const w = width * ratio, h = height * ratio;
  magick(["-size", `${w}x${h}`, `xc:${background}`, "-font", font,
    "-fill", text, "-pointsize", String(Math.round(w * .13)), "-gravity", "center",
    "-annotate", "+0-32", "FORNO.", "-fill", color("text-secondary"), "-pointsize", String(Math.round(w * .035)),
    "-annotate", `+0+${Math.round(w * .09)}`, "by Marcel", "-strip", "-quality", "86",
    output(`splash/forno-premium-${w}x${h}.jpg`)]);
}
