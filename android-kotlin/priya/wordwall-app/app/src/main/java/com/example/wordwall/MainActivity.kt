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
    var saved by rememberSaveable(stateSaver = IdSetSaver) { mutableStateOf(emptySet<Int>()) }

    NavHost(navController = navController, startDestination = ListScreen) {
        composable<ListScreen> {
            WordListScreen(
                words = appWords,
                search = search,
                onSearchChange = { search = it },
                saved = saved,
                onWordClick = { navController.navigate(WordScreen(it.id)) }
            )
        }
        composable<WordScreen> { entry ->
            val word = appWords.first { it.id == entry.toRoute<WordScreen>().id }
            WordDetailScreen(
                word = word,
                isSaved = word.id in saved,
                onSavedChange = { on -> saved = if (on) saved + word.id else saved - word.id },
                onBack = { navController.popBackStack() }
            )
        }
    }
}
