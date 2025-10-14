import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from './themes';
import { storageManager } from './StorageManager';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface OnboardingProps {
  onComplete: () => void;
  theme: Theme;
}

const { width } = Dimensions.get('window');

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, theme }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [slideAnim] = useState(new Animated.Value(0));

  // 사용자 입력 상태
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [lifeExpectancy, setLifeExpectancy] = useState('80');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const animateToNextStep = useCallback((nextStep: number) => {
    Animated.timing(slideAnim, {
      toValue: -width * (nextStep - 1),
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
    });
  }, [slideAnim]);

  const handleNext = useCallback(async () => {
    // 마지막 단계에서 데이터 저장 후 완료
    if (step === 5) {
      // 데이터 저장
      await storageManager.set('nickname', nickname);
      await storageManager.set('birthDate', birthDate);
      await storageManager.set('lifeExpectancy', lifeExpectancy);
      onComplete();
    } else {
      animateToNextStep(step + 1);
    }
  }, [step, nickname, birthDate, lifeExpectancy, animateToNextStep, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleDateChange = useCallback((event: DateTimePickerEvent | null, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setBirthDate(formattedDate);
      setSelectedDate(selectedDate);
    }
  }, []);

  // 다음 버튼 활성화 조건
  const canProceed = useCallback(() => {
    if (step === 3) return nickname.trim().length > 0;
    if (step === 4) return birthDate.length > 0;
    if (step === 5) return lifeExpectancy.length > 0 && parseInt(lifeExpectancy) >= 1 && parseInt(lifeExpectancy) <= 150;
    return true;
  }, [step, nickname, birthDate, lifeExpectancy]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* 진행 표시 */}
          <View style={styles.progressContainer}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: i === step ? theme.primary : theme.placeholder,
                    width: i === step ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

      <Animated.View
        style={[
          styles.contentContainer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Step 1: 환영 화면 */}
        <View style={[styles.stepContainer, { width }]}>
          <View style={styles.stepContent}>
            <Text style={[styles.icon]}>⏳</Text>
            <Text style={[styles.title, { color: theme.primary }]}>
              {t('onboardingWelcomeTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {t('onboardingWelcomeSubtitle')}
            </Text>
            <Text style={[styles.description, { color: theme.text }]}>
              {t('onboardingWelcomeDescription')}
            </Text>
          </View>
        </View>

        {/* Step 2: 왜 필요한가 */}
        <View style={[styles.stepContainer, { width }]}>
          <View style={styles.stepContent}>
            <Text style={[styles.icon]}>💭</Text>
            <Text style={[styles.title, { color: theme.primary }]}>
              {t('onboardingWhyTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {t('onboardingWhySubtitle')}
            </Text>
            <View style={styles.featureList}>
              <Text style={[styles.feature, { color: theme.text }]}>
                • {t('onboardingFeature1')}
              </Text>
              <Text style={[styles.feature, { color: theme.text }]}>
                • {t('onboardingFeature2')}
              </Text>
              <Text style={[styles.feature, { color: theme.text }]}>
                • {t('onboardingFeature3')}
              </Text>
            </View>
          </View>
        </View>

        {/* Step 3: 닉네임 입력 */}
        <View style={[styles.stepContainer, { width }]}>
          <View style={styles.stepContent}>
            <Text style={[styles.icon]}>👤</Text>
            <Text style={[styles.title, { color: theme.primary }]}>
              {t('onboardingNicknameTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {t('onboardingNicknameSubtitle')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.accent,
                },
              ]}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t('onboardingNicknamePlaceholder')}
              placeholderTextColor={theme.placeholder}
              maxLength={20}
              autoFocus={false}
            />
          </View>
        </View>

        {/* Step 4: 생년월일 입력 */}
        <View style={[styles.stepContainer, { width }]}>
          <View style={styles.stepContent}>
            <Text style={[styles.icon]}>📅</Text>
            <Text style={[styles.title, { color: theme.primary }]}>
              {t('onboardingBirthDateTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {t('onboardingBirthDateSubtitle')}
            </Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.datePickerInput,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.accent,
                },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={[
                  styles.inputText,
                  {
                    color: birthDate ? theme.text : theme.placeholder,
                  },
                ]}
              >
                {birthDate || t('onboardingBirthDatePlaceholder')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 5: 예상 수명 입력 */}
        <View style={[styles.stepContainer, { width }]}>
          <View style={styles.stepContent}>
            <Text style={[styles.icon]}>⏳</Text>
            <Text style={[styles.title, { color: theme.primary }]}>
              {t('onboardingLifeExpectancyTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {t('onboardingLifeExpectancySubtitle')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.accent,
                },
              ]}
              value={lifeExpectancy}
              onChangeText={setLifeExpectancy}
              placeholder={t('onboardingLifeExpectancyPlaceholder')}
              placeholderTextColor={theme.placeholder}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
        </View>
      </Animated.View>

      {/* DatePicker Modal */}
      {showDatePicker && Platform.OS === 'ios' && (
        <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
          <View style={styles.datePickerModal}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
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
                  style={[styles.datePickerDoneButton, { backgroundColor: theme.primary }]}
                  onPress={() => setShowDatePicker(false)}
                  accessibilityLabel={t('confirm')}
                  accessibilityRole="button"
                >
                  <Text style={styles.datePickerDoneText}>{t('confirm')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Android DatePicker - uses native modal */}
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

      {/* 버튼 컨테이너 */}
      <View style={styles.buttonContainer}>
        {step < 3 && (
          <TouchableOpacity
            style={[styles.skipButton]}
            onPress={handleSkip}
            accessibilityLabel={t('onboardingSkip')}
            accessibilityRole="button"
          >
            <Text style={[styles.skipButtonText, { color: theme.placeholder }]}>
              {t('onboardingSkip')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor: canProceed() ? theme.primary : theme.placeholder,
              borderColor: theme.accent,
              opacity: canProceed() ? 1 : 0.5,
            },
          ]}
          onPress={handleNext}
          disabled={!canProceed()}
          accessibilityLabel={step === 5 ? t('onboardingStart') : t('onboardingNext')}
          accessibilityRole="button"
        >
          <Text style={[styles.nextButtonText, { color: '#fff' }]}>
            {step === 5 ? t('onboardingStart') : t('onboardingNext')}
          </Text>
        </TouchableOpacity>
      </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 20,
    gap: 8,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
    // transition removed - not supported in React Native
  },
  contentContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  stepContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  stepContent: {
    alignItems: 'center',
    maxWidth: 500,
  },
  icon: {
    fontSize: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  featureList: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
  feature: {
    fontSize: 16,
    lineHeight: 28,
    opacity: 0.85,
    marginBottom: 8,
  },
  buttonContainer: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    gap: 12,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  datePickerInput: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 18,
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
    padding: 24,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  datePickerDoneButton: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Onboarding;
