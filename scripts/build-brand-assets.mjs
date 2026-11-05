// Manual asset preparation only. App builds use the committed files, no ImageMagick dependency.
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const original = path.join(root, "docs/brand/forno-original.jpg");
const icon = path.join(root, "docs/brand/forno-icon-source.png");
const output = (name) => path.join(root, "public", name);
for (const directory of ["brand", "icons", "splash"]) mkdirSync(output(directory), { recursive: true });
function magick(args) {
  const result = spawnSync("magick", args, { stdio: "inherit" });
  if (result.status !== 0) throw Error("Asset preparation failed. ImageMagick 7 is required.");
}
for (const size of [480, 960]) {
  magick([original, "-resize", `${size}x${size}`, "-strip", "-quality", "88", output(`brand/forno-logo-${size}.webp`)]);
}
for (const [name, size] of [
  ["icons/forno-192.png", 192], ["icons/forno-512.png", 512],
  ["icons/forno-maskable-512.png", 512], ["apple-touch-icon-forno.png", 180],
  ["favicon-forno-32.png", 32], ["favicon-forno-64.png", 64],
]) {
  // Keep the complete generated derivative and its maskable safe margins.
  magick([icon, "-resize", `${size}x${size}`, "-strip", output(name)]);
}
// Portrait iPhone launch images. Android uses the manifest icon and Midnight background.
const screens = [
  [375, 667, 2], [375, 812, 3], [390, 844, 3], [393, 852, 3],
  [402, 874, 3], [414, 896, 2], [414, 896, 3], [430, 932, 3], [440, 956, 3],
];
for (const [width, height, ratio] of screens) {
  const w = width * ratio, h = height * ratio;
  const logoSize = Math.round(width * ratio * .74);
  magick(["-size", `${w}x${h}`, "xc:#101820", "(", original,
    "-resize", `${logoSize}x${logoSize}`, ")", "-gravity", "center", "-composite",
    "-strip", "-sampling-factor", "4:2:0", "-quality", "86", output(`splash/forno-${w}x${h}.jpg`)]);
}
