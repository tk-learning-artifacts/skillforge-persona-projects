/* Runs the notebook on this page. Every .cell shares one MiniPy interpreter,
   like a Colab or Jupyter notebook: a variable made in one cell is there in
   the next. The CSV file comes from data.js. */
(function () {
  'use strict';
  const files = { 'changi_monthly_mean_temp.csv': window.CHANGI_CSV };

  document.querySelectorAll('.notebook').forEach((nb) => {
    const cells = [...nb.querySelectorAll('.cell')];
    let count = 0;
    let target = null;
    let ip = null;
    let running = null;
    const fresh = () => new MiniPy.Interp({
      files,
      out: (t, k) => target && target.con.write(t, k),
      input: () => target.con.ask(),
      figure: (f) => {
        const fig = document.createElement('figure');
        fig.className = 'chart';
        fig.innerHTML = MiniPy.chartSVG(f);
        target.figs.append(fig);
      }
    });
    ip = fresh();

    const parts = cells.map((cell) => {
      const file = cell.dataset.file;
      const label = cell.querySelector('.prompt');
      const ed = PyKit.makeEditor(cell.querySelector('.editor-host'), window.CODE[file], 'Python code, ' + (cell.dataset.title || file));
      const con = PyKit.makeConsole(cell.querySelector('.console-host'));
      const figs = cell.querySelector('.figs');
      const part = { cell, file, label, ed, con, figs };
      cell.querySelector('.run').addEventListener('click', () => runCell(part));
      const reset = cell.querySelector('.reset');
      if (reset) reset.addEventListener('click', () => ed.set(window.CODE[file]));
      return part;
    });

    async function runCell(part) {
      if (running) { ip.stop(); await running; }
      target = part;
      part.con.clear();
      part.figs.textContent = '';
      part.cell.classList.remove('failed');
      part.label.textContent = 'In [*]';
      count += 1;
      const n = count;
      running = ip.run(part.ed.get(), 'Cell In[' + n + ']');
      const err = await running;
      running = null;
      part.label.textContent = 'In [' + n + ']';
      if (err) part.cell.classList.add('failed');
      return err;
    }

    const all = nb.querySelector('.run-all');
    if (all) all.addEventListener('click', async () => {
      all.disabled = true;
      for (const p of parts) { if (await runCell(p)) break; }
      all.disabled = false;
    });
    const restart = nb.querySelector('.restart');
    if (restart) restart.addEventListener('click', async () => {
      if (running) { ip.stop(); await running; }
      ip = fresh();
      count = 0;
      parts.forEach((p) => { p.con.clear(); p.figs.textContent = ''; p.label.textContent = 'In [ ]'; p.cell.classList.remove('failed'); });
    });
    nb.querySelectorAll('.download-file').forEach((b) => b.addEventListener('click', () => {
      const name = b.dataset.name;
      PyKit.download(name, name.endsWith('.csv') ? window.CHANGI_CSV : name.endsWith('.ipynb') ? window.NOTEBOOK : window.CODE[name]);
    }));
  });
  document.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));
})();
