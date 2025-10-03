import React, { useState, useEffect, memo, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
  AppState,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTranslation } from 'react-i18next';
import { darkTheme, lightTheme, Theme, typography, spacing } from './themes';
import ErrorBoundary from './ErrorBoundary';
import CrashReporter from './CrashReporter';
import { storageManager } from './StorageManager';
import SecurityAuditor from './SecurityAuditor';
import Onboarding from './Onboarding';
import NotificationService from './NotificationService';
import Settings from './Settings';
import './i18n';

// TimeCard 컴포넌트 분리: 불필요한 리렌더링 방지
interface TimeCardProps {
  value: number;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

const TimeCard = memo<TimeCardProps>(({ value, label, color, backgroundColor, borderColor }) => {
  return (
    <View
      style={[styles.timeCard, { backgroundColor, borderColor }]}
      accessibilityLabel={`${value} ${label}`}
      accessibilityRole="text"
    >
      <Text style={[styles.timeValue, { color }]}>
        {value}
      </Text>
      <Text style={[styles.timeLabel, { color: '#888' }]}>
        {label}
      </Text>
    </View>
  );
}, (prevProps, nextProps) => {
  // 값이 변경되지 않으면 리렌더링 방지
  return prevProps.value === nextProps.value &&
         prevProps.label === nextProps.label &&
         prevProps.color === nextProps.color;
});

TimeCard.displayName = 'TimeCard';

const App = memo(() => {
  console.log('🚀 App component rendering...');
  const { t, i18n } = useTranslation();

  // Memory leak prevention: Component mount state tracking
  const isMountedRef = useRef(true);
  const timeoutIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [lifeExpectancy, setLifeExpectancy] = useState('80');
  const [timeLeft, setTimeLeft] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isActive, setIsActive] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<Theme>(darkTheme);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [currentTimezone, setCurrentTimezone] = useState<string>('');
  const [timezoneChangedNotification, setTimezoneChangedNotification] = useState(false);
  const [appState, setAppState] = useState<string>(AppState.currentState);
  const [lastCalculationTime, setLastCalculationTime] = useState<number>(Date.now());
  const [isBackgroundPaused, setIsBackgroundPaused] = useState(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  // 온보딩 및 검증 상태
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [lifeExpectancyError, setLifeExpectancyError] = useState<string | null>(null);
  const [isLifeExpectancyValid, setIsLifeExpectancyValid] = useState(true);

  // 알림 상태
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);
  const [hasAskedForNotificationPermission, setHasAskedForNotificationPermission] = useState(false);

  // 디바운스 타이머 참조
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memory management utilities
  const safeSetState = useCallback((setter: any, value: any) => {
    if (isMountedRef.current) {
      setter(value);
    } else {
      console.warn('⚠️ Prevented setState on unmounted component');
    }
  }, []);

  const addTimeout = useCallback((timeoutId: ReturnType<typeof setTimeout>) => {
    timeoutIdsRef.current.add(timeoutId);
    return timeoutId;
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    timeoutIdsRef.current.clear();
    console.log('🧹 Cleared all timeouts');
  }, []);

  const languages = useMemo(() => [
    { code: 'ko', name: t('languageKorean') },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
  ], [t]);

  // 햅틱 피드백 유틸리티
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success' | 'error' = 'medium') => {
    const hapticOptions = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    };

    switch (type) {
      case 'light':
        ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
        break;
      case 'medium':
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        break;
      case 'success':
        ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
        break;
      case 'error':
        ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
        break;
    }
  }, []);

  // 스마트 기본값 계산 (생년월일 기반)
  const calculateSuggestedLifeExpectancy = useCallback((birthDateStr: string): number => {
    try {
      const birth = new Date(birthDateStr);
      const now = new Date();
      const currentAge = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

      // 한국 평균 수명 (2024년 기준)
      const averageLifeExpectancy = 83;

      // 현재 나이가 평균 수명보다 높으면 현재 나이 + 10년
      if (currentAge >= averageLifeExpectancy) {
        return Math.min(150, currentAge + 10);
      }

      return averageLifeExpectancy;
    } catch (error) {
      console.error('❌ Error calculating suggested life expectancy:', error);
      return 80;
    }
  }, []);

  // 디바운스된 수명 검증 (500ms 지연)
  const handleLifeExpectancyChange = useCallback((text: string) => {
    // 숫자가 아닌 문자 필터링
    const numericText = text.replace(/[^0-9]/g, '');
    safeSetState(setLifeExpectancy, numericText);

    // 이전 타이머 취소
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    // 빈 값은 즉시 처리 (디바운스 제외)
    if (numericText === '') {
      safeSetState(setLifeExpectancyError, null);
      safeSetState(setIsLifeExpectancyValid, false);
      return;
    }

    // 500ms 후에 검증 실행
    validationTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      const security = SecurityAuditor.getInstance();
      const validation = security.validateLifeExpectancy(parseInt(numericText));

      safeSetState(setIsLifeExpectancyValid, validation.isValid);
      safeSetState(setLifeExpectancyError, validation.isValid ? null : validation.message);

      // 유효하지 않을 때만 햅틱 (최종 검증 후)
      if (!validation.isValid) {
        triggerHaptic('light');
      }
    }, 500);
  }, [safeSetState, triggerHaptic]);

  // 타임존 변경 감지 및 처리 함수
  const detectTimezoneChange = () => {
    const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentOffset = new Date().getTimezoneOffset();
    const tzString = `${currentTz}_${currentOffset}`;

    if (currentTimezone && currentTimezone !== tzString) {
      console.log('Timezone changed detected:', {
        previous: currentTimezone,
        current: tzString
      });

      // 타임존 변경 시 시간 재계산
      if (isActive && birthDate) {
        calculateTimeLeft();
      }

      // 선택적으로 사용자에게 알림 (5초 후 자동 숨김)
      safeSetState(setTimezoneChangedNotification, true);
      const timeoutId = setTimeout(() => {
        safeSetState(setTimezoneChangedNotification, false);
        timeoutIdsRef.current.delete(timeoutId);
      }, 5000);
      addTimeout(timeoutId);
    }

    safeSetState(setCurrentTimezone, tzString);
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    // 타이머는 앱이 활성 상태이고, 백그라운드 일시정지 상태가 아닐 때만 실행
    if (isActive && birthDate && !isBackgroundPaused && appState === 'active') {
      console.log('▶️ Starting timer interval');
      interval = setInterval(() => {
        calculateTimeLeft();
        safeSetState(setLastCalculationTime, Date.now());
      }, 1000);
    } else if (isBackgroundPaused) {
      console.log('⏸️ Timer paused due to background state');
    }

    return () => {
      if (interval) {
        console.log('⏹️ Clearing timer interval');
        clearInterval(interval);
        interval = null;
      }
    };
  }, [isActive, birthDate, lifeExpectancy, isBackgroundPaused, appState]);

  // 알림 업데이트 (timeLeft가 변경될 때마다)
  useEffect(() => {
    if (isActive && birthDate && notificationPermissionGranted) {
      // 1분마다만 알림 업데이트 (배터리 절약)
      if (timeLeft.seconds === 0) {
        NotificationService.updateNotification(timeLeft, t);
      }
    }
  }, [isActive, birthDate, notificationPermissionGranted, timeLeft, t]);

  // 포괄적인 AppState 변화 처리
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('🔄 App state change:', { from: appState, to: nextAppState });

      const previousState = appState;
      safeSetState(setAppState, nextAppState);

      if (nextAppState === 'active') {
        // 포그라운드 복귀 시 처리
        handleForegroundReturn(previousState);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // 백그라운드 진입 시 처리
        handleBackgroundEntry();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      console.log('🧹 Cleaning up AppState listener');
      subscription?.remove();
    };
  }, [appState, isActive, birthDate, lastCalculationTime]);

  // Master cleanup effect for memory leak prevention
  useEffect(() => {
    return () => {
      console.log('🧹 Master cleanup: Component unmounting');

      // Mark component as unmounted
      isMountedRef.current = false;

      // Clear all pending timeouts
      clearAllTimeouts();

      // Clear validation timer
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
        validationTimerRef.current = null;
      }

      // Abort any ongoing async operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('🚫 Aborted ongoing async operations');
      }

      console.log('✅ Master cleanup completed');
    };
  }, [clearAllTimeouts]);

  // 포그라운드 복귀 시 처리 함수
  const handleForegroundReturn = (previousState: string) => {
    console.log('📱 App returned to foreground from:', previousState);

    // 타임존 변경 체크 (기존 기능 유지)
    detectTimezoneChange();

    if (isActive && birthDate && isBackgroundPaused) {
      console.log('⏰ Synchronizing timer after background period');

      // 백그라운드에서 경과된 시간 계산
      const currentTime = Date.now();
      const backgroundDuration = currentTime - lastCalculationTime;

      console.log('Background duration:', Math.floor(backgroundDuration / 1000), 'seconds');

      // 즉시 시간 재계산으로 동기화
      calculateTimeLeft();
      safeSetState(setLastCalculationTime, currentTime);
      safeSetState(setIsBackgroundPaused, false);

      // 사용자에게 동기화 알림 (선택적)
      if (backgroundDuration > 60000) { // 1분 이상 백그라운드에 있었던 경우
        const minutes = Math.floor(backgroundDuration / 60000);
        const syncMessage = t('backgroundSyncMessage', { minutes });
        safeSetState(setSyncNotification, syncMessage);
        console.log('🔔 Long background period detected, showing sync notification');

        // 3초 후 알림 자동 숨김
        const timeoutId = setTimeout(() => {
          safeSetState(setSyncNotification, null);
          timeoutIdsRef.current.delete(timeoutId);
        }, 3000);
        addTimeout(timeoutId);
      }
    }
  };

  // 백그라운드 진입 시 처리 함수
  const handleBackgroundEntry = () => {
    console.log('🌙 App entered background/inactive state');

    if (isActive && birthDate) {
      // 마지막 계산 시간 저장
      const currentTime = Date.now();
      safeSetState(setLastCalculationTime, currentTime);
      safeSetState(setIsBackgroundPaused, true);

      console.log('💤 Timer paused for background optimization');

      // 백그라운드에서의 리소스 절약을 위해 추가 최적화 가능
      // 예: 불필요한 계산 중단, 메모리 정리 등
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔄 Initializing CHALNA app...');

        // Initialize simplified error handling
        const crashReporter = CrashReporter.getInstance();
        crashReporter.setupGlobalErrorHandler();

        // Initialize timezone
        detectTimezoneChange();

        // Load saved data
        await loadSavedData();
        await loadTheme();

        console.log('✅ App initialized successfully');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        Alert.alert(
          t('errorTitle'),
          t('appInitError'),
          [{ text: t('acknowledge') }]
        );
      } finally {
        safeSetState(setIsLoading, false);
      }
    };

    initializeApp();
  }, []);

  const calculateTimeLeft = useCallback(() => {
    if (!birthDate || !lifeExpectancy) return;

    try {
      // 기본 검증
      const security = SecurityAuditor.getInstance();
      const birthValidation = security.validateBirthDate(birthDate);
      const lifeValidation = security.validateLifeExpectancy(parseInt(lifeExpectancy));

      if (!birthValidation.isValid) {
        Alert.alert(t('errorTitle'), birthValidation.message);
        return;
      }

      if (!lifeValidation.isValid) {
        Alert.alert(t('errorTitle'), lifeValidation.message);
        return;
      }


      // UTC 기반 안정적인 시간 계산
      const birth = new Date(birthDate + 'T00:00:00Z'); // UTC로 명시적 설정
      const expectedDeath = new Date(birth);
      expectedDeath.setUTCFullYear(birth.getUTCFullYear() + parseInt(lifeExpectancy));


      // 로컬 시간 기준으로 다시 계산 (사용자 관점에서의 정확한 시간)
      const localBirth = new Date(birthDate + 'T00:00:00');
      const localExpectedDeath = new Date(localBirth);
      localExpectedDeath.setFullYear(localBirth.getFullYear() + parseInt(lifeExpectancy));

      const localNow = new Date();
      const difference = localExpectedDeath.getTime() - localNow.getTime();

      if (difference <= 0) {
        safeSetState(setTimeLeft, { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (isMountedRef.current) {
          Alert.alert(t('timeOverTitle'), t('timeOverMessage'));
        }
        return;
      }

      // 더 정확한 시간 계산 (윤년 고려)
      const totalSeconds = Math.floor(difference / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);

      // 년/월 계산을 위한 더 정확한 로직
      const currentDate = new Date(localNow);
      const endDate = new Date(localExpectedDeath);

      let years = endDate.getFullYear() - currentDate.getFullYear();
      let months = endDate.getMonth() - currentDate.getMonth();

      if (months < 0) {
        years--;
        months += 12;
      }

      if (endDate.getDate() < currentDate.getDate()) {
        months--;
        if (months < 0) {
          years--;
          months += 12;
        }
      }

      // 남은 일, 시, 분, 초 계산
      const tempDate = new Date(currentDate);
      tempDate.setFullYear(tempDate.getFullYear() + years);
      tempDate.setMonth(tempDate.getMonth() + months);

      const remainingMs = endDate.getTime() - tempDate.getTime();
      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      const newTimeLeft = {
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
        seconds: Math.max(0, seconds)
      };

      // 얕은 비교: 이전 값과 비교하여 변경사항이 있을 때만 업데이트
      setTimeLeft(prevTimeLeft => {
        if (
          prevTimeLeft.years === newTimeLeft.years &&
          prevTimeLeft.months === newTimeLeft.months &&
          prevTimeLeft.days === newTimeLeft.days &&
          prevTimeLeft.hours === newTimeLeft.hours &&
          prevTimeLeft.minutes === newTimeLeft.minutes &&
          prevTimeLeft.seconds === newTimeLeft.seconds
        ) {
          return prevTimeLeft; // 변경사항 없으면 이전 상태 반환 (리렌더링 방지)
        }
        return newTimeLeft;
      });
    } catch (error) {
      console.error('Time calculation error:', error);
      CrashReporter.getInstance().reportCrash(error as Error);
    }
  }, [birthDate, lifeExpectancy]);

  const loadSavedData = async () => {
    // Create new AbortController for this operation
    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    try {
      if (currentController.signal.aborted) return;
      // Load saved data
      const savedBirthDate = await storageManager.get('birthDate');
      const savedLifeExpectancy = await storageManager.get('lifeExpectancy');
      const savedLanguage = await storageManager.get('language');
      const savedActive = await storageManager.get('isActive');
      const savedLastCalculationTime = await storageManager.get('lastCalculationTime');
      const savedOnboardingComplete = await storageManager.get('onboardingComplete', { defaultValue: false });
      const savedHasAskedForNotification = await storageManager.get('hasAskedForNotificationPermission', { defaultValue: false });

      // Load saved data if available (with safe setState)
      if (savedBirthDate) safeSetState(setBirthDate, savedBirthDate);
      if (savedLifeExpectancy) safeSetState(setLifeExpectancy, savedLifeExpectancy);
      safeSetState(setOnboardingComplete, savedOnboardingComplete);
      safeSetState(setHasAskedForNotificationPermission, savedHasAskedForNotification);

      // 알림 권한 확인
      const hasNotificationPermission = await NotificationService.checkPermissions();
      safeSetState(setNotificationPermissionGranted, hasNotificationPermission);
      if (savedLanguage && !currentController.signal.aborted) {
        await i18n.changeLanguage(savedLanguage);
      }
      if (savedActive !== null) {
        safeSetState(setIsActive, savedActive);

        // 앱이 다시 시작될 때 마지막 계산 시간 복원 및 동기화
        if (savedActive && savedLastCalculationTime) {
          const currentTime = Date.now();
          const timeSinceLastCalculation = currentTime - savedLastCalculationTime;

          console.log('📱 App restarted with active timer');
          console.log('Time since last calculation:', Math.floor(timeSinceLastCalculation / 1000), 'seconds');

          safeSetState(setLastCalculationTime, currentTime);

          // 앱 재시작 시 즉시 시간 재계산
          if (savedBirthDate) {
            const timeoutId = setTimeout(() => {
              if (isMountedRef.current) {
                calculateTimeLeft();
              }
              timeoutIdsRef.current.delete(timeoutId);
            }, 100);
            addTimeout(timeoutId);
          }
        }
      }

      // Check storage health
      const healthCheck = await storageManager.checkStorageHealth();
      if (!healthCheck.isHealthy) {
        console.warn('Storage health issue:', healthCheck.message);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🚫 Load operation was cancelled');
        return;
      }
      console.error('Failed to load saved data:', error);
    } finally {
      if (abortControllerRef.current === currentController) {
        abortControllerRef.current = null;
      }
    }
  };

  const saveData = async () => {
    // Create new AbortController for this operation
    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    try {
      if (currentController.signal.aborted) return;
      // Save data including app state management
      await storageManager.set('birthDate', birthDate);
      await storageManager.set('lifeExpectancy', lifeExpectancy);
      await storageManager.set('isActive', isActive);
      await storageManager.set('language', i18n.language);
      await storageManager.set('lastCalculationTime', lastCalculationTime);
      await storageManager.set('onboardingComplete', onboardingComplete);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🚫 Save operation was cancelled');
        return;
      }
      console.error('Failed to save data:', error);
    } finally {
      if (abortControllerRef.current === currentController) {
        abortControllerRef.current = null;
      }
    }
  };

  const loadTheme = async () => {
    try {
      const savedTheme = await storageManager.get('isDarkTheme', { defaultValue: true });
      safeSetState(setIsDarkTheme, savedTheme);
      safeSetState(setCurrentTheme, savedTheme ? darkTheme : lightTheme);
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      triggerHaptic('light');
      const newTheme = !isDarkTheme;
      safeSetState(setIsDarkTheme, newTheme);
      safeSetState(setCurrentTheme, newTheme ? darkTheme : lightTheme);
      await storageManager.set('isDarkTheme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const handleStart = async () => {
    if (!birthDate) {
      triggerHaptic('error');
      Alert.alert(t('errorTitle'), t('errorBirthDate'));
      return;
    }

    // 수명 검증
    if (!isLifeExpectancyValid || !lifeExpectancy) {
      triggerHaptic('error');
      Alert.alert(t('errorTitle'), lifeExpectancyError || t('errorLifeExpectancy'));
      return;
    }

    triggerHaptic('success');
    console.log('🚀 Starting CHALNA timer');
    calculateTimeLeft();
    safeSetState(setIsActive, true);
    safeSetState(setLastCalculationTime, Date.now());
    safeSetState(setIsBackgroundPaused, false);
    await saveData();

    // 알림 서비스 시작 (비동기, 타이머와 독립적)
    setTimeout(() => {
      startNotificationService();
    }, 500);
  };

  const handleStop = () => {
    triggerHaptic('medium');
    console.log('🛑 Stopping CHALNA timer');
    safeSetState(setIsActive, false);
    safeSetState(setIsBackgroundPaused, false);
    saveData();

    // 알림 서비스 중지
    stopNotificationService();
  };

  const handleOnboardingComplete = async () => {
    triggerHaptic('success');
    safeSetState(setOnboardingComplete, true);
    await storageManager.set('onboardingComplete', true);
  };

  // 알림 권한 확인 및 요청
  const checkAndRequestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔔 Checking notification permission...');

      // 이미 권한이 있는지 확인
      const hasPermission = await NotificationService.checkPermissions();

      if (hasPermission) {
        console.log('✅ Notification permission already granted');
        safeSetState(setNotificationPermissionGranted, true);
        return true;
      }

      // 이미 한 번 요청했다면 다시 묻지 않음
      if (hasAskedForNotificationPermission) {
        console.log('⚠️ Already asked for permission, skipping');
        return false;
      }

      // 권한 요청
      console.log('📱 Requesting notification permission...');
      safeSetState(setHasAskedForNotificationPermission, true);
      await storageManager.set('hasAskedForNotificationPermission', true);

      const granted = await NotificationService.requestPermissions();

      if (granted) {
        console.log('✅ Notification permission granted');
        safeSetState(setNotificationPermissionGranted, true);
        triggerHaptic('success');
        return true;
      } else {
        console.log('❌ Notification permission denied');
        triggerHaptic('error');

        // 사용자에게 설정에서 권한을 켜도록 안내
        if (Platform.OS === 'android') {
          Alert.alert(
            t('notificationPermissionTitle'),
            t('notificationPermissionMessage'),
            [
              { text: t('cancel'), style: 'cancel' },
              {
                text: t('openSettings'),
                onPress: () => {
                  // Android 설정 앱 열기
                  if (Platform.OS === 'android') {
                    const {Linking} = require('react-native');
                    Linking.openSettings();
                  }
                }
              }
            ]
          );
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Error handling notification permission:', error);
      return false;
    }
  }, [hasAskedForNotificationPermission, safeSetState, triggerHaptic, t]);

  // 알림 서비스 시작
  const startNotificationService = useCallback(async () => {
    try {
      if (!birthDate || !lifeExpectancy || !isActive) {
        console.log('⚠️ Cannot start notification: missing data or inactive');
        return;
      }

      // 권한 확인 및 요청
      const hasPermission = await checkAndRequestNotificationPermission();

      if (!hasPermission) {
        console.log('⚠️ Notification permission not granted, skipping notification service');
        return;
      }

      // 알림 서비스 시작
      console.log('🔔 Starting notification service...');
      NotificationService.startNotificationService(birthDate, parseInt(lifeExpectancy));

    } catch (error) {
      console.error('❌ Error starting notification service:', error);
    }
  }, [birthDate, lifeExpectancy, isActive, checkAndRequestNotificationPermission]);

  // 알림 서비스 중지
  const stopNotificationService = useCallback(() => {
    try {
      console.log('🔕 Stopping notification service...');
      NotificationService.stopNotificationService();
    } catch (error) {
      console.error('❌ Error stopping notification service:', error);
    }
  }, []);

  const handleLanguageChange = useCallback(async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      await storageManager.set('language', languageCode);
      safeSetState(setShowLanguageModal, false);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  }, [safeSetState]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    safeSetState(setShowDatePicker, false);
    if (selectedDate && isMountedRef.current) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      safeSetState(setBirthDate, formattedDate);
      safeSetState(setSelectedDate, selectedDate);
    }
  }, [safeSetState]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={[styles.loadingText, { color: currentTheme.text }]}>
          {t('loading')}
        </Text>
      </View>
    );
  }

  // 온보딩 화면 표시
  if (!onboardingComplete) {
    return (
      <ErrorBoundary>
        <Onboarding onComplete={handleOnboardingComplete} theme={currentTheme} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: currentTheme.background }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StatusBar
            barStyle={isDarkTheme ? 'light-content' : 'dark-content'}
            backgroundColor={currentTheme.background}
          />

          {/* Header */}
          <View style={styles.header}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.themeButton, { borderColor: currentTheme.accent }]}
            accessibilityLabel={isDarkTheme ? t('switchToLight') : t('switchToDark')}
            accessibilityHint={t('toggleThemeHint')}
          >
            <Text style={[styles.themeButtonText, { color: currentTheme.accent }]}>
              {isDarkTheme ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text
              style={[styles.title, { color: currentTheme.primary }]}
              accessibilityRole="header"
            >
              {t('title')}
            </Text>
            <Text
              style={[styles.subtitle, { color: currentTheme.accent }]}
              accessibilityRole="text"
            >
              Every Moment Matters
            </Text>
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => safeSetState(setShowLanguageModal, true)}
              style={[styles.languageButton, { backgroundColor: currentTheme.primary, borderColor: currentTheme.accent }]}
              accessibilityLabel={t('selectLanguage')}
              accessibilityHint={t('selectLanguageHint')}
            >
              <Text style={styles.languageButtonText}>
                {languages.find(lang => lang.code === i18n.language)?.name.slice(0, 2) || 'KO'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('medium');
                safeSetState(setShowSettingsModal, true);
              }}
              style={[styles.settingsButton, { borderColor: currentTheme.accent }]}
              accessibilityLabel={t('settings')}
              accessibilityHint="Open settings"
            >
              <Text style={[styles.settingsButtonText, { color: currentTheme.accent }]}>
                ⚙️
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.text }]}>
              {t('birthDateLabel')}
            </Text>
            <TouchableOpacity
              onPress={() => safeSetState(setShowDatePicker, true)}
              style={[styles.input, styles.inputWithBorder, styles.datePickerButton, { backgroundColor: currentTheme.input, borderColor: currentTheme.accent }]}
              accessibilityLabel={t('birthDateLabel')}
              accessibilityHint={t('selectBirthDateHint')}
            >
              <Text style={[styles.inputText, { color: birthDate ? currentTheme.text : currentTheme.placeholder }]}>
                {birthDate || t('birthDatePlaceholder')}
              </Text>
              <Text style={[styles.calendarIcon, { color: currentTheme.accent }]}>
                📅
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: currentTheme.text }]}>
                {t('lifeExpectancyLabel')}
              </Text>
              {birthDate && (
                <TouchableOpacity
                  onPress={() => {
                    const suggested = calculateSuggestedLifeExpectancy(birthDate);
                    handleLifeExpectancyChange(suggested.toString());
                    triggerHaptic('light');
                  }}
                  style={styles.suggestionButton}
                >
                  <Text style={[styles.suggestionText, { color: currentTheme.accent }]}>
                    {t('suggestedLifeExpectancy', { years: calculateSuggestedLifeExpectancy(birthDate) })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[
                styles.input,
                styles.inputWithBorder,
                {
                  backgroundColor: currentTheme.input,
                  color: currentTheme.text,
                  borderColor: lifeExpectancyError ? '#ff4444' : currentTheme.accent,
                  borderWidth: lifeExpectancyError ? 2 : 1.5,
                },
              ]}
              value={lifeExpectancy}
              onChangeText={handleLifeExpectancyChange}
              placeholder={t('lifeExpectancyPlaceholder')}
              placeholderTextColor={currentTheme.placeholder}
              keyboardType="numeric"
              maxLength={3}
              accessibilityLabel={t('lifeExpectancyLabel')}
              accessibilityHint={t('lifeExpectancyHint')}
            />
            {lifeExpectancyError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{lifeExpectancyError}</Text>
              </View>
            )}
            {isLifeExpectancyValid && lifeExpectancy && birthDate && (
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={[styles.successText, { color: '#4CAF50' }]}>
                  {t('lifeExpectancySuccess', {
                    years: Math.max(0, parseInt(lifeExpectancy) - Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)))
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Time Display */}
        <View style={styles.timeSection}>
          <View style={[styles.timeHeader, { borderBottomColor: currentTheme.accent }]}>
            <Text style={[styles.timeTitle, { color: currentTheme.primary }]}>
              ⏳ {t('timeLeftTitle')}
            </Text>
            <Text style={[styles.philosophicalQuote, { color: currentTheme.accent }]}>
              "{t('timeLeftPhilosophy')}"
            </Text>
          </View>

          <View style={[styles.timeDisplay, { backgroundColor: currentTheme.surface, borderColor: currentTheme.accent }]}>
            <View style={styles.timeRow}>
              <TimeCard
                value={timeLeft.years}
                label={t('years')}
                color={currentTheme.primary}
                backgroundColor={currentTheme.background}
                borderColor={currentTheme.primary}
              />
              <TimeCard
                value={timeLeft.months}
                label={t('months')}
                color={currentTheme.primary}
                backgroundColor={currentTheme.background}
                borderColor={currentTheme.primary}
              />
              <TimeCard
                value={timeLeft.days}
                label={t('days')}
                color={currentTheme.primary}
                backgroundColor={currentTheme.background}
                borderColor={currentTheme.primary}
              />
            </View>
            <View style={styles.timeRow}>
              <TimeCard
                value={timeLeft.hours}
                label={t('hours')}
                color={currentTheme.accent}
                backgroundColor={currentTheme.background}
                borderColor={currentTheme.accent}
              />
              <TimeCard
                value={timeLeft.minutes}
                label={t('minutes')}
                color={currentTheme.accent}
                backgroundColor={currentTheme.background}
                borderColor={currentTheme.accent}
              />
              <TimeCard
                value={timeLeft.seconds}
                label={t('seconds')}
                color={currentTheme.accent}
                backgroundColor={currentTheme.background}
                borderColor={currentTheme.accent}
              />
            </View>
          </View>
        </View>

        {/* Timezone Change Notification */}
        {timezoneChangedNotification && (
          <View style={[styles.notification, styles.timezoneNotification, { backgroundColor: currentTheme.accent, borderColor: currentTheme.primary }]}>
            <Text style={[styles.notificationText, { color: '#fff' }]}>
              {t('timezoneChanged')}
            </Text>
          </View>
        )}

        {/* Background Sync Notification */}
        {syncNotification && (
          <View style={[styles.notification, styles.syncNotification, { backgroundColor: currentTheme.primary, borderColor: currentTheme.accent }]}>
            <Text style={[styles.notificationText, { color: '#fff' }]}>
              {syncNotification}
            </Text>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.buttonContainer}>
          {!isActive ? (
            <TouchableOpacity
              style={[styles.button, styles.startButton, { backgroundColor: currentTheme.primary, borderColor: currentTheme.accent }]}
              onPress={handleStart}
              accessibilityLabel={t('startButton')}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, styles.startButtonText]}>
                ▶️ {t('startButton')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.stopButton, { backgroundColor: currentTheme.accent, borderColor: currentTheme.primary }]}
              onPress={handleStop}
              accessibilityLabel={t('stopButton')}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, styles.stopButtonText]}>
                ⏸️ {t('stopButton')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Language Modal */}
        <Modal
          visible={showLanguageModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => safeSetState(setShowLanguageModal, false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: currentTheme.background }]}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {t('selectLanguage')}
              </Text>
              <FlatList
                data={languages}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.languageItem, { backgroundColor: currentTheme.input }]}
                    onPress={() => handleLanguageChange(item.code)}
                  >
                    <Text style={[styles.languageItemText, { color: currentTheme.text }]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: currentTheme.primary }]}
                onPress={() => safeSetState(setShowLanguageModal, false)}
                accessibilityLabel={t('close')}
                accessibilityHint={t('closeModalHint')}
              >
                <Text style={styles.closeButtonText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Settings Modal */}
        <Settings
          visible={showSettingsModal}
          onClose={() => safeSetState(setShowSettingsModal, false)}
          currentTheme={currentTheme}
          isDarkTheme={isDarkTheme}
          onThemeToggle={toggleTheme}
          onLanguagePress={() => {
            safeSetState(setShowSettingsModal, false);
            safeSetState(setShowLanguageModal, true);
          }}
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: 30,
    paddingHorizontal: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: 20,
  },
  settingsButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: typography.displayLarge,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: typography.labelSmall,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
  languageButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButtonText: {
    color: '#fff',
    fontWeight: typography.weight.semiBold,
    fontSize: typography.labelSmall,
  },
  inputSection: {
    marginBottom: spacing.xl,
    paddingHorizontal: 10,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: typography.headlineMedium,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.5,
  },
  suggestionButton: {
    padding: 4,
  },
  suggestionText: {
    fontSize: typography.bodyMedium,
    fontWeight: typography.weight.semiBold,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
  },
  errorIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: typography.bodyMedium,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
  },
  successIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  successText: {
    fontSize: typography.bodyMedium,
    flex: 1,
  },
  input: {
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.headlineMedium,
    minHeight: 56,
    justifyContent: 'center',
  },
  inputWithBorder: {
    borderWidth: 1.5,
  },
  inputText: {
    fontSize: typography.headlineMedium,
    fontWeight: typography.weight.regular,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  timeSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: 10,
  },
  timeHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    width: '100%',
  },
  timeTitle: {
    fontSize: typography.displayMedium,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  philosophicalQuote: {
    fontSize: typography.bodyMedium,
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  timeDisplay: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    width: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeCard: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeValue: {
    fontSize: typography.displayMedium,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontSize: typography.labelSmall,
    marginTop: 6,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    borderWidth: 2,
    minWidth: 160,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startButton: {
    // Additional styling for start button
  },
  stopButton: {
    // Additional styling for stop button
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.headlineMedium,
    fontWeight: typography.weight.semiBold,
    letterSpacing: 0.5,
  },
  startButtonText: {
    // Additional styling for start button text
  },
  stopButtonText: {
    // Additional styling for stop button text
  },
  loadingText: {
    marginTop: 10,
    fontSize: typography.headlineMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 10,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: typography.headlineLarge,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  languageItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
  },
  languageItemText: {
    fontSize: typography.headlineMedium,
    textAlign: 'center',
  },
  closeButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: typography.headlineMedium,
    fontWeight: typography.weight.bold,
  },
  notification: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  timezoneNotification: {
    top: 100,
  },
  syncNotification: {
    top: 160,
  },
  notificationText: {
    fontSize: typography.bodyMedium,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

export default App;