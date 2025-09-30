// 간소화된 StorageManager - CHALNA 앱용
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SimpleStorageOptions {
  defaultValue?: any;
  retries?: number;
}

const STORAGE_HEALTH_KEY = '_storage_health';

class StorageManager {
  private static instance: StorageManager;

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  // 기본 get 메서드
  async get(key: string, options: SimpleStorageOptions = {}): Promise<any> {
    const { defaultValue = null, retries = 1 } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const value = await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
      } catch (error) {
        console.error(`Storage get error (attempt ${attempt + 1}):`, error);

        if (attempt === retries) {
          console.error(`Failed to get ${key} after ${retries + 1} attempts`);
          return defaultValue;
        }

        // 간단한 재시도 지연
        await new Promise<void>(resolve => setTimeout(resolve, 100));
      }
    }

    return defaultValue;
  }

  // 기본 set 메서드
  async set(key: string, value: any, options: SimpleStorageOptions = {}): Promise<boolean> {
    const { retries = 1 } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error(`Storage set error (attempt ${attempt + 1}):`, error);

        if (attempt === retries) {
          console.error(`Failed to set ${key} after ${retries + 1} attempts`);
          return false;
        }

        // 간단한 재시도 지연
        await new Promise<void>(resolve => setTimeout(resolve, 100));
      }
    }

    return false;
  }

  // 기본 remove 메서드
  async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Storage remove error:`, error);
      return false;
    }
  }

  // 기본 clear 메서드
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error(`Storage clear error:`, error);
      return false;
    }
  }

  // 모든 키 가져오기
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys]; // 타입 호환성을 위해 새 배열 생성
    } catch (error) {
      console.error(`Storage getAllKeys error:`, error);
      return [];
    }
  }

  // 저장소 건강도 체크
  async checkStorageHealth(): Promise<{ isHealthy: boolean; message?: string }> {
    try {
      // 간단한 읽기/쓰기 테스트
      const testKey = `${STORAGE_HEALTH_KEY}_${Date.now()}`;
      const testValue = { test: true, timestamp: Date.now() };

      await AsyncStorage.setItem(testKey, JSON.stringify(testValue));
      const retrieved = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);

      if (!retrieved) {
        return { isHealthy: false, message: '저장소 읽기 실패' };
      }

      const parsed = JSON.parse(retrieved);
      if (parsed.test !== true) {
        return { isHealthy: false, message: '데이터 무결성 검증 실패' };
      }

      return { isHealthy: true };
    } catch (error) {
      return { isHealthy: false, message: `저장소 오류: ${error}` };
    }
  }

}

// 기본 인스턴스 내보내기 (이전 코드와의 호환성)
export const storageManager = StorageManager.getInstance();
export default StorageManager;