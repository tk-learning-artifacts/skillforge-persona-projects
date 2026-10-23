// Make One, in the browser: you against the Bot, with the final paper rules.
(function () {
  'use strict';
  var M = MakeOne;
  var HAND = 4, MAX_HAND = 6;

  var el = function (id) { return document.getElementById(id); };
  var handEl = el('hand'), cupBar = el('cup-bar'), cupText = el('cup-text'), live = el('live'), logEl = el('log');
  var askEl = el('ask'), askQ = el('ask-q'), askOpts = el('ask-opts');
  var drawBtn = el('draw'), newBtn = el('new'), starterBox = el('starter');
  var youEl = el('you-score'), botEl = el('bot-score'), deckEl = el('deck-left'), botHandEl = el('bot-hand');

  var G;
  function newGame() {
    var d = M.shuffle(M.deck(starterBox.checked));
    G = { deck: d, you: d.splice(0, HAND), bot: d.splice(0, HAND), cup: [], youPts: 0, botPts: 0,
          turn: 'you', picked: null, passes: 0, skipYou: false, over: false, log: [] };
    note('New game. You go first. Tap a card to play it.');
    render();
  }

  function total() { return G.cup.reduce(function (a, b) { return a + b; }, 0); }
  function legal(hand) { var t = total(); return hand.filter(function (v) { return t + v <= 12; }); }

  function note(msg, cls) {
    live.textContent = msg;
    live.className = 'live' + (cls ? ' ' + cls : '');
    G.log.unshift(msg);
    G.log = G.log.slice(0, 4);
    while (logEl.firstChild) logEl.removeChild(logEl.firstChild);
    G.log.slice(1).forEach(function (m) { var li = document.createElement('li'); li.textContent = m; logEl.appendChild(li); });
  }

  function render() {
    youEl.textContent = 'You: ' + G.youPts;
    botEl.textContent = 'Bot: ' + G.botPts;
    deckEl.textContent = 'Deck: ' + G.deck.length;
    botHandEl.textContent = 'Bot has ' + G.bot.length + (G.bot.length === 1 ? ' card' : ' cards');
    // The cup, as one strip of twelfths.
    while (cupBar.firstChild) cupBar.removeChild(cupBar.firstChild);
    G.cup.forEach(function (v) {
      var s = document.createElement('span'); s.className = 'seg';
      s.style.flex = '0 0 ' + (v / 12 * 100) + '%';
      s.textContent = M.label(v);
      cupBar.appendChild(s);
    });
    var t = total();
    cupText.textContent = t === 0 ? 'The cup is empty.' : 'The cup holds ' + M.label(t) + ' (' + G.cup.length + (G.cup.length === 1 ? ' card).' : ' cards).');
    // Your hand.
    while (handEl.firstChild) handEl.removeChild(handEl.firstChild);
    G.you.forEach(function (v, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'fcard';
      b.setAttribute('aria-label', 'Play ' + M.word(v));
      b.setAttribute('aria-pressed', String(G.picked === i));
      b.appendChild(M.fracEl(v));
      var w = document.createElement('span'); w.className = 'word'; w.textContent = M.word(v);
      b.appendChild(w);
      b.appendChild(M.stripEl(v));
      b.disabled = G.turn !== 'you' || G.over;
      b.addEventListener('click', function () { play(i); });
      handEl.appendChild(b);
    });
    drawBtn.disabled = G.turn !== 'you' || G.over;
    drawBtn.textContent = G.deck.length ? 'Draw a card and pass' : 'Pass';
  }

  function drawUp(hand) {
    while (hand.length < HAND && G.deck.length) hand.push(G.deck.shift());
  }

  // Your turn: pick a card.
  function play(i) {
    if (G.turn !== 'you' || G.over) return;
    var v = G.you[i], t = total();
    G.passes = 0;
    if (t + v > 12) {
      note(M.label(t) + ' + ' + M.label(v) + ' is more than 1 whole. Card back. Your turn ends.', 'bad');
      return endTurn('you');
    }
    if (t === 0) { return place('you', i); }
    G.picked = i; G.turn = 'ask';
    render();
    ask(t, v, i);
  }

  // The "say it" rule: name the new total before the card goes in.
  function ask(t, v, i) {
    var right = t + v;
    var a = M.simplest(t), b = M.simplest(v);
    var opts = [{ txt: [right], ok: true }];
    // The common slip: add the tops and add the bottoms.
    var slipTop = a[0] + b[0], slipBot = a[1] + b[1];
    if (slipTop * 12 !== right * slipBot) opts.push({ txt: [slipTop, slipBot], ok: false });
    var near = right + (right < 12 ? 1 : -1);
    opts.push({ txt: [near], ok: false });
    if (opts.length < 3) opts.push({ txt: [right - 2 > 0 ? right - 2 : right + 2], ok: false });
    M.shuffle(opts);
    askQ.textContent = 'The cup has ' + M.label(t) + '. You add ' + M.label(v) + '. What does the cup hold now?';
    while (askOpts.firstChild) askOpts.removeChild(askOpts.firstChild);
    opts.forEach(function (o) {
      var btn = document.createElement('button'); btn.type = 'button';
      var f = o.txt.length === 2 ? M.fracParts(o.txt[0], o.txt[1]) : M.fracEl(o.txt[0]);
      btn.appendChild(f);
      btn.setAttribute('aria-label', o.txt.length === 2 ? o.txt[0] + ' over ' + o.txt[1] : M.word(o.txt[0]));
      btn.addEventListener('click', function () {
        askEl.hidden = true;
        G.picked = null;
        if (o.ok) { place('you', i); }
        else {
          note('Not quite. ' + M.label(t) + ' + ' + M.label(v) + ' = ' + M.label(right) + '. Card back. Your turn ends.', 'bad');
          endTurn('you');
        }
      });
      askOpts.appendChild(btn);
    });
    askEl.hidden = false;
    askOpts.firstChild.focus();
  }

  function place(who, i) {
    var hand = who === 'you' ? G.you : G.bot;
    var v = hand.splice(i, 1)[0];
    G.cup.push(v);
    var t = total();
    if (t === 12) {
      var pts = G.cup.length;
      if (who === 'you') G.youPts += pts; else G.botPts += pts;
      note((who === 'you' ? 'You make' : 'Bot makes') + ' exactly 1 whole. ' + (who === 'you' ? 'You win' : 'Bot wins') + ' the cup: ' + pts + (pts === 1 ? ' point.' : ' points.'), who === 'you' ? 'good' : 'bad');
      G.cup = [];
    } else if (who === 'you') {
      note((G.cup.length === 1 ? 'You start the cup with ' + M.label(t) + '.' : 'Yes. The cup holds ' + M.label(t) + ' now.'), 'good');
    }
    drawUp(hand);
    endTurn(who);
  }

  function endTurn(who) {
    G.turn = 'wait';
    // Nobody could play for a whole round: the cup is emptied and nobody scores it.
    if (G.passes >= 2 && G.deck.length && G.cup.length) {
      G.cup = []; G.passes = 0;
      note('Nobody could play for a round. The cup is emptied. Nobody scores it.');
    }
    render();
    if (checkOver()) return;
    if (who === 'you') { setTimeout(botTurn, 1100); }
    else if (G.skipYou) {
      G.skipYou = false;
      note('You miss this turn for the wrong challenge.', 'bad');
      setTimeout(botTurn, 1300);
    } else { G.turn = 'you'; render(); }
  }

  function checkOver() {
    var stuck = !G.deck.length && (G.passes >= 2 || (!legal(G.you).length && !legal(G.bot).length));
    if (stuck || (!G.you.length && !G.bot.length)) {
      G.over = true; G.turn = 'over';
      var msg = 'Game over. You ' + G.youPts + ', Bot ' + G.botPts + '. ';
      msg += G.youPts > G.botPts ? 'You win.' : G.youPts < G.botPts ? 'Bot wins.' : 'A draw.';
      note(msg, G.youPts >= G.botPts ? 'good' : 'bad');
      render();
      return true;
    }
    return false;
  }

  // The Bot finishes a cup when it can, and likes to leave a gap no card can fill.
  function botTurn() {
    if (G.over) return;
    var t = total();
    var opts = G.bot.map(function (v, i) { return { v: v, i: i }; }).filter(function (o) { return t + o.v <= 12; });
    if (!opts.length) {
      G.passes++;
      if (G.deck.length && G.bot.length < MAX_HAND) G.bot.push(G.deck.shift());
      note('Bot cannot play, so it draws and passes.');
      return endTurn('bot');
    }
    G.passes = 0;
    var values = (starterBox.checked ? M.STARTER : M.FULL).map(function (c) { return c.v; });
    // The Bot is a fair, not perfect, player: it misses some finishes and safe moves.
    var finish = Math.random() < 0.6 ? opts.filter(function (o) { return t + o.v === 12; })[0] : null;
    var safe = opts.filter(function (o) { return values.indexOf(12 - t - o.v) < 0; })[0];
    var choice = finish || (Math.random() < 0.3 && safe) || opts[Math.floor(Math.random() * opts.length)];
    var v = choice.v;
    if (t === 0 || t + v === 12) { note('Bot plays ' + M.label(v) + '.'); return place('bot', choice.i); }
    // Bot says the total. Sometimes it makes the common slip, and you can challenge.
    var a = M.simplest(t), b = M.simplest(v);
    var slip = Math.random() < 0.25 && (a[0] + b[0]) * 12 !== (t + v) * (a[1] + b[1]);
    var said = slip ? (a[0] + b[0]) + '/' + (a[1] + b[1]) : M.label(t + v);
    G.turn = 'challenge';
    render();
    askQ.textContent = 'Bot plays ' + M.label(v) + ' and says: "The cup holds ' + said + ' now." Is Bot right?';
    while (askOpts.firstChild) askOpts.removeChild(askOpts.firstChild);
    [['Agree', true], ['Challenge', false]].forEach(function (pair) {
      var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = pair[0];
      btn.addEventListener('click', function () {
        askEl.hidden = true;
        var agree = pair[1];
        if (agree && !slip) { place('bot', choice.i); }
        else if (agree && slip) {
          note('Bot was wrong. ' + M.label(t) + ' + ' + M.label(v) + ' = ' + M.label(t + v) + '. Nobody checked, so the card stays.', 'bad');
          place('bot', choice.i);
        } else if (!agree && slip) {
          note('Good challenge. ' + M.label(t) + ' + ' + M.label(v) + ' = ' + M.label(t + v) + '. Bot takes its card back.', 'good');
          endTurn('bot');
        } else {
          note('Bot was right: ' + M.label(t + v) + '. A wrong challenge means you miss your next turn.', 'bad');
          G.skipYou = true;
          place('bot', choice.i);
        }
      });
      askOpts.appendChild(btn);
    });
    askEl.hidden = false;
    askOpts.firstChild.focus();
  }

  drawBtn.addEventListener('click', function () {
    if (G.turn !== 'you' || G.over) return;
    G.passes++;
    if (G.deck.length && G.you.length < MAX_HAND) { G.you.push(G.deck.shift()); note('You draw a card and pass.'); }
    else note('You pass.');
    endTurn('you');
  });
  newBtn.addEventListener('click', function () { askEl.hidden = true; newGame(); });
  starterBox.addEventListener('change', function () { askEl.hidden = true; newGame(); });

  newGame();
  window.__makeOne = { state: function () { return G; } };
})();
