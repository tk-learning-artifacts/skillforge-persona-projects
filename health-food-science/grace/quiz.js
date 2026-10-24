// The Breakfast Cups pupil quiz. Pupils sat it on paper, read aloud.
// This version lets a trainer try it, one question at a time, with feedback.
(function () {
  'use strict';

  var QUESTIONS = [
    { q: 'On My Healthy Plate, which part fills half the plate?',
      opts: ['Wholegrains', 'Fruit and vegetables', 'Meat and others'], a: 1,
      why: 'Half the plate is fruit and vegetables. Wholegrains and meat and others take a quarter each.' },
    { q: 'Which of these is a wholegrain?',
      opts: ['White rice', 'White bread', 'Rolled oats'], a: 2,
      why: 'Rolled oats are a wholegrain. That is why they are the bottom layer of our breakfast cup.' },
    { q: 'How long should you rub your hands with soap?',
      opts: ['5 seconds', '20 seconds', '2 minutes'], a: 1,
      why: 'Rub all of your hands with soap for 20 seconds. Rinsing with water is not enough.' },
    { q: 'Germs in food grow fastest between which temperatures?',
      opts: ['5°C and 60°C', '0°C and 5°C', '60°C and 100°C'], a: 0,
      why: 'SFA calls 5°C to 60°C the danger zone. Room temperature in Singapore is inside it.' },
    { q: 'Why does the yoghurt stay in the cooler box until your group is ready?',
      opts: ['So it tastes sweeter', 'To keep it out of the danger zone', 'So nobody takes it'], a: 1,
      why: 'Cold food stays below 5°C, where germs grow slowly. That is the C for control temperature.' },
    { q: 'Why do we never cut fruit on a board used for raw chicken?',
      opts: ['Germs from the chicken can get onto the fruit', 'The fruit will go brown', 'The board will get blunt'], a: 0,
      why: 'Fruit is not cooked, so germs on it are not killed. That is the C for counter cross-contamination.' },
    { q: 'A cut apple went brown. What made it brown?',
      opts: ['Germs on the apple', 'Air reaching the inside of the apple', 'The apple was old'], a: 1,
      why: 'Air reacts with something in the apple and turns it brown. Brown does not tell you about germs.' },
    { q: 'In our fair test, how many things did we change?',
      opts: ['One thing', 'Two things', 'Everything we could'], a: 0,
      why: 'Change one thing and keep the rest the same. Then you know what made the difference.' }
  ];

  var i = 0, score = 0;
  var el = function (id) { return document.getElementById(id); };
  var count = el('count'), qEl = el('question'), opts = el('opts'), fb = el('feedback'), next = el('next'), live = el('live');

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function show(focus) {
    var item = QUESTIONS[i];
    count.textContent = 'Question ' + (i + 1) + ' of ' + QUESTIONS.length;
    qEl.textContent = item.q;
    clear(opts);
    fb.hidden = true;
    next.hidden = true;
    item.opts.forEach(function (text, n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', function () { answer(n); });
      opts.appendChild(b);
    });
    if (focus) opts.firstChild.focus();
  }

  function answer(n) {
    var item = QUESTIONS[i];
    var buttons = opts.querySelectorAll('button');
    for (var k = 0; k < buttons.length; k++) {
      buttons[k].disabled = true;
      if (k === item.a) { buttons[k].className = 'right'; buttons[k].textContent = '\u2713 ' + item.opts[k]; }
      else if (k === n) { buttons[k].className = 'wrong'; buttons[k].textContent = '\u2717 ' + item.opts[k]; }
    }
    var right = n === item.a;
    if (right) score++;
    fb.textContent = (right ? 'Yes. ' : 'Not quite. The answer is "' + item.opts[item.a] + '". ') + item.why;
    fb.hidden = false;
    live.textContent = fb.textContent;
    next.textContent = i === QUESTIONS.length - 1 ? 'See my score' : 'Next question';
    next.hidden = false;
    next.focus();
  }

  function finish() {
    count.textContent = 'Done';
    qEl.textContent = 'You got ' + score + ' out of ' + QUESTIONS.length + '.';
    clear(opts);
    fb.textContent = 'My class averaged 2.1 out of 8 before the programme and 6.4 after. Those numbers are made up, like my class.';
    fb.hidden = false;
    live.textContent = qEl.textContent;
    next.textContent = 'Try again';
    next.hidden = false;
    i = -1;
    score = 0;
  }

  next.addEventListener('click', function () {
    i++;
    if (i >= QUESTIONS.length) finish();
    else show(true);
  });

  show();
})();
