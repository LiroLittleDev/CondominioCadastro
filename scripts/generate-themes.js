const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '../src/themes.js');
const outDir = path.resolve(__dirname, '../public');
const outPath = path.join(outDir, 'themes.json');

function extractMapFromSource(src) {
  const keys = ['default', 'blue', 'green', 'orange'];
  const map = {};
  for (const key of keys) {
    const idx = src.indexOf(key + ':');
    if (idx === -1) continue;
    const ct = src.indexOf('createTheme(', idx);
    if (ct === -1) continue;
    // find matching closing parenthesis for createTheme(
    let pos = ct;
    let depth = 0;
    for (; pos < src.length; pos++) {
      const ch = src[pos];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    const block = src.substring(ct, pos + 1);
    const m = block.match(/primary\s*:\s*\{[\s\S]*?main\s*:\s*['"](#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}))['"]/);
    if (m && m[1]) map[key] = m[1];
  }
  return map;
}

function write() {
  try {
    const src = fs.readFileSync(srcPath, 'utf8');
    let map = extractMapFromSource(src);

    // fallback defaults
    const defaults = { default: '#764ba2', blue: '#1565c0', green: '#2e7d32', orange: '#ef6c00' };
    for (const k of Object.keys(defaults)) if (!map[k]) map[k] = defaults[k];

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(map, null, 2), 'utf8');
    console.log('themes.json written to', outPath);
  } catch (e) {
    console.error('Failed to generate themes.json', e);
    process.exit(1);
  }
}

write();
