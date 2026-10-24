// The page's colours, copied from style.css, so the checks can test both
// light and dark mode. proto.js warns if these and the live page disagree.
window.PALETTE = {
  light: {
    ink: '#1d2340', 'ink-2': '#3a4060', muted: '#535a78', line: '#d5d8e8',
    ground: '#ffffff', surface: '#f3f4fb', accent: '#3c3fa0', 'accent-soft': '#e6e7f7',
    done: '#1d6636', 'done-soft': '#e2f1e6', warn: '#874600', 'warn-soft': '#fdf0dc'
  },
  dark: {
    ink: '#eceefa', 'ink-2': '#c8cbe0', muted: '#a3a8c3', line: '#33385a',
    ground: '#141729', surface: '#1d2138', accent: '#aeb2ff', 'accent-soft': '#292e58',
    done: '#8fd6a3', 'done-soft': '#17301f', warn: '#f3c27f', 'warn-soft': '#36270f'
  }
};

// Text pairs used in the mock-up: [what it is, text colour, background, large text?]
window.TEXT_PAIRS = [
  ['Body text on the page', 'ink', 'ground', false],
  ['Task text on a card', 'ink', 'surface', false],
  ['Subject label on a card', 'ink-2', 'surface', false],
  ['Small notes and counts', 'muted', 'ground', false],
  ['Small notes on a card', 'muted', 'surface', false],
  ['Links and the back button', 'accent', 'ground', false],
  ['Button text on the main button', 'ground', 'accent', false],
  ['Chosen tab', 'accent', 'accent-soft', false],
  ['"Due tomorrow" tag', 'warn', 'warn-soft', false],
  ['"Done" tag', 'done', 'done-soft', false],
  ['Big heading', 'ink', 'ground', true]
];

// Parts of controls that must stand out at 3:1: [what it is, colour, next to]
window.UI_PAIRS = [
  ['Tick box border on a card', 'ink-2', 'surface'],
  ['Checkbox border on the page', 'ink-2', 'ground'],
  ['Focus ring on the page', 'accent', 'ground'],
  ['Main button against the page', 'accent', 'ground']
];
