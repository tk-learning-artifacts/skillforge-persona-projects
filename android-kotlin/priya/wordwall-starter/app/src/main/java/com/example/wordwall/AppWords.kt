package com.example.wordwall

// One word from the course. week is the week students first meet it.
data class AppWord(
    val id: Int,
    val word: String,
    val week: Int,
    val meaning: String,
    val inOurApp: String
)

val weekTitles = mapOf(
    1 to "Week 1: Blocks first",
    2 to "Week 2: Kotlin in the browser",
    3 to "Week 3: A first Compose screen",
    4 to "Week 4: State",
    5 to "Week 5: Lists and screens",
    6 to "Week 6: Run it on a phone"
)

val appWords = listOf(
    AppWord(1, "Component", 1,
        "A part of an App Inventor app, such as a Button, Label or Sound.",
        "HelloPurr has a Button with the kitty picture and a Sound for the meow."),
    AppWord(2, "Event", 1,
        "Something that happens, such as a tap, that the app can respond to.",
        "The when Button1.Click block runs when someone taps the kitty."),
    AppWord(3, "Companion", 1,
        "The MIT AI2 Companion app. It shows your App Inventor app live on a phone or tablet.",
        "Scan the code on screen and your app opens in the Companion."),
    AppWord(4, "val and var", 2,
        "Two ways to store a value in Kotlin. A val can't change. A var can.",
        "val total = 12 stays 12. var score = 0 can go up."),
    AppWord(5, "Function", 2,
        "A named block of code you can run again. In Kotlin it starts with fun.",
        "fun main() is where a Kotlin program starts."),
    AppWord(6, "List", 2,
        "An ordered group of values, such as listOf(\"cell\", \"atom\").",
        "Our app keeps all 18 words in one list."),
    AppWord(7, "Composable", 3,
        "A Kotlin function marked @Composable that describes part of the screen.",
        "WordRow is a composable. It draws one word in the list."),
    AppWord(8, "Modifier", 3,
        "Settings you chain onto a composable, such as padding, size or what a tap does.",
        "Modifier.clickable makes a row open the word."),
    AppWord(9, "Preview", 3,
        "A composable marked @Preview. Android Studio draws it without running the app.",
        "We check the list in the preview before we run it."),
    AppWord(10, "State", 4,
        "A value that can change while the app runs. When it changes, the screen updates.",
        "The words you saved for revision are state."),
    AppWord(11, "remember", 4,
        "Keeps a value when the screen is redrawn. rememberSaveable also keeps it when the phone rotates.",
        "The search box text uses rememberSaveable."),
    AppWord(12, "Recomposition", 4,
        "Compose running your composables again because the state they read has changed.",
        "Type one letter in search and the list recomposes."),
    AppWord(13, "LazyColumn", 5,
        "A scrolling list that only builds the rows you can see.",
        "This list of 18 words is a LazyColumn."),
    AppWord(14, "Navigation", 5,
        "Moving from one screen to another. Navigation Compose keeps a back stack of screens.",
        "Tap a word to go to its screen. Back takes you to the list."),
    AppWord(15, "Route", 5,
        "The name of a screen that you navigate to. It can carry data, such as an id.",
        "WordScreen(id = 15) is the route for this word."),
    AppWord(16, "Emulator", 6,
        "A pretend Android phone that runs on your computer.",
        "It needs more memory, so some school laptops use a real phone instead.")
    // TODO 1 (everyone): add 2 words from Week 6 here.
    // Copy the AppWord above. Give each one a new id: 17 and 18.
)
