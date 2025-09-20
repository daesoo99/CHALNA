import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share, Alert } from 'react-native';
import Analytics from './Analytics';
import MilestoneManager from './MilestoneManager';

interface ExportData {
  exportDate: string;
  appVersion: string;
  userData: {
    birthDate?: string;
    lifeExpectancy?: string;
    theme?: string;
    language?: string;
  };
  analytics: any;
}

class DataExport {
  async exportToJSON(): Promise<string> {
    try {
      const exportData: ExportData = {
        exportDate: new Date().toISOString(),
        appVersion: '0.0.1',
        userData: {},
        analytics: {}
      };

      // Get user data
      const [birthDate, lifeExpectancy, theme] = await Promise.all([
        AsyncStorage.getItem('birthDate'),
        AsyncStorage.getItem('lifeExpectancy'),
        AsyncStorage.getItem('theme')
      ]);

      exportData.userData = {
        birthDate: birthDate || undefined,
        lifeExpectancy: lifeExpectancy || undefined,
        theme: theme || 'dark'
      };

      // Get analytics data
      exportData.analytics = await Analytics.getAnalytics();

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  async exportToCSV(): Promise<string> {
    try {
      const analytics = await Analytics.getAnalytics();

      const csvData = [
        'Metric,Value',
        `App Launches,${analytics.appLaunches}`,
        `Timer Starts,${analytics.timerStarts}`,
        `Total Time Active (seconds),${analytics.totalTimeActive}`,
        `Theme Changes,${analytics.themeChanges}`,
        `Language Changes,${analytics.languageChanges}`,
        `Average Life Expectancy,${analytics.averageLifeExpectancy}`,
        `Birth Date Set,${analytics.birthdateSet ? 'Yes' : 'No'}`,
        `Last Active Date,${analytics.lastActiveDate}`,
        `Export Date,${new Date().toISOString()}`
      ].join('\n');

      return csvData;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw new Error('Failed to export CSV data');
    }
  }

  async shareData(format: 'json' | 'csv', t: (key: string) => string): Promise<void> {
    try {
      let data: string;

      if (format === 'json') {
        data = await this.exportToJSON();
      } else {
        data = await this.exportToCSV();
      }

      await Share.share({
        message: data,
        title: t('exportData'),
      });

      // Track export for milestones
      await MilestoneManager.trackDataExport();

    } catch (error) {
      console.error('Error sharing data:', error);
      Alert.alert(t('errorTitle'), t('exportError'));
    }
  }

  async importFromJSON(jsonData: string): Promise<boolean> {
    try {
      const data: ExportData = JSON.parse(jsonData);

      // Import user data
      if (data.userData) {
        const promises = [];

        if (data.userData.birthDate) {
          promises.push(AsyncStorage.setItem('birthDate', data.userData.birthDate));
        }
        if (data.userData.lifeExpectancy) {
          promises.push(AsyncStorage.setItem('lifeExpectancy', data.userData.lifeExpectancy));
        }
        if (data.userData.theme) {
          promises.push(AsyncStorage.setItem('theme', data.userData.theme));
        }

        await Promise.all(promises);
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem('birthDate'),
        AsyncStorage.removeItem('lifeExpectancy'),
        AsyncStorage.removeItem('theme'),
        Analytics.resetAnalytics()
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Failed to clear data');
    }
  }
}

export default new DataExport();