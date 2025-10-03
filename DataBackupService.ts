// DataBackupService.ts - CHALNA 데이터 백업/복구 서비스
import { Platform, Alert } from 'react-native';
import Share from 'react-native-share';
import DocumentPicker from 'react-native-document-picker';
import { storageManager } from './StorageManager';
import { SecurityAuditor } from './SecurityAuditor';
import i18n from './i18n';

// 백업 데이터 인터페이스
interface BackupData {
  version: string;
  exportDate: string;
  appVersion: string;
  platform: string;
  data: {
    birthDate?: string;
    lifeExpectancy?: string;
    isActive?: boolean;
    language?: string;
    isDarkTheme?: boolean;
    onboardingComplete?: boolean;
    lastCalculationTime?: number;
    hasAskedForNotificationPermission?: boolean;
    notificationSettings?: {
      enabled: boolean;
      interval: '1' | '5' | '10' | '60';
      sound: boolean;
      vibration: boolean;
    };
  };
}

// 검증 결과 인터페이스
interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export class DataBackupService {
  private static instance: DataBackupService;
  private readonly BACKUP_VERSION = '1.0';
  private readonly APP_VERSION = '1.0.0';
  private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB (안전장치)

  // 백업할 AsyncStorage 키 목록
  private readonly BACKUP_KEYS = [
    'birthDate',
    'lifeExpectancy',
    'isActive',
    'language',
    'isDarkTheme',
    'onboardingComplete',
    'lastCalculationTime',
    'hasAskedForNotificationPermission',
    'notificationSettings',
  ];

  static getInstance(): DataBackupService {
    if (!DataBackupService.instance) {
      DataBackupService.instance = new DataBackupService();
    }
    return DataBackupService.instance;
  }

  /**
   * 데이터 내보내기 (백업)
   * Share API를 사용하여 JSON 파일로 내보내기
   */
  async exportData(): Promise<void> {
    try {
      // 1. 모든 백업 데이터 수집
      const backupData = await this.collectBackupData();

      // 2. JSON 문자열 생성
      const jsonString = JSON.stringify(backupData, null, 2);

      // 3. 파일 이름 생성 (날짜 포함)
      const fileName = this.generateBackupFileName();

      // 4. Share API로 파일 공유
      if (Platform.OS === 'android') {
        // Android: Share with base64
        await Share.open({
          title: i18n.t('settingsDataBackup'),
          message: i18n.t('backupFileMessage'),
          filename: fileName,
          url: `data:application/json;base64,${this.base64Encode(jsonString)}`,
          subject: 'CHALNA Backup',
        });
      } else {
        // iOS: Share with data URL
        await Share.open({
          title: i18n.t('settingsDataBackup'),
          message: i18n.t('backupFileMessage'),
          filename: fileName,
          url: `data:application/json;base64,${this.base64Encode(jsonString)}`,
          subject: 'CHALNA Backup',
        });
      }

      console.log('Backup exported successfully:', fileName);
    } catch (error: any) {
      // 사용자가 취소한 경우는 에러로 간주하지 않음
      if (error?.message?.includes('User did not share')) {
        console.log('Backup cancelled by user');
        return;
      }
      console.error('Export error:', error);
      throw error;
    }
  }

  /**
   * 데이터 가져오기 (복구)
   * Document Picker를 사용하여 JSON 파일 선택 및 복구
   */
  async importData(): Promise<boolean> {
    try {
      // 1. 복구 확인 Alert
      return new Promise((resolve) => {
        Alert.alert(
          i18n.t('settingsDataRestore'),
          i18n.t('restoreConfirm'),
          [
            {
              text: i18n.t('cancel'),
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: i18n.t('continue'),
              onPress: async () => {
                try {
                  // 2. 파일 선택
                  const result = await DocumentPicker.pickSingle({
                    type: [DocumentPicker.types.allFiles],
                    copyTo: 'cachesDirectory',
                  });

                  // 3. 파일 읽기
                  const fileContent = await this.readFileContent(result);

                  // 4. 데이터 가져오기 및 복구
                  const success = await this.restoreFromContent(fileContent);
                  resolve(success);
                } catch (docError: any) {
                  if (DocumentPicker.isCancel(docError)) {
                    console.log('Document picker cancelled');
                    resolve(false);
                  } else {
                    console.error('Document picker error:', docError);
                    resolve(false);
                  }
                }
              },
            },
          ]
        );
      });
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  /**
   * 백업 데이터 수집
   */
  private async collectBackupData(): Promise<BackupData> {
    const data: any = {};

    // 각 키에 대해 AsyncStorage에서 값 가져오기
    for (const key of this.BACKUP_KEYS) {
      try {
        const value = await storageManager.get(key);
        if (value !== null && value !== undefined) {
          data[key] = value;
        }
      } catch (error) {
        console.warn(`Failed to get ${key}:`, error);
      }
    }

    // 메타데이터 포함
    const backupData: BackupData = {
      version: this.BACKUP_VERSION,
      exportDate: new Date().toISOString(),
      appVersion: this.APP_VERSION,
      platform: Platform.OS,
      data,
    };

    return backupData;
  }

  /**
   * 파일 내용에서 데이터 복구
   */
  private async restoreFromContent(fileContent: string): Promise<boolean> {
    try {
      // 1. JSON 파싱
      const backupData: BackupData = JSON.parse(fileContent);

      // 2. 데이터 검증
      const validation = this.validateBackupData(backupData);
      if (!validation.isValid) {
        Alert.alert(i18n.t('errorTitle'), validation.message || i18n.t('restoreInvalidData'));
        return false;
      }

      // 3. AsyncStorage에 데이터 복원
      let successCount = 0;
      for (const [key, value] of Object.entries(backupData.data)) {
        if (this.BACKUP_KEYS.includes(key)) {
          try {
            await storageManager.set(key, value);
            successCount++;
          } catch (error) {
            console.warn(`Failed to restore ${key}:`, error);
          }
        }
      }

      console.log(`Restored ${successCount}/${Object.keys(backupData.data).length} items`);
      return successCount > 0;
    } catch (error) {
      console.error('Restore from content error:', error);
      Alert.alert(i18n.t('errorTitle'), i18n.t('restoreInvalidData'));
      return false;
    }
  }

  /**
   * 백업 데이터 검증
   */
  validateBackupData(data: any): ValidationResult {
    try {
      // 1. 기본 구조 검증
      if (!data || typeof data !== 'object') {
        return { isValid: false, message: i18n.t('restoreInvalidData') };
      }

      // 2. 필수 필드 검증
      if (!data.version || !data.exportDate || !data.data) {
        return { isValid: false, message: i18n.t('restoreInvalidData') };
      }

      // 3. 버전 호환성 검증
      if (data.version !== this.BACKUP_VERSION) {
        return {
          isValid: false,
          message: i18n.t('restoreVersionMismatch', {
            version: data.version,
            expected: this.BACKUP_VERSION
          }),
        };
      }

      // 4. 데이터 객체 검증
      if (typeof data.data !== 'object') {
        return { isValid: false, message: i18n.t('restoreInvalidData') };
      }

      // 5. 생년월일 검증 (있는 경우)
      if (data.data.birthDate) {
        const securityAuditor = SecurityAuditor.getInstance();
        const birthDateValidation = securityAuditor.validateBirthDate(data.data.birthDate);
        if (!birthDateValidation.isValid) {
          return {
            isValid: false,
            message: i18n.t('restoreInvalidBirthDate') + ': ' + birthDateValidation.message,
          };
        }
      }

      // 6. 수명 검증 (있는 경우)
      if (data.data.lifeExpectancy) {
        const securityAuditor = SecurityAuditor.getInstance();
        const lifeExpectancyValidation = securityAuditor.validateLifeExpectancy(data.data.lifeExpectancy);
        if (!lifeExpectancyValidation.isValid) {
          return {
            isValid: false,
            message: i18n.t('restoreInvalidLifeExpectancy') + ': ' + lifeExpectancyValidation.message,
          };
        }
      }

      // 7. 파일 크기 검증 (간접적으로)
      const jsonSize = JSON.stringify(data).length;
      if (jsonSize > this.MAX_FILE_SIZE) {
        return {
          isValid: false,
          message: i18n.t('restoreFileTooLarge'),
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Validation error:', error);
      return { isValid: false, message: i18n.t('restoreInvalidData') };
    }
  }

  /**
   * 백업 파일 이름 생성
   */
  private generateBackupFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    return `CHALNA_Backup_${dateStr}.json`;
  }

  /**
   * Base64 인코딩 (간단한 구현)
   */
  private base64Encode(str: string): string {
    // React Native는 Buffer를 지원하지 않으므로 간단한 btoa 사용
    // 실제로는 react-native-base64 같은 라이브러리 사용 권장
    if (typeof btoa !== 'undefined') {
      return btoa(unescape(encodeURIComponent(str)));
    }
    // Fallback for environments without btoa
    return Buffer.from(str, 'utf-8').toString('base64');
  }

  /**
   * 파일 내용 읽기
   */
  private async readFileContent(result: any): Promise<string> {
    try {
      // Document Picker의 결과에서 파일 URI 사용
      const uri = result.fileCopyUri || result.uri;

      if (!uri) {
        throw new Error('No file URI found');
      }

      // React Native의 fetch를 사용하여 파일 읽기
      const response = await fetch(uri);
      const content = await response.text();

      return content;
    } catch (error) {
      console.error('Read file error:', error);
      throw error;
    }
  }

  /**
   * 백업 메타데이터 가져오기 (향후 확장용)
   */
  async getBackupMetadata(fileContent: string): Promise<any> {
    try {
      const backupData: BackupData = JSON.parse(fileContent);
      return {
        version: backupData.version,
        exportDate: backupData.exportDate,
        appVersion: backupData.appVersion,
        platform: backupData.platform,
        itemCount: Object.keys(backupData.data).length,
      };
    } catch (error) {
      console.error('Get metadata error:', error);
      return null;
    }
  }
}

export default DataBackupService;
