package com.example.wordwall

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Light = lightColorScheme(
    primary = Color(0xFF0B6E69),
    secondary = Color(0xFF7A4A00),
    background = Color(0xFFFFFFFF),
    surface = Color(0xFFFFFFFF)
)

private val Dark = darkColorScheme(
    primary = Color(0xFF6FD3C9),
    secondary = Color(0xFFF2C27A),
    background = Color(0xFF111816),
    surface = Color(0xFF111816)
)

@Composable
fun WordWallTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) Dark else Light,
        content = content
    )
}
