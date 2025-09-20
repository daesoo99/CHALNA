import PushNotification, {Importance} from 'react-native-push-notification';
import {Platform} from 'react-native';

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

  constructor() {
    this.initialize();
  }

  private initialize = () => {
    if (!this.isConfigured) {
      this.configure();
      this.createChannel();
      this.isConfigured = true;
    }
  };

  configure = () => {
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
  };

  createChannel = () => {
    PushNotification.createChannel(
      {
        channelId: this.notificationId,
        channelName: 'Death Clock',
        channelDescription: 'Persistent notification showing remaining lifetime',
        playSound: false,
        soundName: 'default',
        importance: Importance.LOW,
        vibrate: false,
      },
      (created) => console.log(`createChannel returned '${created}'`)
    );
  };

  showPersistentNotification = (timeLeft: TimeLeft, t: (key: string) => string) => {
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
    PushNotification.cancelLocalNotifications({id: 1});
  };

  cancelAllNotifications = () => {
    PushNotification.cancelAllLocalNotifications();
  };

  requestPermissions = async () => {
    try {
      await PushNotification.requestPermissions();
    } catch (error) {
      console.log('Error requesting permissions:', error);
    }
  };

  destroy = () => {
    this.cancelAllNotifications();
    this.isConfigured = false;
  };
}

export default new NotificationService();