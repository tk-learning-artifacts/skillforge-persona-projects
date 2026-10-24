// Every card holds a message, two buttons and an empty feedback line.
const cards = document.querySelectorAll('.card');
const score = document.querySelector('#score');
let right = 0;

cards.forEach(function (card) {
  const feedback = card.querySelector('.feedback');
  const buttons = card.querySelectorAll('button');

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      // Both are words, like "scam" or "safe".
      const choice = button.dataset.choice;
      const answer = card.dataset.answer;

      // TODO 3 (JavaScript): If choice is the same as answer,
      // set feedback.textContent to "Correct! " followed by card.dataset.clue,
      // and add 1 to right. Otherwise, set it to "Not quite. " and the clue.
      // Then update the score with score.textContent.

    });
  });
});
