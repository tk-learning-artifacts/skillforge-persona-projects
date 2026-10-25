// Queue Quest, version 2: 20 game cards. Each card has a category (shown by
// colour, icon and word), a picture for children who can't read yet, a
// two-line rule for the grown-up, an age mark and a player count.
var QQ = (function () {
  var CATS = {
    look: { word: 'Look', icon: '<path d="M4 20Q20 4 36 20Q20 36 4 20Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><circle cx="20" cy="20" r="5.5" fill="currentColor"/>' },
    talk: { word: 'Talk', icon: '<path d="M6 8H34Q37 8 37 11V25Q37 28 34 28H18L10 35V28H6Q3 28 3 25V11Q3 8 6 8Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>' },
    move: { word: 'Move', icon: '<path d="M12 34V16M12 16V8M19 16V5M26 16V7M33 18V11M12 34Q12 38 20 38H25Q33 38 33 28V18" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' },
    listen: { word: 'Listen', icon: '<path d="M10 16Q10 4 21 4Q32 4 32 15Q32 22 25 26Q22 28 22 33Q22 37 18 37Q14 37 13 33" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M17 16Q17 11 21 11Q25 11 25 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' }
  };

  // Pictures are drawn on a 100 by 64 grid. They use the card's ink colour
  // plus a few fixed fills, so they still read in black and white.
  var S = 'stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  var CARDS = [
    { id: 1, cat: 'look', name: 'Colour Hunt', age: 4, players: '1 or more', solo: true,
      rule: 'Find 5 red things. Then 5 blue things. Then you pick a colour.',
      pic: '<circle cx="26" cy="32" r="13" fill="#e03131"/><circle cx="50" cy="32" r="13" fill="#1971c2"/><circle cx="74" cy="32" r="13" fill="#f2b01e"/>' },
    { id: 2, cat: 'look', name: 'Count It', age: 6, players: '2 or more',
      rule: 'Guess how many people near you wear a cap. Then count. Closest guess wins.',
      pic: '<path d="M22 40Q22 18 42 18Q60 18 60 40Z" ' + S + '/><path d="M60 40H80" ' + S + '/><text x="70" y="26" font-size="16" font-weight="700" fill="currentColor">?</text>' },
    { id: 3, cat: 'look', name: 'Shape Spotter', age: 4, players: '1 or more', solo: true,
      rule: 'Find a circle, a square and a triangle near you. Point at each one.',
      pic: '<circle cx="22" cy="34" r="13" ' + S + '/><rect x="40" y="21" width="24" height="26" ' + S + '/><path d="M70 47L82 20L94 47Z" ' + S + '/>' },
    { id: 4, cat: 'look', name: "What's Gone?", age: 4, players: '2',
      rule: 'Look at the table for 10 seconds. Close your eyes. One thing hides. What is gone?', timer: 10,
      pic: '<rect x="12" y="24" width="18" height="22" rx="3" ' + S + '/><circle cx="50" cy="35" r="11" ' + S + '/><rect x="70" y="24" width="18" height="22" rx="3" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="4 4"/>' },
    { id: 5, cat: 'look', name: 'Odd One Out', age: 6, players: '2 or more',
      rule: 'Point at 3 things. Two belong together. Can your partner spot the odd one?',
      pic: '<circle cx="22" cy="34" r="12" ' + S + '/><circle cx="50" cy="34" r="12" ' + S + '/><rect x="66" y="22" width="24" height="24" rx="2" ' + S + '/><path d="M64 54H92" ' + S + '/>' },
    { id: 6, cat: 'talk', name: 'Story Chain', age: 6, players: '2 or more',
      rule: 'Say one word each, in turn. Build a story. Who gets to say "The end"?',
      pic: '<rect x="10" y="24" width="30" height="18" rx="9" ' + S + '/><rect x="35" y="24" width="30" height="18" rx="9" ' + S + '/><rect x="60" y="24" width="30" height="18" rx="9" ' + S + '/>' },
    { id: 7, cat: 'talk', name: 'Alphabet Food', age: 6, players: '2 or more',
      rule: 'A for ayam, B for bee hoon. Take turns. How far down the alphabet can you go?',
      pic: '<path d="M20 30H80Q78 52 50 52Q22 52 20 30Z" ' + S + '/><path d="M58 8L46 30M68 10L54 30" ' + S + '/><text x="40" y="47" font-size="13" font-weight="700" fill="currentColor">ABC</text>' },
    { id: 8, cat: 'talk', name: 'Would You Rather', age: 4, players: '2 or more',
      rule: 'Chicken rice every day, or never again? Pick one and say why. Then you ask one.',
      pic: '<path d="M8 30H40Q39 46 24 46Q9 46 8 30Z" ' + S + '/><path d="M60 30H92Q91 46 76 46Q61 46 60 30Z" ' + S + '/><text x="44" y="42" font-size="18" font-weight="700" fill="currentColor">?</text>' },
    { id: 9, cat: 'talk', name: 'Opposites', age: 4, players: '2',
      rule: 'I say "hot". You say "cold". Go faster and faster. Who slips first?',
      pic: '<path d="M30 50V14M18 26L30 14L42 26" ' + S + '/><path d="M70 14V50M58 38L70 50L82 38" ' + S + '/>' },
    { id: 10, cat: 'talk', name: 'Guess My Animal', age: 6, players: '2 or more',
      rule: 'Think of an animal. Others ask yes or no questions. They get 10 tries.',
      pic: '<path d="M32 22L36 8L46 18M68 22L64 8L54 18" ' + S + '/><circle cx="50" cy="36" r="20" ' + S + '/><circle cx="42" cy="33" r="2.5" fill="currentColor"/><circle cx="58" cy="33" r="2.5" fill="currentColor"/><path d="M46 43Q50 46 54 43" ' + S + '/>' },
    { id: 11, cat: 'move', name: 'Copy Cat', age: 4, players: '2',
      rule: 'Make a silly face. Your partner copies it. Then swap.',
      pic: '<circle cx="28" cy="32" r="18" ' + S + '/><circle cx="22" cy="28" r="2.5" fill="currentColor"/><circle cx="34" cy="28" r="2.5" fill="currentColor"/><path d="M20 38Q28 46 36 38" ' + S + '/><circle cx="72" cy="32" r="18" ' + S + '/><circle cx="66" cy="28" r="2.5" fill="currentColor"/><circle cx="78" cy="28" r="2.5" fill="currentColor"/><path d="M64 38Q72 46 80 38" ' + S + '/>' },
    { id: 12, cat: 'move', name: 'Statue', age: 4, players: '2 or more', timer: 30,
      rule: 'Freeze for 30 seconds. No moving, no laughing. First to move loses.',
      pic: '<circle cx="50" cy="12" r="7" ' + S + '/><path d="M50 19V40M50 26L34 18M50 26L66 34M50 40L40 58M50 40L60 58" ' + S + '/>' },
    { id: 13, cat: 'move', name: 'Finger Drum', age: 4, players: '2',
      rule: 'Tap a beat on the table. Can your partner tap it back the same?',
      pic: '<circle cx="18" cy="44" r="6" fill="currentColor"/><circle cx="38" cy="44" r="6" fill="currentColor"/><circle cx="54" cy="44" r="4" fill="currentColor"/><circle cx="66" cy="44" r="4" fill="currentColor"/><circle cx="86" cy="44" r="6" fill="currentColor"/><path d="M10 56H92" ' + S + '/>' },
    { id: 14, cat: 'move', name: 'Air Draw', age: 4, players: '2',
      rule: 'Draw a shape in the air with one finger. Can your partner guess it?',
      pic: '<path d="M50 6L58 24L78 26L63 39L67 58L50 48L33 58L37 39L22 26L42 24Z" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="5 4" stroke-linejoin="round"/>' },
    { id: 15, cat: 'move', name: 'Back Writing', age: 6, players: '2',
      rule: 'Draw a letter on your partner\'s back with a finger. Can they guess it?',
      pic: '<path d="M22 60Q22 20 50 16Q78 20 78 60" ' + S + '/><path d="M40 50L50 26L60 50M44 41H56" ' + S + '/>' },
    { id: 16, cat: 'move', name: 'Rock Paper Scissors Plus', age: 4, players: '2',
      rule: 'Play best of 5. The loser makes up a new hand sign. What beats what?',
      pic: '<circle cx="20" cy="34" r="12" fill="currentColor"/><rect x="40" y="20" width="22" height="28" rx="2" ' + S + '/><path d="M74 48L82 22M90 48L82 22" ' + S + '/>' },
    { id: 17, cat: 'listen', name: 'Sound Detective', age: 4, players: '1 or more', solo: true, timer: 20,
      rule: 'Close your eyes for 20 seconds. Count every sound you hear. Who heard most?',
      pic: '<path d="M40 22Q40 10 50 10Q60 10 60 21Q60 27 55 31Q52 33 52 37Q52 41 48 41" ' + S + '/><path d="M68 18Q74 26 68 34M76 12Q86 26 76 40M32 18Q26 26 32 34M24 12Q14 26 24 40" ' + S + '/>' },
    { id: 18, cat: 'listen', name: 'Clap on Three', age: 6, players: '2 or more',
      rule: 'Count up together, one number each. On 3, 6 and 9, clap instead of talking.',
      pic: '<text x="8" y="42" font-size="18" font-weight="700" fill="currentColor">1  2</text><path d="M66 20L72 46M80 18L76 46M60 30L70 24M86 28L78 22" ' + S + '/>' },
    { id: 19, cat: 'listen', name: 'Whisper Pass', age: 4, players: '3 or more',
      rule: 'Whisper a word to the next person. Pass it down the line. Did it change?',
      pic: '<circle cx="18" cy="30" r="9" ' + S + '/><circle cx="50" cy="30" r="9" ' + S + '/><circle cx="82" cy="30" r="9" ' + S + '/><path d="M30 30Q34 26 38 30M62 30Q66 26 70 30" ' + S + '/><path d="M10 52H90" stroke="currentColor" stroke-width="3" stroke-dasharray="3 5"/>' },
    { id: 20, cat: 'listen', name: 'Rhyme Time', age: 6, players: '2 or more',
      rule: 'Say a word. Take turns to rhyme with it. Stuck? The other player wins the round.',
      pic: '<rect x="8" y="16" width="38" height="26" rx="8" ' + S + '/><text x="14" y="34" font-size="13" font-weight="700" fill="currentColor">cat</text><rect x="54" y="16" width="38" height="26" rx="8" ' + S + '/><text x="60" y="34" font-size="13" font-weight="700" fill="currentColor">hat</text>' }
  ];

  function icon(cat, size) {
    return '<svg viewBox="0 0 40 40" width="' + size + '" height="' + size + '" aria-hidden="true">' + CATS[cat].icon + '</svg>';
  }

  // One card face, as HTML. The content is our own fixed data above.
  function face(c) {
    return '<article class="qq-card cat-' + c.cat + '" aria-label="' + c.name + ', a ' + CATS[c.cat].word + ' game">' +
      '<header>' + icon(c.cat, 22) + '<span>' + CATS[c.cat].word + '</span><b>' + c.id + '</b></header>' +
      '<svg class="pic" viewBox="0 0 100 64" aria-hidden="true">' + c.pic + '</svg>' +
      '<h4>' + c.name + '</h4>' +
      '<p>' + c.rule + '</p>' +
      '<footer><span>Ages ' + c.age + '+</span><span>' + c.players + ' players</span></footer>' +
      '</article>';
  }

  return { CATS: CATS, CARDS: CARDS, face: face, icon: icon };
})();
