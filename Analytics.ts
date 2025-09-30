import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsData {
  appLaunches: number;
  timerStarts: number;
  totalTimeActive: number;
  lastActiveDate: string;
  themeChanges: number;
  languageChanges: number;
  averageLifeExpectancy: number;
  birthdateSet: boolean;
  resets: number;
}

class Analytics {
  private storageKey = 'death_clock_analytics';
  private sessionStartTime: number | null = null;

  async initializeSession() {
    const data = await this.getData();
    data.appLaunches += 1;
    data.lastActiveDate = new Date().toISOString();
    await this.saveData(data);
    this.sessionStartTime = Date.now();
  }

  async trackTimerStart(lifeExpectancy: number) {
    const data = await this.getData();
    data.timerStarts += 1;
    data.averageLifeExpectancy = Math.round(
      (data.averageLifeExpectancy * (data.timerStarts - 1) + lifeExpectancy) / data.timerStarts
    );
    await this.saveData(data);
  }

  async trackBirthdateSet() {
    const data = await this.getData();
    data.birthdateSet = true;
    await this.saveData(data);
  }

  async trackThemeChange() {
    const data = await this.getData();
    data.themeChanges += 1;
    await this.saveData(data);
  }

  async trackLanguageChange() {
    const data = await this.getData();
    data.languageChanges += 1;
    await this.saveData(data);
  }

  async trackReset() {
    const data = await this.getData();
    data.resets += 1;
    await this.saveData(data);
  }

  async trackSessionEnd() {
    if (this.sessionStartTime) {
      const sessionDuration = Date.now() - this.sessionStartTime;
      const data = await this.getData();
      data.totalTimeActive += Math.round(sessionDuration / 1000);
      await this.saveData(data);
      this.sessionStartTime = null;
      console.log('Analytics session ended and cleaned up');
    }
  }

  // Method to clean up and reset analytics session
  cleanup() {
    this.sessionStartTime = null;
    console.log('Analytics cleanup completed');
  }

  async getAnalytics(): Promise<AnalyticsData> {
    return await this.getData();
  }

  async resetAnalytics() {
    const defaultData = this.getDefaultData();
    await this.saveData(defaultData);
  }

  private async getData(): Promise<AnalyticsData> {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      if (data) {
        return { ...this.getDefaultData(), ...JSON.parse(data) };
      }
    } catch (error) {
      console.log('Error loading analytics:', error);
    }
    return this.getDefaultData();
  }

  private async saveData(data: AnalyticsData) {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.log('Error saving analytics:', error);
    }
  }

  private getDefaultData(): AnalyticsData {
    return {
      appLaunches: 0,
      timerStarts: 0,
      totalTimeActive: 0,
      lastActiveDate: '',
      themeChanges: 0,
      languageChanges: 0,
      averageLifeExpectancy: 0,
      birthdateSet: false,
      resets: 0,
    };
  }
}

export default new Analytics();