// Hides the stalls that don't match what you type.
const box = document.getElementById('find');
const items = document.querySelectorAll('.stalls li');
const count = document.getElementById('count');

box.addEventListener('input', () => {
  const words = box.value.trim().toLowerCase();
  let shown = 0;
  for (const li of items) {
    const match = li.textContent.toLowerCase().includes(words);
    li.hidden = !match;
    if (match) shown++;
  }
  count.textContent = shown + ' of ' + items.length + ' stalls';
});
