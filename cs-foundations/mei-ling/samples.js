// Scripts from two made-up pairs, drawn on work.html.
window.SAMPLES = {
  'pair3-card2': [
    [['whenclicked'],
      ['ifelse', ['eq', ['costumename'], 'dots'],
        [['costume', 'back'], ['change', 'total', -16]],
        [['costume', 'dots'], ['change', 'total', 16]]]]
  ],
  'pair3-card2-fixed': [
    [['whenclicked'],
      ['ifelse', ['eq', ['costumename'], 'dots'],
        [['costume', 'back'], ['change', 'total', -2]],
        [['costume', 'dots'], ['change', 'total', 2]]]]
  ],
  'pair7-card32': [
    [['whenclicked'],
      ['ifelse', ['eq', ['costumename'], 'dots'],
        [['costume', 'back'], ['change', 'total', -32]],
        [['costume', 'dots'], ['change', 'total', 32]]]],
    [['whenreceive', 'reset'], ['costume', 'back']]
  ],
  'pair7-bit': [
    [['whenflag'],
      ['set', 'score', 0],
      ['set', 'total', 0],
      ['broadcast', 'reset'],
      ['repeat', 5, [
        ['set', 'target', ['random', 32, 63]],
        ['say', ['join', 'Show me ', ['var', 'target']]],
        ['waituntil', ['eq', ['var', 'total'], ['var', 'target']]],
        ['change', 'score', 1],
        ['sayfor', 'Yes!', 2],
        ['set', 'total', 0],
        ['broadcast', 'reset']
      ]]]
  ]
};
