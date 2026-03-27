import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../themes';
import { DEFAULT_LIFE_EXPECTANCY, MIN_LIFE_EXPECTANCY, MAX_LIFE_EXPECTANCY } from '../constants';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface OnboardingProps {
  onComplete: (data: { nickname: string; birthDate: string; lifeExpectancy: string }) => void | Promise<void>;
  theme: Theme;
}

// 토스 스타일: 단일 화면에 모든 정보 입력
const Onboarding: React.FC<OnboardingProps> = ({ onComplete, theme }) => {
  const { t } = useTranslation();

  // 사용자 입력 상태
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [lifeExpectancy, setLifeExpectancy] = useState(DEFAULT_LIFE_EXPECTANCY.toString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(2000, 0, 1));

  const handleDateChange = useCallback((event: DateTimePickerEvent | null, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      setBirthDate(formattedDate);
      setSelectedDate(date);
    }
  }, []);

  const canStart = useCallback(() => {
    const age = parseInt(lifeExpectancy, 10);
    return (
      nickname.trim().length > 0 &&
      birthDate.length > 0 &&
      lifeExpectancy.length > 0 &&
      !isNaN(age) &&
      age >= MIN_LIFE_EXPECTANCY &&
      age <= MAX_LIFE_EXPECTANCY
    );
  }, [nickname, birthDate, lifeExpectancy]);

  const handleStart = useCallback(async () => {
    if (canStart()) {
      await onComplete({ nickname, birthDate, lifeExpectancy });
    }
  }, [nickname, birthDate, lifeExpectancy, canStart, onComplete]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={[styles.container, { backgroundColor: theme.background }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* 상단 여백 */}
          <View style={styles.header}>
            {/* 아이콘 */}
            <Text style={styles.icon}>⏳</Text>

            {/* 앱 이름 */}
            <Text style={[styles.appName, { color: theme.primary }]}>CHALNA</Text>

            {/* 부제 - 토스 스타일 */}
            <Text style={[styles.tagline, { color: theme.secondaryText }]}>
              {t('onboardingWelcomeSubtitle') || '매 순간을 소중하게'}
            </Text>
          </View>

          {/* 입력 폼 - 토스처럼 깔끔하게 */}
          <View style={styles.form}>
            {/* 닉네임 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t('onboardingNicknameTitle') || '이름'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={nickname}
                onChangeText={setNickname}
                placeholder={t('onboardingNicknamePlaceholder') || '닉네임을 입력하세요'}
                placeholderTextColor={theme.placeholder}
                maxLength={20}
                returnKeyType="next"
              />
            </View>

            {/* 생년월일 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t('onboardingBirthDateTitle') || '생년월일'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.dateInput,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    styles.dateText,
                    {
                      color: birthDate ? theme.text : theme.placeholder,
                    },
                  ]}
                >
                  {birthDate || t('onboardingBirthDatePlaceholder') || '생년월일을 선택하세요'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 기대수명 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {t('onboardingLifeExpectancyTitle') || '기대수명'}
              </Text>
              <View style={styles.lifeExpectancyContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.lifeExpectancyInput,
                    {
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={lifeExpectancy}
                  onChangeText={setLifeExpectancy}
                  placeholder="80"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="numeric"
                  maxLength={3}
                  returnKeyType="done"
                />
                <Text style={[styles.lifeExpectancySuffix, { color: theme.secondaryText }]}>
                  세
                </Text>
              </View>
              <Text style={[styles.hint, { color: theme.placeholder }]}>
                {t('onboardingLifeExpectancyHint') || '평균 기대수명: 80세'}
              </Text>
            </View>
          </View>

          {/* DatePicker */}
          {showDatePicker && Platform.OS === 'ios' && (
            <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
              <View style={styles.datePickerModal}>
                <TouchableWithoutFeedback>
                  <View style={[styles.datePickerContainer, { backgroundColor: theme.surface }]}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                      textColor={theme.text}
                    />
                    <TouchableOpacity
                      style={[styles.datePickerDone, { backgroundColor: theme.primary }]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.datePickerDoneText}>
                        {t('confirm') || '확인'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          )}

          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="calendar"
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}

          {/* 시작 버튼 - 토스 스타일 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.startButton,
                {
                  backgroundColor: canStart() ? theme.primary : theme.placeholder,
                  opacity: canStart() ? 1 : 0.5,
                },
              ]}
              onPress={handleStart}
              disabled={!canStart()}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>
                {t('onboardingStart') || '시작하기'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 하단 여백 */}
          <View style={styles.footer} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  icon: {
    fontSize: 72,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  form: {
    paddingHorizontal: 24,
    gap: 28,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '400',
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
  },
  lifeExpectancyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lifeExpectancyInput: {
    flex: 1,
    textAlign: 'center',
  },
  lifeExpectancySuffix: {
    fontSize: 16,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    marginTop: 4,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  startButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  datePickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    width: '85%',
    padding: 20,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  datePickerDone: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    height: 40,
  },
});

export default Onboarding;
