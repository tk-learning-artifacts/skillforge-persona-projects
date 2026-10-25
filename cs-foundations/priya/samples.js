// Scripts from a made-up pair's Key Bot, drawn on work.html.
(function () {
  function check(word) { return ['eq', ['answer'], word]; }
  function bot(word) {
    return [
      [['whenflag'],
        ['forever', [
          ['sayfor', 'Pick one object. Keep it secret.', 3],
          ['ask', 'Does it stretch and spring back? (y/n)'],
          ['ifelse', check(word),
            [['sayfor', 'It is the rubber band!', 2]],
            [['ask', 'Does it conduct electricity? (y/n)'],
              ['ifelse', check(word),
                [['ask', 'Can you bend it with your fingers? (y/n)'],
                  ['ifelse', check(word), [['sayfor', 'It is the copper wire!', 2]], [['sayfor', 'It is the steel spoon!', 2]]]],
                [['ask', 'Does it float in water? (y/n)'],
                  ['ifelse', check(word), [['sayfor', 'It is the ice-cream stick!', 2]], [['sayfor', 'It is the glass marble!', 2]]]]]]]
        ]]]
    ];
  }
  window.SAMPLES = window.SAMPLES || {};
  window.SAMPLES['pair7-bug'] = bot('yes');
  window.SAMPLES['pair7-fixed'] = bot('y');
})();
