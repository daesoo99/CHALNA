import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface CrashReport {
  id: string;
  timestamp: string;
  error: string;
  stackTrace?: string;
  userAgent: string;
  appVersion: string;
  componentStack?: string;
}

class CrashReporter {
  private static instance: CrashReporter;
  private crashReports: CrashReport[] = [];

  static getInstance(): CrashReporter {
    if (!CrashReporter.instance) {
      CrashReporter.instance = new CrashReporter();
    }
    return CrashReporter.instance;
  }

  async reportCrash(error: Error, componentStack?: string): Promise<void> {
    try {
      const crashReport: CrashReport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        error: error.message,
        stackTrace: error.stack,
        userAgent: 'DeathClock Mobile App',
        appVersion: '0.0.1',
        componentStack
      };

      // Store crash report locally
      this.crashReports.push(crashReport);
      await this.saveCrashReports();

      // Show user-friendly error message
      Alert.alert(
        'Unexpected Error',
        'The app encountered an error. Your data is safe and the issue has been logged.',
        [{ text: 'OK' }]
      );

      console.error('Crash reported:', crashReport);
    } catch (reportingError) {
      console.error('Failed to report crash:', reportingError);
    }
  }

  async getCrashReports(): Promise<CrashReport[]> {
    try {
      const stored = await AsyncStorage.getItem('crashReports');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load crash reports:', error);
      return [];
    }
  }

  private async saveCrashReports(): Promise<void> {
    try {
      await AsyncStorage.setItem('crashReports', JSON.stringify(this.crashReports));
    } catch (error) {
      console.error('Failed to save crash reports:', error);
    }
  }

  async clearCrashReports(): Promise<void> {
    try {
      this.crashReports = [];
      await AsyncStorage.removeItem('crashReports');
    } catch (error) {
      console.error('Failed to clear crash reports:', error);
    }
  }

  setupGlobalErrorHandler(): void {
    // Handle unhandled promise rejections
    const originalHandler = global.ErrorUtils?.getGlobalHandler?.();

    global.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      this.reportCrash(error);

      // Call original handler if it exists
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });

    // Handle unhandled promise rejections
    if (typeof global.addEventListener === 'function') {
      global.addEventListener('unhandledrejection', (event: any) => {
        this.reportCrash(new Error(`Unhandled Promise Rejection: ${event.reason}`));
      });
    }
  }
}

export default CrashReporter;