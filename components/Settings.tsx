import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { darkTheme, lightTheme, typography, spacing } from '../themes';
import { MIN_LIFE_EXPECTANCY, MAX_LIFE_EXPECTANCY, DEFAULT_LIFE_EXPECTANCY, APP_VERSION } from '../constants';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface SettingsProps {
  nickname: string;
  birthDate: string;
  lifeExpectancy: string;
  isDarkTheme: boolean;
  currentLanguage: string;
  onClose: () => void;
  onUpdate: (data: { nickname: string; birthDate: string; lifeExpectancy: string }) => void | Promise<void>;
  onThemeToggle: () => void | Promise<void>;
  onLanguageChange: (_code: string) => void | Promise<void>;
  onReset: () => void;
}

// Section Header Component (outside to avoid recreating on each render)
const SectionHeader = memo<{ title: string; color: string; accentColor: string }>(
  ({ title, color, accentColor }) => (
    <View style={[styles.sectionHeader, { borderBottomColor: accentColor }]}>
      <Text style={[styles.sectionHeaderText, { color }]}>{title}</Text>
    </View>
  )
);

SectionHeader.displayName = 'SectionHeader';

// Setting Item Component (outside to avoid recreating on each render)
const SettingItem = memo<{
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showBorder?: boolean;
  theme: { cardBackground: string; text: string; secondaryText: string; border: string };
}>(({ label, value, onPress, rightElement, showBorder = true, theme }) => (
  <TouchableOpacity
    style={[
      styles.settingItem,
      { backgroundColor: theme.cardBackground },
      showBorder && styles.settingItemBorder,
      showBorder && { borderBottomColor: theme.border },
    ]}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
  >
    <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
    {value && (
      <Text style={[styles.settingValue, { color: theme.secondaryText }]}>{value}</Text>
    )}
    {rightElement}
  </TouchableOpacity>
));

SettingItem.displayName = 'SettingItem';

const Settings = memo<SettingsProps>(({
  nickname: initialNickname,
  birthDate: initialBirthDate,
  lifeExpectancy: initialLifeExpectancy,
  isDarkTheme,
  currentLanguage,
  onClose,
  onUpdate,
  onThemeToggle,
  onLanguageChange,
  onReset,
}) => {
  const { t } = useTranslation();
  const currentTheme = isDarkTheme ? darkTheme : lightTheme;

  // Local state
  const [nickname, setNickname] = useState(initialNickname);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [lifeExpectancy, setLifeExpectancy] = useState(initialLifeExpectancy);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Handlers
  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert(t('errorTitle'), t('nicknameRequired'));
      return;
    }

    if (!birthDate) {
      Alert.alert(t('errorTitle'), t('birthDateRequired'));
      return;
    }

    const age = parseInt(lifeExpectancy, 10);
    if (isNaN(age) || age < MIN_LIFE_EXPECTANCY || age > MAX_LIFE_EXPECTANCY) {
      Alert.alert(t('errorTitle'), t('lifeExpectancyInvalid'));
      return;
    }

    try {
      await onUpdate({ nickname, birthDate, lifeExpectancy });
      setIsEditing(false);
      Alert.alert(t('success'), t('settingsSaved'));
    } catch (error) {
      Alert.alert(t('errorTitle'), t('appInitError'));
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setBirthDate(formattedDate);
      setIsEditing(true);
    }
  };

  const handleLanguageSelect = async (languageCode: string) => {
    await onLanguageChange(languageCode);
    setShowLanguageModal(false);
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      t('settingsDataDelete'),
      t('settingsDataDeleteConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: onReset,
        },
      ]
    );
  };

  const languages = [
    { code: 'ko', name: t('languageKorean') },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { color: currentTheme.accent }]}>
            {t('close')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {t('settings')}
        </Text>
        {isEditing && (
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={[styles.saveButtonText, { color: currentTheme.success }]}>
              {t('save')}
            </Text>
          </TouchableOpacity>
        )}
        {!isEditing && <View style={styles.placeholder} />}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 섹션 1: 나의 정보 */}
        <SectionHeader
          title={t('settingsPersonalInfo')}
          color={currentTheme.text}
          accentColor={currentTheme.accent}
        />
        <View style={styles.section}>
          <View style={[
            styles.inputItem,
            {
              backgroundColor: currentTheme.cardBackground,
              borderBottomWidth: 1,
              borderBottomColor: currentTheme.border,
            }
          ]}>
            <Text style={[styles.inputLabel, { color: currentTheme.secondaryText }]}>
              {t('settingsNickname')}
            </Text>
            <TextInput
              style={[styles.input, { color: currentTheme.text }]}
              value={nickname}
              onChangeText={(text) => {
                setNickname(text);
                setIsEditing(true);
              }}
              placeholder={t('settingsNicknamePlaceholder')}
              placeholderTextColor={currentTheme.secondaryText}
            />
          </View>

          <SettingItem
            label={t('settingsBirthDate')}
            value={birthDate}
            onPress={() => setShowDatePicker(true)}
            theme={currentTheme}
          />

          <View style={[
            styles.inputItem,
            {
              backgroundColor: currentTheme.cardBackground,
              borderBottomWidth: 1,
              borderBottomColor: currentTheme.border,
            }
          ]}>
            <Text style={[styles.inputLabel, { color: currentTheme.secondaryText }]}>
              {t('settingsLifeExpectancy')}
            </Text>
            <TextInput
              style={[styles.input, { color: currentTheme.text }]}
              value={lifeExpectancy}
              onChangeText={(text) => {
                setLifeExpectancy(text);
                setIsEditing(true);
              }}
              keyboardType="number-pad"
              placeholder={DEFAULT_LIFE_EXPECTANCY.toString()}
              placeholderTextColor={currentTheme.secondaryText}
            />
          </View>
        </View>

        {/* 섹션 2: 표시 설정 */}
        <SectionHeader
          title={t('settingsDisplay')}
          color={currentTheme.text}
          accentColor={currentTheme.accent}
        />
        <View style={styles.section}>
          <SettingItem
            label={t('settingsThemeDark')}
            onPress={onThemeToggle}
            theme={currentTheme}
            rightElement={
              <Switch
                value={isDarkTheme}
                onValueChange={onThemeToggle}
                trackColor={{ false: '#767577', true: currentTheme.accent }}
                thumbColor={isDarkTheme ? currentTheme.success : '#f4f3f4'}
              />
            }
          />

          <SettingItem
            label={t('settingsLanguage')}
            value={currentLanguage.toUpperCase()}
            onPress={() => setShowLanguageModal(true)}
            showBorder={false}
            theme={currentTheme}
          />
        </View>

        {/* 섹션 3: 데이터 */}
        <SectionHeader
          title={t('settingsData')}
          color={currentTheme.text}
          accentColor={currentTheme.accent}
        />
        <View style={styles.section}>
          <SettingItem
            label={t('settingsDataDelete')}
            onPress={handleDeleteAllData}
            theme={currentTheme}
          />

          <SettingItem
            label={t('settingsVersion')}
            value={APP_VERSION}
            showBorder={false}
            theme={currentTheme}
          />
        </View>

        {/* 하단 여백 */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={birthDate ? new Date(birthDate) : new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Language Modal */}
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
                    currentLanguage === item.code && {
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
                          currentLanguage === item.code
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
    </View>
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
    paddingTop: Platform.OS === 'ios' ? spacing.xl + 20 : spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    ...typography.button,
    fontSize: 16,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 20,
  },
  saveButton: {
    padding: spacing.sm,
  },
  saveButtonText: {
    ...typography.button,
    fontSize: 16,
  },
  placeholder: {
    width: 60,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
  },
  sectionHeaderText: {
    ...typography.subtitle,
    fontWeight: '600',
  },
  section: {
    marginTop: spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
  },
  settingLabel: {
    ...typography.body,
    flex: 1,
  },
  settingValue: {
    ...typography.body,
    marginLeft: spacing.md,
  },
  inputItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  inputLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    paddingVertical: spacing.xs,
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

export default Settings;
