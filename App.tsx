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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { darkTheme, lightTheme, Theme, typography, spacing } from './themes';
import ErrorBoundary from './ErrorBoundary';
import { storageManager } from './StorageManager';
import SecurityAuditor from './SecurityAuditor';
import Onboarding from './Onboarding';
import NotificationService from './NotificationService';
import Settings from './Settings';
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

  // 시간 계산
  const calculateTimeLeft = useCallback(() => {
    if (!birthDate || !lifeExpectancy) return;

    try {
      const security = SecurityAuditor.getInstance();
      const birthValidation = security.validateBirthDate(birthDate);
      const lifeValidation = security.validateLifeExpectancy(parseInt(lifeExpectancy, 10));

      if (!birthValidation.isValid || !lifeValidation.isValid) {
        return;
      }

      const birth = new Date(birthDate + 'T00:00:00');
      const expectedDeath = new Date(birth);
      expectedDeath.setFullYear(birth.getFullYear() + parseInt(lifeExpectancy, 10));

      const now = new Date();
      const difference = expectedDeath.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

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

  useEffect(() => {
    loadSavedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                {nickname}님
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(true)}
                style={styles.headerIcon}
              >
                <Text style={styles.iconText}>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(true)}
                style={styles.headerIcon}
              >
                <Text style={styles.iconText}>🌐</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 메인 카드 - 토스 스타일 큰 카드 */}
          <View style={[styles.mainCard, { backgroundColor: currentTheme.cardBackground }]}>
            <Text style={[styles.cardTitle, { color: currentTheme.secondaryText }]}>
              남은 시간
            </Text>

            {/* 핵심 숫자 - 토스처럼 크게 */}
            <Text style={[styles.mainNumber, { color: currentTheme.text }]}>
              {timeLeft.years}년 {timeLeft.months}개월 {timeLeft.days}일
            </Text>

            {/* 구분선 */}
            <View style={[styles.divider, { backgroundColor: currentTheme.border }]} />

            {/* 부가 정보 - 토스처럼 작게 */}
            <View style={styles.subInfo}>
              <Text style={[styles.subInfoText, { color: currentTheme.secondaryText }]}>
                {(timeLeft.years * 365 + timeLeft.months * 30 + timeLeft.days).toLocaleString()}일
              </Text>
              <Text style={[styles.subInfoDot, { color: currentTheme.placeholder }]}>•</Text>
              <Text style={[styles.subInfoText, { color: currentTheme.secondaryText }]}>
                {((timeLeft.years * 365 + timeLeft.months * 30 + timeLeft.days) * 24 + timeLeft.hours).toLocaleString()}시간
              </Text>
            </View>

            {/* 실시간 업데이트 표시 */}
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, { backgroundColor: currentTheme.primary }]} />
              <Text style={[styles.liveText, { color: currentTheme.secondaryText }]}>
                {timeLeft.hours.toString().padStart(2, '0')}:
                {timeLeft.minutes.toString().padStart(2, '0')}:
                {timeLeft.seconds.toString().padStart(2, '0')}
              </Text>
            </View>
          </View>

          {/* 부가 카드 - 통계 (미래 기능 대비) */}
          <View style={[styles.statsCard, { backgroundColor: currentTheme.cardBackground }]}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: currentTheme.secondaryText }]}>
                생년월일
              </Text>
              <Text style={[styles.statValue, { color: currentTheme.text }]}>
                {birthDate}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: currentTheme.secondaryText }]}>
                기대수명
              </Text>
              <Text style={[styles.statValue, { color: currentTheme.text }]}>
                {lifeExpectancy}세
              </Text>
            </View>
          </View>
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
    fontSize: 20,
    fontWeight: '700',
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
    fontSize: 22,
  },
  // 메인 카드 - 토스 스타일
  mainCard: {
    marginHorizontal: 24,
    marginTop: 8,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  mainNumber: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subInfoText: {
    fontSize: 14,
    fontWeight: '400',
  },
  subInfoDot: {
    fontSize: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  // 통계 카드
  statsCard: {
    marginHorizontal: 24,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
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
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  languageItem: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  languageText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default App;
