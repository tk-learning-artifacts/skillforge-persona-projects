// Verdict lab: read a submission, predict what Kattis says, then see why.
(function () {
  var NAMES = { AC: 'Accepted', WA: 'Wrong Answer', TLE: 'Time Limit Exceeded', RTE: 'Run Time Error' };
  var CARDS = [
    {
      problem: 'Spavanac', href: 'problems.html#p3',
      task: 'Print the time 45 minutes earlier, on a 24-hour clock.',
      code: 'h, m = map(int, input().split())\nm -= 45\nif m < 0:\n    m += 60\n    h -= 1\nprint(h, m)',
      answer: 'WA',
      why: 'It borrows an hour, but never wraps the day. For 0 30 it prints -1 45. The answer is 23 45.',
      how: 'That input is Kattis\'s second sample, so this fails on test 2. I ran it on all three sample files.'
    },
    {
      problem: 'No Duplicates', href: 'problems.html#p4',
      task: 'Print "yes" if no word in the line repeats, and "no" if one does.',
      code: 'words = input().split()\nrepeat = False\nfor w in words:\n    if words.count(w) > 1:\n        repeat = True\nprint("no" if repeat else "yes")',
      answer: 'AC',
      why: 'count() scans the whole list, so this is O(n\u00b2). But a line has at most 80 characters, so at most 40 words. That is about 1,600 steps.',
      how: 'Read the limits before you speed anything up. Big O only matters when n is big.'
    },
    {
      problem: 'Shopaholic', href: 'problems.html#p6',
      task: 'Buy 3, pay for 2: the cheapest of each 3 is free. Find the biggest discount.',
      code: 'prices = sorted(map(int, data[1:n + 1]))\nprint(sum(prices[2::3]))',
      answer: 'WA',
      why: 'sorted() puts the cheapest first. Then [2::3] takes the dearest item of each group of 3. That item is never the free one.',
      how: 'On the sample (400 100 200 350 300 250) it prints 650. The answer is 400.'
    },
    {
      problem: 'Perket', href: 'problems.html#p8',
      task: 'Choose ingredients so sourness and bitterness are as close as possible.',
      code: 'best = float("inf")\nfor pick in product([0, 1], repeat=n):\n    sour, bitter = 1, 0\n    for (s, b), p in zip(items, pick):\n        if p:\n            sour *= s\n            bitter += b\n    best = min(best, abs(sour - bitter))\nprint(best)',
      answer: 'WA',
      why: 'product() includes the choice where every p is 0. An empty meal has sourness 1 and bitterness 0, a difference of 1. The statement says you must use at least one ingredient.',
      how: 'Sample 1 has one ingredient, sourness 3 and bitterness 10. The answer is 7. This prints 1.'
    },
    {
      problem: 'Tri', href: 'problems.html#p7',
      task: 'Put back the = sign and one operation to make a true equation.',
      code: 'a, b, c = map(int, input().split())\n...\nelif a / b == c:\n    print(f"{a}/{b}={c}")\n...',
      answer: 'AC',
      why: 'Floats worry people, and fairly. Here the numbers are whole and under 100. When b divides a, the result is exact. When it does not, the result is far from any whole number.',
      how: 'I checked all 970,299 triples from 1 to 99. The float test and a == b * c agreed every time. I still write the multiplication: it works in every language.'
    },
    {
      problem: 'Counting Stars', href: 'problems.html#p11',
      task: 'Count the stars in each image. Print "Case 1: 4" and so on.',
      code: 'm, n = map(int, input().split())\nsky = [list(input()) for _ in range(m)]\n# ... flood fill, count stars ...\nprint(f"Case 1: {stars}")',
      answer: 'WA',
      why: 'The input holds up to 50 images and ends at the end of the file. This reads one image and stops.',
      how: 'The sample has two images. This prints "Case 1: 4" and nothing for case 2.'
    },
    {
      problem: 'Knight Jump', href: 'problems.html#p10',
      task: 'Find the fewest knight moves to cell (1, 1), or print -1.',
      code: '# BFS fills steps, a dict of cell -> moves\nprint(steps[(0, 0)])',
      answer: 'RTE',
      why: 'When (1, 1) cannot be reached, it is never put in the dict. Looking it up raises KeyError. An uncaught exception is a crash, and Kattis calls a crash Run Time Error.',
      how: 'In sample 2, the knight can never reach (1, 1). Python stops with "KeyError: (0, 0)". The fix is steps.get((0, 0), -1).'
    },
    {
      problem: 'Grid', href: 'problems.html#p12',
      task: 'Fewest jumps from top-left to bottom-right, on a grid up to 500 by 500.',
      code: 'visited = [(0, 0)]\n# ... inside the BFS loop:\nif (nr, nc) not in visited:\n    visited.append((nr, nc))\n    queue.append((nr, nc, d + 1))',
      answer: 'TLE',
      why: '"in" on a list checks items one by one. The list grows to 250,000 cells, so each check gets slower. The whole search is about O(n\u00b2) in the number of cells.',
      how: 'It passes all 3 samples, which are tiny. On a 500 by 500 grid of 1s, mine took about half a second. This one was still running after 30 seconds. The limit is 1 second.'
    }
  ];

  var root = document.getElementById('lab');
  if (!root) return;
  var el = function (id) { return document.getElementById(id); };
  var idx = 0;
  var picked = new Array(CARDS.length);
  var score = 0;

  var buttons = root.querySelectorAll('.choices button');

  function show() {
    var c = CARDS[idx];
    el('lab-count').textContent = 'Card ' + (idx + 1) + ' of ' + CARDS.length;
    el('lab-score').textContent = 'Right so far: ' + score;
    var link = el('lab-problem');
    link.textContent = c.problem;
    link.href = c.href;
    el('lab-task').textContent = c.task;
    var code = el('lab-code');
    code.textContent = c.code;
    if (window.paintPython) window.paintPython(code);
    var done = picked[idx];
    buttons.forEach(function (b) {
      var v = b.getAttribute('data-v');
      b.classList.remove('right', 'wrong');
      b.setAttribute('aria-pressed', done === v ? 'true' : 'false');
      if (done) {
        if (v === c.answer) b.classList.add('right');
        else if (v === done) b.classList.add('wrong');
      }
    });
    renderFeedback(done ? (done === c.answer) : null, false);
    el('lab-prev').disabled = idx === 0;
    el('lab-next').textContent = idx === CARDS.length - 1 ? 'Start again' : 'Next card';
  }

  function renderFeedback(right, announce) {
    var c = CARDS[idx];
    var box = el('lab-feedback');
    if (right === null) { box.hidden = true; return; }
    box.hidden = false;
    var badge = el('lab-verdict');
    badge.textContent = NAMES[c.answer];
    badge.className = 'v v-' + c.answer.toLowerCase();
    el('lab-result').textContent = right ? 'Right.' : 'Not this time. Kattis says:';
    el('lab-why').textContent = c.why;
    el('lab-how').textContent = c.how;
    if (announce) {
      el('lab-live').textContent = (right ? 'Right. ' : 'Not quite. ') + 'The verdict is ' + NAMES[c.answer] + '.';
    }
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      if (picked[idx]) return;
      var v = b.getAttribute('data-v');
      picked[idx] = v;
      if (v === CARDS[idx].answer) score += 1;
      show();
      renderFeedback(v === CARDS[idx].answer, true);
    });
  });
  el('lab-prev').addEventListener('click', function () {
    if (idx > 0) { idx -= 1; el('lab-live').textContent = ''; show(); }
  });
  el('lab-next').addEventListener('click', function () {
    if (idx === CARDS.length - 1) {
      el('lab-live').textContent = 'You got ' + score + ' of ' + CARDS.length + '. Starting again.';
      idx = 0; score = 0; picked = new Array(CARDS.length);
    } else {
      idx += 1;
      el('lab-live').textContent = '';
    }
    show();
  });

  var start = parseInt(new URLSearchParams(location.search).get('card'), 10);
  if (start >= 1 && start <= CARDS.length) idx = start - 1;
  show();
})();
