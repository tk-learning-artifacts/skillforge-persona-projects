// The talk as delivered, line by line. s: the slide on screen. wpm: how fast I
// said the line, measured from the recording. wait: seconds of silence after
// it. who: "p" when a parent spoke. cue: what my voice or body did.
// Start times are worked out from these, so the transcript, the player and the
// pace chart always agree.
var LINES = [
  { s: 0, wait: 4, cue: 'Centre front, no podium. I wait for the room to settle, and breathe out slowly.', text: '' },
  { s: 0, wpm: 168, text: 'Good morning, everyone. Give me twelve minutes, and I’ll give you one thing to do tonight.' },
  { s: 0, wpm: 168, text: 'I’m Grace. I teach your children’s coding class on Tuesdays.' },
  { s: 1, wpm: 162, cue: 'I point at the slide, then turn back to the room before I speak.', text: 'Here is my promise. By the time I stop, you’ll be able to make a password a computer can’t guess in your lifetime. And you’ll be able to remember it.' },
  { s: 1, wpm: 162, wait: 1, text: 'Um, no maths degree needed. Just counting.' },
  { s: 2, wpm: 140, cue: 'I step to the left of the screen, so both passwords stay in view.', text: 'So let’s start with a question. Here are two passwords. Which one would take a computer longer to guess?' },
  { s: 2, wpm: 140, wait: 3, cue: 'I raise my own hand, to show what I am asking for.', text: 'Hands up for the one on the left.' },
  { s: 2, wpm: 140, wait: 2, text: 'Hands up for the one on the right.' },
  { s: 2, wpm: 140, wait: 5, cue: 'I count five seconds in my head and walk two steps towards the back row.', text: 'Mostly the left. Who will tell me why? Yes, at the back?' },
  { s: 2, who: 'p', wpm: 150, text: 'It has a capital, a number and a symbol.' },
  { s: 2, wpm: 140, cue: 'I repeat the answer so the front rows hear it too.', text: '“It has a capital, a number and a symbol.” Thank you. That is exactly what most of us were taught. Hold on to that answer. We’ll come back to it.' },
  { s: 3, wpm: 140, text: 'First, how guessing works. Computers don’t guess the way we do. They start with a list.' },
  { s: 3, wpm: 135, wait: 2, cue: 'I stop after “two hundred million” and let the number land.', text: 'On that list are passwords that leaked from websites. This one, one two three four five six, has turned up in leaks more than two hundred million times.' },
  { s: 3, wpm: 140, text: 'So it’s the first thing any guessing program tries. It’s gone in less than a second.' },
  { s: 4, wpm: 142, cue: 'One finger up.', text: 'There are two ways in. Okay, the first way is the front door.' },
  { s: 4, wpm: 142, text: 'Someone types guesses into the login page. Most sites slow that down. Get it wrong a few times and you’re locked out. So the front door is fairly safe.' },
  { s: 4, wpm: 142, cue: 'Two fingers up.', text: 'The second way is the back door. A website gets broken into, and its file of scrambled passwords is stolen.' },
  { s: 4, wpm: 140, text: 'A word on \u201cscrambled\u201d. Good websites don\u2019t keep your password as you typed it. They keep a scrambled version that can\u2019t be turned back. But a thief can scramble each guess the same way, and look for a match. That\u2019s why guessing still works.' },
  { s: 4, wpm: 142, text: 'Now there’s no lock-out. A thief can run guesses on their own computers, as fast as those computers go.' },
  { s: 4, wpm: 138, wait: 1, text: 'For today, I’ll pretend they can try one hundred billion guesses a second. That’s a number I picked to keep the sums easy. It is not a measurement. The back door is the one we’re planning for.' },
  { s: 5, wpm: 140, cue: 'I mime turning a small dial with my thumb and finger.', text: 'Think of a combination lock. The kind on a school locker.' },
  { s: 5, wpm: 140, text: 'Three dials, each from nought to nine. That’s a thousand combinations. A bored student could try them all in one recess.' },
  { s: 5, wpm: 128, wait: 2, cue: 'Hands close together for a thousand. Wide apart for a million.', text: 'Add three more dials. Now it’s a million. Every dial you add multiplies the work by ten. It doesn’t add ten. It multiplies by ten.' },
  { s: 5, wpm: 140, text: 'A password works the same way. Every character is another dial. And, um, a dial with all the letters, numbers and symbols has about ninety-four positions, not ten.' },
  { s: 5, wpm: 136, wait: 4, cue: 'A check before the big numbers. I ask, then wait.', text: 'Quick check. If I add one more character to a password, what happens to the work?' },
  { s: 5, who: 'p', wpm: 150, text: 'It multiplies.' },
  { s: 5, wpm: 138, text: 'It multiplies. By about ninety-four. Thank you. That one word is most of today.' },
  { s: 6, wpm: 140, text: 'Here are three real sums.' },
  { s: 6, wpm: 138, text: 'Eight random characters, any type. About six thousand million million ways. At my pretend speed, a thief tries every one in under a day.' },
  { s: 6, wpm: 138, text: 'Four random words, from a list of seven thousand, seven hundred and seventy-six. That list comes from the Electronic Frontier Foundation. It’s about the same. Under a day.' },
  { s: 6, wpm: 120, wait: 3, cue: 'I stop and look around the room. I let the reaction happen.', text: 'Six random words from the same list. That takes about seventy thousand years.' },
  { s: 6, wpm: 140, cue: 'I see frowns in the right-hand rows, and turn my body to face them.', text: 'I can see some puzzled faces on this side. Let me say it another way.' },
  { s: 6, wpm: 132, wait: 3, cue: 'I wait for nods from the right side before I go on.', text: 'Each word is one big dial, with seven thousand positions. Six big dials beat eight small ones, by a long way. Does that help?' },
  { s: 6, wpm: 140, cue: 'I switch the screen to the guessing calculator and stand beside it, facing the room.', text: 'Let\u2019s try it live. This is a little calculator I made. Nobody types a real password in, ever. We only choose a kind and a length.' },
  { s: 6, wpm: 140, wait: 3, text: 'Somebody give me a number of random words. Shout it out.' },
  { s: 6, who: 'p', wpm: 150, text: 'Three!' },
  { s: 6, wpm: 138, wait: 2, text: 'Three words. Under five seconds at my pretend speed. Not good. Another number?' },
  { s: 6, who: 'p', wpm: 150, text: 'Five.' },
  { s: 6, wpm: 132, wait: 2, cue: 'I read the answer aloud and point at it, so the back row needn\u2019t squint.', text: 'Five words. About nine years. And one more word takes it to seventy thousand. Each word is worth it.' },
  { s: 7, wpm: 140, text: 'Now, back to our vote. Why does S-one-ngapore with an exclamation mark do so badly?' },
  { s: 7, wpm: 142, text: 'Because it isn’t random. People told to add a capital, a number and a symbol all do it the same way. A capital at the front. A one or an exclamation mark at the end. A one instead of an i.' },
  { s: 7, wpm: 140, text: 'The US standards body, NIST, says this plainly. People respond to those rules in very predictable ways. Password becomes Password1, then Password1 with an exclamation mark. So guessing lists try those swaps early.' },
  { s: 7, wpm: 125, wait: 1, text: 'The clever trick is near the top of the list.' },
  { s: 8, wpm: 100, wait: 1, cue: 'Slower. Each word gets its own beat.', text: 'So here’s the first idea to take home. Long beats clever.' },
  { s: 8, wpm: 136, cue: 'A fence: what a passphrase is not. I hold one hand up, palm out.', text: 'One warning, though. Long means long and random. A sentence you would say, like \u201cI love my two children\u201d, is long but not random. People pick sentences like that, so guessing lists try them.' },
  { s: 8, wpm: 136, text: 'Random means you didn\u2019t choose the words. Something else did, like a dice roll. I\u2019ll show you how at the end.' },
  { s: 8, wpm: 110, wait: 2, cue: 'Open palm towards the room. About half the parents say it with me.', text: 'Say it with me? Long beats clever.' },
  { s: 8, wpm: 145, text: 'Okay, that’s idea one. Two more, and they’re short.' },
  { s: 8, wpm: 136, wait: 1, cue: 'Verbal punctuation. I step back to centre.', text: 'That\u2019s the first half done: how guessing works. The second half is what to do about it.' },
  { s: 9, wpm: 120, wait: 1, text: 'Idea two. One password, one account.' },
  { s: 9, wpm: 142, text: 'Remember the back door. When one website leaks, thieves try that same email and password on other sites. Your email, your shopping app, your child’s game account.' },
  { s: 9, wpm: 142, text: 'One reused password opens every door it was used on. Singapore’s Cyber Security Agency says it simply: don’t reuse passwords across accounts.' },
  { s: 9, wpm: 142, text: 'A password manager helps here. It remembers the long ones, so you only need to remember one. CSA suggests that too.' },
  { s: 9, wpm: 132, cue: 'A story. I move to the side of the screen and lower my voice a little.', text: 'Let me tell you how I learnt this. About ten years ago, I got an email from a friend. It said, \u201cGrace, why are you selling sunglasses?\u201d' },
  { s: 9, wpm: 132, text: 'I wasn\u2019t. Someone was sending adverts from my account. I had used the same password on a small cooking forum. The forum leaked, and somebody simply tried that password on my email.' },
  { s: 9, wpm: 132, wait: 1, text: 'It took me a whole weekend to undo, and I had to write to everyone in my contacts. One reused password. One forum I had forgotten I\u2019d joined.' },
  { s: 9, wpm: 140, cue: 'Back to centre. I give the instruction, then show thirty seconds on my fingers.', text: 'So, a quick one with your neighbour. Which account would you fix first, and why? Don\u2019t say the password, just the account. Thirty seconds.' },
  { s: 9, wait: 30, cue: 'Pairs talk. I walk down the side aisle and listen. Two pairs say \u201cemail\u201d, one says \u201cthe family iPad\u201d.', text: '' },
  { s: 9, wpm: 140, text: 'I heard \u201cemail\u201d a lot. Good. Hold on to that, because it\u2019s where idea three starts.' },
  { s: 10, wpm: 120, wait: 1, text: 'Idea three. Add a second lock.' },
  { s: 10, wpm: 142, text: 'Two-factor authentication, or 2FA. After your password, the site asks for something else. A code on your phone, or a tap in an app.' },
  { s: 10, wpm: 142, text: 'Even if a thief has your password, they’re stuck at the second lock. Turn it on for your email first, because your email can reset everything else.' },
  { s: 10, wpm: 140, text: 'You\u2019ll usually find it in your account\u2019s security settings. It takes a few minutes. Do your own first, then sit with your child and do theirs.' },
  { s: 11, wpm: 142, text: 'Last slide of facts. What do the official guides say?' },
  { s: 11, wpm: 142, text: 'Singapore’s CSA says at least twelve characters, long and random. NIST in the US went further last year. If a password is the only lock, they ask for at least fifteen.' },
  { s: 11, who: 'p', wpm: 160, cue: 'A father in the second row asks, without raising his hand.', text: 'But my bank makes me change my password every three months. Isn’t that safer?' },
  { s: 11, wpm: 166, cue: 'I take a step towards him and nod while he speaks. My answer comes out too fast.', text: 'Um, good question, thank you. I used to think so too.' },
  { s: 11, wpm: 166, text: 'NIST now says sites should not force regular changes. When I had to change mine often, I just bumped the number at the end. Thieves guess that too.' },
  { s: 11, wpm: 160, text: 'Change it when there’s a reason. A leak, a warning email, or if you shared it. Does your bank also send a code to your phone?' },
  { s: 11, who: 'p', wpm: 150, text: 'Yes, an SMS.' },
  { s: 11, wpm: 140, wait: 1, text: 'Then you already have a second lock. That counts for more than the three-month change.' },
  { s: 12, wpm: 140, text: 'Here’s the one thing for tonight. Make a passphrase with your child, using dice.' },
  { s: 12, wpm: 138, text: 'Roll five dice. Read them as a number, like four three six one two. Look that number up on the EFF word list, and write the word down. Do it six times. That’s six random words.' },
  { s: 12, wpm: 136, text: 'Six words sounds like a lot to remember. So make a silly picture. A lamp floating down a river, wearing one sock, in a thunderstorm. You\u2019ll remember the picture. The words come back with it.' },
  { s: 12, who: 'p', wpm: 150, cue: 'A mother near the front asks.', text: 'Where do we find the word list?' },
  { s: 12, wpm: 140, wait: 1, text: 'It\u2019s on the back of your handout, with the web address. The EFF made it, and it\u2019s free. You only need the dice.' },
  { s: 12, wpm: 140, text: 'Your child will like the dice. You’ll like that it’s random. Neither of you picked it, so nobody can guess it from knowing you.' },
  { s: 12, wpm: 140, wait: 1, text: 'Two rules. Use it for one account only. And never write it on anything you post or hand in.' },
  { s: 13, wpm: 135, cue: 'I count on my fingers, one per line.', text: 'So, by now you can do three things.' },
  { s: 13, wpm: 130, text: 'You can explain why long beats clever. You can make a six-word passphrase with dice. And you can add a second lock to your email.' },
  { s: 13, wpm: 108, wait: 1, cue: 'Slower again. The three ideas, one last time.', text: 'Long beats clever. One password, one account. Add a second lock.' },
  { s: 13, wpm: 135, wait: 2, cue: 'I stop and stay still for two seconds. No “that’s all”.', text: 'I expected a quiet room on a Saturday morning. Your questions made this a better talk. The bank question was one I hadn’t planned, and I’m glad it came up.' }
];

var FILLERS = /\b(um|uh|okay)\b/gi;

// Adds t (start) and d (length in seconds) to every line. Returns the total.
function timeLines() {
  var t = 0;
  LINES.forEach(function (l) {
    var words = l.text ? l.text.split(/\s+/).length : 0;
    l.words = words;
    l.t = t;
    l.speak = words ? words / (l.wpm || 140) * 60 : 0;
    l.d = l.speak + (l.wait || 0);
    t += l.d;
  });
  return t;
}
