package com.example.wordwall

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import kotlinx.serialization.Serializable

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            WordWallTheme {
                WordWallApp()
            }
        }
    }
}

// Routes for the two screens.
@Serializable
object ListScreen

@Serializable
data class WordScreen(val id: Int)

private val IdSetSaver = Saver<Set<Int>, IntArray>(
    save = { it.toIntArray() },
    restore = { it.toSet() }
)

@Composable
fun WordWallApp() {
    val navController = rememberNavController()

    // Both screens need these, so they live in the parent.
    // rememberSaveable keeps them when the phone rotates.
    var search by rememberSaveable { mutableStateOf("") }
    // TODO 3 (stretch): make a saved Set<Int> here, like search above.
    // Use rememberSaveable(stateSaver = IdSetSaver). Then use it below.

    NavHost(navController = navController, startDestination = ListScreen) {
        composable<ListScreen> {
            WordListScreen(
                words = appWords,
                search = search,
                onSearchChange = { search = it },
                saved = emptySet(),
                onWordClick = { navController.navigate(WordScreen(it.id)) }
            )
        }
        composable<WordScreen> { entry ->
            val word = appWords.first { it.id == entry.toRoute<WordScreen>().id }
            WordDetailScreen(
                word = word,
                isSaved = false,
                onSavedChange = { on ->
                    // TODO 3 (stretch): add word.id to saved, or take it away.
                },
                onBack = { navController.popBackStack() }
            )
        }
    }
}
