// The web copy of Team Points. It follows the Swift code screen by screen:
// TeamsView (the list) and TeamView (one team). The teams array lives here,
// at the top, like @State in TeamsView. The team screen changes it directly,
// like a @Binding. Call TeamPoints.mount(element) to start it.
(function () {
  'use strict';

  const STARTERS = [
    { name: 'Kopi', shape: 'circle', color: 'rgb(110,69,41)' },
    { name: 'Teh', shape: 'triangle', color: 'rgb(176,74,0)' },
    { name: 'Milo', shape: 'square', color: 'rgb(28,107,51)' },
    { name: 'Bandung', shape: 'star', color: 'rgb(176,38,102)' }
  ];
  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // The four team shapes, drawn instead of SF Symbols.
  function shape(kind, color, size) {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    let s;
    if (kind === 'circle') { s = document.createElementNS(SVGNS, 'circle'); s.setAttribute('cx', 12); s.setAttribute('cy', 12); s.setAttribute('r', 10); }
    else if (kind === 'square') { s = document.createElementNS(SVGNS, 'rect'); s.setAttribute('x', 3); s.setAttribute('y', 3); s.setAttribute('width', 18); s.setAttribute('height', 18); s.setAttribute('rx', 3); }
    else if (kind === 'triangle') { s = document.createElementNS(SVGNS, 'path'); s.setAttribute('d', 'M12 2.5 L22.5 21 H1.5 Z'); s.setAttribute('stroke-linejoin', 'round'); }
    else if (kind === 'crown') { s = document.createElementNS(SVGNS, 'path'); s.setAttribute('d', 'M2 7 L7 12 L12 4 L17 12 L22 7 L20 19 H4 Z'); }
    else { s = document.createElementNS(SVGNS, 'path'); s.setAttribute('d', 'M12 1.8 L14.9 8.6 L22.2 9.2 L16.7 14 L18.4 21.2 L12 17.4 L5.6 21.2 L7.3 14 L1.8 9.2 L9.1 8.6 Z'); }
    s.setAttribute('fill', color);
    svg.appendChild(s);
    return svg;
  }

  function mount(root) {
    root.classList.add('tp');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'Team Points app, web copy');
    const teams = STARTERS.map((t) => Object.assign({ points: 0 }, t));
    const live = el('p', 'visually-hidden');
    live.setAttribute('aria-live', 'polite');
    const list = el('div', 'tp-screen');
    const detail = el('div', 'tp-screen');
    detail.dataset.off = 'right';
    detail.hidden = true;
    root.append(list, detail, live);
    let open = -1;

    function isLeading(team) {
      const top = Math.max(...teams.map((t) => t.points));
      return top > 0 && team.points === top;
    }

    // Screen 1: TeamsView.
    function drawList() {
      list.replaceChildren();
      const bar = el('div', 'tp-bar');
      bar.append(el('span'));
      const reset = el('button', 'tp-bar-btn', 'Reset');
      reset.type = 'button';
      reset.dataset.act = 'reset';
      reset.disabled = teams.every((t) => t.points === 0);
      reset.addEventListener('click', askReset);
      bar.append(reset);
      const title = el('h3', 'tp-large', 'Team Points');
      const ul = el('ul', 'tp-list');
      teams.forEach((team, i) => {
        const li = el('li');
        const row = el('button', 'tp-row');
        row.type = 'button';
        row.dataset.team = i;
        const lead = isLeading(team);
        row.setAttribute('aria-label', team.name + ', ' + team.points + ' points' + (lead ? ', in the lead' : ''));
        row.append(shape(team.shape, team.color, 28), el('span', 'tp-row-name', team.name));
        if (lead) row.append(shape('crown', '#f19a1c', 22));
        row.append(el('span', 'tp-row-score', String(team.points)), el('span', 'tp-chev', '›'));
        row.addEventListener('click', () => openTeam(i));
        li.append(row);
        ul.append(li);
      });
      list.append(bar, title, ul, el('p', 'tp-foot', 'Tap a team to give points.'));
    }

    // Screen 2: TeamView, changing teams[open] in place.
    function openTeam(i) {
      open = i;
      drawDetail();
      detail.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        detail.dataset.off = '';
        list.dataset.off = 'left';
      }));
      setTimeout(() => detail.querySelector('[data-act="back"]').focus(), reduceMotion() ? 0 : 360);
    }

    function closeTeam() {
      drawList();
      detail.dataset.off = 'right';
      list.dataset.off = '';
      const back = open;
      setTimeout(() => {
        detail.hidden = true;
        const row = list.querySelector('[data-team="' + back + '"]');
        if (row) row.focus();
      }, reduceMotion() ? 0 : 360);
      open = -1;
    }

    function drawDetail() {
      const team = teams[open];
      detail.replaceChildren();
      const bar = el('div', 'tp-bar');
      const back = el('button', 'tp-bar-btn', '‹ Team Points');
      back.type = 'button';
      back.dataset.act = 'back';
      back.addEventListener('click', closeTeam);
      const title = el('span', 'tp-bar-title', team.name);
      bar.append(back, title, el('span'));
      bar.lastChild.style.width = '44px';

      const body = el('div', 'tp-team');
      body.append(shape(team.shape, team.color, 64));
      const big = el('div', 'tp-big');
      big.setAttribute('aria-label', team.points + ' points');
      big.setAttribute('role', 'img');
      const num = el('span', '', String(team.points));
      big.append(num);
      const btns = el('div', 'tp-btns');
      const minus = point('−1', 'grey', -1, 'Take away 1 point');
      minus.disabled = team.points === 0;
      btns.append(minus, point('+1', team.color, 1, 'Add 1 point'), point('+3', team.color, 3, 'Add 3 points'));
      const name = el('input', 'tp-name');
      name.value = team.name;
      name.placeholder = 'Team name';
      name.setAttribute('aria-label', 'Team name');
      name.addEventListener('input', () => {
        team.name = name.value;
        title.textContent = team.name;
      });
      body.append(big, btns, name);
      detail.append(bar, body);

      function point(label, color, amount, spoken) {
        const b = el('button', 'tp-pt', label);
        b.type = 'button';
        b.style.background = color === 'grey' ? '#8e8e93' : color;
        b.setAttribute('aria-label', spoken);
        b.dataset.amount = amount;
        b.addEventListener('click', () => change(amount));
        return b;
      }

      function change(amount) {
        const before = team.points;
        team.points = Math.max(0, team.points + amount);
        minus.disabled = team.points === 0;
        big.setAttribute('aria-label', team.points + ' points');
        live.textContent = team.name + ', ' + team.points + ' points';
        if (reduceMotion()) { num.textContent = String(team.points); return; }
        const fresh = el('span', team.points >= before ? 'roll-up' : 'roll-down', String(team.points));
        big.replaceChildren(fresh);
        num.remove();
        big.classList.add('bump');
        setTimeout(() => big.classList.remove('bump'), 150);
      }
    }

    // The confirmation dialog for Reset.
    function askReset() {
      const bg = el('div', 'tp-sheet-bg');
      const sheet = el('div', 'tp-sheet');
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-label', 'Set every score back to 0?');
      const box = el('div', 'tp-sheet-box');
      box.append(el('p', '', 'Set every score back to 0?'));
      const yes = el('button', 'tp-danger', 'Reset all scores');
      yes.type = 'button';
      yes.dataset.act = 'confirm';
      box.append(yes);
      const cancelBox = el('div', 'tp-sheet-box');
      const no = el('button', 'tp-cancel', 'Cancel');
      no.type = 'button';
      cancelBox.append(no);
      sheet.append(box, cancelBox);
      bg.append(sheet);
      root.append(bg);
      yes.focus();
      const close = () => { bg.remove(); drawList(); list.querySelector('[data-act="reset"]').focus(); };
      yes.addEventListener('click', () => { teams.forEach((t) => { t.points = 0; }); live.textContent = 'All scores are back to 0.'; close(); });
      no.addEventListener('click', close);
      bg.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }

    drawList();
    return { teams, root };
  }

  window.TeamPoints = { mount };
  document.querySelectorAll('[data-team-points]').forEach((node) => mount(node));
})();
