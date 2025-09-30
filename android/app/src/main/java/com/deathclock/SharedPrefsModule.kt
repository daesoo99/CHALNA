package com.kimdaesoo.deathclock

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SharedPrefsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SharedPrefs"
    }

    @ReactMethod
    fun saveUserData(birthYear: Int, birthMonth: Int, birthDay: Int, desiredDeathAge: Int) {
        val sharedPref: SharedPreferences = reactApplicationContext.getSharedPreferences(
            "DeathClockPrefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putInt("birthYear", birthYear)
            putInt("birthMonth", birthMonth)
            putInt("birthDay", birthDay)
            putInt("desiredDeathAge", desiredDeathAge)
            apply()
        }

        // Trigger widget update
        triggerWidgetUpdate()

        // Start notification service
        startNotificationService()
    }

    @ReactMethod
    fun startNotificationService() {
        DeathClockNotificationService.start(reactApplicationContext)
    }

    @ReactMethod
    fun stopNotificationService() {
        DeathClockNotificationService.stop(reactApplicationContext)
    }

    @ReactMethod
    fun requestNotificationPermission() {
        val context = reactApplicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } else {
            // For older versions, open app settings
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            val uri = Uri.fromParts("package", context.packageName, null)
            intent.data = uri
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
    }

    @ReactMethod
    fun checkNotificationPermission(callback: com.facebook.react.bridge.Callback) {
        val context = reactApplicationContext
        val isEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
        callback.invoke(isEnabled)
    }

    private fun triggerWidgetUpdate() {
        val context = reactApplicationContext
        val intent = android.content.Intent(context, DeathClockWidgetProvider::class.java)
        intent.action = android.appwidget.AppWidgetManager.ACTION_APPWIDGET_UPDATE
        val ids = android.appwidget.AppWidgetManager.getInstance(context)
            .getAppWidgetIds(android.content.ComponentName(context, DeathClockWidgetProvider::class.java))
        intent.putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(intent)
    }
}