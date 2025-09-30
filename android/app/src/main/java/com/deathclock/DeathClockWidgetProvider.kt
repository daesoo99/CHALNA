package com.kimdaesoo.deathclock

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.util.*
import kotlin.math.max

class DeathClockWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.death_clock_widget)

        // Get user data from SharedPreferences
        val prefs = context.getSharedPreferences("DeathClockPrefs", Context.MODE_PRIVATE)
        val birthYear = prefs.getInt("birthYear", 1990)
        val birthMonth = prefs.getInt("birthMonth", 1)
        val birthDay = prefs.getInt("birthDay", 1)
        val desiredDeathAge = prefs.getInt("desiredDeathAge", 80)

        // Calculate remaining time
        val now = Calendar.getInstance()
        val birthDate = Calendar.getInstance().apply {
            set(Calendar.YEAR, birthYear)
            set(Calendar.MONTH, birthMonth - 1)
            set(Calendar.DAY_OF_MONTH, birthDay)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        val deathDate = Calendar.getInstance().apply {
            time = birthDate.time
            add(Calendar.YEAR, desiredDeathAge)
        }

        val remainingMs = max(0, deathDate.timeInMillis - now.timeInMillis)

        val years = remainingMs / (365.25 * 24 * 60 * 60 * 1000).toLong()
        val days = (remainingMs % (365.25 * 24 * 60 * 60 * 1000).toLong()) / (24 * 60 * 60 * 1000)
        val hours = (remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
        val minutes = (remainingMs % (60 * 60 * 1000)) / (60 * 1000)
        val seconds = (remainingMs % (60 * 1000)) / 1000

        // Update widget views
        views.setTextViewText(R.id.widget_title, "CHALNA")
        views.setTextViewText(R.id.widget_years, years.toString())
        views.setTextViewText(R.id.widget_days, days.toString())
        views.setTextViewText(R.id.widget_hours, hours.toString())
        views.setTextViewText(R.id.widget_minutes, minutes.toString())
        views.setTextViewText(R.id.widget_seconds, seconds.toString())

        // Set up click intent to open the app
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)

        // Schedule next update in 1 second
        scheduleNextUpdate(context)
    }

    private fun scheduleNextUpdate(context: Context) {
        // No manual scheduling needed - let system handle widget updates
    }
}