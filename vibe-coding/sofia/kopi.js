// Kopi Rush: the order rules. No page code here, so the tests can check it.
// Claude wrote most of this file. Lines that end in "// Sofia" are lines I
// typed or retyped myself. Sofia Reyes is an AI persona.
window.Kopi = (function () {
  'use strict';

  // The order code, part by part. Fix a word here and the whole game follows.
  // "word" is what the customer says. An empty word means the usual choice.
  const PARTS = {
    drink: [
      { key: 'kopi', word: 'Kopi', label: 'coffee' },
      { key: 'teh', word: 'Teh', label: 'tea' }
    ],
    milk: [
      { key: 'condensed', word: '', label: 'condensed milk' }, // Sofia: Claude had C here
      { key: 'evaporated', word: 'C', label: 'evaporated milk' }, // Sofia: and condensed here
      { key: 'none', word: 'O', label: 'no milk' }
    ],
    sugar: [
      { key: 'normal', word: '', label: 'normal sugar' },
      { key: 'less', word: 'siew dai', label: 'less sugar' },
      { key: 'more', word: 'gah dai', label: 'more sugar' },
      { key: 'none', word: 'kosong', label: 'no sugar' }
    ],
    temp: [
      { key: 'hot', word: '', label: 'hot' },
      { key: 'iced', word: 'peng', label: 'iced' }
    ]
  };
  const ORDER = ['drink', 'milk', 'sugar', 'temp'];

  function find(part, key) {
    return PARTS[part].find((p) => p.key === key);
  }

  // Kosong only goes with O or C. My sources disagree on plain kosong, so the game // Sofia
  // never asks for plain "Kopi kosong". // Sofia
  function isValid(drink) {
    return ORDER.every((part) => find(part, drink[part])) &&
      !(drink.sugar === 'none' && drink.milk === 'condensed'); // Sofia
  }

  // Every drink the stall can make: 2 x 3 x 4 x 2, minus 4 plain kosong ones.
  function allDrinks() {
    const list = [];
    PARTS.drink.forEach((d) => PARTS.milk.forEach((m) => PARTS.sugar.forEach((s) => PARTS.temp.forEach((t) => {
      const drink = { drink: d.key, milk: m.key, sugar: s.key, temp: t.key };
      if (isValid(drink)) list.push(drink);
    }))));
    return list;
  }

  // Level 1: drink and milk words only. Level 2 adds sugar words. Level 3 adds peng.
  function drinksForLevel(level) {
    return allDrinks().filter((d) =>
      (level >= 2 || d.sugar === 'normal') && (level >= 3 || d.temp === 'hot'));
  }

  function name(drink) {
    return ORDER.map((part) => find(part, drink[part]).word).filter(Boolean).join(' ');
  }

  function describe(drink) {
    const text = ORDER.map((part) => find(part, drink[part]).label).join(', ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Turns "Teh C siew dai peng" back into a drink. Returns null if it isn't
  // an order the stall knows.
  function parse(text) {
    const words = text.trim().toLowerCase().split(/\s+/);
    const drink = {};
    let i = 0;
    for (const part of ORDER) {
      const options = PARTS[part];
      const match = options.find((p) => {
        if (!p.word) return false;
        const size = p.word.split(' ').length;
        return words.slice(i, i + size).join(' ') === p.word.toLowerCase();
      });
      if (match) {
        drink[part] = match.key;
        i += match.word.split(' ').length;
      } else {
        const usual = options.find((p) => !p.word);
        if (!usual) return null; // the drink word can't be left out
        drink[part] = usual.key;
      }
    }
    return i === words.length && isValid(drink) ? drink : null;
  }

  // What the customer says about each wrong part. Claude wrote "Incorrect // Sofia
  // milk selection." An 8-year-old needs the rule, so I rewrote these. // Sofia
  function why(part, wanted) {
    const p = find(part, wanted);
    if (p.word) return '"' + p.word + '" means ' + p.label + '.'; // Sofia
    const none = { milk: 'No O or C', sugar: 'No sugar word', temp: 'No peng' }[part]; // Sofia
    return none + ' means ' + p.label + '.'; // Sofia
  }

  function mistakes(made, wanted) {
    return ORDER.filter((part) => made[part] !== wanted[part]).map((part) => ({
      part: part,
      text: part === 'drink'
        ? 'I wanted ' + find(part, wanted[part]).label + ', not ' + find(part, made[part]).label + '.' // Sofia
        : why(part, wanted[part]) + ' You gave me ' + find(part, made[part]).label + '.' // Sofia
    }));
  }

  return { PARTS, ORDER, find, isValid, allDrinks, drinksForLevel, name, describe, parse, mistakes };
})();
