// The Volume Box page: version and view buttons, print playback, lid maker.
(function () {
  const M = window.MESHES;
  const W = 69, D = 21, LID = 2; // body width and depth, lid plate thickness
  const view = new window.Viewer(document.getElementById('view'));
  const text = document.getElementById('view-text');
  const slider = document.getElementById('layer');
  const out = document.getElementById('layer-out');
  const play = document.getElementById('play');
  const state = { version: 3, mode: 'closed', customLid: null };
  // From the made-up print log: minutes and layer height for each part.
  const LOG = { body: { min: 155, height: 21 }, lid: { min: 38, height: 9.2 } };

  // The lid prints face-down. Closed, it is flipped over onto the body.
  const flip = (lift) => (q) => [W - q[0], q[1], D + LID - q[2] + lift];
  const words = {
    closed: 'closed. The orange body holds the parts. The blue lid presses on top.',
    apart: 'apart. The lid is lifted so you can see its lip and four posts.',
    body: 'body as printed, back-down on the bed.',
    lid: 'lid as printed, face-down with the lip pointing up.'
  };

  function lidMesh() { return state.customLid || M['v' + state.version + '-lid']; }
  function render() {
    const body = M['v' + state.version + '-body'];
    let parts;
    if (state.mode === 'closed') parts = [{ mesh: body, color: '--model-body' }, { mesh: lidMesh(), color: '--model-lid', map: flip(0) }];
    else if (state.mode === 'apart') parts = [{ mesh: body, color: '--model-body' }, { mesh: lidMesh(), color: '--model-lid', map: flip(28) }];
    else if (state.mode === 'body') parts = [{ mesh: body, color: '--model-body' }];
    else parts = [{ mesh: lidMesh(), color: '--model-lid' }];
    const printing = state.mode === 'body' || state.mode === 'lid';
    const pct = +slider.value;
    if (printing && pct < 100) {
      const log = LOG[state.mode];
      const layers = Math.round(log.height / 0.2);
      const layer = Math.max(1, Math.round(layers * pct / 100));
      view.cut = { part: 0, h: layer * 0.2 };
      const min = Math.round(log.min * layer / layers);
      out.textContent = 'Layer ' + layer + ' of ' + layers + ', about ' + min + ' of ' + log.min + ' min';
    } else {
      view.cut = null;
      out.textContent = printing ? 'Full part' : 'Press Play to print the body';
    }
    view.setParts(parts);
    const lidNote = state.customLid && state.mode !== 'body' ? ' The lid is the one you made.' : '';
    text.textContent = 'Version ' + state.version + ', ' + words[state.mode] + lidNote;
  }

  function press(attr, value) {
    document.querySelectorAll('[data-' + attr + ']').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value))));
  }
  document.querySelectorAll('[data-version]').forEach((b) => b.addEventListener('click', () => {
    state.version = +b.dataset.version; state.customLid = null; press('version', state.version); render();
  }));
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    state.mode = b.dataset.mode; press('mode', state.mode); slider.value = 100; stopPlay(); render();
  }));
  slider.addEventListener('input', () => {
    if (state.mode !== 'body' && state.mode !== 'lid') { state.mode = 'body'; press('mode', 'body'); }
    render();
  });

  let timer = null;
  function stopPlay() { if (timer) { clearInterval(timer); timer = null; play.textContent = 'Play the print'; } }
  play.addEventListener('click', () => {
    if (timer) { stopPlay(); return; }
    if (state.mode !== 'body' && state.mode !== 'lid') { state.mode = 'body'; press('mode', 'body'); }
    slider.value = 1;
    play.textContent = 'Stop';
    render();
    timer = setInterval(() => {
      const next = +slider.value + 1;
      if (next > 100) { stopPlay(); slider.value = 100; render(); return; }
      slider.value = next;
      render();
    }, 70);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlay(); });

  // Lid maker
  const snug = document.getElementById('snug');
  const lidOut = document.getElementById('lid-out');
  const L = window.LidMaker;
  function gap() { return +snug.value; }
  function describe() {
    const c = gap();
    lidOut.textContent = 'Gap ' + c.toFixed(2) + ' mm per side. Lip size: ' + (64 - 2 * c).toFixed(1) + ' × ' + (72 - 2 * c).toFixed(1) + ' mm.';
  }
  snug.addEventListener('change', describe);
  document.getElementById('make-lid').addEventListener('click', () => {
    const c = gap();
    const buf = L.stl(L.mesh(c), 'Volume Box lid, gap ' + c + ' mm');
    const url = URL.createObjectURL(new Blob([buf], { type: 'model/stl' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'case-lid-gap-' + c.toFixed(2) + '.stl';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    lidOut.textContent = 'Made case-lid-gap-' + c.toFixed(2) + '.stl. Lip size: ' + (64 - 2 * c).toFixed(1) + ' × ' + (72 - 2 * c).toFixed(1) + ' mm.';
  });
  document.getElementById('show-lid').addEventListener('click', () => {
    state.version = 3; press('version', 3);
    state.customLid = L.mesh(gap());
    state.mode = 'apart'; press('mode', 'apart'); slider.value = 100; stopPlay();
    render();
    document.getElementById('look').scrollIntoView({ behavior: 'smooth' });
  });

  describe();
  render();
})();
