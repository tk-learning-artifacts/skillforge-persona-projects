/* Wires up each .bench on the page: pick a program, run it in the console,
   and read or change its code. The programs come from code.js. */
(function () {
  'use strict';
  document.querySelectorAll('.bench').forEach((bench) => {
    const files = bench.dataset.files.split(',');
    const edits = {};
    files.forEach((f) => { edits[f] = window.CODE[f]; });
    let current = files[0];
    const select = bench.querySelector('select');
    const runBtn = bench.querySelector('.run');
    const stopBtn = bench.querySelector('.stop');
    const name = bench.querySelector('.filename');
    const ed = PyKit.makeEditor(bench.querySelector('.editor-host'), edits[current], 'Python code');
    const con = PyKit.makeConsole(bench.querySelector('.console-host'));
    con.write(bench.dataset.hello || 'Press Run to start.\n', 'note');
    let job = null;

    const show = (f) => {
      edits[current] = ed.get();
      current = f;
      ed.set(edits[f]);
      if (name) name.textContent = f;
    };
    if (select) select.addEventListener('change', () => show(select.value));

    runBtn.addEventListener('click', async () => {
      if (job) { job.stop(); await job.done; }
      con.clear();
      const mine = PyKit.runIn(con, ed.get(), current);
      job = mine;
      stopBtn.disabled = false;
      runBtn.textContent = 'Run again';
      const err = await mine.done;
      if (job !== mine) return;
      job = null;
      stopBtn.disabled = true;
      if (!err) con.write('\n[The program has ended.]\n', 'note');
    });
    stopBtn.addEventListener('click', () => { if (job) job.stop(); });
    bench.querySelector('.reset').addEventListener('click', () => { ed.set(window.CODE[current]); });
    bench.querySelector('.copy').addEventListener('click', (e) => PyKit.copy(ed.get(), e.currentTarget));
    bench.querySelector('.download').addEventListener('click', () => PyKit.download(current, ed.get()));
  });
  document.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));
})();
