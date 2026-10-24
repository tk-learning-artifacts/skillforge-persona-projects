// The 12 sorting items. Bin keys: blue (blue recycling bin), general (general
// waste), elsewhere (e-waste bin, or give it away). Reasons follow NEA's
// Recycle Right guidance, linked on the index page.
var BINS = {
  blue: { name: 'Blue bin', sub: 'recycle it', icon: 'binBlue' },
  general: { name: 'General waste', sub: 'throw it away', icon: 'binGeneral' },
  elsewhere: { name: 'Somewhere else', sub: 'e-waste or give away', icon: 'elsewhere' }
};
var ITEMS = [
  { id: 'paper', name: 'Clean worksheet', bin: 'blue', why: 'Clean paper goes in the blue bin.' },
  { id: 'cardboard', name: 'Flat cardboard box', bin: 'blue', why: 'Flat, dry cardboard goes in the blue bin.' },
  { id: 'bottle', name: 'Empty plastic drink bottle', bin: 'blue', why: 'Pour out the drink first. Then it goes in the blue bin.' },
  { id: 'can', name: 'Empty drink can', bin: 'blue', why: 'Empty cans go in the blue bin.' },
  { id: 'carton', name: 'Empty drink packet', bin: 'blue', why: 'Drink packets are cartons. Squeeze them empty. Then they go in the blue bin.' },
  { id: 'jar', name: 'Rinsed glass jar', bin: 'blue', why: 'Glass jars go in the blue bin. An adult carries glass.' },
  { id: 'tissue', name: 'Used tissue', bin: 'general', why: 'Tissue can never be recycled, clean or dirty.' },
  { id: 'foam', name: 'Styrofoam food box', bin: 'general', why: 'Styrofoam spoils the blue bin. It goes in general waste.' },
  { id: 'oily', name: 'Paper box with oil stains', bin: 'general', why: 'Oil and food spoil paper. It goes in general waste.' },
  { id: 'spoon', name: 'Plastic spoon', bin: 'general', why: 'Plastic spoons and forks are on the list of things that spoil the blue bin.' },
  { id: 'battery', name: 'Old battery', bin: 'elsewhere', why: 'Batteries go to an e-waste bin, never the blue bin. Give them to your teacher.' },
  { id: 'toy', name: 'Toy car that still works', bin: 'elsewhere', why: 'Give it to someone who will play with it. Toys do not go in the blue bin.' }
];
