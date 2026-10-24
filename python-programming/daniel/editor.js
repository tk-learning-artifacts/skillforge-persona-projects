/* A small code editor (textarea with line numbers) and a console that runs
   code with MiniPy. Tab indents by 4 spaces; press Esc, then Tab, to leave
   the editor. Enter keeps the indent, and adds 4 after a line ending in ":". */
(function () {
  'use strict';

  function makeEditor(host, text, label) {
    host.classList.add('editor');
    const gutter = document.createElement('pre');
    gutter.className = 'gutter';
    gutter.setAttribute('aria-hidden', 'true');
    const ta = document.createElement('textarea');
    ta.spellcheck = false;
    ta.setAttribute('autocapitalize', 'off');
    ta.setAttribute('autocomplete', 'off');
    ta.setAttribute('autocorrect', 'off');
    ta.setAttribute('wrap', 'off');
    ta.setAttribute('aria-label', label);
    host.append(gutter, ta);
    let escaped = false;
    const sync = () => {
      const lines = ta.value.split('\n');
      const n = lines.length;
      ta.style.minWidth = (Math.max(30, ...lines.map((l) => l.length)) + 3) + 'ch';
      let g = '';
      for (let i = 1; i <= n; i++) g += i + '\n';
      gutter.textContent = g;
      ta.rows = n;
    };
    const insert = (s) => {
      ta.focus();
      if (!document.execCommand || !document.execCommand('insertText', false, s)) {
        ta.setRangeText(s, ta.selectionStart, ta.selectionEnd, 'end');
      }
      sync();
    };
    ta.addEventListener('input', sync);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { escaped = true; return; }
      if (e.key === 'Tab' && !escaped && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); insert('    '); return; }
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const before = ta.value.slice(0, ta.selectionStart);
        const line = before.slice(before.lastIndexOf('\n') + 1);
        let indent = line.match(/^ */)[0];
        if (/:\s*$/.test(line)) indent += '    ';
        e.preventDefault();
        insert('\n' + indent);
      }
      if (e.key !== 'Tab') escaped = false;
    });
    const strip = (t) => t.replace(/\n$/, '');
    ta.value = strip(text);
    sync();
    return {
      get: () => (ta.value.endsWith('\n') ? ta.value : ta.value + '\n'),
      set: (t) => { ta.value = strip(t); sync(); },
      textarea: ta
    };
  }

  // A console: write() adds text, ask() shows a box for input().
  function makeConsole(host) {
    host.classList.add('console');
    const out = document.createElement('pre');
    out.className = 'out';
    out.setAttribute('role', 'log');
    out.setAttribute('aria-live', 'polite');
    const form = document.createElement('form');
    form.className = 'ask';
    form.hidden = true;
    const id = 'ask-' + Math.random().toString(36).slice(2, 8);
    form.innerHTML = '<label for="' + id + '" class="visually-hidden">Your answer</label>' +
      '<span class="caret" aria-hidden="true">&gt;</span><input id="' + id + '" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send">' +
      '<button type="submit">Enter</button>';
    host.append(out, form);
    const input = form.querySelector('input');
    let pending = null;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!pending) return;
      const r = pending; pending = null;
      form.hidden = true;
      const v = input.value; input.value = '';
      r(v);
    });
    let chars = 0;
    return {
      write(text, kind) {
        const span = document.createElement('span');
        span.className = 'k-' + (kind || 'out');
        span.textContent = text;
        out.append(span);
        chars += text.length;
        while (chars > 60000 && out.firstChild) { chars -= out.firstChild.textContent.length; out.firstChild.remove(); }
        out.scrollTop = out.scrollHeight;
      },
      clear() { out.textContent = ''; chars = 0; },
      ask() {
        return new Promise((resolve) => {
          pending = resolve;
          form.hidden = false;
          input.focus({ preventScroll: true });
          out.scrollTop = out.scrollHeight;
        });
      },
      cancel() { if (pending) { const r = pending; pending = null; form.hidden = true; r(''); } },
      focus() { if (!form.hidden) input.focus({ preventScroll: true }); }
    };
  }

  // Run src in a fresh interpreter, writing to con. Returns a stop() handle.
  function runIn(con, src, filename, opts) {
    opts = opts || {};
    const ip = new MiniPy.Interp({
      files: opts.files,
      out: (t, k) => con.write(t, k),
      input: () => con.ask(),
      figure: opts.figure
    });
    const done = ip.run(src, filename);
    return { done, stop: () => { ip.stop(); con.cancel(); }, interp: ip };
  }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  async function copy(text, button) {
    const old = button.textContent;
    try { await navigator.clipboard.writeText(text); button.textContent = 'Copied'; }
    catch (e) { button.textContent = 'Select the code and copy it'; }
    setTimeout(() => { button.textContent = old; }, 1600);
  }

  window.PyKit = { makeEditor, makeConsole, runIn, download, copy };
})();
