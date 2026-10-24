// "Is it safe?" One made-up message at a time. Pupils choose Looks safe,
// Scam, or Not sure: ask an adult. There is no timer and no score to beat.
(function () {
  'use strict';

  var CLUE = {
    hurry: { icon: 'i-clock', name: 'Hurry' },
    prize: { icon: 'i-gift', name: 'Prize' },
    link: { icon: 'i-link', name: 'Link or log in' },
    code: { icon: 'i-key', name: 'Code or password' },
    secret: { icon: 'i-secret', name: 'Secret' },
    money: { icon: 'i-money', name: 'Money' },
    scary: { icon: 'i-warn', name: 'Scary words' },
    stranger: { icon: 'i-ask', name: 'Who is it really?' }
  };

  // Every sender is made up. No real game, person or company.
  var MSGS = [
    { from: 'GemQuest Rewards', where: 'Message in a game', avatar: 'i-gift', answer: 'scam',
      text: 'Congrats!! You won 5,000 free gems. Log in at gemquest-gifts.co/claim in the next 10 minutes or your gems disappear.',
      short: 'You won 5,000 gems! Log in at this link in 10 minutes.',
      clues: [
        ['prize', 'A prize you did not try to win.', 'A prize you did not try for.'],
        ['hurry', '"In the next 10 minutes" rushes you, so you do not stop to think.', 'It rushes you.'],
        ['link', 'It wants you to log in through its own link. Log in only from the real app.', 'It wants you to log in from a link.']
      ],
      next: 'Stop. Do not tap the link. Close the message and tell an adult.' },
    { from: 'Mum', where: 'Saved contact', avatar: 'i-person', answer: 'safe',
      text: 'Running late. Wait at the school office, not the gate. See you at 2.30.',
      short: 'Running late. Wait at the school office. See you at 2.30.',
      safe: [
        'No link, no code, no money and no secret.',
        'It fits what usually happens after school.',
        'It comes from the contact you saved, not a new number.'
      ],
      next: 'If something feels odd, call Mum on the number you know. That is a check, and it is always allowed.' },
    { from: 'Unknown number', where: 'Chat message', avatar: 'i-ask', answer: 'scam',
      text: 'Hi its Jun Wei, this is my new number. I sent a 6-digit code to your phone by mistake. Can you send it to me? Quick pls',
      short: 'Hi, it is Jun Wei with a new number. Send me the code on your phone. Quick.',
      clues: [
        ['code', 'It asks for a code sent to your phone. That code is a key to your account. Never share it, even with a friend.', 'It asks for your code.'],
        ['hurry', '"Quick pls" rushes you.', 'It rushes you.'],
        ['stranger', 'A "new number" means you can\'t be sure who it is.', 'A new number.']
      ],
      next: 'Stop. Do not send the code. Ask Jun Wei in person, or ask an adult to check.' },
    { from: 'Class 5 Courage', where: 'Class group chat', avatar: 'i-paper', answer: 'safe',
      text: 'Mr Tan: Reminder, bring your art apron tomorrow. We are painting.',
      short: 'Mr Tan: Bring your art apron tomorrow.',
      safe: [
        'It comes from the class chat you already know.',
        'It asks you to bring an apron. Nothing about codes, money or links.'
      ],
      next: 'Nothing to do but pack your apron.' },
    { from: 'Unknown number', where: 'Voice message', avatar: 'i-speaker', answer: 'scam', voice: true,
      text: '(A voice that sounds like Ah Ma) "Ah Ma here. I am in trouble. Send money now. Don\'t tell your mummy."',
      short: 'A voice like Ah Ma: "Send money now. Don\'t tell Mummy."',
      clues: [
        ['money', 'It asks for money.', 'It asks for money.'],
        ['secret', '"Don\'t tell your mummy" asks you to keep a secret from a safe adult.', 'It says keep it secret.'],
        ['scary', '"I am in trouble" makes you scared, so you act fast.', 'It makes you scared.']
      ],
      extra: 'Computers can now copy a voice. A voice that sounds right is not proof.',
      next: 'Stop. Tell a safe adult. They can call Ah Ma on the number they already know.' },
    { from: 'School library', where: 'School app notice', avatar: 'i-paper', answer: 'safe',
      text: 'Your book "The Secret Garden" is due on Friday. You can renew it at the library counter.',
      short: 'Your library book is due on Friday.',
      safe: [
        'It tells you something. It does not ask you for anything.',
        'To renew, you go to the counter in person. No link.'
      ],
      next: 'Return or renew the book.' },
    { from: 'Pop-up on a tablet', where: 'While watching a video', avatar: 'i-warn', answer: 'scam', alert: true,
      text: 'WARNING! Your tablet has 3 viruses! Call the number on this screen now to fix it, or lose all your photos!',
      short: 'WARNING! 3 viruses! Call this number now!',
      clues: [
        ['scary', 'Big scary words, to make you panic.', 'Scary words.'],
        ['hurry', '"Now" rushes you.', 'It rushes you.'],
        ['link', 'It wants you to call a number it gives you. Real help comes from people you know.', 'It wants you to call its number.']
      ],
      next: 'Stop. Do not call. Close the video or the tab and tell an adult.' },
    { from: 'Hui Min', where: 'Saved contact', avatar: 'i-person', answer: 'safe',
      text: 'Are you coming for badminton CCA today? Coach says bring your own racket.',
      short: 'Badminton CCA today? Bring your racket.',
      safe: [
        'It is from a friend you saved.',
        'It is about something you both really do.',
        'It does not ask for codes, money, links or secrets.'
      ],
      next: 'Reply as normal.' }
  ];

  var el = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function icon(id, cls) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', cls || 'icon'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('viewBox', '0 0 24 24');
    var u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#' + id);
    s.appendChild(u);
    return s;
  }
  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  var box = el('sorter');
  var state = { i: 0, picks: [], fewer: false };

  // Reading aloud uses the browser's own voices, so it works offline.
  var canSpeak = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  function say(text) {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    var u = new window.SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    var voices = window.speechSynthesis.getVoices();
    var v = voices.filter(function (x) { return /^en-(SG|GB)/.test(x.lang); })[0] || voices.filter(function (x) { return /^en/.test(x.lang); })[0];
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }

  var LABEL = { safe: 'Looks safe', scam: 'Scam', ask: 'Not sure: ask an adult' };

  function feedbackText(m, pick) {
    if (m.answer === 'scam') {
      if (pick === 'scam') return 'Yes. This is a scam.';
      if (pick === 'ask') return 'Good choice. Asking an adult keeps you safe. This one is a scam.';
      return 'Look again. This one is a scam. Here are the clues.';
    }
    if (pick === 'safe') return 'Yes. This one looks safe.';
    if (pick === 'ask') return 'Asking is always fine. This one looks safe, and here is why.';
    return 'Careful thinking. This one looks safe, and here is why.';
  }

  function renderMessage() {
    var m = MSGS[state.i];
    var pick = state.picks[state.i];
    clear(box);

    var top = make('div', 'progress');
    top.appendChild(make('span', '', 'Message ' + (state.i + 1) + ' of ' + MSGS.length));
    var dots = make('div', 'dots');
    dots.setAttribute('aria-hidden', 'true');
    MSGS.forEach(function (_, j) {
      dots.appendChild(make('span', j === state.i ? 'now' : (state.picks[j] ? 'done' : '')));
    });
    top.appendChild(dots);
    box.appendChild(top);

    var phone = make('div', 'phone');
    var bar = make('div', 'bar');
    var av = make('div', 'avatar'); av.appendChild(icon(m.avatar));
    bar.appendChild(av);
    var who = make('div');
    who.appendChild(make('div', 'who', m.from));
    who.appendChild(make('div', 'where', m.where));
    bar.appendChild(who);
    phone.appendChild(bar);
    var bubble = make('p', 'bubble' + (m.alert ? ' alert' : ''), state.fewer ? m.short : m.text);
    phone.appendChild(bubble);
    box.appendChild(phone);

    var tools = make('div', 'nav');
    if (canSpeak) {
      var read = make('button', '');
      read.type = 'button';
      read.appendChild(icon('i-speaker')); read.appendChild(document.createTextNode(' Read it to me'));
      read.addEventListener('click', function () {
        say(m.from + '. ' + (state.fewer ? m.short : m.text).replace(/\.co\//g, ' dot co slash ') + '. Is it safe, a scam, or are you not sure?');
      });
      tools.appendChild(read);
    }
    box.appendChild(tools);

    var q = make('p', '', 'What do you think?');
    q.style.fontWeight = '700';
    q.style.marginBottom = '0';
    box.appendChild(q);
    var choices = make('div', 'choices');
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', 'Your answer');
    [['safe', 'i-safe', 'c-safe'], ['scam', 'i-warn', 'c-scam'], ['ask', 'i-ask', 'c-ask']].forEach(function (c) {
      var b = make('button', c[2]);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(pick === c[0]));
      b.appendChild(icon(c[1]));
      b.appendChild(document.createTextNode(' ' + LABEL[c[0]]));
      b.addEventListener('click', function () { state.picks[state.i] = c[0]; renderMessage(); focusFeedback(); });
      choices.appendChild(b);
    });
    box.appendChild(choices);

    if (pick) box.appendChild(renderFeedback(m, pick));

    var nav = make('div', 'nav');
    var back = make('button', '', 'Back');
    back.type = 'button';
    back.disabled = state.i === 0;
    back.addEventListener('click', function () { state.i--; renderMessage(); });
    var next = make('button', '', state.i === MSGS.length - 1 ? 'See what I spotted' : 'Next message');
    next.type = 'button';
    next.disabled = !pick;
    next.addEventListener('click', function () {
      if (canSpeak) window.speechSynthesis.cancel();
      if (state.i === MSGS.length - 1) renderEnd(); else { state.i++; renderMessage(); }
    });
    nav.appendChild(back); nav.appendChild(next);
    box.appendChild(nav);
  }

  function renderFeedback(m, pick) {
    var f = make('div', 'feedback ' + (m.answer === 'scam' ? 'is-scam' : 'is-safe'));
    f.id = 'feedback';
    f.tabIndex = -1;
    var h = make('h3');
    h.appendChild(icon(m.answer === 'scam' ? 'i-warn' : 'i-safe'));
    h.appendChild(document.createTextNode(' ' + feedbackText(m, pick)));
    f.appendChild(h);
    var list = make('ul', 'clues' + (m.answer === 'safe' ? ' safe' : ''));
    if (m.answer === 'scam') {
      m.clues.forEach(function (c) {
        var li = make('li');
        li.appendChild(icon(CLUE[c[0]].icon));
        var t = make('span');
        var nm = CLUE[c[0]].name;
        var b = make('strong', '', nm + (/[?.]$/.test(nm) ? ' ' : '. '));
        t.appendChild(b);
        t.appendChild(document.createTextNode(state.fewer ? c[2] : c[1]));
        li.appendChild(t);
        list.appendChild(li);
      });
    } else {
      (state.fewer ? m.safe.slice(0, 1) : m.safe).forEach(function (s) {
        var li = make('li');
        li.appendChild(icon('i-safe'));
        li.appendChild(make('span', '', s));
        list.appendChild(li);
      });
    }
    f.appendChild(list);
    if (m.extra && !state.fewer) f.appendChild(make('p', '', m.extra));
    var nx = make('p');
    nx.appendChild(make('strong', '', 'What to do: '));
    nx.appendChild(document.createTextNode(m.next));
    f.appendChild(nx);
    return f;
  }

  function focusFeedback() {
    var f = el('feedback');
    if (f) f.focus({ preventScroll: false });
  }

  function renderEnd() {
    clear(box);
    var scams = 0, spotted = 0, asked = 0, safeOk = 0, safes = 0;
    MSGS.forEach(function (m, j) {
      var p = state.picks[j];
      if (p === 'ask') asked++;
      if (m.answer === 'scam') { scams++; if (p !== 'safe') spotted++; } else { safes++; if (p === 'safe') safeOk++; }
    });
    var end = make('div', 'end');
    end.appendChild(make('h3', '', 'What you spotted'));
    var ul = make('ul', 'tight');
    ul.appendChild(make('li', '', 'You kept safe on ' + spotted + ' of the ' + scams + ' scams.'));
    ul.appendChild(make('li', '', 'You said ' + safeOk + ' of the ' + safes + ' safe messages looked safe.'));
    ul.appendChild(make('li', '', 'You chose "ask an adult" ' + asked + (asked === 1 ? ' time.' : ' times.') + ' Asking always counts as a safe choice.'));
    end.appendChild(ul);
    end.appendChild(make('p', '', 'Remember the three steps: Stop. Check. Tell.'));
    var again = make('button', '', 'Start again');
    again.type = 'button';
    again.addEventListener('click', function () { state.i = 0; state.picks = []; renderMessage(); });
    end.appendChild(again);
    box.appendChild(end);
  }

  // Access options.
  var sizes = ['', 'big', 'bigger'];
  var sizeBtn = el('size');
  var size = 0;
  sizeBtn.addEventListener('click', function () {
    document.body.classList.remove('big', 'bigger');
    size = (size + 1) % sizes.length;
    if (sizes[size]) document.body.classList.add(sizes[size]);
    sizeBtn.textContent = 'Text size: ' + ['normal', 'big', 'bigger'][size];
  });
  var fewerBtn = el('fewer');
  fewerBtn.addEventListener('click', function () {
    state.fewer = !state.fewer;
    fewerBtn.setAttribute('aria-pressed', String(state.fewer));
    if (state.picks.length && box.querySelector('.end')) return;
    renderMessage();
  });
  if (!canSpeak) el('no-speech').hidden = false;

  renderMessage();
}());
