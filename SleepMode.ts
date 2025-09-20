import AsyncStorage from '@react-native-async-storage/async-storage';

interface SleepSettings {
  enabled: boolean;
  startTime: string; // "22:00" format
  endTime: string;   // "06:00" format
  pauseTimer: boolean;
  muteNotifications: boolean;
}

class SleepMode {
  private storageKey = 'death_clock_sleep_mode';

  async getSettings(): Promise<SleepSettings> {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      if (data) {
        return { ...this.getDefaultSettings(), ...JSON.parse(data) };
      }
    } catch (error) {
      console.log('Error loading sleep settings:', error);
    }
    return this.getDefaultSettings();
  }

  async saveSettings(settings: SleepSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch (error) {
      console.log('Error saving sleep settings:', error);
    }
  }

  async updateSetting<K extends keyof SleepSettings>(
    key: K,
    value: SleepSettings[K]
  ): Promise<void> {
    const settings = await this.getSettings();
    settings[key] = value;
    await this.saveSettings(settings);
  }

  async isInSleepMode(): Promise<boolean> {
    const settings = await this.getSettings();

    if (!settings.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return this.isTimeBetween(currentTime, settings.startTime, settings.endTime);
  }

  async shouldPauseTimer(): Promise<boolean> {
    const settings = await this.getSettings();
    const inSleepMode = await this.isInSleepMode();

    return settings.enabled && settings.pauseTimer && inSleepMode;
  }

  async shouldMuteNotifications(): Promise<boolean> {
    const settings = await this.getSettings();
    const inSleepMode = await this.isInSleepMode();

    return settings.enabled && settings.muteNotifications && inSleepMode;
  }

  getNextWakeUpTime(): Promise<Date> {
    return new Promise(async (resolve) => {
      const settings = await this.getSettings();
      const now = new Date();
      const [endHour, endMinute] = settings.endTime.split(':').map(Number);

      const wakeUpToday = new Date(now);
      wakeUpToday.setHours(endHour, endMinute, 0, 0);

      // If wake up time has passed today, set for tomorrow
      if (wakeUpToday <= now) {
        wakeUpToday.setDate(wakeUpToday.getDate() + 1);
      }

      resolve(wakeUpToday);
    });
  }

  getSleepModeStatus(): Promise<{
    isInSleepMode: boolean;
    nextWakeUp: Date | null;
    timeUntilWakeUp: string;
  }> {
    return new Promise(async (resolve) => {
      const isInSleepMode = await this.isInSleepMode();

      if (!isInSleepMode) {
        resolve({
          isInSleepMode: false,
          nextWakeUp: null,
          timeUntilWakeUp: ''
        });
        return;
      }

      const nextWakeUp = await this.getNextWakeUpTime();
      const now = new Date();
      const msUntilWakeUp = nextWakeUp.getTime() - now.getTime();

      const hours = Math.floor(msUntilWakeUp / (1000 * 60 * 60));
      const minutes = Math.floor((msUntilWakeUp % (1000 * 60 * 60)) / (1000 * 60));

      resolve({
        isInSleepMode: true,
        nextWakeUp,
        timeUntilWakeUp: `${hours}시간 ${minutes}분`
      });
    });
  }

  private isTimeBetween(current: string, start: string, end: string): boolean {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const currentMinutes = toMinutes(current);
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);

    // Handle overnight period (e.g., 22:00 to 06:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    // Normal period (e.g., 06:00 to 22:00)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  private getDefaultSettings(): SleepSettings {
    return {
      enabled: false,
      startTime: '22:00',
      endTime: '06:00',
      pauseTimer: true,
      muteNotifications: true
    };
  }
}

export default new SleepMode();
export type { SleepSettings };