import React, { useState, useEffect, memo, useCallback } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { darkTheme, lightTheme, Theme, typography, spacing } from './themes';
import ErrorBoundary from './ErrorBoundary';
import { storageManager } from './StorageManager';
import SecurityAuditor from './SecurityAuditor';
import Onboarding from './Onboarding';
import NotificationService from './NotificationService';
import Settings from './Settings';
import HourglassIcon from './components/HourglassIcon';
import './i18n';

// TimeCard 컴포넌트: 시간 표시 카드
interface TimeCardProps {
  value: number;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

const TimeCard = memo<TimeCardProps>(({ value, label, color, backgroundColor, borderColor }) => (
  <View
    style={[styles.timeCard, { backgroundColor, borderColor }]}
    accessibilityLabel={`${value} ${label}`}
  >
    <Text style={[styles.timeValue, { color }]}>{value}</Text>
    <Text style={[styles.timeLabel, { color: '#888' }]}>{label}</Text>
  </View>
));

TimeCard.displayName = 'TimeCard';

const App = memo(() => {
  const { t, i18n } = useTranslation();

  // 핵심 상태만 유지
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
  const [isActive, setIsActive] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<Theme>(darkTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const languages = [
    { code: 'ko', name: t('languageKorean') },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
  ];

  // 단순화된 시간 계산
  const calculateTimeLeft = useCallback(() => {
    if (!birthDate || !lifeExpectancy) return;

    try {
      // 기본 검증
      const security = SecurityAuditor.getInstance();
      const birthValidation = security.validateBirthDate(birthDate);
      const lifeValidation = security.validateLifeExpectancy(parseInt(lifeExpectancy, 10));

      if (!birthValidation.isValid || !lifeValidation.isValid) {
        return;
      }

      // 시간 계산 (단순화)
      const birth = new Date(birthDate + 'T00:00:00');
      const expectedDeath = new Date(birth);
      expectedDeath.setFullYear(birth.getFullYear() + parseInt(lifeExpectancy, 10));

      const now = new Date();
      const difference = expectedDeath.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      // 년/월/일/시/분/초 계산
      let years = expectedDeath.getFullYear() - now.getFullYear();
      let months = expectedDeath.getMonth() - now.getMonth();

      if (months < 0) {
        years--;
        months += 12;
      }

      if (expectedDeath.getDate() < now.getDate()) {
        months--;
        if (months < 0) {
          years--;
          months += 12;
        }
      }

      const tempDate = new Date(now);
      tempDate.setFullYear(tempDate.getFullYear() + years);
      tempDate.setMonth(tempDate.getMonth() + months);

      const remainingMs = expectedDeath.getTime() - tempDate.getTime();
      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      setTimeLeft({
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
        seconds: Math.max(0, seconds)
      });
    } catch (error) {
      console.error('Time calculation error:', error);
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
      console.error('Failed to load data:', error);
      setIsLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadSavedData();
  }, []);

  // 타이머 실행
  useEffect(() => {
    if (!isActive || !birthDate) return;

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [isActive, birthDate, calculateTimeLeft]);

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
    setIsActive(true);

    await Promise.all([
      storageManager.set('nickname', data.nickname),
      storageManager.set('birthDate', data.birthDate),
      storageManager.set('lifeExpectancy', data.lifeExpectancy),
      storageManager.set('onboardingComplete', 'true'),
    ]);

    // 알림 서비스 시작
    try {
      await NotificationService.requestPermissions();
      NotificationService.startNotificationService(data.birthDate, parseInt(data.lifeExpectancy, 10));
    } catch (error) {
      console.error('Failed to start notification service:', error);
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
            setIsActive(false);
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
          currentLanguage={i18n.language}
          onLanguageChange={handleLanguageSelect}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <StatusBar
          barStyle={isDarkTheme ? 'light-content' : 'dark-content'}
          backgroundColor={currentTheme.background}
        />

        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowLanguageModal(true)}
            style={styles.iconButton}
            accessibilityLabel={t('selectLanguage')}
          >
            <Text style={[styles.icon, { color: currentTheme.text }]}>🌐</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleThemeToggle}
            style={styles.iconButton}
            accessibilityLabel={t('toggleTheme')}
          >
            <Text style={styles.icon}>{isDarkTheme ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowSettingsModal(true)}
            style={styles.iconButton}
            accessibilityLabel={t('settings')}
          >
            <Text style={[styles.icon, { color: currentTheme.text }]}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 타이틀 */}
          <View style={styles.titleContainer}>
            <HourglassIcon color={currentTheme.accent} size={48} />
            <Text style={[styles.title, { color: currentTheme.text }]}>
              {t('title')}
            </Text>
            <Text style={[styles.subtitle, { color: currentTheme.secondaryText }]}>
              {t('subtitle')}
            </Text>
          </View>

          {/* 닉네임 */}
          {nickname && (
            <Text style={[styles.greeting, { color: currentTheme.text }]}>
              {t('greeting', { name: nickname })}
            </Text>
          )}

          {/* 타이머 */}
          <View style={styles.timerContainer}>
            <View style={styles.timeRow}>
              <TimeCard
                value={timeLeft.years}
                label={t('years')}
                color={currentTheme.accent}
                backgroundColor={currentTheme.cardBackground}
                borderColor={currentTheme.accent}
              />
              <TimeCard
                value={timeLeft.months}
                label={t('months')}
                color={currentTheme.accent}
                backgroundColor={currentTheme.cardBackground}
                borderColor={currentTheme.accent}
              />
              <TimeCard
                value={timeLeft.days}
                label={t('days')}
                color={currentTheme.accent}
                backgroundColor={currentTheme.cardBackground}
                borderColor={currentTheme.accent}
              />
            </View>

            <View style={styles.timeRow}>
              <TimeCard
                value={timeLeft.hours}
                label={t('hours')}
                color={currentTheme.secondaryAccent}
                backgroundColor={currentTheme.cardBackground}
                borderColor={currentTheme.secondaryAccent}
              />
              <TimeCard
                value={timeLeft.minutes}
                label={t('minutes')}
                color={currentTheme.secondaryAccent}
                backgroundColor={currentTheme.cardBackground}
                borderColor={currentTheme.secondaryAccent}
              />
              <TimeCard
                value={timeLeft.seconds}
                label={t('seconds')}
                color={currentTheme.secondaryAccent}
                backgroundColor={currentTheme.cardBackground}
                borderColor={currentTheme.secondaryAccent}
              />
            </View>
          </View>

          {/* 일시정지/시작 버튼 */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              {
                backgroundColor: isActive ? currentTheme.error : currentTheme.success,
              },
            ]}
            onPress={() => setIsActive(!isActive)}
            activeOpacity={0.7}
          >
            <Text style={styles.controlButtonText}>
              {isActive ? t('pause') : t('resume')}
            </Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xl + 20 : spacing.xl,
    paddingBottom: spacing.md,
  },
  iconButton: {
    padding: spacing.sm,
    marginLeft: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.subtitle,
    marginTop: spacing.xs,
  },
  greeting: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  timerContainer: {
    marginBottom: spacing.xl,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  timeCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  timeValue: {
    ...typography.number,
    marginBottom: spacing.xs,
  },
  timeLabel: {
    ...typography.caption,
  },
  controlButton: {
    borderRadius: 25,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  controlButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
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
    ...typography.subtitle,
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
    textAlign: 'center',
  },
});

export default App;
