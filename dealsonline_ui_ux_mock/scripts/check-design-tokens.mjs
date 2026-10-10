#!/usr/bin/env node
/**
 * Design-token guard (DESIGN_RULES.md §2). Fails when app code uses:
 *   - raw Tailwind palette colours (gray-*, slate-*, red-*, emerald-*, …)
 *   - shadows other than shadow-raised / shadow-overlay
 *   - radii above 8px (rounded-xl and up, or arbitrary rounded-[…])
 *
 * shadcn primitives in components/ui are checked for colours only.
 * Run: npm run check:design
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../src/app/', import.meta.url).pathname;
const RULES = [
  { name: 'raw palette colour', re: /\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|placeholder)-(?:gray|slate|zinc|neutral|stone|red|green|emerald|amber|yellow|orange|blue|indigo|rose|pink|purple|violet)-\d{2,3}\b/g, ui: true },
  { name: 'shadow outside the two levels', re: /(?<![\w-])shadow-(?:xs|sm|md|lg|xl|2xl|inner)\b/g, ui: false },
  { name: 'radius above 8px', re: /\brounded-(?:\[(?!inherit)[^\]]+\])/g, ui: false },
];

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(name)) files.push(p);
  }
})(ROOT);

let failures = 0;
for (const file of files) {
  const rel = relative(ROOT, file);
  const inUi = rel.startsWith('components/ui/');
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (inUi && !rule.ui) continue;
      for (const m of line.matchAll(rule.re)) {
        failures++;
        console.log(`${rel}:${i + 1}  ${rule.name}: ${m[0]}`);
      }
    }
  });
}
if (failures) {
  console.log(`\n${failures} design-token violation(s). See DESIGN_RULES.md §2.`);
  process.exit(1);
}
console.log('design tokens: ok');
