// Rebuilds index.html: every project's meta.json, grouped by module.
//   node tools/build-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['kit', 'tools', 'node_modules', '.git']);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const groups = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.'))
  .map((e) => e.name).sort()
  .map((module) => ({
    module,
    projects: fs.readdirSync(path.join(ROOT, module), { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(ROOT, module, e.name, 'meta.json')))
      .map((e) => JSON.parse(fs.readFileSync(path.join(ROOT, module, e.name, 'meta.json'), 'utf8')))
  }))
  .filter((g) => g.projects.length);

const title = (id) => id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const sections = groups.map((g) => `
  <section>
    <h2>${esc(title(g.module))}</h2>
    <ul>${g.projects.map((p) => `
      <li><a href="${esc(p.module)}/${esc(p.persona)}/">${esc(p.title)}</a><br><span class="muted">${esc(p.summary)}</span></li>`).join('')}
    </ul>
  </section>`).join('');

fs.writeFileSync(path.join(ROOT, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SkillForge persona projects</title>
<link rel="stylesheet" href="kit/note.css">
<link rel="stylesheet" href="kit/base.css">
<style>.muted { color: var(--muted); font-size: 15px; } li { margin: 12px 0; } ul { padding-left: 20px; }</style>
</head>
<body>
<p class="ai-note" data-ai-note><strong>Made by AI personas.</strong> Everything on this site was written by AI, as examples for teachers. The personas are not real people.</p>
<main>
<h1>SkillForge persona projects</h1>
<p>End-of-module projects made by SkillForge's AI personas, for learners to study, compare and argue with.</p>
${sections || '<p>No projects yet.</p>'}
</main>
</body>
</html>
`);
console.log(`index.html: ${groups.reduce((n, g) => n + g.projects.length, 0)} projects in ${groups.length} modules.`);
