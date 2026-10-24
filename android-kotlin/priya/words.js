// Made from AppWords.kt by a script, so it matches the app.
const WEEK_TITLES = {
 "1": "Week 1: Blocks first",
 "2": "Week 2: Kotlin in the browser",
 "3": "Week 3: A first Compose screen",
 "4": "Week 4: State",
 "5": "Week 5: Lists and screens",
 "6": "Week 6: Run it on a phone"
};
const APP_WORDS = [
 {
  "id": 1,
  "word": "Component",
  "week": 1,
  "meaning": "A part of an App Inventor app, such as a Button, Label or Sound.",
  "inOurApp": "HelloPurr has a Button with the kitty picture and a Sound for the meow."
 },
 {
  "id": 2,
  "word": "Event",
  "week": 1,
  "meaning": "Something that happens, such as a tap, that the app can respond to.",
  "inOurApp": "The when Button1.Click block runs when someone taps the kitty."
 },
 {
  "id": 3,
  "word": "Companion",
  "week": 1,
  "meaning": "The MIT AI2 Companion app. It shows your App Inventor app live on a phone or tablet.",
  "inOurApp": "Scan the code on screen and your app opens in the Companion."
 },
 {
  "id": 4,
  "word": "val and var",
  "week": 2,
  "meaning": "Two ways to store a value in Kotlin. A val can't change. A var can.",
  "inOurApp": "val total = 12 stays 12. var score = 0 can go up."
 },
 {
  "id": 5,
  "word": "Function",
  "week": 2,
  "meaning": "A named block of code you can run again. In Kotlin it starts with fun.",
  "inOurApp": "fun main() is where a Kotlin program starts."
 },
 {
  "id": 6,
  "word": "List",
  "week": 2,
  "meaning": "An ordered group of values, such as listOf(\"cell\", \"atom\").",
  "inOurApp": "Our app keeps all 18 words in one list."
 },
 {
  "id": 7,
  "word": "Composable",
  "week": 3,
  "meaning": "A Kotlin function marked @Composable that describes part of the screen.",
  "inOurApp": "WordRow is a composable. It draws one word in the list."
 },
 {
  "id": 8,
  "word": "Modifier",
  "week": 3,
  "meaning": "Settings you chain onto a composable, such as padding, size or what a tap does.",
  "inOurApp": "Modifier.clickable makes a row open the word."
 },
 {
  "id": 9,
  "word": "Preview",
  "week": 3,
  "meaning": "A composable marked @Preview. Android Studio draws it without running the app.",
  "inOurApp": "We check the list in the preview before we run it."
 },
 {
  "id": 10,
  "word": "State",
  "week": 4,
  "meaning": "A value that can change while the app runs. When it changes, the screen updates.",
  "inOurApp": "The words you saved for revision are state."
 },
 {
  "id": 11,
  "word": "remember",
  "week": 4,
  "meaning": "Keeps a value when the screen is redrawn. rememberSaveable also keeps it when the phone rotates.",
  "inOurApp": "The search box text uses rememberSaveable."
 },
 {
  "id": 12,
  "word": "Recomposition",
  "week": 4,
  "meaning": "Compose running your composables again because the state they read has changed.",
  "inOurApp": "Type one letter in search and the list recomposes."
 },
 {
  "id": 13,
  "word": "LazyColumn",
  "week": 5,
  "meaning": "A scrolling list that only builds the rows you can see.",
  "inOurApp": "This list of 18 words is a LazyColumn."
 },
 {
  "id": 14,
  "word": "Navigation",
  "week": 5,
  "meaning": "Moving from one screen to another. Navigation Compose keeps a back stack of screens.",
  "inOurApp": "Tap a word to go to its screen. Back takes you to the list."
 },
 {
  "id": 15,
  "word": "Route",
  "week": 5,
  "meaning": "The name of a screen that you navigate to. It can carry data, such as an id.",
  "inOurApp": "WordScreen(id = 15) is the route for this word."
 },
 {
  "id": 16,
  "word": "Emulator",
  "week": 6,
  "meaning": "A pretend Android phone that runs on your computer.",
  "inOurApp": "It needs more memory, so some school laptops use a real phone instead."
 },
 {
  "id": 17,
  "word": "USB debugging",
  "week": 6,
  "meaning": "A setting in Developer options that lets Android Studio install apps over a cable.",
  "inOurApp": "Tap Build number seven times to see Developer options."
 },
 {
  "id": 18,
  "word": "APK",
  "week": 6,
  "meaning": "Android Package: the file that installs an app on an Android phone.",
  "inOurApp": "Android Studio builds an APK each time you press Run."
 }
];
