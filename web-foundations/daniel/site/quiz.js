// Scam or not?: adds two buttons to each message, checks the choice,
// shows the clue and keeps the score.
const messages = document.querySelectorAll('.msg');
const score = document.querySelector('#score');
const done = document.querySelector('#done');
let right = 0;
let answered = 0;

function makeButton(text, value) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = value;
  button.textContent = text;
  button.dataset.choice = value;
  button.setAttribute('aria-pressed', 'false');
  return button;
}

messages.forEach(function (msg, i) {
  const choices = document.createElement('div');
  choices.className = 'choices';
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', 'Message ' + (i + 1));
  const feedback = document.createElement('p');
  feedback.className = 'feedback';
  feedback.setAttribute('aria-live', 'polite');

  [makeButton('Scam', 'scam'), makeButton('Looks safe', 'safe')].forEach(function (button) {
    button.addEventListener('click', function () {
      const correct = button.dataset.choice === msg.dataset.answer;
      button.setAttribute('aria-pressed', 'true');
      choices.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      feedback.textContent = '';
      const head = document.createElement('b');
      head.textContent = correct ? 'Correct. ' : 'Not quite. It is ' + (msg.dataset.answer === 'scam' ? 'a scam. ' : 'safe. ');
      feedback.appendChild(head);
      feedback.appendChild(document.createTextNode(msg.dataset.clue));
      feedback.classList.add(correct ? 'right' : 'wrong');
      if (correct) right++;
      answered++;
      score.textContent = 'Score: ' + right + ' of ' + messages.length;
      if (answered === messages.length) {
        done.textContent = right === messages.length
          ? 'All 6 right. Now show a family member the 4 signs.'
          : 'You got ' + right + ' of 6. Read the clues again, then press Start again.';
      }
    });
    choices.appendChild(button);
  });
  msg.appendChild(choices);
  msg.appendChild(feedback);
});

document.querySelector('#restart').addEventListener('click', function () {
  right = 0;
  answered = 0;
  score.textContent = 'Score: 0 of ' + messages.length;
  done.textContent = '';
  document.querySelectorAll('.choices button').forEach(function (b) {
    b.disabled = false;
    b.setAttribute('aria-pressed', 'false');
  });
  document.querySelectorAll('.feedback').forEach(function (f) {
    f.textContent = '';
    f.className = 'feedback';
  });
  messages[0].querySelector('button').focus();
});
