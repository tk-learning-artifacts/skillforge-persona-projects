// Copy buttons on the prompt log.
document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', () => {
    const text = button.parentElement.querySelector('.prompt').textContent;
    const done = () => { button.textContent = 'Copied'; setTimeout(() => { button.textContent = 'Copy this prompt'; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => { button.textContent = 'Select the text to copy'; });
    else button.textContent = 'Select the text to copy';
  });
});
