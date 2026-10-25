// First draft of the quiz: radio buttons and one Check button.
document.querySelector('#check').addEventListener('click', function () {
  var right = 0;
  document.querySelectorAll('.msg').forEach(function (msg, i) {
    var picked = document.querySelector('input[name="q' + (i + 1) + '"]:checked');
    if (picked && picked.value === msg.dataset.answer) right++;
  });
  document.querySelector('#result').textContent = 'You got ' + right + ' out of 3.';
});
document.querySelector('#again').addEventListener('click', function () {
  document.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
  document.querySelector('#result').textContent = '';
});
