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

    // The words you know. It lives here, above both screens, so both can see it.
    // rememberSaveable keeps it when you rotate the phone.
    var known by rememberSaveable(stateSaver = KnownSaver) { mutableStateOf(emptySet<Int>()) }

    NavHost(navController = navController, startDestination = WordList) {
        composable<WordList> {
            WordListScreen(
                words = gameWords,
                known = known,
                onWordClick = { word -> navController.navigate(WordDetail(word.id)) }
            )
        }
        composable<WordDetail> { entry ->
            val id = entry.toRoute<WordDetail>().id
            val word = gameWords.first { it.id == id }
            WordDetailScreen(
                word = word,
                isKnown = id in known,
                onKnownChange = { nowKnown -> known = if (nowKnown) known + id else known - id },
                onBack = { navController.popBackStack() }
            )
        }
    }
}
