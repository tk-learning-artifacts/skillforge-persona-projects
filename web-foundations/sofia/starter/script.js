// Find the secret message and the button on the page.
const secret = document.querySelector('#secret');
const button = document.querySelector('#decode');
const hidden = secret.textContent;

// TODO 3 (JavaScript): The message was hidden with a Caesar shift.
// Change the 0 to the right shift. Caesar's own shift is a good guess.
const shift = 0;

// Moves every letter back along the alphabet by the shift.
function decode(text) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let answer = '';
  for (const letter of text) {
    const place = abc.indexOf(letter);
    if (place === -1) {
      answer = answer + letter;
    } else {
      answer = answer + abc[(place - shift + 26) % 26];
    }
  }
  return answer;
}

button.addEventListener('click', function () {
  secret.textContent = decode(hidden);
});
