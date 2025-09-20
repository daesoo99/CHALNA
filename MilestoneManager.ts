import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './NotificationService';

interface MilestoneConfig {
  id: string;
  type: 'usage' | 'action' | 'daily'; // milestone type
  threshold: number; // hours for usage, count for action, daily for daily
  title: string;
  message: string;
  triggered: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface MilestoneSettings {
  enabled: boolean;
  testMode: boolean;
  milestones: MilestoneConfig[];
  lastChecked: string;
  appStartTime: string; // When app was first used
  lastDailyNotification: string; // Last daily 23:59 notification
  timerStartCount: number; // How many times timer was started
  themeChangeCount: number; // Theme changes
  exportCount: number; // Data exports
}

class MilestoneManager {
  private storageKey = 'death_clock_milestones';

  private getDefaultMilestones(testMode = false): MilestoneConfig[] {
    if (testMode) {
      return [
        {
          id: 'test_first_start',
          type: 'action',
          threshold: 1,
          title: '🧪 테스트: 첫 시작',
          message: '테스트 모드 - 첫 번째 타이머 시작!',
          triggered: false,
          priority: 'high'
        },
        {
          id: 'test_5_minutes_usage',
          type: 'usage',
          threshold: 0.08, // 5 minutes in hours
          title: '🧪 테스트: 5분 사용',
          message: '테스트 모드 - 5분째 사용 중!',
          triggered: false,
          priority: 'medium'
        }
      ];
    }

    return [
      // App Usage Milestones
      {
        id: 'first_start',
        type: 'action',
        threshold: 1,
        title: '🎉 첫 시작',
        message: '데스클럭과 함께 시작! 죽음을 마주할 준비가 되셨나요?',
        triggered: false,
        priority: 'high'
      },
      {
        id: 'one_hour_usage',
        type: 'usage',
        threshold: 1,
        title: '⏰ 1시간 사용',
        message: '1시간째 죽음을 마주하고 있네요. 어떤 기분인가요?',
        triggered: false,
        priority: 'high'
      },
      {
        id: 'one_day_usage',
        type: 'usage',
        threshold: 24,
        title: '📅 하루 사용',
        message: '하루째 자신의 유한함을 깨달았습니다. 오늘 뭔가 달랐나요?',
        triggered: false,
        priority: 'high'
      },
      {
        id: 'one_week_usage',
        type: 'usage',
        threshold: 168, // 7 days
        title: '🗓️ 일주일 사용',
        message: '일주일째, 인생이 달라졌나요? 죽음의 의식이 삶을 바꿨을까요?',
        triggered: false,
        priority: 'medium'
      },
      {
        id: 'one_month_usage',
        type: 'usage',
        threshold: 720, // 30 days
        title: '📆 한 달 사용',
        message: '한 달째 죽음을 생각하며 살고 있습니다. 당신은 성장했습니다.',
        triggered: false,
        priority: 'medium'
      },
      {
        id: 'three_months_usage',
        type: 'usage',
        threshold: 2160, // 90 days
        title: '🏆 3개월 사용',
        message: '3개월째, 당신은 변화했습니다. 죽음이 더 이상 두렵지 않을지도...',
        triggered: false,
        priority: 'low'
      },
      // Action-based Milestones
      {
        id: 'timer_10_starts',
        type: 'action',
        threshold: 10,
        title: '🔄 타이머 10번째',
        message: '10번째 시작, 습관이 되었나요? 죽음이 일상이 되었습니다.',
        triggered: false,
        priority: 'medium'
      },
      {
        id: 'first_theme_change',
        type: 'action',
        threshold: 1,
        title: '🎨 첫 테마 변경',
        message: '나만의 죽음을 꾸몄습니다. 색깔도 죽음을 표현하는 방법이죠.',
        triggered: false,
        priority: 'low'
      },
      {
        id: 'first_data_export',
        type: 'action',
        threshold: 1,
        title: '📊 첫 데이터 저장',
        message: '자신의 기록을 보존했네요. 디지털 무덤을 만드셨군요.',
        triggered: false,
        priority: 'low'
      },
      // Daily notification
      {
        id: 'daily_reminder',
        type: 'daily',
        threshold: 1,
        title: '🌙 오늘도 하루가 지났습니다',
        message: '또 하루가 당신의 인생에서 사라졌습니다. 후회 없는 하루였나요?',
        triggered: false,
        priority: 'medium'
      }
    ];
  }

  async getSettings(): Promise<MilestoneSettings> {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      if (data) {
        const settings = JSON.parse(data);
        const testMode = settings.testMode ?? false;
        return {
          enabled: settings.enabled ?? true,
          testMode,
          milestones: [...this.getDefaultMilestones(testMode), ...(settings.customMilestones || [])],
          lastChecked: settings.lastChecked || ''
        };
      }
    } catch (error) {
      console.log('Error loading milestone settings:', error);
    }

    return {
      enabled: true,
      testMode: false,
      milestones: this.getDefaultMilestones(false),
      lastChecked: '',
      appStartTime: new Date().toISOString(),
      lastDailyNotification: '',
      timerStartCount: 0,
      themeChangeCount: 0,
      exportCount: 0
    };
  }

  async saveSettings(settings: MilestoneSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch (error) {
      console.log('Error saving milestone settings:', error);
    }
  }

  async toggleEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    settings.enabled = !settings.enabled;
    await this.saveSettings(settings);
    return settings.enabled;
  }

  async checkMilestones(t: (key: string) => string): Promise<void> {
    const settings = await this.getSettings();

    if (!settings.enabled) {
      return;
    }

    const now = new Date();
    const appStartTime = new Date(settings.appStartTime);
    const hoursUsed = (now.getTime() - appStartTime.getTime()) / (1000 * 60 * 60);

    let hasTriggered = false;

    for (const milestone of settings.milestones) {
      if (milestone.triggered) continue;

      let shouldTrigger = false;

      switch (milestone.type) {
        case 'usage':
          if (hoursUsed >= milestone.threshold) {
            shouldTrigger = true;
          }
          break;
        case 'action':
          if (milestone.id === 'first_start' && settings.timerStartCount >= 1) {
            shouldTrigger = true;
          } else if (milestone.id === 'timer_10_starts' && settings.timerStartCount >= 10) {
            shouldTrigger = true;
          } else if (milestone.id === 'first_theme_change' && settings.themeChangeCount >= 1) {
            shouldTrigger = true;
          } else if (milestone.id === 'first_data_export' && settings.exportCount >= 1) {
            shouldTrigger = true;
          }
          break;
        case 'daily':
          shouldTrigger = await this.checkDailyNotification(settings);
          break;
      }

      if (shouldTrigger) {
        await this.triggerMilestone(milestone, t);
        milestone.triggered = true;
        hasTriggered = true;
      }
    }

    if (hasTriggered) {
      settings.lastChecked = now.toISOString();
      await this.saveSettings(settings);
    }
  }

  private async checkDailyNotification(settings: MilestoneSettings): Promise<boolean> {
    const now = new Date();
    const today = now.toDateString();
    const lastNotificationDate = settings.lastDailyNotification ?
      new Date(settings.lastDailyNotification).toDateString() : '';

    // Check if it's 23:59 and we haven't sent notification today
    if (now.getHours() === 23 && now.getMinutes() === 59 && today !== lastNotificationDate) {
      settings.lastDailyNotification = now.toISOString();
      return true;
    }

    return false;
  }

  private async triggerMilestone(
    milestone: MilestoneConfig,
    t: (key: string) => string
  ): Promise<void> {
    // Show alert
    Alert.alert(
      milestone.title,
      milestone.message,
      [
        {
          text: t('acknowledge'),
          style: 'default'
        }
      ],
      { cancelable: false }
    );

    // Send notification if app is backgrounded
    try {
      await NotificationService.showPersistentNotification(
        {
          years: 0,
          months: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        },
        (key: string) => {
          if (key === 'title') return milestone.title;
          return milestone.message;
        }
      );
    } catch (error) {
      console.log('Error sending milestone notification:', error);
    }
  }

  async toggleTestMode(): Promise<boolean> {
    const settings = await this.getSettings();
    settings.testMode = !settings.testMode;

    // Reset milestones and switch to appropriate milestone set
    settings.milestones = this.getDefaultMilestones(settings.testMode);

    await this.saveSettings(settings);
    return settings.testMode;
  }

  async resetMilestones(): Promise<void> {
    const settings = await this.getSettings();
    settings.milestones.forEach(milestone => {
      milestone.triggered = false;
    });
    await this.saveSettings(settings);
  }

  async addCustomMilestone(
    threshold: number,
    title: string,
    message: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    const settings = await this.getSettings();

    const customMilestone: MilestoneConfig = {
      id: `custom_${Date.now()}`,
      threshold,
      title,
      message,
      triggered: false,
      priority
    };

    settings.milestones.push(customMilestone);
    await this.saveSettings(settings);
  }

  // Action tracking methods
  async trackTimerStart(): Promise<void> {
    const settings = await this.getSettings();
    settings.timerStartCount += 1;
    await this.saveSettings(settings);
  }

  async trackThemeChange(): Promise<void> {
    const settings = await this.getSettings();
    settings.themeChangeCount += 1;
    await this.saveSettings(settings);
  }

  async trackDataExport(): Promise<void> {
    const settings = await this.getSettings();
    settings.exportCount += 1;
    await this.saveSettings(settings);
  }

  async getUpcomingMilestones(): Promise<MilestoneConfig[]> {
    const settings = await this.getSettings();
    return settings.milestones.filter(m => !m.triggered);
  }

  async getUsageStats(): Promise<{
    hoursUsed: number;
    timerStarts: number;
    themeChanges: number;
    exports: number;
  }> {
    const settings = await this.getSettings();
    const now = new Date();
    const appStartTime = new Date(settings.appStartTime);
    const hoursUsed = (now.getTime() - appStartTime.getTime()) / (1000 * 60 * 60);

    return {
      hoursUsed: Math.round(hoursUsed * 100) / 100,
      timerStarts: settings.timerStartCount,
      themeChanges: settings.themeChangeCount,
      exports: settings.exportCount
    };
  }
}

export default new MilestoneManager();
export type { MilestoneConfig, MilestoneSettings };