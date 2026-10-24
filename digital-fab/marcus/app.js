// Ping Mount page: version and pose buttons, and the print playback clock.
(function () {
  const M = window.MESHES;
  const view = new window.Viewer(document.getElementById('view'));
  const text = document.getElementById('view-text');
  const slider = document.getElementById('layer');
  const layerText = document.getElementById('layer-text');
  const clock = document.getElementById('clock');
  const play = document.getElementById('play');
  const LAYER = 0.28;
  // Print minutes from the team log (made up), and height on the bed in mm.
  const RUN = { 1: { min: 14, height: 24, side: false }, 2: { min: 14, height: 24, side: false }, 3: { min: 26, height: 50, side: true } };
  const state = { version: 3, pose: 'robot' };
  view.yaw = -0.75; view.pitch = 0.45;

  // V3 is stored as printed, on its side. This turns it back upright.
  const upright = (q) => [q[2], q[1], 24 - q[0]];
  const about = {
    1: 'V1: 2 mm thick, 16.0 mm holes. The cans jammed.',
    2: 'V2: 16.6 mm holes and a cable-tie slot. It snapped at the bend.',
    3: 'V3: 3 mm thick, gussets and teardrop holes. 50 crashes, no crack.'
  };
  const mmss = (m) => { const s = Math.round(m * 60); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  function render() {
    const run = RUN[state.version];
    const onBed = state.pose === 'bed';
    const map = run.side && !onBed ? upright : null;
    const pct = +slider.value;
    const layers = Math.round(run.height / LAYER);
    if (pct < 100) {
      const layer = Math.max(1, Math.round(layers * pct / 100));
      view.cut = { part: 0, h: layer * LAYER };
      clock.textContent = mmss(run.min * layer / layers) + ' / ' + mmss(run.min);
      layerText.textContent = 'Layer ' + layer + ' of ' + layers + ' at 0.28 mm.';
    } else {
      view.cut = null;
      clock.textContent = mmss(run.min) + ' / ' + mmss(run.min);
      layerText.textContent = 'Full part. ' + layers + ' layers at 0.28 mm.';
    }
    view.setParts([{ mesh: M['v' + state.version], color: '--model', map: map || undefined }]);
    let where;
    if (!run.side) where = ' Printed upright, foot on the bed, the same way it sits on the robot.';
    else if (onBed) where = ' On the bed: lying on its side, so each layer is a whole L.';
    else where = ' On the robot: foot on the chassis, cans facing forward.';
    text.textContent = about[state.version] + where;
  }

  function press(attr, value) {
    document.querySelectorAll('[data-' + attr + ']').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === String(value))));
  }
  document.querySelectorAll('[data-version]').forEach((b) => b.addEventListener('click', () => {
    state.version = +b.dataset.version; press('version', state.version); stop(); slider.value = 100; render();
  }));
  document.querySelectorAll('[data-pose]').forEach((b) => b.addEventListener('click', () => {
    state.pose = b.dataset.pose; press('pose', state.pose); render();
  }));
  slider.addEventListener('input', () => {
    if (state.pose !== 'bed') { state.pose = 'bed'; press('pose', 'bed'); }
    render();
  });

  let timer = null;
  function stop() { if (timer) { clearInterval(timer); timer = null; play.textContent = 'Play the print'; } }
  play.addEventListener('click', () => {
    if (timer) { stop(); return; }
    state.pose = 'bed'; press('pose', 'bed');
    slider.value = 1; play.textContent = 'Stop'; render();
    timer = setInterval(() => {
      const next = +slider.value + 1;
      if (next > 100) { stop(); slider.value = 100; render(); return; }
      slider.value = next; render();
    }, 60);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  render();
})();
