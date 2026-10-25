// The camp talk, line by line, as it happened.
// who: 's' me, 'all' everyone together, or a camper's name. 'do' is an activity with no talk.
// wpm: speaking speed. wait: seconds after the line. cue: what I did.
// at: where I stood ('c' is the middle of the circle, a number is a spot on the edge, in degrees).
// go: the campers move ('pix' into the tape grid, 'pairs' into buddies, 'circle' back).
// card: the shape the nine human pixels show. mat: rows of the ghost coloured in on the floor mat.
var LINES = [
  { who: 'do', wait: 4, at: 'c', cue: 'I stand in the middle of the circle. Sixteen campers sit on the floor round me. I clap twice, wait, then clap once.' },
  { who: 's', wpm: 150, text: 'When I say “Pixels”, you say “Freeze”. Pixels!' },
  { who: 'all', wpm: 120, text: 'Freeze!' },
  { who: 's', wpm: 150, cue: 'I slump my shoulders and yawn, then stand up tall.', text: 'Ooh, that was a sleepy freeze. Pixels!' },
  { who: 'all', wpm: 120, wait: 1, text: 'FREEZE!' },
  { who: 's', wpm: 145, text: 'Much better. That’s our signal today. When you hear “Pixels”, you freeze and look at me.' },
  { who: 's', wpm: 140, wait: 2, cue: 'I hold up a card covered in numbers. I turn slowly, so everyone sees it.', text: 'Look at this card. It’s full of numbers. Two, four, two. One, six, one. Zero, two, one, two. Looks boring, right?' },
  { who: 'Aryan', wpm: 160, text: 'It’s a phone number!' },
  { who: 's', wpm: 140, text: 'Ha! Good guess, Aryan. It’s not a phone number. It’s a secret picture.' },
  { who: 's', wpm: 128, wait: 1, cue: 'Slower. I look round the whole circle while I say it.', text: 'Here’s my promise. Before snack time, every one of you will read this picture. And you’ll be able to send your own picture to a friend, using only numbers.' },
  { who: 's', wpm: 145, wait: 4, cue: 'I put my own hand up and turn a full circle, counting hands.', text: 'Hands up if you’ve ever zoomed right into a photo on a phone. Really, really far.' },
  { who: 's', wpm: 145, wait: 4, text: 'Lots of you! So what did you see, when you zoomed in that far?' },
  { who: 'Wei Ling', wpm: 130, text: 'It goes blurry. Then there are little squares.' },
  { who: 's', wpm: 150, at: 200, cue: 'I walk over to Wei Ling and point at her, big smile.', text: 'Squares! Wei Ling just found the big secret of every screen. Everyone, say it: squares!' },
  { who: 'all', wpm: 120, wait: 1, text: 'Squares!' },
  { who: 's', wpm: 140, at: 'c', cue: 'I kneel at the floor mat in the middle. It is an 8 by 8 grid on mahjong paper. I run my finger along a row.', text: 'Every screen is made of tiny squares in rows, like this mat. Each square shows one colour. That’s all it can do. One square, one colour.' },
  { who: 's', wpm: 140, text: 'The squares have a name. Pixels. It’s a squashed-together word. Pix means pictures. El is from element, which means a tiny part. Picture element. Pixel.' },
  { who: 's', wpm: 165, cue: 'Too fast. I am excited, and it shows.', text: 'A screen has so many pixels that your eyes blend them together. Lots of HD TVs have one thousand nine hundred and twenty pixels across, and one thousand and eighty down. That’s more than two million squares.' },
  { who: 'Ethan', wpm: 165, text: 'That’s more than everyone in Singapore!' },
  { who: 's', wpm: 145, cue: 'I hold up three fingers.', text: 'Ooh, close! Singapore has about six million people. So you’d need about three TVs to give everyone their own pixel.' },
  { who: 's', wpm: 150, wait: 3.2, text: 'Okay. Today, we’re not going to look at a screen. We’re going to be one.' },
  { who: 's', wpm: 148, at: 60, cue: 'I stand up and walk to the edge of the circle, by the tape grid.', text: 'I need nine pixels. If I tap your shoulder, stand on a square of the tape grid and take a card. White side out, you’re off. Black side out, you’re on.' },
  { who: 'do', wait: 22, go: 'pix', at: 300, cue: 'Nine campers, aged 8 to 12, find a square. Jun, my co-trainer, hands out the cards. The other seven stay sitting. They are the audience.' },
  { who: 's', wpm: 145, text: 'Pixels, hold your card in front of you, white side out. Everyone sitting, you’re the computer. Your job is to tell the pixels what to do.' },
  { who: 's', wpm: 125, cue: 'I say each row slowly, and point to the row as I say it.', text: 'Top row: black, black, black. Middle row: white, black, white. Bottom row: white, black, white. Go!' },
  { who: 'do', wait: 6, card: 'T', cue: 'The pixels flip their cards.' },
  { who: 's', wpm: 145, text: 'Computer, what can you see?' },
  { who: 'all', wpm: 120, wait: 1, text: 'A T!' },
  { who: 's', wpm: 145, wait: 4, text: 'A T! You’re a screen. Nine pixels, one letter. Now the computer makes an X. Who wants to call it out?' },
  { who: 'Mia', wpm: 130, at: 250, cue: 'Mia jumps up. She is 8, our youngest. I crouch beside her so we are the same height.', text: 'Me! Top row: black, white, black.' },
  { who: 's', wpm: 140, cue: 'I point at the middle row, as a hint.', text: 'Brilliant. Middle row?' },
  { who: 'Mia', wpm: 130, wait: 6, card: 'X', text: 'White, black, white. And the bottom is the same as the top!' },
  { who: 's', wpm: 145, text: 'Look at that! Mia found a shortcut. “Same as the top” saves a lot of words. Keep that idea in your pocket.' },
  { who: 's', wpm: 150, wait: 15, go: 'circle', at: 'c', cue: 'The pixels give their cards back to Jun and sit down. I walk back to the mat.', text: 'Pixels, cards to Jun, and back to the circle. Thank you, screen!' },
  { who: 's', wpm: 140, text: 'Now here’s a problem. Calling out black, white, black takes forever. Imagine two million pixels! So computers use a shortcut. They count.' },
  { who: 's', wpm: 130, wait: 1, cue: 'I hold up one finger for the rule, and say it twice.', text: 'Here’s the rule. In each row, count how many squares in a row are the same colour. And the first number is always white. The first number is always white.' },
  { who: 's', wpm: 145, wait: 6, cue: 'Two campers at the back are poking each other. I make it a body game, so everyone moves.', text: 'Quick check, with your body. Stand up if the first number is always black. Stay sitting if it\u2019s always white.' },
  { who: 'do', wait: 3, cue: 'Three stand. They look around, laugh, and sit down again.' },
  { who: 's', wpm: 145, text: 'Ha! Always white. Sit down, my standing friends. Now let\u2019s try it on the mat.' },
  { who: 's', wpm: 125, mat: 1, cue: 'I colour the first row as I say it: two white, four black, two white.', text: 'Top row of my secret card: two, four, two. That means two white, then four black, then two white.' },
  { who: 's', wpm: 140, wait: 4, text: 'Row two is one, six, one. Who can tell me what that means?' },
  { who: 'Nur', wpm: 110, cue: 'Nur says it very quietly. She hasn’t spoken yet today.', text: 'One white, six black, one white.' },
  { who: 's', wpm: 135, at: 120, cue: 'I move to Nur’s side of the circle and crouch.', text: 'Nur, that was exactly right. Can you say it again, loud enough for the far side?' },
  { who: 'Nur', wpm: 120, text: 'One white, six black, one white!' },
  { who: 's', wpm: 140, wait: 8, mat: 2, at: 'c', cue: 'I hand Nur the marker and step back. She is in the middle, not me.', text: 'Yes! Come and colour it.' },
  { who: 's', wpm: 135, wait: 5, cue: 'I wait. Five seconds feels very long with sixteen campers.', text: 'Now row three is tricky. It starts with a zero. Zero, two, one, two, one, two. Why would a row start with zero?' },
  { who: 'Aryan', wpm: 150, text: 'Because it’s zero white! It starts with black!' },
  { who: 's', wpm: 140, text: 'Aryan cracked it. The first number is always white. So if a row starts black, we say zero white first. Everybody, what colour is the first number?' },
  { who: 'all', wpm: 120, text: 'White!' },
  { who: 's', wpm: 140, text: 'And if the row starts black?' },
  { who: 'all', wpm: 120, wait: 1, text: 'Zero!' },
  { who: 's', wpm: 140, text: 'Aryan, you read rows three and four. Mia, you colour them.' },
  { who: 'do', wait: 22, mat: 4, cue: 'Aryan reads the numbers out. Mia colours. Two eyes appear on the mat.' },
  { who: 'Some campers', wpm: 150, text: 'It’s a face! It’s a robot!' },
  { who: 's', wpm: 150, cue: 'Finger on my lips, big eyes.', text: 'Shh, don’t say it yet! Keep it secret in your head.' },
  { who: 's', wpm: 150, wait: 3, cue: 'I show two fingers for two minutes.', text: 'Buddy time. Find your buddy from this morning. Big buddies read the numbers. Small buddies colour. Every pair gets a new secret card. Two minutes. Go!' },
  { who: 'do', wait: 60, go: 'pairs', at: 90, cue: 'Eight pairs decode. I walk round the outside of the circle. Ethan’s pair finishes in under a minute.' },
  { who: 's', wpm: 150, at: 160, text: 'Ethan, done already? Then flip your card over. Make your own picture on the blank grid, and write its numbers. Then swap with Nur’s pair.' },
  { who: 'do', wait: 48, at: 270, cue: 'Most pairs finish. One pair is stuck on a zero row. I ask Nur’s pair to help them, so I don’t have to.' },
  { who: 's', wpm: 140, at: 'c', text: 'Pixels!' },
  { who: 'all', wpm: 120, wait: 1, text: 'Freeze!' },
  { who: 's', wpm: 145, wait: 4, go: 'circle', cue: 'Thirteen of sixteen hands go up.', text: 'Hands up if your picture came out.' },
  { who: 's', wpm: 140, text: 'Wow. You just did what a phone does when it sends a picture. It turns the picture into numbers, sends the numbers, and the other phone turns them back into squares.' },
  { who: 's', wpm: 140, text: 'Old fax machines sent black and white pictures with this same counting trick. It was much faster than sending every square one by one.' },
  { who: 'Mia', wpm: 130, text: 'What’s a fax machine?' },
  { who: 's', wpm: 150, cue: 'Everyone laughs, me too.', text: 'Ha! Ask your grandparents. It sends a page down a phone line, and another machine prints it.' },
  { who: 's', wpm: 140, wait: 1, text: 'Phones today use cleverer tricks than ours. But the idea is the same. Pictures become numbers.' },
  { who: 's', wpm: 140, wait: 4, text: 'One more secret. Our pixels were only black or white. What about colour? Real screens have colour pixels. Any guesses how?' },
  { who: 'Ethan', wpm: 150, text: 'They have a colour number too?' },
  { who: 's', wpm: 140, text: 'Ooh, yes, a bit like that. Each pixel mixes three kinds of light: red, green and blue. More red, less blue, and so on. Turn all three up together and you get white.' },
  { who: 's', wpm: 145, wait: 1, text: 'Ethan, that\u2019s your next challenge for this afternoon. Give our secret code a colour number.' },
  { who: 's', wpm: 130, cue: 'I hold up the mystery card again and turn slowly.', text: 'Now. The big moment. My secret card. Read row one with me. Two, four, two.' },
  { who: 'all', wpm: 120, text: 'Two white, four black, two white!' },
  { who: 's', wpm: 140, wait: 22, mat: 8, cue: 'I call out rows five to eight. The whole circle says them back, and Wei Ling colours them in.', text: 'Rows five to eight. Zero, eight. Zero, eight. Zero, eight. Then zero, two, one, two, one, two. Wei Ling, colour them in. What is it?' },
  { who: 'all', wpm: 120, wait: 1, text: 'A GHOST!' },
  { who: 's', wpm: 140, text: 'A ghost! Made of sixty-four pixels and a few numbers.' },
  { who: 's', wpm: 125, cue: 'I count on my fingers, one for each.', text: 'So now you can do three things. You can say what a pixel is. You can read a picture made of numbers. And you can send one to a friend.' },
  { who: 's', wpm: 135, wait: 1, text: 'Mia found a shortcut today. Nur read the first tricky row. Aryan cracked the zero. That was a very sharp screen.' },
  { who: 's', wpm: 150, text: 'Pixels!' },
  { who: 'all', wpm: 120, wait: 1, text: 'Freeze!' },
  { who: 's', wpm: 150, text: 'Snack time. Walk, don’t run.' }
];

var FILLERS = /\b(um|uh|okay|ooh)\b/gi;

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
