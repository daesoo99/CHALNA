import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';

interface ReviewSettings {
  appLaunchCount: number;
  hasPrompted: boolean;
  lastPromptDate?: string;
  userDeclinedReview: boolean;
}

class ReviewPrompt {
  private static readonly LAUNCH_COUNT_THRESHOLD = 10;
  private static readonly DAYS_BETWEEN_PROMPTS = 30;
  private static readonly STORAGE_KEY = 'reviewSettings';

  static async incrementLaunchCount(): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.appLaunchCount += 1;
      await this.saveSettings(settings);

      // Check if we should show review prompt
      if (this.shouldShowPrompt(settings)) {
        this.showReviewPrompt();
      }
    } catch (error) {
      console.error('Failed to increment launch count:', error);
    }
  }

  private static shouldShowPrompt(settings: ReviewSettings): boolean {
    // Don't prompt if user already declined
    if (settings.userDeclinedReview) {
      return false;
    }

    // Don't prompt if already prompted recently
    if (settings.lastPromptDate) {
      const lastPromptDate = new Date(settings.lastPromptDate);
      const daysSinceLastPrompt = (Date.now() - lastPromptDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastPrompt < this.DAYS_BETWEEN_PROMPTS) {
        return false;
      }
    }

    // Prompt if launch count threshold is met
    return settings.appLaunchCount >= this.LAUNCH_COUNT_THRESHOLD;
  }

  private static async showReviewPrompt(): Promise<void> {
    Alert.alert(
      '⭐ Death Clock을 평가해주세요',
      'Death Clock이 도움이 되셨나요? 앱스토어에서 평가해주시면 큰 도움이 됩니다!',
      [
        {
          text: '나중에',
          style: 'cancel',
          onPress: async () => {
            await this.markPromptShown(false);
          },
        },
        {
          text: '평가 안함',
          style: 'destructive',
          onPress: async () => {
            await this.markUserDeclined();
          },
        },
        {
          text: '평가하기',
          onPress: async () => {
            await this.openAppStore();
            await this.markPromptShown(true);
          },
        },
      ]
    );
  }

  private static async openAppStore(): Promise<void> {
    try {
      const appId = 'YOUR_APP_ID'; // Replace with actual app store ID

      if (Platform.OS === 'ios') {
        const url = `itms-apps://itunes.apple.com/app/id${appId}?action=write-review`;
        await Linking.openURL(url);
      } else if (Platform.OS === 'android') {
        const packageName = 'com.deathclock'; // Replace with actual package name
        const url = `market://details?id=${packageName}`;
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Failed to open app store:', error);
      // Fallback to web browser
      const fallbackUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/death-clock/id${appId}'
        : 'https://play.google.com/store/apps/details?id=com.deathclock';

      try {
        await Linking.openURL(fallbackUrl);
      } catch (fallbackError) {
        console.error('Failed to open fallback URL:', fallbackError);
      }
    }
  }

  private static async markPromptShown(userRated: boolean): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.lastPromptDate = new Date().toISOString();
      settings.hasPrompted = true;

      if (userRated) {
        settings.userDeclinedReview = false;
      }

      await this.saveSettings(settings);
    } catch (error) {
      console.error('Failed to mark prompt shown:', error);
    }
  }

  private static async markUserDeclined(): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.userDeclinedReview = true;
      settings.lastPromptDate = new Date().toISOString();
      await this.saveSettings(settings);
    } catch (error) {
      console.error('Failed to mark user declined:', error);
    }
  }

  private static async getSettings(): Promise<ReviewSettings> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {
        appLaunchCount: 0,
        hasPrompted: false,
        userDeclinedReview: false,
      };
    } catch (error) {
      console.error('Failed to load review settings:', error);
      return {
        appLaunchCount: 0,
        hasPrompted: false,
        userDeclinedReview: false,
      };
    }
  }

  private static async saveSettings(settings: ReviewSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save review settings:', error);
    }
  }

  static async resetSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset review settings:', error);
    }
  }
}

export default ReviewPrompt;