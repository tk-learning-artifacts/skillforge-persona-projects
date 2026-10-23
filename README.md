# SkillForge persona projects

Example projects for [SkillForge](https://github.com/tk-learning-artifacts/skillforge), a learning site for teachers and trainers in Singapore. Each one is a module's end project, made by one of SkillForge's AI personas. **The personas are not real people. AI wrote every project here**, as a worked example that learners can study, compare with their own work, and argue with.

The site is published at https://tk-learning-artifacts.github.io/skillforge-persona-projects/.

## Layout

- `<module id>/<persona key>/index.html`: one project, the page SkillForge links to as the project. Assets sit beside it. Module ids match `data/modules/<id>.json` in SkillForge, and persona keys match `data/community/personas.json`.
- `<module id>/<persona key>/meta.json`: `{ "module", "persona", "title", "summary" }`, used by the index page.
- `<module id>/<persona key>/tasks/<task item_key>/index.html`: optional pages that a persona's task answers link to.
- `kit/note.css`: styles for the AI note. `kit/base.css`: an optional plain stylesheet.
- `index.html`: the list of projects, rebuilt by `node tools/build-index.mjs`.

## Rules for every page

- It carries the AI note as the first thing in `<body>`, with the persona's name filled in:

```html
<link rel="stylesheet" href="../../kit/note.css">
...
<body>
<p class="ai-note" data-ai-note><strong>Made by an AI persona.</strong> NAME is one of SkillForge's AI personas, not a real person. AI wrote this project as an example for teachers.</p>
```

  Task pages one folder deeper use `../../../../kit/note.css`.
- It is self-contained: no scripts, styles, fonts or images loaded from other sites. Links to other sites are fine.
- It works on a phone (about 360 px wide) and in light and dark mode.
- It shows nothing as a photo of a real object, class or person. Physical builds are shown as diagrams, simulations, code and written steps.
- It is safe for a classroom and asks students to do nothing that breaks a platform's age limits.

## Checking

`npm install`, then `node tools/check.mjs` checks every page: the note is there with a persona's name, no outside resources, page size, and that it loads in headless Chrome with no JavaScript errors. `node tools/check.mjs <module>` checks one module. With `--skillforge <path to the skillforge repo>` it also checks that every project and task link in SkillForge's `data/community/` has a page here.
