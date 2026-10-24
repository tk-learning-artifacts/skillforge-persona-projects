// The secret pictures from camp. # is a black square, . is a white one.
// encodeRow turns a row into the camp code: counts of runs, white first.
var PICTURES = {
  ghost: { name: 'The mystery card', rows: ['..####..', '.######.', '##.##.##', '##.##.##', '########', '########', '########', '##.##.##'], answer: 'a ghost' },
  cat: { name: 'Card A', rows: ['#......#', '##....##', '########', '#..##..#', '########', '###..###', '.######.', '..####..'], answer: 'a cat' },
  rocket: { name: 'Card B', rows: ['...##...', '..####..', '..#..#..', '..####..', '..####..', '.######.', '##.##.##', '#..##..#'], answer: 'a rocket' },
  umbrella: { name: 'Card C', rows: ['..####..', '.######.', '########', '...#....', '...#....', '...#....', '...#.#..', '....#...'], answer: 'an umbrella' }
};

function encodeRow(row) {
  var out = [], colour = '.', run = 0;
  for (var i = 0; i < row.length; i++) {
    if (row[i] === colour) run++;
    else { out.push(run); colour = row[i]; run = 1; }
  }
  out.push(run);
  return out;
}
