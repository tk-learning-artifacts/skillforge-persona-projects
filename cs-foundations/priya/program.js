// The Scratch project "Key Bot", written out as data. The page runs it with
// scratchlite.js. key-bot.sb3 and key-bot-starter.sb3 were built from this
// same description, so the blocks on the page match the blocks in Scratch.
(function () {
  var yes = function () { return ['eq', ['answer'], 'y']; };
  var costumes = [{ name: 'keybot', file: 'art/keybot.svg', w: 96, h: 110, cx: 48, cy: 55 }];
  var stage = {
    costumes: [{ name: 'bench', file: 'art/backdrop.svg', w: 480, h: 360, cx: 240, cy: 180 }],
    variables: { games: 0, right: 0, guess: '' },
    monitors: ['games', 'right'],
    scripts: []
  };

  window.PROGRAM = {
    title: 'Key Bot',
    stage: stage,
    broadcasts: [],
    sprites: [{
      name: 'Key Bot', x: 180, y: 112, costumes: costumes,
      scripts: [
        [['whenflag'],
          ['set', 'games', 0],
          ['set', 'right', 0],
          ['forever', [
            ['sayfor', 'Pick one object on the bench. Keep it secret.', 3],
            ['ask', 'Does it conduct electricity? (y/n)'],
            ['ifelse', yes(),
              [['ask', 'Can you wrap it round a pencil? (y/n)'],
                ['ifelse', yes(), [['set', 'guess', 'copper wire']], [['set', 'guess', 'steel spoon']]]],
              [['ask', 'Does it stretch and spring back? (y/n)'],
                ['ifelse', yes(), [['set', 'guess', 'rubber band']],
                  [['ask', 'Does it float in water? (y/n)'],
                    ['ifelse', yes(), [['set', 'guess', 'ice-cream stick']], [['set', 'guess', 'glass marble']]]]]]],
            ['ask', ['join', 'Is it the ', ['join', ['var', 'guess'], '? (y/n)']]],
            ['change', 'games', 1],
            ['ifelse', yes(),
              [['change', 'right', 1], ['sayfor', 'The key worked.', 2]],
              [['sayfor', 'The key went wrong. Which question was unclear?', 3]]]
          ]]
        ]
      ]
    }]
  };

  // Lesson 2 starter: the first question is done. Pairs replace the two
  // "say" blocks with the rest of their own group's key.
  window.STARTER = {
    title: 'Key Bot (starter)',
    stage: stage,
    broadcasts: [],
    sprites: [{
      name: 'Key Bot', x: 180, y: 112, costumes: costumes,
      scripts: [
        [['whenflag'],
          ['set', 'games', 0],
          ['set', 'right', 0],
          ['forever', [
            ['sayfor', 'Pick one object on the bench. Keep it secret.', 3],
            ['ask', 'Does it conduct electricity? (y/n)'],
            ['ifelse', yes(),
              [['sayfor', 'Put your next question for metals here.', 2]],
              [['sayfor', 'Put your next question for the others here.', 2]]]
          ]]
        ]
      ]
    }]
  };
})();
