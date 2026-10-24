package com.example.hitbox

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WordListScreen(
    words: List<Word>,
    known: Set<Int>,
    onWordClick: (Word) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Hitbox: game words") })
        }
    ) { inner ->
        Column(Modifier.padding(inner)) {
            // State goes down: the list only reads known. It never changes it.
            Text(
                text = "Known ${known.size} of ${words.size}",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            LinearProgressIndicator(
                progress = { known.size / words.size.toFloat() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )
            // LazyColumn only builds the rows on screen.
            LazyColumn {
                items(words, key = { it.id }) { word ->
                    ListItem(
                        headlineContent = { Text(word.term, fontWeight = FontWeight.Bold) },
                        // TODO 1 (quest 1): show the word's meaning under the term.
                        // Look at how headlineContent shows word.term.
                        overlineContent = { Text("Level ${word.level}") },
                        trailingContent = { Text(if (word.id in known) "★" else "☆") },
                        // Events go up: tell the parent which word was tapped.
                        modifier = Modifier.clickable { onWordClick(word) }
                    )
                    HorizontalDivider()
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun WordListPreview() {
    HitboxTheme {
        WordListScreen(words = gameWords, known = setOf(1, 3), onWordClick = {})
    }
}
