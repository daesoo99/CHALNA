import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from './themes';

interface OnboardingProps {
  onComplete: () => void;
  theme: Theme;
}

const { width, height } = Dimensions.get('window');

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, theme }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [slideAnim] = useState(new Animated.Value(0));

  const animateToNextStep = useCallback((nextStep: number) => {
    Animated.timing(slideAnim, {
      toValue: -width * (nextStep - 1),
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
    });
  }, [slideAnim]);

  const handleNext = useCallback(() => {
    if (step < 3) {
      animateToNextStep(step + 1);
    } else {
      onComplete();
    }
  }, [step, animateToNextStep, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* 진행 표시 */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((i) => (
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

        {/* Step 3: 시작 준비 */}
        <View style={[styles.stepContainer, { width }]}>
          <View style={styles.stepContent}>
            <Text style={[styles.icon]}>🚀</Text>
            <Text style={[styles.title, { color: theme.primary }]}>
              {t('onboardingReadyTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {t('onboardingReadySubtitle')}
            </Text>
            <Text style={[styles.description, { color: theme.text }]}>
              {t('onboardingReadyDescription')}
            </Text>
          </View>
        </View>
      </Animated.View>

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
            { backgroundColor: theme.primary, borderColor: theme.accent },
          ]}
          onPress={handleNext}
          accessibilityLabel={step === 3 ? t('onboardingStart') : t('onboardingNext')}
          accessibilityRole="button"
        >
          <Text style={[styles.nextButtonText, { color: '#fff' }]}>
            {step === 3 ? t('onboardingStart') : t('onboardingNext')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
    transition: 'all 0.3s ease',
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
});

export default Onboarding;
