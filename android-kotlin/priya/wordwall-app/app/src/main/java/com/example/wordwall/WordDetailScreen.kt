package com.example.wordwall

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WordDetailScreen(
    word: AppWord,
    isSaved: Boolean,
    onSavedChange: (Boolean) -> Unit,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(weekTitles.getValue(word.week)) },
                navigationIcon = { TextButton(onClick = onBack) { Text("< List") } }
            )
        }
    ) { inner ->
        Column(
            modifier = Modifier
                .padding(inner)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(word.word, style = MaterialTheme.typography.headlineLarge)
            Text(word.meaning, style = MaterialTheme.typography.titleMedium)
            Text("In our app", style = MaterialTheme.typography.labelLarge)
            Text(word.inOurApp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(checked = isSaved, onCheckedChange = onSavedChange)
                Text("  Save for revision")
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun WordDetailPreview() {
    WordWallTheme {
        WordDetailScreen(appWords[9], isSaved = true, onSavedChange = {}, onBack = {})
    }
}
