package com.example.wordwall

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WordListScreen(
    words: List<AppWord>,
    search: String,
    onSearchChange: (String) -> Unit,
    saved: Set<Int>,
    onWordClick: (AppWord) -> Unit
) {
    // Work out what to show from the state we were given.
    val shown = words.filter { it.word.contains(search.trim(), ignoreCase = true) }
    val byWeek = shown.groupBy { it.week }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Word Wall") }) }
    ) { inner ->
        Column(Modifier.padding(inner)) {
            // State goes down (value), events go up (onValueChange).
            OutlinedTextField(
                value = search,
                onValueChange = onSearchChange,
                label = { Text("Search words") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )
            Text(
                text = "${shown.size} words · ${saved.size} saved for revision",
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            LazyColumn {
                byWeek.forEach { (week, weekWords) ->
                    stickyHeader(key = "week-$week") {
                        Text(
                            text = weekTitles.getValue(week),
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.secondaryContainer)
                                .padding(horizontal = 16.dp, vertical = 6.dp)
                        )
                    }
                    items(weekWords, key = { it.id }) { word ->
                        WordRow(word, isSaved = word.id in saved, onClick = { onWordClick(word) })
                    }
                }
                if (shown.isEmpty()) {
                    item {
                        Text("No word matches \"$search\".", Modifier.padding(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun WordRow(word: AppWord, isSaved: Boolean, onClick: () -> Unit) {
    ListItem(
        headlineContent = { Text(word.word) },
        supportingContent = { Text(word.meaning, maxLines = 1) },
        trailingContent = { if (isSaved) Text("Saved") },
        modifier = Modifier.clickable(onClick = onClick)
    )
}

@Preview(showBackground = true)
@Composable
fun WordListPreview() {
    WordWallTheme {
        WordListScreen(appWords, search = "", onSearchChange = {}, saved = setOf(10), onWordClick = {})
    }
}
