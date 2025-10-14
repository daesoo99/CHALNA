declare module 'react-native-push-notification' {
  export interface Importance {
    DEFAULT: number;
    HIGH: number;
    LOW: number;
    MIN: number;
    NONE: number;
  }

  export const Importance: Importance;

  export interface PushNotificationObject {
    id?: string | number;
    title?: string;
    message: string;
    channelId?: string;
    playSound?: boolean;
    soundName?: string;
    vibrate?: boolean;
    ongoing?: boolean;
    priority?: string;
    visibility?: string;
    importance?: string;
    autoCancel?: boolean;
    invokeApp?: boolean;
    actions?: string[];
  }

  export interface ChannelObject {
    channelId: string;
    channelName: string;
    channelDescription?: string;
    playSound?: boolean;
    soundName?: string;
    importance?: number;
    vibrate?: boolean;
  }

  export interface PushNotificationPermissions {
    alert?: boolean;
    badge?: boolean;
    sound?: boolean;
  }

  export interface PushNotificationOptions {
    onRegister?: (token: any) => void;
    onNotification?: (notification: any) => void;
    onAction?: (notification: any) => void;
    onRegistrationError?: (err: any) => void;
    permissions?: PushNotificationPermissions;
    popInitialNotification?: boolean;
    requestPermissions?: boolean;
  }

  class PushNotification {
    static configure(options: PushNotificationOptions): void;
    static localNotification(notification: PushNotificationObject): void;
    static createChannel(channel: ChannelObject, callback?: (created: any) => void): void;
    static cancelAllLocalNotifications(): void;
    static removeAllDeliveredNotifications(): void;
  }

  export default PushNotification;
}
