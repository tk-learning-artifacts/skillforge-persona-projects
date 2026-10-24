package com.example.hitbox

// One game-design word. level is how hard the word is: 1, 2 or 3.
data class Word(
    val id: Int,
    val term: String,
    val level: Int,
    val meaning: String,
    val example: String
)

val gameWords = listOf(
    Word(1, "Goal", 1,
        "What the player is trying to do.",
        "In Super Mario Bros., you run right to reach the flagpole at the end of most levels."),
    Word(2, "Rule", 1,
        "What the player can and can't do.",
        "In my game Prime Smash, a wrong prime costs a heart."),
    Word(3, "Feedback", 1,
        "How the game tells you what just happened.",
        "In Pac-Man, the ghosts turn blue after you eat a power pellet. You see the rules change."),
    Word(4, "Core loop", 2,
        "The thing the player does again and again.",
        "Look at the number, pick a prime, see it shrink, pick again."),
    Word(5, "Spawn point", 1,
        "Where a player appears at the start, or after they lose.",
        "In Minecraft, sleeping in a bed sets your spawn point to that bed."),
    Word(6, "Power-up", 1,
        "An item that gives the player a new ability for a while.",
        "In Super Mario Bros., a Super Mushroom makes Mario bigger. It protects him from one hit."),
    Word(7, "Sprite", 2,
        "A 2D picture that moves around the game screen.",
        "In MakeCode Arcade, your player, the enemies and the coins are all sprites."),
    Word(8, "Hitbox", 2,
        "The invisible shape the game checks to see if two things touch.",
        "A hitbox smaller than the sprite makes near misses feel fair."),
    Word(9, "HUD", 2,
        "Heads-up display: the score, lives and timer drawn over the game.",
        "Prime Smash shows score, level and hearts in a bar above the screen."),
    Word(10, "Playtest", 2,
        "Watching someone new play your game, without helping them.",
        "Stay silent. Write down where they get stuck."),
    Word(11, "Difficulty curve", 3,
        "How fast the game gets harder as you play.",
        "Too steep and players give up. Too flat and they get bored."),
    Word(12, "Cooldown", 3,
        "A wait before you can use the same move again.",
        "A cooldown stops players from pressing one strong button over and over.")
)
