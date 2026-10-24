// Five disruptions. Each has one or two decisions. Pick a move, read why.
(function () {
  var GOOD = 'My choice', MEH = 'Could work', BAD = 'Likely to backfire';
  var SCENARIOS = [
    {
      title: '1. A PLD that stays out',
      text: "I've said lids down and started explaining Step 2. Wei Jie has his PLD open on his lap, under the desk.",
      steps: [
        { q: 'What do you do first?', opts: [
          ['Stop and say, "Wei Jie, I can see that. Put it away now."', MEH, 'He may put it away. But the whole class now watches him. Some students will push back harder with an audience.'],
          ['Keep explaining and walk over. Stand beside his desk.', GOOD, "The smallest step. He knows I've seen it, and nobody else needs to."],
          ['Walk over and take it from his hands.', BAD, 'Taking a device by hand can turn into a tug of war. Follow your school rules on keeping devices instead.'],
          ["Ignore it. It's his loss.", MEH, 'Fine for a few seconds. But others see that the bag rule only holds sometimes.']
        ] },
        { q: "I'm beside him. He looks up, then keeps scrolling. Now what?", opts: [
          ['Crouch and say quietly: "Bag, or my desk till the end. Your choice." Then walk away.', GOOD, "A quiet word with a choice. Both choices end with the PLD away. Walking away lets him do it without losing face."],
          ['Say loudly: "When you scroll, I feel ignored."', MEH, 'The I-statement is the right idea, one step too early and far too loud. Keep it for a talk after class.'],
          ['Send him to the year head.', BAD, "That skips three steps. Next time, he knows the ladder goes straight to the top."]
        ] }
      ]
    },
    {
      title: '2. An argument over the keyboard',
      text: 'Amir and Jia Hui share a computer. Amir has typed for 15 minutes. Jia Hui pulls the keyboard towards her. Voices rise.',
      steps: [
        { q: 'What do you do?', opts: [
          ['Go over. Point at the swap timer: "Who drove last? The timer says it\'s Jia Hui\'s turn."', GOOD, "The routine settles it, not me. The timer can't take sides, so neither student feels I picked."],
          ['Say, "Amir, give her the keyboard."', MEH, "It ends the argument, but I've picked a winner. Next time they'll come to me again."],
          ['Move one of them to another computer.', MEH, "Too big for a first argument. It's a fair step if it happens again."],
          ['From the front: "Both of you, stop it."', BAD, "Raising my voice makes it a three-way argument. Then the room joins in."]
        ] }
      ]
    },
    {
      title: '3. The projector dies',
      text: "Minute 15. The projector goes blank. The step-by-step slides were on it. 36 students turn round to look at me.",
      steps: [
        { q: 'What do you do?', opts: [
          ['Lids down. Hand out the paper step cards. Give it a three-minute fix, then call IT.', GOOD, "Paper keeps the lesson going. A three-minute limit stops me hunting cables while the room drifts."],
          ['Spend ten minutes fixing it while they wait.', BAD, "Ten idle minutes in a lab is a long time. Students fill them for you, usually with games."],
          ['Let them have free time until it works.', BAD, 'It teaches them that a broken projector means play. You want it to mean paper.'],
          ['Ask the student who "knows computers" to fix it.', MEH, "Sometimes they can. But it's my job, and the rest of the class still has nothing to do."]
        ] }
      ]
    },
    {
      title: '4. A broken headset',
      text: 'Kai stands up fast. His headset cable snaps. A few students laugh. He looks at me, red in the face.',
      steps: [
        { q: 'What do you do first?', opts: [
          ['Check nobody is hurt. Unplug it and move it aside. Quietly: "Thanks for not hiding it. We\'ll do the form after class."', GOOD, "I check first and judge later. Thanking him for not hiding it teaches the class what to do."],
          ['Ask the room, "Who did this?"', BAD, 'Everyone already knows. Now Kai has to own up in front of 35 people.'],
          ['Tell him his parents will have to pay.', BAD, "You don't know yet if it was an accident. Follow the school's process later, with facts."],
          ['Say nothing and carry on.', MEH, "Calm, but it leaves a broken cable on the desk. The class sees that damage doesn't get reported."]
        ] }
      ]
    },
    {
      title: '5. Chatting at the back',
      text: 'Two students at the far wall are chatting. Their screen still shows Step 1. Everyone else is on Step 3.',
      steps: [
        { q: 'What do you do first?', opts: [
          ['Catch their eye from where you are, and hold it for a second.', GOOD, 'The look costs nothing and stops nothing. If it fails, I go up one step.'],
          ['Walk over and teach from beside them.', GOOD, "Also my choice. On a day I'm at the far side of the room, I'd start here."],
          ['Stop the class: "Some people are still on Step 1."', BAD, "Everyone looks round. You've told the whole class who to watch, and the two of them now have an audience."],
          ['Move them apart straight away.', MEH, "It works, but it's a big step for a first chat. Keep it for the seating plan change."]
        ] }
      ]
    }
  ];

  var root = document.getElementById('scenarios');
  var progress = document.getElementById('progress');
  var answered = 0, total = 0, matched = 0;
  SCENARIOS.forEach(function (s) { total += s.steps.length; });

  function update() {
    progress.textContent = answered + ' of ' + total + ' decisions made. ' + matched + ' matched my choice.';
  }

  SCENARIOS.forEach(function (s) {
    var box = document.createElement('section');
    box.className = 'scenario';
    box.innerHTML = '<h3></h3><p></p>';
    box.querySelector('h3').textContent = s.title;
    box.querySelector('p').textContent = s.text;
    root.appendChild(box);
    function showStep(i) {
      var step = s.steps[i];
      var q = document.createElement('p');
      q.innerHTML = '<strong></strong>';
      q.firstChild.textContent = step.q;
      box.appendChild(q);
      var opts = document.createElement('div');
      opts.className = 'opts';
      box.appendChild(opts);
      step.opts.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = o[0];
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(opts.children, function (c) { c.disabled = true; });
          b.disabled = false;
          b.className = o[1] === GOOD ? 'picked-good' : o[1] === MEH ? 'picked-meh' : 'picked-bad';
          b.setAttribute('aria-pressed', 'true');
          answered++;
          if (o[1] === GOOD) matched++;
          var fb = document.createElement('div');
          fb.className = 'feedback';
          fb.setAttribute('role', 'status');
          fb.innerHTML = '<span class="verdict"></span> <span></span>';
          fb.children[0].textContent = o[1] + '.';
          fb.children[1].textContent = o[2];
          box.appendChild(fb);
          if (o[1] !== GOOD) {
            var mine = step.opts.filter(function (x) { return x[1] === GOOD; })[0];
            var m = document.createElement('p');
            m.className = 'small';
            m.textContent = 'What I would do: ' + mine[0];
            box.appendChild(m);
          }
          if (i + 1 < s.steps.length) showStep(i + 1);
          update();
        });
        opts.appendChild(b);
      });
    }
    showStep(0);
  });

  document.getElementById('reset').addEventListener('click', function () { location.reload(); });
  update();
})();
