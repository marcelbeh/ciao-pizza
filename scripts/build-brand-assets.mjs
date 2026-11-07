// Deterministic packaging of the supplied transparent brand. No drawing or font substitution.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = name => path.join(root, 'public', name);
for (const dir of ['brand', 'icons']) mkdirSync(output(dir), { recursive: true });
function magick(args) {
  if (spawnSync('magick', args, { stdio: 'inherit' }).status !== 0) throw Error('ImageMagick 7 required for asset preparation only.');
}
const supplied = path.join(root, 'docs/brand/forno-supplied-logo.png');
const temporary = mkdtempSync(path.join(tmpdir(), 'forno-brand-'));
const cleaned = path.join(temporary, 'clean.png');
// Remove isolated alpha speckles in the supplied export, retaining original antialiased edges.
magick([supplied, '(', '+clone', '-alpha', 'extract', '-threshold', '20%',
  '-define', 'connected-components:area-threshold=800', '-define', 'connected-components:mean-color=true',
  '-connected-components', '8', '-morphology', 'Dilate', 'Disk:2', '-alpha', 'copy', ')',
  '-alpha', 'on', '-compose', 'DstIn', '-composite', cleaned]);
const crop = ['-crop', '1570x430+90+230', '+repage'];
magick([cleaned, ...crop, '-resize', '942x258', '-strip', output('brand/forno-light.png')]);
// Lift only near-black ink to warm ivory, preserving alpha, oven, flame, dot and tricolour.
magick([cleaned, ...crop, '-channel', 'RGB', '-fx', 'max(r,max(g,b))<0.25 ? (u==r ? 0.961 : u==g ? 0.945 : 0.914) : u', '+channel', '-resize', '942x258', '-strip', output('brand/forno-dark.png')]);
for (const [name, size] of [
  ['icons/forno-brand-v2-192.png',192], ['icons/forno-brand-v2-512.png',512],
  ['icons/forno-brand-v2-maskable-512.png',512], ['apple-touch-icon-brand-v2.png',180],
  ['favicon-brand-v2-32.png',32], ['favicon-brand-v2-64.png',64],
]) {
  const width = Math.round(size * (name.includes('maskable') ? .64 : .72));
  magick([cleaned, '-crop', '548x342+96+237', '+repage', '-resize', `${width}x${width}`, '-background', '#F9F6F1', '-gravity', 'center', '-extent', `${size}x${size}`, '-alpha', 'remove', '-alpha', 'off', '-depth', '8', '-strip', output(name)]);
}
copyFileSync(output('apple-touch-icon-brand-v2.png'), output('apple-touch-icon.png'));

rmSync(temporary, { recursive: true, force: true });
