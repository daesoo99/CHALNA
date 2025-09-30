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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { darkTheme, lightTheme, Theme } from './themes';
import ErrorBoundary from './ErrorBoundary';
import CrashReporter from './CrashReporter';
import { storageManager } from './StorageManager';
import SecurityAuditor from './SecurityAuditor';
import './i18n';

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
    { code: 'ko', name: '한국어' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
  ], []);

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
        const syncMessage = `⏰ ${minutes}분 후 복귀했습니다. 시간을 동기화했습니다.`;
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
          '앱 초기화 중 오류가 발생했습니다. 다시 시도해주세요.',
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

      safeSetState(setTimeLeft, {
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
        seconds: Math.max(0, seconds)
      });
    } catch (error) {
      console.error('Time calculation error:', error);
      CrashReporter.getInstance().reportCrash(error as Error);
    }
  }, [birthDate, lifeExpectancy, safeSetState]);

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

      // Load saved data if available (with safe setState)
      if (savedBirthDate) safeSetState(setBirthDate, savedBirthDate);
      if (savedLifeExpectancy) safeSetState(setLifeExpectancy, savedLifeExpectancy);
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
      const newTheme = !isDarkTheme;
      safeSetState(setIsDarkTheme, newTheme);
      safeSetState(setCurrentTheme, newTheme ? darkTheme : lightTheme);
      await storageManager.set('isDarkTheme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const handleStart = () => {
    if (!birthDate) {
      Alert.alert(t('errorTitle'), t('errorBirthDate'));
      return;
    }

    console.log('🚀 Starting CHALNA timer');
    calculateTimeLeft();
    safeSetState(setIsActive, true);
    safeSetState(setLastCalculationTime, Date.now());
    safeSetState(setIsBackgroundPaused, false);
    saveData();
  };

  const handleStop = () => {
    console.log('🛑 Stopping CHALNA timer');
    safeSetState(setIsActive, false);
    safeSetState(setIsBackgroundPaused, false);
    saveData();
  };

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

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
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
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.text }]}>
              {t('birthDateLabel')}
            </Text>
            <TouchableOpacity
              onPress={() => safeSetState(setShowDatePicker, true)}
              style={[styles.input, styles.inputWithBorder, { backgroundColor: currentTheme.input, borderColor: currentTheme.accent }]}
              accessibilityLabel={t('birthDateLabel')}
              accessibilityHint={t('selectBirthDateHint')}
            >
              <Text style={[styles.inputText, { color: birthDate ? currentTheme.text : currentTheme.placeholder }]}>
                {birthDate || t('birthDatePlaceholder')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: currentTheme.text }]}>
              {t('lifeExpectancyLabel')}
            </Text>
            <TextInput
              style={[styles.input, styles.inputWithBorder, { backgroundColor: currentTheme.input, color: currentTheme.text, borderColor: currentTheme.accent }]}
              value={lifeExpectancy}
              onChangeText={setLifeExpectancy}
              placeholder={t('lifeExpectancyPlaceholder')}
              placeholderTextColor={currentTheme.placeholder}
              keyboardType="numeric"
              accessibilityLabel={t('lifeExpectancyLabel')}
              accessibilityHint={t('lifeExpectancyHint')}
            />
          </View>
        </View>

        {/* Time Display */}
        <View style={styles.timeSection}>
          <View style={[styles.timeHeader, { borderBottomColor: currentTheme.accent }]}>
            <Text style={[styles.timeTitle, { color: currentTheme.primary }]}>
              ⏳ {t('timeLeftTitle')}
            </Text>
            <Text style={[styles.philosophicalQuote, { color: currentTheme.accent }]}>
              "찰나의 소중함을 느끼세요"
            </Text>
          </View>

          <View style={[styles.timeDisplay, { backgroundColor: currentTheme.surface, borderColor: currentTheme.accent }]}>
            <View style={styles.timeRow}>
              <View
                style={[styles.timeCard, { backgroundColor: currentTheme.background, borderColor: currentTheme.primary }]}
                accessibilityLabel={`${timeLeft.years} ${t('years')}`}
                accessibilityRole="text"
              >
                <Text style={[styles.timeValue, { color: currentTheme.primary }]}>
                  {timeLeft.years}
                </Text>
                <Text style={[styles.timeLabel, { color: currentTheme.text }]}>
                  {t('years')}
                </Text>
              </View>
              <View
                style={[styles.timeCard, { backgroundColor: currentTheme.background, borderColor: currentTheme.primary }]}
                accessibilityLabel={`${timeLeft.months} ${t('months')}`}
                accessibilityRole="text"
              >
                <Text style={[styles.timeValue, { color: currentTheme.primary }]}>
                  {timeLeft.months}
                </Text>
                <Text style={[styles.timeLabel, { color: currentTheme.text }]}>
                  {t('months')}
                </Text>
              </View>
              <View
                style={[styles.timeCard, { backgroundColor: currentTheme.background, borderColor: currentTheme.primary }]}
                accessibilityLabel={`${timeLeft.days} ${t('days')}`}
                accessibilityRole="text"
              >
                <Text style={[styles.timeValue, { color: currentTheme.primary }]}>
                  {timeLeft.days}
                </Text>
                <Text style={[styles.timeLabel, { color: currentTheme.text }]}>
                  {t('days')}
                </Text>
              </View>
            </View>
            <View style={styles.timeRow}>
              <View
                style={[styles.timeCard, { backgroundColor: currentTheme.background, borderColor: currentTheme.accent }]}
                accessibilityLabel={`${timeLeft.hours} ${t('hours')}`}
                accessibilityRole="text"
              >
                <Text style={[styles.timeValue, { color: currentTheme.accent }]}>
                  {timeLeft.hours}
                </Text>
                <Text style={[styles.timeLabel, { color: currentTheme.text }]}>
                  {t('hours')}
                </Text>
              </View>
              <View
                style={[styles.timeCard, { backgroundColor: currentTheme.background, borderColor: currentTheme.accent }]}
                accessibilityLabel={`${timeLeft.minutes} ${t('minutes')}`}
                accessibilityRole="text"
              >
                <Text style={[styles.timeValue, { color: currentTheme.accent }]}>
                  {timeLeft.minutes}
                </Text>
                <Text style={[styles.timeLabel, { color: currentTheme.text }]}>
                  {t('minutes')}
                </Text>
              </View>
              <View
                style={[styles.timeCard, { backgroundColor: currentTheme.background, borderColor: currentTheme.accent }]}
                accessibilityLabel={`${timeLeft.seconds} ${t('seconds')}`}
                accessibilityRole="text"
              >
                <Text style={[styles.timeValue, { color: currentTheme.accent }]}>
                  {timeLeft.seconds}
                </Text>
                <Text style={[styles.timeLabel, { color: currentTheme.text }]}>
                  {t('seconds')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Timezone Change Notification */}
        {timezoneChangedNotification && (
          <View style={[styles.notification, styles.timezoneNotification, { backgroundColor: currentTheme.accent, borderColor: currentTheme.primary }]}>
            <Text style={[styles.notificationText, { color: '#fff' }]}>
              ⏳ 시간대가 변경되었습니다. 시간을 다시 계산했습니다.
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
              >
                <Text style={styles.closeButtonText}>닫기</Text>
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
      </View>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 30,
    paddingHorizontal: 10,
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
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
    fontWeight: '600',
    fontSize: 12,
  },
  inputSection: {
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  inputWithBorder: {
    borderWidth: 1.5,
  },
  inputText: {
    fontSize: 16,
    fontWeight: '400',
  },
  timeSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  timeHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    width: '100%',
  },
  timeTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  philosophicalQuote: {
    fontSize: 14,
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
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
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
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
  },
  languageItemText: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

export default App;