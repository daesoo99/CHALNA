// 간소화된 CrashReporter - 로컬 앱용
import { Alert } from 'react-native';

interface SimpleCrashReport {
  timestamp: string;
  error: string;
  stackTrace?: string;
}

class CrashReporter {
  private static instance: CrashReporter;

  static getInstance(): CrashReporter {
    if (!CrashReporter.instance) {
      CrashReporter.instance = new CrashReporter();
    }
    return CrashReporter.instance;
  }

  async reportCrash(error: Error, _componentStack?: string): Promise<void> {
    try {
      const crashReport: SimpleCrashReport = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stackTrace: error.stack,
      };

      // 단순히 콘솔에 로그 (개발용)
      console.error('⏳ CHALNA Crash:', crashReport);

      // 사용자에게 간단한 알림
      Alert.alert(
        '오류가 발생했습니다',
        '앱에서 오류가 발생했지만 데이터는 안전합니다. 다시 시도해주세요.',
        [{ text: '확인' }]
      );
    } catch (reportingError) {
      console.error('Failed to report crash:', reportingError);
    }
  }

  // 전역 에러 핸들러 설정 (간소화)
  setupGlobalErrorHandler(): void {
    const originalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();

    (global as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal?: boolean) => {
      this.reportCrash(error);

      // 원래 핸들러도 호출
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
}

export default CrashReporter;