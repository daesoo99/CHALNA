package com.kimdaesoo.deathclock

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.util.*
import kotlin.math.max

class DeathClockNotificationService : Service() {

    private val NOTIFICATION_ID = 1
    private val CHANNEL_ID = "DeathClockChannel"
    private var timer: Timer? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForegroundService()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "CHALNA"
            val descriptionText = "Shows your remaining time countdown"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
            }
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundService() {
        val notification = buildNotification("⏳ CHALNA", "Calculating...")
        startForeground(NOTIFICATION_ID, notification)
    }

    private fun startTimer() {
        timer = Timer()
        timer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                updateNotification()
            }
        }, 0, 1000) // Update every second
    }

    private fun updateNotification() {
        try {
            val prefs = getSharedPreferences("DeathClockPrefs", Context.MODE_PRIVATE)
            val birthYear = prefs.getInt("birthYear", 1990)
            val birthMonth = prefs.getInt("birthMonth", 1)
            val birthDay = prefs.getInt("birthDay", 1)
            val desiredDeathAge = prefs.getInt("desiredDeathAge", 80)

            // Validate data
            if (birthYear == 0 || desiredDeathAge == 0) {
                stopTimer()
                stopSelf()
                return
            }

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

            // If time is up, stop the service
            if (remainingMs <= 0) {
                val notification = buildNotification("⏳ CHALNA", "Time's up!")
                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.notify(NOTIFICATION_ID, notification)
                stopTimer()
                return
            }

            val years = remainingMs / (365.25 * 24 * 60 * 60 * 1000).toLong()
            val days = (remainingMs % (365.25 * 24 * 60 * 60 * 1000).toLong()) / (24 * 60 * 60 * 1000)
            val hours = (remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
            val minutes = (remainingMs % (60 * 60 * 1000)) / (60 * 1000)
            val seconds = (remainingMs % (60 * 1000)) / 1000

            val title = "⏳ CHALNA"
            val content = "${years}Y ${days}D ${hours}H ${minutes}M ${seconds}S"

            val notification = buildNotification(title, content)
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            // If any error occurs, stop the service
            stopTimer()
            stopSelf()
        }
    }

    private fun buildNotification(title: String, content: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true) // Makes it persistent
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        stopTimer()
    }

    private fun stopTimer() {
        timer?.cancel()
        timer?.purge() // Remove cancelled tasks from queue
        timer = null
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // App was swiped away - stop timer and service
        stopTimer()
        stopSelf()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            // If service is already running with timer, don't create another
            if (timer != null) {
                return START_STICKY
            }

            // Check if we have valid data before starting timer
            val prefs = getSharedPreferences("DeathClockPrefs", Context.MODE_PRIVATE)
            val birthYear = prefs.getInt("birthYear", 0)

            if (birthYear == 0) {
                // No valid data, stop service
                stopSelf()
                return START_NOT_STICKY
            }

            startTimer()
            return START_STICKY
        } catch (e: Exception) {
            // Error occurred, stop service
            stopSelf()
            return START_NOT_STICKY
        }
    }

    companion object {
        fun start(context: Context) {
            val intent = Intent(context, DeathClockNotificationService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, DeathClockNotificationService::class.java)
            context.stopService(intent)
        }
    }
}