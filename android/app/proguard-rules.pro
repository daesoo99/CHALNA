# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native Community packages
-keep class com.reactnativecommunity.** { *; }

# Date Time Picker
-keep class com.reactcommunity.** { *; }

# Push Notifications
-keep class com.dieam.reactnativepushnotification.** { *; }

# Keep our app classes
-keep class com.deathclock.** { *; }

# Keep reflection-based classes
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# Keep enum classes
-keepclassmembers enum * { *; }
