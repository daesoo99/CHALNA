import React, { useState, useEffect, memo, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { darkTheme, lightTheme, Theme, typography, spacing } from './themes';
import ErrorBoundary from './ErrorBoundary';
import { storageManager } from './StorageManager';
import SecurityAuditor from './SecurityAuditor';
import Onboarding from './Onboarding';
import NotificationService from './NotificationService';
import Settings from './Settings';
import { calculateTimeLeft, calculateTotalDays, calculateTotalHours } from './utils/timeCalculator';
import TimeDisplay from './components/TimeDisplay';
import './i18n';

const App = memo(() => {
  const { t, i18n } = useTranslation();

  // 핵심 상태
  const [nickname, setNickname] = useState('');
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
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<Theme>(darkTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Live dot 펄스 애니메이션
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 성능 최적화: 비용이 큰 계산 메모이제이션
  const totalDays = useMemo(() => {
    if (!birthDate || !lifeExpectancy) return 0;
    return calculateTotalDays(birthDate, lifeExpectancy);
  }, [birthDate, lifeExpectancy]);

  const totalHours = useMemo(() => {
    if (!birthDate || !lifeExpectancy) return 0;
    return calculateTotalHours(birthDate, lifeExpectancy);
  }, [birthDate, lifeExpectancy]);

  const languages = [
    { code: 'ko', name: t('languageKorean') },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
  ];

  // 시간 계산
  const updateTimeLeft = useCallback(() => {
    if (!birthDate || !lifeExpectancy) return;

    try {
      const security = SecurityAuditor.getInstance();
      const birthValidation = security.validateBirthDate(birthDate);
      const lifeValidation = security.validateLifeExpectancy(parseInt(lifeExpectancy, 10));

      if (!birthValidation.isValid || !lifeValidation.isValid) {
        return;
      }

      const result = calculateTimeLeft(birthDate, lifeExpectancy);
      setTimeLeft(result);
    } catch (error) {
      // 에러 발생 시 초기화 (잘못된 데이터 처리)
      setTimeLeft({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
    }
  }, [birthDate, lifeExpectancy]);

  // 데이터 로드
  const loadSavedData = async () => {
    try {
      const [savedNickname, savedBirthDate, savedLifeExpectancy, savedLanguage, savedTheme, savedOnboarding] =
        await Promise.all([
          storageManager.get('nickname'),
          storageManager.get('birthDate'),
          storageManager.get('lifeExpectancy'),
          storageManager.get('language'),
          storageManager.get('isDarkTheme'),
          storageManager.get('onboardingComplete'),
        ]);

      if (savedNickname) setNickname(savedNickname);
      if (savedBirthDate) setBirthDate(savedBirthDate);
      if (savedLifeExpectancy) setLifeExpectancy(savedLifeExpectancy);
      if (savedLanguage) i18n.changeLanguage(savedLanguage);
      if (savedTheme !== null) {
        const isDark = savedTheme === 'true';
        setIsDarkTheme(isDark);
        setCurrentTheme(isDark ? darkTheme : lightTheme);
      }
      if (savedOnboarding === 'true') setOnboardingComplete(true);

      setIsLoading(false);
    } catch (error) {
      // 로드 실패 시에도 앱 시작 (초기 상태로)
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSavedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!birthDate) return;

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [birthDate, updateTimeLeft]);

  // Live dot 펄스 애니메이션 효과
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      pulse.stop();
      pulseAnim.stopAnimation(); // 메모리 누수 방지
    };
    // pulseAnim은 useRef로 생성되어 변하지 않으므로 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 앱 백그라운드 복귀 시 상태 복원 (리로딩 방지)
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          // 포그라운드 복귀 시 시간만 업데이트 (전체 리로드 없음)
          updateTimeLeft();
        }
      }
    );

    return () => {
      appStateSubscription.remove();
    };
  }, [updateTimeLeft]);

  // 언어 변경
  const handleLanguageSelect = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode);
    await storageManager.set('language', languageCode);
    setShowLanguageModal(false);
  };

  // 테마 토글
  const handleThemeToggle = async () => {
    const newIsDark = !isDarkTheme;
    setIsDarkTheme(newIsDark);
    setCurrentTheme(newIsDark ? darkTheme : lightTheme);
    await storageManager.set('isDarkTheme', newIsDark.toString());
  };

  // 온보딩 완료
  const handleOnboardingComplete = async (data: {
    nickname: string;
    birthDate: string;
    lifeExpectancy: string;
  }) => {
    setNickname(data.nickname);
    setBirthDate(data.birthDate);
    setLifeExpectancy(data.lifeExpectancy);
    setOnboardingComplete(true);

    await Promise.all([
      storageManager.set('nickname', data.nickname),
      storageManager.set('birthDate', data.birthDate),
      storageManager.set('lifeExpectancy', data.lifeExpectancy),
      storageManager.set('onboardingComplete', 'true'),
    ]);

    try {
      await NotificationService.requestPermissions();
      NotificationService.startNotificationService(data.birthDate, parseInt(data.lifeExpectancy, 10));
    } catch (error) {
      // 알림 권한 실패는 앱 사용에 영향 없음
    }
  };

  // 설정 업데이트
  const handleSettingsUpdate = async (updatedData: {
    nickname: string;
    birthDate: string;
    lifeExpectancy: string;
  }) => {
    setNickname(updatedData.nickname);
    setBirthDate(updatedData.birthDate);
    setLifeExpectancy(updatedData.lifeExpectancy);

    await Promise.all([
      storageManager.set('nickname', updatedData.nickname),
      storageManager.set('birthDate', updatedData.birthDate),
      storageManager.set('lifeExpectancy', updatedData.lifeExpectancy),
    ]);

    NotificationService.startNotificationService(
      updatedData.birthDate,
      parseInt(updatedData.lifeExpectancy, 10)
    );
  };

  // 리셋
  const handleReset = async () => {
    Alert.alert(
      t('resetConfirmTitle'),
      t('resetConfirmMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: async () => {
            await storageManager.clear();
            NotificationService.cancelAllNotifications();
            setOnboardingComplete(false);
            setNickname('');
            setBirthDate('');
            setLifeExpectancy('80');
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.accent} />
      </View>
    );
  }

  if (!onboardingComplete) {
    return (
      <ErrorBoundary>
        <Onboarding
          onComplete={handleOnboardingComplete}
          theme={currentTheme}
        />
      </ErrorBoundary>
    );
  }

  // 토스 스타일 메인 화면
  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <StatusBar
          barStyle={isDarkTheme ? 'light-content' : 'dark-content'}
          backgroundColor={currentTheme.background}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 - 토스 스타일 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.nicknameText, { color: currentTheme.text }]}>
                {t('headerGreeting', { name: nickname || t('yourTime') })}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(true)}
                style={styles.headerIcon}
                accessibilityLabel={t('settings')}
                accessibilityHint="Open settings menu"
                accessibilityRole="button"
              >
                <Text style={styles.iconText}>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(true)}
                style={styles.headerIcon}
                accessibilityLabel={t('selectLanguage')}
                accessibilityHint="Change language"
                accessibilityRole="button"
              >
                <Text style={styles.iconText}>🌐</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 메인 카드 - 토스 스타일 큰 카드 */}
          <TimeDisplay
            timeLeft={timeLeft}
            totalDays={totalDays}
            totalHours={totalHours}
            theme={currentTheme}
            pulseAnim={pulseAnim}
            birthDate={birthDate}
            lifeExpectancy={lifeExpectancy}
          />
        </ScrollView>

        {/* 언어 선택 모달 */}
        <Modal
          visible={showLanguageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowLanguageModal(false)}
          >
            <View
              style={[styles.modalContent, { backgroundColor: currentTheme.cardBackground }]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                {t('selectLanguage')}
              </Text>
              <FlatList
                data={languages}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.languageItem,
                      i18n.language === item.code && {
                        backgroundColor: currentTheme.accent + '20',
                      },
                    ]}
                    onPress={() => handleLanguageSelect(item.code)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.languageText,
                        {
                          color:
                            i18n.language === item.code
                              ? currentTheme.accent
                              : currentTheme.text,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 설정 모달 */}
        <Modal
          visible={showSettingsModal}
          animationType="slide"
          onRequestClose={() => setShowSettingsModal(false)}
        >
          <Settings
            nickname={nickname}
            birthDate={birthDate}
            lifeExpectancy={lifeExpectancy}
            isDarkTheme={isDarkTheme}
            currentLanguage={i18n.language}
            onClose={() => setShowSettingsModal(false)}
            onUpdate={handleSettingsUpdate}
            onThemeToggle={handleThemeToggle}
            onLanguageChange={handleLanguageSelect}
            onReset={handleReset}
          />
        </Modal>
      </View>
    </ErrorBoundary>
  );
});

App.displayName = 'App';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  // 헤더 - 토스 스타일
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nicknameText: {
    fontSize: typography.headlineLarge,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIcon: {
    padding: 8,
  },
  iconText: {
    fontSize: 22, // Icon size, not from typography system
  },
  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.title,
    fontSize: 18,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  languageItem: {
    padding: spacing.md,
    borderRadius: 8,
    marginVertical: spacing.xs,
  },
  languageText: {
    ...typography.body,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
});

export default App;
