// Checks the project pages. Usage:
//   node tools/check.mjs [module ...] [--skillforge <path to skillforge repo>]
// Every index.html under <module>/<persona>/ (and its tasks/ pages) must:
// - start its body with the AI note naming one of the personas,
// - load nothing from other sites (scripts, styles, images, fonts, frames),
// - stay under 2 MB with its folder's assets,
// - load in headless Chrome with no JavaScript errors.
// With --skillforge, every project and task link_path in SkillForge's
// data/community/ must have a page here, and every project folder here must
// be listed there.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const sfAt = args.indexOf('--skillforge');
const skillforge = sfAt >= 0 ? path.resolve(args[sfAt + 1]) : null;
const only = args.filter((a, i) => !a.startsWith('--') && (sfAt < 0 || i !== sfAt + 1));
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MAX_BYTES = 2 * 1024 * 1024;
const SKIP = new Set(['kit', 'tools', 'node_modules', '.git']);

const problems = [];
const fail = (where, what) => problems.push(`${path.relative(ROOT, where)}: ${what}`);

const personaNames = (() => {
  const file = skillforge && path.join(skillforge, 'data/community/personas.json');
  if (!file || !fs.existsSync(file)) return null;
  return new Set(JSON.parse(fs.readFileSync(file, 'utf8')).personas.map((p) => p.name));
})();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const modules = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.'))
  .map((e) => e.name)
  .filter((m) => !only.length || only.includes(m));

const pages = [];
for (const module of modules) {
  for (const persona of fs.readdirSync(path.join(ROOT, module), { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const dir = path.join(ROOT, module, persona.name);
    if (!fs.existsSync(path.join(dir, 'index.html'))) fail(dir, 'no index.html');
    const meta = path.join(dir, 'meta.json');
    if (!fs.existsSync(meta)) fail(dir, 'no meta.json');
    else {
      const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
      for (const k of ['module', 'persona', 'title', 'summary']) if (!m[k]) fail(meta, `missing ${k}`);
      if (m.module !== module || m.persona !== persona.name) fail(meta, 'module or persona does not match the folder');
    }
    const files = walk(dir);
    const bytes = files.reduce((n, f) => n + fs.statSync(f).size, 0);
    if (bytes > MAX_BYTES) fail(dir, `${Math.round(bytes / 1024)} KB, over 2 MB`);
    pages.push(...files.filter((f) => path.basename(f) === 'index.html'));
  }
}

const OUTSIDE = [
  /<script[^>]+src\s*=\s*["']?(https?:)?\/\//i,
  /<link[^>]+href\s*=\s*["']?(https?:)?\/\/[^>]*>/i,
  /<(img|iframe|source|video|audio|embed|object)[^>]+(src|data)\s*=\s*["']?(https?:)?\/\//i,
  /@import\s+(url\()?["']?(https?:)?\/\//i,
  /url\(\s*["']?(https?:)?\/\//i
];
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const body = html.split(/<body[^>]*>/i)[1] || '';
  const note = body.trimStart().match(/^<p class="ai-note" data-ai-note><strong>Made by an AI persona\.<\/strong> (.+?) is one of SkillForge's AI personas, not a real person\. AI wrote this (project|page) as an example for teachers\.<\/p>/);
  if (!note) fail(page, 'the body does not start with the AI note from README.md');
  else if (personaNames && !personaNames.has(note[1])) fail(page, `the AI note names "${note[1]}", who is not a persona`);
  if (!/kit\/note\.css/.test(html)) fail(page, 'does not link kit/note.css');
  if (!/<meta[^>]+name=["']viewport/i.test(html)) fail(page, 'no viewport meta tag');
  for (const re of OUTSIDE) if (re.test(html)) fail(page, `loads something from another site (${re.source.slice(0, 30)}...)`);
}
for (const css of pages.flatMap((p) => walk(path.dirname(p)).filter((f) => f.endsWith('.css')))) {
  const text = fs.readFileSync(css, 'utf8');
  if (/@import\s+(url\()?["']?(https?:)?\/\/|url\(\s*["']?(https?:)?\/\//i.test(text)) fail(css, 'loads something from another site');
}

if (skillforge) {
  const read = (sub) => {
    const dir = path.join(skillforge, 'data/community', sub);
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) : [];
  };
  const listed = new Set();
  for (const file of read('projects')) {
    if (only.length && !only.includes(file.module)) continue;
    for (const p of file.projects) {
      listed.add(`${file.module}/${p.persona}`);
      if (!fs.existsSync(path.join(ROOT, file.module, p.persona, 'index.html'))) fail(path.join(ROOT, file.module, p.persona), 'listed in SkillForge but has no page');
    }
  }
  for (const file of read('tasks')) {
    if (only.length && !only.includes(file.module)) continue;
    for (const a of file.answers) {
      if (a.link_path && !fs.existsSync(path.join(ROOT, a.link_path, 'index.html'))) fail(path.join(ROOT, a.link_path), `linked from task answer ${file.module}/${a.item_key}/${a.persona} but has no page`);
    }
  }
  for (const module of modules) {
    for (const persona of fs.readdirSync(path.join(ROOT, module), { withFileTypes: true }).filter((e) => e.isDirectory())) {
      if (!listed.has(`${module}/${persona.name}`)) fail(path.join(ROOT, module, persona.name), 'not listed in SkillForge data/community/projects/');
    }
  }
}

// Load each page from disk in headless Chrome and collect errors.
if (pages.length && fs.existsSync(CHROME)) {
  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
  try {
    for (const page of pages) {
      const tab = await browser.newPage();
      await tab.setViewport({ width: 360, height: 780 });
      const errors = [];
      tab.on('pageerror', (e) => errors.push(e.message));
      tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      tab.on('requestfailed', (r) => { if (!r.url().startsWith('data:')) errors.push(`failed to load ${r.url()}`); });
      await tab.goto(pathToFileURL(page).href, { waitUntil: 'load', timeout: 20000 }).catch((e) => errors.push(e.message));
      await new Promise((r) => setTimeout(r, 400));
      const wide = await tab.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => false);
      if (wide) errors.push('scrolls sideways at 360 px wide');
      for (const e of errors) fail(page, e);
      await tab.close();
    }
  } finally {
    await browser.close();
  }
} else if (pages.length) {
  console.warn(`Chrome not found at ${CHROME}; set CHROME_PATH. Skipped loading the pages.`);
}

if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n${problems.length} problem(s) in ${pages.length} page(s).`);
  process.exitCode = 1;
} else {
  console.log(`${pages.length} page(s) checked, no problems.`);
}
