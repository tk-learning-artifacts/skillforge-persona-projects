package com.example.hitbox

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
            HitboxTheme {
                HitboxApp()
            }
        }
    }
}

// The two screens. Navigation Compose uses these as routes.
@Serializable
object WordList

@Serializable
data class WordDetail(val id: Int)

// A Set can't go in a Bundle, so save the ids as an IntArray.
private val KnownSaver = Saver<Set<Int>, IntArray>(
    save = { it.toIntArray() },
    restore = { it.toSet() }
)

@Composable
fun HitboxApp() {
    val navController = rememberNavController()

    // TODO 3 (boss quest): make a var called known that holds a Set<Int>.
    // Use rememberSaveable with KnownSaver, so it survives a rotation.
    // Then pass it to both screens instead of emptySet().

    NavHost(navController = navController, startDestination = WordList) {
        composable<WordList> {
            WordListScreen(
                words = gameWords,
                known = emptySet(),
                onWordClick = { word ->
                    // TODO 2 (quest 2): go to the WordDetail screen for this word.
                }
            )
        }
        composable<WordDetail> { entry ->
            val id = entry.toRoute<WordDetail>().id
            val word = gameWords.first { it.id == id }
            WordDetailScreen(
                word = word,
                isKnown = false,
                onKnownChange = { nowKnown ->
                    // TODO 3 (boss quest): add id to known, or take it away.
                },
                onBack = { navController.popBackStack() }
            )
        }
    }
}
