import React, { memo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme, typography, spacing } from '../themes';

interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface TimeDisplayProps {
  timeLeft: TimeLeft;
  totalDays: number;
  totalHours: number;
  theme: Theme;
  pulseAnim: Animated.Value;
  birthDate: string;
  lifeExpectancy: string;
}

const TimeDisplay = memo<TimeDisplayProps>(({
  timeLeft,
  totalDays,
  totalHours,
  theme,
  pulseAnim,
  birthDate,
  lifeExpectancy,
}) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.mainCard, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.cardTitle, { color: theme.secondaryText }]}>
        {t('timeRemaining')}
      </Text>

      {/* 핵심 숫자 - 토스처럼 크게 */}
      <Text style={[styles.mainNumber, { color: theme.text }]}>
        {birthDate && lifeExpectancy
          ? `${timeLeft.years} ${t('years')} ${timeLeft.months} ${t('months')} ${timeLeft.days} ${t('days')}`
          : '--'}
      </Text>

      {/* 구분선 */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* 부가 정보 - 토스처럼 작게 */}
      <View style={styles.subInfo}>
        <Text style={[styles.subInfoText, { color: theme.secondaryText }]}>
          {totalDays.toLocaleString()} {t('days')}
        </Text>
        <Text style={[styles.subInfoDot, { color: theme.placeholder }]}>•</Text>
        <Text style={[styles.subInfoText, { color: theme.secondaryText }]}>
          {totalHours.toLocaleString()} {t('hours')}
        </Text>
      </View>

      {/* 실시간 업데이트 표시 */}
      <View style={styles.liveIndicator}>
        <Animated.View
          style={[
            styles.liveDot,
            {
              backgroundColor: theme.primary,
              opacity: pulseAnim,
            },
          ]}
        />
        <Text style={[styles.liveText, { color: theme.secondaryText }]}>
          {timeLeft.hours.toString().padStart(2, '0')}:
          {timeLeft.minutes.toString().padStart(2, '0')}:
          {timeLeft.seconds.toString().padStart(2, '0')}
        </Text>
      </View>
    </View>
  );
});

TimeDisplay.displayName = 'TimeDisplay';

const styles = StyleSheet.create({
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
    fontSize: typography.bodyMedium,
    fontWeight: typography.weight.medium,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },
  mainNumber: {
    fontSize: typography.displayLarge,
    fontWeight: typography.weight.bold,
    letterSpacing: -1,
    marginBottom: spacing.lg - 4,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subInfoText: {
    fontSize: typography.bodyMedium,
    fontWeight: typography.weight.regular,
  },
  subInfoDot: {
    fontSize: typography.labelSmall,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 13,
    fontWeight: typography.weight.medium,
    fontVariant: ['tabular-nums'],
  },
});

export default TimeDisplay;
