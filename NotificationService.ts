import PushNotification, {Importance} from 'react-native-push-notification';
import {Platform, NativeModules} from 'react-native';

const {SharedPrefs} = NativeModules;

export interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

class NotificationService {
  private notificationId = 'death_clock_notification';
  private isConfigured = false;
  private useNativeService = Platform.OS === 'android';

  constructor() {
    this.initialize();
  }

  private initialize = () => {
    if (!this.isConfigured) {
      // Check if SharedPrefs is available when using native service
      if (this.useNativeService && !SharedPrefs) {
        console.error('SharedPrefs native module not found, falling back to React Native notifications');
        this.useNativeService = false;
      }

      this.configure();
      if (!this.useNativeService) {
        this.createChannel();
      }
      this.isConfigured = true;
    }
  };

  configure = () => {
    // Only configure React Native push notifications for iOS or as fallback
    if (!this.useNativeService) {
      PushNotification.configure({
        onRegister: function (token) {
          console.log('TOKEN:', token);
        },
        onNotification: function (notification) {
          console.log('NOTIFICATION:', notification);
        },
        onAction: function (notification) {
          console.log('ACTION:', notification.action);
        },
        onRegistrationError: function(err) {
          console.error(err.message, err);
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios',
      });
    }
  };

  createChannel = () => {
    if (!this.useNativeService) {
      PushNotification.createChannel(
        {
          channelId: this.notificationId,
          channelName: 'CHALNA',
          channelDescription: 'Persistent notification showing remaining lifetime',
          playSound: false,
          soundName: 'default',
          importance: Importance.LOW,
          vibrate: false,
        },
        (created) => console.log(`createChannel returned '${created}'`)
      );
    }
  };

  showPersistentNotification = (timeLeft: TimeLeft, t: (key: string) => string) => {
    if (this.useNativeService) {
      // For Android, the native service handles notifications automatically
      // We just need to ensure the service is running
      console.log('Android native notification service is handling persistent notifications');
      return;
    }

    // Fallback to React Native notifications for iOS
    const title = `💀 ${t('title')}`;
    const message = this.formatTimeLeft(timeLeft, t);

    PushNotification.localNotification({
      channelId: this.notificationId,
      id: 1,
      title,
      message,
      playSound: false,
      vibrate: false,
      ongoing: true, // Makes notification persistent
      priority: 'low',
      visibility: 'public',
      importance: 'low',
      autoCancel: false,
      invokeApp: true,
      actions: ['pause', 'resume'],
    });
  };

  updateNotification = (timeLeft: TimeLeft, t: (key: string) => string) => {
    if (this.useNativeService) {
      // Native service updates automatically, nothing needed here
      return;
    }
    this.showPersistentNotification(timeLeft, t);
  };

  formatTimeLeft = (timeLeft: TimeLeft, t: (key: string) => string): string => {
    if (timeLeft.years > 0) {
      return `${timeLeft.years} ${t('years')} ${timeLeft.months} ${t('months')} ${timeLeft.days} ${t('days')} ${timeLeft.hours}:${timeLeft.minutes.toString().padStart(2, '0')}:${timeLeft.seconds.toString().padStart(2, '0')}`;
    } else if (timeLeft.months > 0) {
      return `${timeLeft.months} ${t('months')} ${timeLeft.days} ${t('days')} ${timeLeft.hours}:${timeLeft.minutes.toString().padStart(2, '0')}:${timeLeft.seconds.toString().padStart(2, '0')}`;
    } else {
      return `${timeLeft.days} ${t('days')} ${timeLeft.hours}:${timeLeft.minutes.toString().padStart(2, '0')}:${timeLeft.seconds.toString().padStart(2, '0')}`;
    }
  };

  cancelNotification = () => {
    if (this.useNativeService && SharedPrefs) {
      SharedPrefs.stopNotificationService();
    } else {
      // @ts-ignore - Method exists in library
      PushNotification.cancelLocalNotifications({id: 1});
    }
  };

  cancelAllNotifications = () => {
    if (this.useNativeService && SharedPrefs) {
      SharedPrefs.stopNotificationService();
    } else {
      PushNotification.cancelAllLocalNotifications();
    }
  };

  requestPermissions = async (): Promise<boolean> => {
    try {
      if (this.useNativeService && SharedPrefs) {
        return new Promise((resolve) => {
          SharedPrefs.checkNotificationPermission((isEnabled: boolean) => {
            if (!isEnabled) {
              SharedPrefs.requestNotificationPermission();
              // Since we can't know if user granted permission, return false
              // and let the caller check again later
              resolve(false);
            } else {
              resolve(true);
            }
          });
        });
      } else {
        // @ts-ignore - Method exists in library
        await PushNotification.requestPermissions();
        return true;
      }
    } catch (error) {
      console.log('Error requesting permissions:', error);
      return false;
    }
  };

  checkPermissions = async (): Promise<boolean> => {
    try {
      if (this.useNativeService && SharedPrefs) {
        return new Promise((resolve) => {
          SharedPrefs.checkNotificationPermission((isEnabled: boolean) => {
            resolve(isEnabled);
          });
        });
      } else {
        // For iOS, assume permissions are granted if configured
        return true;
      }
    } catch (error) {
      console.log('Error checking permissions:', error);
      return false;
    }
  };

  startNotificationService = (birthDate: string, lifeExpectancy: number) => {
    if (this.useNativeService && SharedPrefs) {
      try {
        const birth = new Date(birthDate);
        SharedPrefs.saveUserData(
          birth.getFullYear(),
          birth.getMonth() + 1, // Android expects 1-based months
          birth.getDate(),
          lifeExpectancy
        );
        console.log('Native notification service started with user data');
      } catch (error) {
        console.error('Error starting native notification service:', error);
      }
    }
  };

  stopNotificationService = () => {
    if (this.useNativeService && SharedPrefs) {
      SharedPrefs.stopNotificationService();
    }
  };

  destroy = () => {
    // Stop notifications
    this.cancelAllNotifications();

    if (!this.useNativeService) {
      // Clear any pending notifications
      // @ts-ignore - Method exists in library
      PushNotification.abandonPermissions();
    }

    // Reset configuration state
    this.isConfigured = false;

    console.log('NotificationService destroyed and cleaned up');
  };
}

export default new NotificationService();