// The Scratch project "Flip to make my number", written out as data.
// The page runs it with scratchlite.js. The file dot-cards.sb3 was built from
// this same description, so the blocks here match the blocks in Scratch.
(function () {
  function card(v, x) {
    return {
      name: 'Card ' + v, label: 'Card ' + v, x: x, y: -50,
      costumes: [
        { name: 'back', file: 'art/card-' + v + '-back.svg', w: 80, h: 122, cx: 40, cy: 61 },
        { name: 'dots', file: 'art/card-' + v + '-dots.svg', w: 80, h: 122, cx: 40, cy: 61 }
      ],
      describe: function (s) { return 'Card ' + v + ', ' + (s.costume ? 'dots showing' : 'face down'); },
      note: v === 16 ? 'Cards 8, 4, 2 and 1 have these same two scripts. Only the number changes.' : '',
      scripts: [
        [['whenclicked'],
          ['ifelse', ['eq', ['costumename'], 'dots'],
            [['costume', 'back'], ['change', 'total', -v]],
            [['costume', 'dots'], ['change', 'total', v]]]],
        [['whenreceive', 'reset'], ['costume', 'back']]
      ]
    };
  }

  var bit = {
    name: 'Bit', label: 'Bit', x: 180, y: 112,
    costumes: [{ name: 'bit', file: 'art/bit.svg', w: 90, h: 104, cx: 45, cy: 52 }],
    scripts: [
      [['whenflag'],
        ['set', 'score', 0],
        ['set', 'total', 0],
        ['broadcast', 'reset'],
        ['sayfor', 'Hi, I am Bit. Flip the cards to make my number.', 3],
        ['repeat', 5, [
          ['set', 'target', ['random', 1, 31]],
          ['say', ['join', 'Show me ', ['var', 'target']]],
          ['waituntil', ['eq', ['var', 'total'], ['var', 'target']]],
          ['change', 'score', 1],
          ['sayfor', ['join', 'Yes! You made ', ['var', 'target']], 2],
          ['set', 'total', 0],
          ['broadcast', 'reset']
        ]],
        ['ask', 'Last one. Cards 16, 4 and 1 show dots. What number is that?'],
        ['ifelse', ['eq', ['answer'], 21],
          [['change', 'score', 1], ['say', 'Yes! 16 + 4 + 1 = 21. Well done.']],
          [['say', 'Not yet. Count the dots: 16 + 4 + 1 = 21.']]]
      ]
    ]
  };

  var cards = [card(16, -176), card(8, -88), card(4, 0), card(2, 88), card(1, 176)];

  window.PROGRAM = {
    title: 'Flip to make my number',
    stage: {
      costumes: [{ name: 'table', file: 'art/backdrop.svg', w: 480, h: 360, cx: 240, cy: 180 }],
      variables: { score: 0, total: 0, target: 0 },
      monitors: ['score', 'total'],
      scripts: []
    },
    broadcasts: ['reset'],
    sprites: [bit].concat(cards)
  };

  // The starter file for session 2: everything is drawn, and only Card 16
  // has its scripts. Pupils copy them to the other cards, then build Bit.
  var starterBit = {
    name: 'Bit', x: 180, y: 112, costumes: bit.costumes,
    scripts: [[['whenflag'], ['set', 'total', 0], ['broadcast', 'reset'], ['say', 'Flip a card. Watch the total.']]]
  };
  window.STARTER = {
    title: 'Flip to make my number (starter)',
    stage: window.PROGRAM.stage,
    broadcasts: ['reset'],
    sprites: [starterBit, cards[0]].concat(cards.slice(1).map(function (c) {
      return { name: c.name, x: c.x, y: c.y, costumes: c.costumes, scripts: [] };
    }))
  };
})();
