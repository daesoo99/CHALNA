import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
  Platform,
  StyleSheet,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { typography, spacing, Theme } from './themes';
import { storageManager } from './StorageManager';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { DataBackupService } from './DataBackupService';

// Legal document URLs - GitHub Pages
const GITHUB_PAGES_BASE = 'https://daesoo99.github.io/CHALNA';
const PRIVACY_POLICY_URL = `${GITHUB_PAGES_BASE}/privacy-policy.html`;
const TERMS_URL = `${GITHUB_PAGES_BASE}/terms-of-service.html`;

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
  currentTheme: Theme;
  isDarkTheme: boolean;
  onThemeToggle: () => void;
  onLanguagePress: () => void;
}

// 알림 설정 인터페이스
interface NotificationSettings {
  enabled: boolean;
  interval: '1' | '5' | '10' | '60'; // minutes
  sound: boolean;
  vibration: boolean;
}

const Settings = memo<SettingsProps>(({
  visible,
  onClose,
  currentTheme,
  isDarkTheme,
  onThemeToggle,
  onLanguagePress
}) => {
  const { t, i18n } = useTranslation();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: false,
    interval: '1',
    sound: true,
    vibration: true,
  });

  // 햅틱 피드백 헬퍼
  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
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
  };

  // 알림 설정 불러오기
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const settings = await storageManager.get('notificationSettings');
      if (settings) {
        setNotificationSettings(settings);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveNotificationSettings = async (settings: NotificationSettings) => {
    try {
      await storageManager.set('notificationSettings', settings);
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  // 알림 설정 토글
  const toggleNotification = async (value: boolean) => {
    triggerHaptic('light');
    await saveNotificationSettings({ ...notificationSettings, enabled: value });
  };

  const toggleSound = async (value: boolean) => {
    triggerHaptic('light');
    await saveNotificationSettings({ ...notificationSettings, sound: value });
  };

  const toggleVibration = async (value: boolean) => {
    triggerHaptic('light');
    await saveNotificationSettings({ ...notificationSettings, vibration: value });
  };

  const changeInterval = async (interval: '1' | '5' | '10' | '60') => {
    triggerHaptic('light');
    await saveNotificationSettings({ ...notificationSettings, interval });
  };

  // 데이터 삭제
  const handleDeleteAllData = () => {
    triggerHaptic('error');
    Alert.alert(
      t('settingsDataDelete'),
      t('settingsDataDeleteConfirm'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('settingsDataDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await storageManager.clear();
              triggerHaptic('success');
              Alert.alert(t('settings'), t('settingsDataDeleteSuccess'));
              onClose();
            } catch (error) {
              triggerHaptic('error');
              Alert.alert(t('errorTitle'), t('settingsDataDeleteError'));
            }
          },
        },
      ]
    );
  };

  // 개발자에게 이메일 보내기
  const handleContactDeveloper = () => {
    triggerHaptic('medium');
    Linking.openURL('mailto:developer@chalna.app?subject=CHALNA Feedback');
  };

  // 의견 보내기
  const handleSendFeedback = () => {
    triggerHaptic('medium');
    Linking.openURL('mailto:feedback@chalna.app?subject=CHALNA Feedback&body=');
  };

  // 도움말 표시
  const handleHelp = () => {
    triggerHaptic('medium');
    Alert.alert(
      t('settingsHelp'),
      t('settingsHelpContent'),
      [{ text: t('acknowledge') }]
    );
  };

  // 데이터 백업
  const handleBackupData = async () => {
    try {
      triggerHaptic('medium');
      const backupService = DataBackupService.getInstance();
      await backupService.exportData();
      // 성공 시 haptic feedback (Share dialog가 닫힌 후)
      triggerHaptic('success');
    } catch (error) {
      console.error('Backup error:', error);
      triggerHaptic('error');
      Alert.alert(t('errorTitle'), t('backupError'));
    }
  };

  // 데이터 복구
  const handleRestoreData = async () => {
    try {
      triggerHaptic('medium');
      const backupService = DataBackupService.getInstance();
      const success = await backupService.importData();

      if (success) {
        triggerHaptic('success');
        Alert.alert(
          t('success'),
          t('restoreSuccess'),
          [
            {
              text: t('acknowledge'),
              onPress: () => {
                // 앱 재시작 권장 (설정 모달 닫기)
                onClose();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Restore error:', error);
      triggerHaptic('error');
      Alert.alert(t('errorTitle'), t('restoreError'));
    }
  };

  // 준비 중 기능
  const handleComingSoon = (feature: string) => {
    triggerHaptic('light');
    Alert.alert(
      feature,
      t('settingsComingSoon'),
      [{ text: t('acknowledge') }]
    );
  };

  // 섹션 헤더 컴포넌트
  const SectionHeader = ({ title }: { title: string }) => (
    <View style={[styles.sectionHeader, { borderBottomColor: currentTheme.accent }]}>
      <Text style={[styles.sectionHeaderText, { color: currentTheme.primary }]}>
        {title}
      </Text>
    </View>
  );

  // 설정 항목 컴포넌트
  const SettingItem = ({
    label,
    onPress,
    rightElement,
    showBorder = true
  }: {
    label: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showBorder?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        { backgroundColor: currentTheme.surface },
        showBorder && { borderBottomColor: currentTheme.input, borderBottomWidth: 1 }
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.settingLabel, { color: currentTheme.text }]}>
        {label}
      </Text>
      {rightElement}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: currentTheme.accent }]}>
          <Text style={[styles.headerTitle, { color: currentTheme.primary }]}>
            {t('settings')}
          </Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('medium');
              onClose();
            }}
            style={[styles.closeButton, { backgroundColor: currentTheme.primary }]}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 섹션 1: 알림 설정 */}
          <SectionHeader title={t('settingsNotification')} />
          <View style={styles.section}>
            <SettingItem
              label={t('settingsNotificationEnable')}
              rightElement={
                <Switch
                  value={notificationSettings.enabled}
                  onValueChange={toggleNotification}
                  trackColor={{ false: '#767577', true: currentTheme.primary }}
                  thumbColor={notificationSettings.enabled ? '#fff' : '#f4f3f4'}
                />
              }
            />

            {notificationSettings.enabled && (
              <>
                <View style={[styles.settingItem, { backgroundColor: currentTheme.surface }]}>
                  <Text style={[styles.settingLabel, { color: currentTheme.text }]}>
                    {t('settingsNotificationInterval')}
                  </Text>
                </View>
                <View style={[styles.intervalButtons, { backgroundColor: currentTheme.surface }]}>
                  {(['1', '5', '10', '60'] as const).map((interval) => (
                    <TouchableOpacity
                      key={interval}
                      style={[
                        styles.intervalButton,
                        {
                          backgroundColor: notificationSettings.interval === interval
                            ? currentTheme.primary
                            : currentTheme.input,
                          borderColor: currentTheme.accent,
                        },
                      ]}
                      onPress={() => changeInterval(interval)}
                    >
                      <Text
                        style={[
                          styles.intervalButtonText,
                          {
                            color: notificationSettings.interval === interval
                              ? '#fff'
                              : currentTheme.text,
                          },
                        ]}
                      >
                        {interval === '60' ? t('intervalOneHour') : `${interval}${t('intervalMinuteSuffix')}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <SettingItem
                  label={t('settingsNotificationSound')}
                  rightElement={
                    <Switch
                      value={notificationSettings.sound}
                      onValueChange={toggleSound}
                      trackColor={{ false: '#767577', true: currentTheme.primary }}
                      thumbColor={notificationSettings.sound ? '#fff' : '#f4f3f4'}
                    />
                  }
                />

                <SettingItem
                  label={t('settingsNotificationVibration')}
                  showBorder={false}
                  rightElement={
                    <Switch
                      value={notificationSettings.vibration}
                      onValueChange={toggleVibration}
                      trackColor={{ false: '#767577', true: currentTheme.primary }}
                      thumbColor={notificationSettings.vibration ? '#fff' : '#f4f3f4'}
                    />
                  }
                />
              </>
            )}
          </View>

          {/* 섹션 2: 테마 설정 */}
          <SectionHeader title={t('settingsTheme')} />
          <View style={styles.section}>
            <SettingItem
              label={t('settingsThemeDark')}
              onPress={onThemeToggle}
              rightElement={
                <Switch
                  value={isDarkTheme}
                  onValueChange={onThemeToggle}
                  trackColor={{ false: '#767577', true: currentTheme.primary }}
                  thumbColor={isDarkTheme ? '#fff' : '#f4f3f4'}
                />
              }
            />
            <SettingItem
              label={t('settingsLanguage')}
              onPress={onLanguagePress}
              showBorder={false}
              rightElement={
                <Text style={[styles.settingValue, { color: currentTheme.accent }]}>
                  {i18n.language === 'ko' ? '한국어' :
                   i18n.language === 'en' ? 'English' :
                   i18n.language === 'ja' ? '日本語' : '中文'}
                </Text>
              }
            />
          </View>

          {/* 섹션 3: 데이터 관리 */}
          <SectionHeader title={t('settingsData')} />
          <View style={styles.section}>
            <SettingItem
              label={t('settingsDataBackup')}
              onPress={handleBackupData}
              rightElement={
                <Text style={[styles.settingValue, { color: currentTheme.accent }]}>
                  📤
                </Text>
              }
            />
            <SettingItem
              label={t('settingsDataRestore')}
              onPress={handleRestoreData}
              rightElement={
                <Text style={[styles.settingValue, { color: currentTheme.accent }]}>
                  📥
                </Text>
              }
            />
            <SettingItem
              label={t('settingsDataExport')}
              onPress={() => handleComingSoon(t('settingsDataExport'))}
              rightElement={
                <Text style={[styles.comingSoonBadge, { color: currentTheme.accent }]}>
                  {t('settingsComingSoonBadge')}
                </Text>
              }
            />
            <SettingItem
              label={t('settingsDataDelete')}
              onPress={handleDeleteAllData}
              showBorder={false}
              rightElement={
                <Text style={styles.dangerIcon}>⚠️</Text>
              }
            />
          </View>

          {/* 섹션 4: 앱 정보 */}
          <SectionHeader title={t('settingsAppInfo')} />
          <View style={styles.section}>
            <SettingItem
              label={t('settingsVersion')}
              rightElement={
                <Text style={[styles.settingValue, { color: currentTheme.accent }]}>
                  1.0.0
                </Text>
              }
            />
            <SettingItem
              label={t('settingsPrivacyPolicy')}
              onPress={() => {
                triggerHaptic('medium');
                Linking.openURL(PRIVACY_POLICY_URL).catch(() => {
                  Alert.alert(
                    t('errorTitle'),
                    'Unable to open Privacy Policy. Please check your internet connection or update the app.',
                    [{ text: t('acknowledge') }]
                  );
                });
              }}
            />
            <SettingItem
              label={t('settingsTerms')}
              onPress={() => {
                triggerHaptic('medium');
                Linking.openURL(TERMS_URL).catch(() => {
                  Alert.alert(
                    t('errorTitle'),
                    'Unable to open Terms of Service. Please check your internet connection or update the app.',
                    [{ text: t('acknowledge') }]
                  );
                });
              }}
            />
            <SettingItem
              label={t('settingsLicenses')}
              onPress={() => {
                triggerHaptic('medium');
                Alert.alert(
                  t('settingsLicenses'),
                  t('settingsLicensesContent'),
                  [{ text: t('acknowledge') }]
                );
              }}
            />
            <SettingItem
              label={t('settingsDeveloper')}
              onPress={handleContactDeveloper}
              showBorder={false}
              rightElement={
                <Text style={[styles.settingValue, { color: currentTheme.accent }]}>
                  developer@chalna.app
                </Text>
              }
            />
          </View>

          {/* 섹션 5: 지원 */}
          <SectionHeader title={t('settingsSupport')} />
          <View style={styles.section}>
            <SettingItem
              label={t('settingsFeedback')}
              onPress={handleSendFeedback}
            />
            <SettingItem
              label={t('settingsHelp')}
              onPress={handleHelp}
              showBorder={false}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: currentTheme.placeholder }]}>
              {t('settingsFooter')}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
});

Settings.displayName = 'Settings';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.displayMedium,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: typography.weight.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    marginTop: spacing.md,
  },
  sectionHeaderText: {
    fontSize: typography.headlineMedium,
    fontWeight: typography.weight.semiBold,
    letterSpacing: 0.5,
  },
  section: {
    marginTop: spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  settingLabel: {
    fontSize: typography.headlineMedium,
    fontWeight: typography.weight.regular,
    flex: 1,
  },
  settingValue: {
    fontSize: typography.bodyMedium,
    fontWeight: typography.weight.medium,
    marginLeft: spacing.sm,
  },
  comingSoonBadge: {
    fontSize: typography.labelSmall,
    fontWeight: typography.weight.semiBold,
    fontStyle: 'italic',
  },
  dangerIcon: {
    fontSize: 20,
  },
  intervalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexWrap: 'wrap',
  },
  intervalButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    marginVertical: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  intervalButtonText: {
    fontSize: typography.bodyMedium,
    fontWeight: typography.weight.medium,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.labelSmall,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default Settings;
