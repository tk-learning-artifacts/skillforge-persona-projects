package com.example.hitbox

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WordDetailScreen(
    word: Word,
    isKnown: Boolean,
    onKnownChange: (Boolean) -> Unit,
    onBack: () -> Unit
) {
    // Only this screen needs to know if the meaning is showing,
    // so this state stays here and is not hoisted.
    var revealed by rememberSaveable { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Level ${word.level}") },
                navigationIcon = { TextButton(onClick = onBack) { Text("< Back") } }
            )
        }
    ) { inner ->
        Column(
            modifier = Modifier
                .padding(inner)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(word.term, style = MaterialTheme.typography.displaySmall)

            if (revealed) {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(word.meaning, style = MaterialTheme.typography.titleLarge)
                        Text("In a game: ${word.example}")
                    }
                }
                Text("Did you know it?")
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = { onKnownChange(true); onBack() }) { Text("I knew it") }
                    OutlinedButton(onClick = { onKnownChange(false); onBack() }) { Text("Not yet") }
                }
            } else {
                Text("Say the meaning out loud first. Then check.")
                Button(onClick = { revealed = true }) { Text("Show meaning") }
            }

            if (isKnown) {
                Text("★ You marked this one as known.", color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun WordDetailPreview() {
    HitboxTheme {
        WordDetailScreen(word = gameWords[3], isKnown = false, onKnownChange = {}, onBack = {})
    }
}
