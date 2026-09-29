import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function getFiles(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res = res.concat(getFiles(p));
    else if (p.endsWith('.jsx')) res.push(p);
  }
  return res;
}

const files = getFiles(srcDir);
const classMap = {};
for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  // Match string literals in className="..." or className={`...`}
  const matches1 = [...code.matchAll(/className=["']([^"']+)["']/g)];
  const matches2 = [...code.matchAll(/className={`([^`$]+)`/g)];
  const rel = path.relative(srcDir, file);
  if (!classMap[rel]) classMap[rel] = new Set();
  for (const m of matches1.concat(matches2)) {
    const classes = m[1].split(/\s+/).filter(Boolean);
    classes.forEach(c => classMap[rel].add(c));
  }
}

const css = fs.readFileSync(path.join(srcDir, 'App.css'), 'utf8') + '\n' + fs.readFileSync(path.join(srcDir, 'index.css'), 'utf8');

console.log('=== CSS CLASS ANALYSIS ===\n');
for (const [file, set] of Object.entries(classMap)) {
  const missing = [];
  for (const cls of set) {
    // Format 1: normal class regex
    const escaped1 = cls.replace(/[-\/\\^$*+?.()|[\]{}:%]/g, '\\$&');
    const regex1 = new RegExp('\\.' + escaped1 + '(?=[^a-zA-Z0-9_-]|$)', 'm');
    
    // Format 2: exact substring check for CSS-escaped selector (.md\:flex-row, .bg-rose-500\/10, etc.)
    let cssSelector = '.';
    for (const ch of cls) {
      if ([':', '/', '.', '[', ']'].includes(ch)) {
        cssSelector += '\\' + ch;
      } else {
        cssSelector += ch;
      }
    }
    const hasCssSelector = css.includes(cssSelector);

    if (!regex1.test(css) && !hasCssSelector) {
      missing.push(cls);
    }
  }
  console.log(`${file}: ${set.size} classes, ${missing.length} missing in CSS`);
  if (missing.length > 0) {
    console.log(`  Sample missing: ${missing.slice(0, 12).join(', ')}`);
  }
}
