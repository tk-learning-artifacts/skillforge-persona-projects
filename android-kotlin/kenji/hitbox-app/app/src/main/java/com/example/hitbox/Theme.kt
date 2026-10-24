package com.example.hitbox

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Light = lightColorScheme(
    primary = Color(0xFF5B3CC4),
    secondary = Color(0xFFB0006D),
    background = Color(0xFFFBF8FF),
    surface = Color(0xFFFBF8FF)
)

private val Dark = darkColorScheme(
    primary = Color(0xFFC9B8FF),
    secondary = Color(0xFFFFAFD3),
    background = Color(0xFF15121F),
    surface = Color(0xFF15121F)
)

@Composable
fun HitboxTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) Dark else Light,
        content = content
    )
}
