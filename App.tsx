import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, Theme } from './themes';
import NotificationService from './NotificationService';
import ErrorBoundary from './ErrorBoundary';
import Analytics from './Analytics';
import DataExport from './DataExport';
import SleepMode from './SleepMode';
import MilestoneManager from './MilestoneManager';
import CrashReporter from './CrashReporter';
import HapticFeedback from 'react-native-haptic-feedback';
import './i18n';

const App = memo(() => {
  const { t, i18n } = useTranslation();
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
  const [showNotification, setShowNotification] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  const [isSleeping, setIsSleeping] = useState(false);
  const [sleepModeEnabled, setSleepModeEnabled] = useState(false);
  const [testModeEnabled, setTestModeEnabled] = useState(false);

  const languages = [
    { code: 'ko', name: '한국어' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && birthDate && !isSleeping) {
      interval = setInterval(() => {
        calculateTimeLeft();
      }, 1000);
    } else if ((!isActive || isSleeping) && interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, birthDate, lifeExpectancy, calculateTimeLeft, isSleeping]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize crash reporter first
        const crashReporter = CrashReporter.getInstance();
        crashReporter.setupGlobalErrorHandler();

        await Promise.all([
          loadTheme(),
          loadSavedData(),
          NotificationService.requestPermissions(),
          Analytics.initializeSession()
        ]);
      } catch (error) {
        console.log('Error initializing app:', error);
        const crashReporter = CrashReporter.getInstance();
        crashReporter.reportCrash(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
    checkSleepMode(); // Initial sleep mode check
  }, [checkSleepMode]);

  useEffect(() => {
    setCurrentTheme(isDarkTheme ? darkTheme : lightTheme);
  }, [isDarkTheme]);

  useEffect(() => {
    if (isActive && showNotification && birthDate) {
      NotificationService.updateNotification(timeLeft, t);
    } else {
      NotificationService.cancelNotification();
    }
  }, [timeLeft, showNotification, isActive, birthDate, t]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        if (isActive) {
          calculateTimeLeft();
        }
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [appState, isActive, calculateTimeLeft]);

  useEffect(() => {
    // Check sleep mode every minute
    const sleepCheckInterval = setInterval(checkSleepMode, 60000);

    return () => {
      clearInterval(sleepCheckInterval);
      Analytics.trackSessionEnd();
    };
  }, [checkSleepMode]);

  useEffect(() => {
    const loadSettings = async () => {
      const sleepSettings = await SleepMode.getSettings();
      setSleepModeEnabled(sleepSettings.enabled);

      const milestoneSettings = await MilestoneManager.getSettings();
      setTestModeEnabled(milestoneSettings.testMode);
    };

    loadSettings();
  }, []);

  const checkSleepMode = useCallback(async () => {
    const shouldPause = await SleepMode.shouldPauseTimer();
    setIsSleeping(shouldPause);
  }, []);

  const toggleSleepMode = async () => {
    const newState = !sleepModeEnabled;
    setSleepModeEnabled(newState);
    await SleepMode.updateSetting('enabled', newState);
    await checkSleepMode();
  };

  const toggleTestMode = async () => {
    const newState = await MilestoneManager.toggleTestMode();
    setTestModeEnabled(newState);

    // Reset milestones for the new mode
    await MilestoneManager.resetMilestones();

    // Show informative alert
    Alert.alert(
      testModeEnabled ? t('testModeOff') : t('testModeOn'),
      testModeEnabled
        ? t('testModeOffMessage')
        : t('testModeOnMessage'),
      [{ text: t('acknowledge'), style: 'default' }]
    );
  };

  const expectedDeathDate = useMemo(() => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const expectedLifeYears = parseInt(lifeExpectancy, 10);

    // Handle leap year birthdays (Feb 29)
    let targetYear = birth.getFullYear() + expectedLifeYears;
    let targetMonth = birth.getMonth();
    let targetDate = birth.getDate();

    // If birthday is Feb 29 and target year is not leap year, use Feb 28
    if (targetMonth === 1 && targetDate === 29) {
      const isTargetLeapYear = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
      if (!isTargetLeapYear) {
        targetDate = 28;
      }
    }

    return new Date(targetYear, targetMonth, targetDate);
  }, [birthDate, lifeExpectancy]);

  // Override death date for test mode - set to 5 minutes from now
  const testDeathDate = useMemo(() => {
    if (testModeEnabled) {
      const now = new Date();
      return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    }
    return null;
  }, [testModeEnabled]);

  const finalDeathDate = testModeEnabled && testDeathDate ? testDeathDate : expectedDeathDate;

  const lifeProgress = useMemo(() => {
    if (!birthDate || !expectedDeathDate) return 0;

    const birth = new Date(birthDate);
    const now = new Date();
    const totalLife = expectedDeathDate.getTime() - birth.getTime();
    const lived = now.getTime() - birth.getTime();

    return Math.min(Math.max((lived / totalLife) * 100, 0), 100);
  }, [birthDate, expectedDeathDate]);

  const calculateTimeLeft = useCallback(() => {
    if (!birthDate || !finalDeathDate) return;

    const now = new Date();

    if (finalDeathDate <= now) {
      setTimeLeft({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
      Alert.alert(t('timeOverTitle'), t('timeOverMessage'));
      setIsActive(false);
      return;
    }

    // Check milestones before calculating time
    MilestoneManager.checkMilestones(t);

    // Use a more reliable calculation method
    let years = finalDeathDate.getFullYear() - now.getFullYear();
    let months = finalDeathDate.getMonth() - now.getMonth();
    let days = finalDeathDate.getDate() - now.getDate();

    // Adjust if day is negative
    if (days < 0) {
      months--;
      // Get days in previous month
      const prevMonth = new Date(expectedDeathDate.getFullYear(), expectedDeathDate.getMonth(), 0);
      days += prevMonth.getDate();
    }

    // Adjust if month is negative
    if (months < 0) {
      years--;
      months += 12;
    }

    // Calculate remaining time for hours, minutes, seconds
    const todayAtTargetTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      finalDeathDate.getHours(),
      finalDeathDate.getMinutes(),
      finalDeathDate.getSeconds()
    );

    const remainingMillis = finalDeathDate.getTime() - now.getTime();
    const remainingToday = todayAtTargetTime.getTime() - now.getTime();

    let hours = Math.floor((remainingToday % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutes = Math.floor((remainingToday % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((remainingToday % (1000 * 60)) / 1000);

    // If target time has passed today, adjust for tomorrow
    if (remainingToday < 0) {
      hours = 24 + hours;
      minutes = Math.floor((remainingMillis % (1000 * 60 * 60)) / (1000 * 60));
      seconds = Math.floor((remainingMillis % (1000 * 60)) / 1000);
    }

    // Ensure non-negative values
    setTimeLeft({
      years: Math.max(0, years),
      months: Math.max(0, months),
      days: Math.max(0, days),
      hours: Math.max(0, hours),
      minutes: Math.max(0, minutes),
      seconds: Math.max(0, seconds)
    });
  }, [birthDate, finalDeathDate, t, expectedDeathDate]);

  const startClock = async () => {
    HapticFeedback.trigger('impactMedium');

    if (!birthDate) {
      Alert.alert(t('errorTitle'), t('errorBirthDate'));
      return;
    }

    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
      Alert.alert(t('errorTitle'), t('errorDateFormat'));
      return;
    }

    const now = new Date();
    if (birth > now) {
      Alert.alert(t('errorTitle'), t('errorFutureDate'));
      return;
    }

    const age = now.getFullYear() - birth.getFullYear();
    if (age > 150) {
      Alert.alert(t('errorTitle'), t('errorTooOld'));
      return;
    }

    const expectedLifeYears = parseInt(lifeExpectancy, 10);
    if (isNaN(expectedLifeYears) || expectedLifeYears < 1 || expectedLifeYears > 150) {
      Alert.alert(t('errorTitle'), t('errorLifeExpectancyRange'));
      return;
    }
    if (expectedLifeYears < age) {
      Alert.alert(t('errorTitle'), t('errorLifeExpectancy'));
      return;
    }

    await saveData();
    await Analytics.trackTimerStart(expectedLifeYears);
    await MilestoneManager.trackTimerStart(); // Track timer start for milestones
    setIsActive(true);
    calculateTimeLeft();
  };

  const stopClock = () => {
    HapticFeedback.trigger('impactLight');
    setIsActive(false);
    NotificationService.cancelNotification();
  };

  const toggleNotification = () => {
    setShowNotification(!showNotification);
    if (showNotification) {
      NotificationService.cancelNotification();
    }
  };

  const changeLanguage = async (langCode: string) => {
    i18n.changeLanguage(langCode);
    await Analytics.trackLanguageChange();
    setShowLanguageModal(false);
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      // Validate date
      const now = new Date();
      if (date > now) {
        Alert.alert(t('errorTitle'), t('errorFutureDate'));
        return;
      }

      const age = now.getFullYear() - date.getFullYear();
      if (age > 150) {
        Alert.alert(t('errorTitle'), t('errorTooOld'));
        return;
      }

      // Check for invalid dates (like Feb 30)
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const testDate = new Date(year, month, day);

      if (testDate.getFullYear() !== year ||
          testDate.getMonth() !== month ||
          testDate.getDate() !== day) {
        Alert.alert(t('errorTitle'), t('errorInvalidDate'));
        return;
      }

      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setBirthDate(formattedDate);
      Analytics.trackBirthdateSet();
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        const isThemeDark = savedTheme === 'dark';
        setIsDarkTheme(isThemeDark);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedBirthDate = await AsyncStorage.getItem('birthDate');
      const savedLifeExpectancy = await AsyncStorage.getItem('lifeExpectancy');

      if (savedBirthDate) {
        setBirthDate(savedBirthDate);
      }
      if (savedLifeExpectancy) {
        setLifeExpectancy(savedLifeExpectancy);
      }
    } catch (error) {
      console.log('Error loading saved data:', error);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('birthDate', birthDate);
      await AsyncStorage.setItem('lifeExpectancy', lifeExpectancy);
    } catch (error) {
      console.log('Error saving data:', error);
    }
  };

  const toggleTheme = async () => {
    HapticFeedback.trigger('selection');
    try {
      const newTheme = !isDarkTheme;
      setIsDarkTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
      await Analytics.trackThemeChange();
      await MilestoneManager.trackThemeChange(); // Track theme change for milestones
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: currentTheme.backgroundColor }]}>
        <StatusBar
          barStyle={currentTheme.statusBarStyle}
          backgroundColor={currentTheme.backgroundColor}
        />
        <ActivityIndicator size="large" color={currentTheme.primaryColor} />
        <Text style={[styles.loadingText, { color: currentTheme.textColor }]}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: currentTheme.backgroundColor }]}>
        <StatusBar
          barStyle={currentTheme.statusBarStyle}
          backgroundColor={currentTheme.backgroundColor}
        />

        <View style={styles.header}>
        <TouchableOpacity
          style={[styles.themeButton, { backgroundColor: currentTheme.languageButtonBackground }]}
          onPress={toggleTheme}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={isDarkTheme ? t('switchToLight') : t('switchToDark')}
          accessibilityHint={t('toggleThemeHint')}
        >
          <Text style={styles.themeButtonText}>{isDarkTheme ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: currentTheme.textColor }]}>{t('title')}</Text>

        <TouchableOpacity
          style={[styles.languageButton, { backgroundColor: currentTheme.languageButtonBackground }]}
          onPress={() => setShowLanguageModal(true)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('selectLanguage')}
          accessibilityHint={t('selectLanguageHint')}
        >
          <Text style={styles.languageButtonText}>🌐</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: currentTheme.textColor }]}>{t('birthDateLabel')}</Text>
        <TouchableOpacity
          style={[styles.input, styles.datePickerInput, {
            backgroundColor: currentTheme.inputBackground
          }]}
          onPress={showDatePickerModal}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${t('birthDateLabel')}: ${birthDate || t('birthDatePlaceholder')}`}
          accessibilityHint={t('selectBirthDateHint')}
        >
          <Text style={[{ color: birthDate ? currentTheme.textColor : currentTheme.placeholderColor }]}>
            {birthDate || t('birthDatePlaceholder')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: currentTheme.textColor }]}>{t('lifeExpectancyLabel')}</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: currentTheme.inputBackground,
            color: currentTheme.textColor
          }]}
          value={lifeExpectancy}
          onChangeText={(text) => {
            const numericText = text.replace(/[^0-9]/g, '');
            if (numericText.length <= 3) {
              setLifeExpectancy(numericText);
            }
          }}
          placeholder={t('lifeExpectancyPlaceholder')}
          placeholderTextColor={currentTheme.placeholderColor}
          keyboardType="numeric"
          maxLength={3}
          returnKeyType="done"
          accessible={true}
          accessibilityLabel={t('lifeExpectancyLabel')}
          accessibilityHint={t('lifeExpectancyHint')}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, {
          backgroundColor: isActive ? currentTheme.buttonStopBackground : currentTheme.buttonBackground
        }]}
        onPress={isActive ? stopClock : startClock}
      >
        <Text style={[styles.buttonText, { color: currentTheme.textColor }]}>
          {isActive ? t('stopButton') : t('startButton')}
        </Text>
      </TouchableOpacity>

      {isActive && (
        <TouchableOpacity
          style={[styles.notificationButton, {
            backgroundColor: showNotification ? currentTheme.primaryColor : currentTheme.languageButtonBackground
          }]}
          onPress={toggleNotification}
        >
          <Text style={[styles.notificationButtonText, { color: currentTheme.textColor }]}>
            {showNotification ? t('notificationOn') : t('notificationOff')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.exportButtonsContainer}>
        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: currentTheme.languageButtonBackground }]}
          onPress={() => DataExport.shareData('json', t)}
        >
          <Text style={[styles.exportButtonText, { color: currentTheme.textColor }]}>
            📄 {t('exportJSON')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: currentTheme.languageButtonBackground }]}
          onPress={() => DataExport.shareData('csv', t)}
        >
          <Text style={[styles.exportButtonText, { color: currentTheme.textColor }]}>
            📊 {t('exportCSV')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsContainer}>
        <TouchableOpacity
          style={[styles.settingsButton, {
            backgroundColor: sleepModeEnabled ? currentTheme.primaryColor : currentTheme.languageButtonBackground
          }]}
          onPress={toggleSleepMode}
        >
          <Text style={[styles.settingsButtonText, { color: currentTheme.textColor }]}>
            🌙 {sleepModeEnabled ? t('sleepModeOn') : t('sleepModeOff')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingsButton, {
            backgroundColor: testModeEnabled ? currentTheme.buttonStopBackground : currentTheme.languageButtonBackground
          }]}
          onPress={toggleTestMode}
        >
          <Text style={[styles.settingsButtonText, { color: currentTheme.textColor }]}>
            🧪 {testModeEnabled ? t('testModeOn') : t('testModeOff')}
          </Text>
        </TouchableOpacity>
      </View>

      {isSleeping && (
        <View style={[styles.sleepIndicator, { backgroundColor: currentTheme.languageButtonBackground }]}>
          <Text style={[styles.sleepIndicatorText, { color: currentTheme.textColor }]}>
            😴 {t('sleepingNow')}
          </Text>
        </View>
      )}

      {isActive && (
        <View style={styles.clockContainer}>
          <Text style={[styles.clockTitle, { color: currentTheme.primaryColor }]}>{t('timeLeftTitle')}</Text>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: currentTheme.languageButtonBackground }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: currentTheme.primaryColor,
                    width: `${lifeProgress}%`
                  }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: currentTheme.secondaryColor }]}>
              {t('lifeProgress')}: {lifeProgress.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.timeDisplay}>
            <View style={styles.timeUnit}>
              <Text style={[styles.timeNumber, { color: currentTheme.textColor }]}>{timeLeft.years}</Text>
              <Text style={[styles.timeLabel, { color: currentTheme.secondaryColor }]}>{t('years')}</Text>
            </View>
            <View style={styles.timeUnit}>
              <Text style={[styles.timeNumber, { color: currentTheme.textColor }]}>{timeLeft.months}</Text>
              <Text style={[styles.timeLabel, { color: currentTheme.secondaryColor }]}>{t('months')}</Text>
            </View>
            <View style={styles.timeUnit}>
              <Text style={[styles.timeNumber, { color: currentTheme.textColor }]}>{timeLeft.days}</Text>
              <Text style={[styles.timeLabel, { color: currentTheme.secondaryColor }]}>{t('days')}</Text>
            </View>
          </View>

          <View style={styles.timeDisplay}>
            <View style={styles.timeUnit}>
              <Text style={[styles.timeNumber, { color: currentTheme.textColor }]}>{timeLeft.hours}</Text>
              <Text style={[styles.timeLabel, { color: currentTheme.secondaryColor }]}>{t('hours')}</Text>
            </View>
            <View style={styles.timeUnit}>
              <Text style={[styles.timeNumber, { color: currentTheme.textColor }]}>{timeLeft.minutes}</Text>
              <Text style={[styles.timeLabel, { color: currentTheme.secondaryColor }]}>{t('minutes')}</Text>
            </View>
            <View style={styles.timeUnit}>
              <Text style={[styles.timeNumber, { color: currentTheme.textColor }]}>{timeLeft.seconds}</Text>
              <Text style={[styles.timeLabel, { color: currentTheme.secondaryColor }]}>{t('seconds')}</Text>
            </View>
          </View>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: currentTheme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.modalBackground }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textColor }]}>{t('selectLanguage')}</Text>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    { backgroundColor: currentTheme.languageButtonBackground },
                    i18n.language === item.code && {
                      backgroundColor: currentTheme.selectedLanguageBackground
                    }
                  ]}
                  onPress={() => {
                    HapticFeedback.trigger('selection');
                    changeLanguage(item.code);
                  }}
                >
                  <Text style={[
                    styles.languageText,
                    { color: currentTheme.textColor },
                    i18n.language === item.code && styles.selectedLanguageText
                  ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: currentTheme.textColor }]}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  themeButton: {
    padding: 10,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: 20,
  },
  languageButton: {
    padding: 10,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageButtonText: {
    fontSize: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clockContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  clockTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  timeUnit: {
    alignItems: 'center',
  },
  timeNumber: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  timeLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  languageText: {
    fontSize: 16,
    textAlign: 'center',
  },
  selectedLanguageText: {
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  notificationButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  notificationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
  },
  datePickerInput: {
    justifyContent: 'center',
  },
  progressContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  exportButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    marginBottom: 10,
  },
  exportButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.45,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  settingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginHorizontal: 20,
  },
  settingsButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 0.48,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sleepIndicator: {
    marginTop: 10,
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(128, 128, 128, 0.5)',
  },
  sleepIndicatorText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default App;
