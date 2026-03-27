/**
 * Time calculation utilities for CHALNA
 * Provides accurate time calculations based on birth date and life expectancy
 */

export interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Helper: Calculate expected death date
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @param lifeExpectancy - Expected life span in years (string)
 * @returns Date object representing expected death
 */
function getExpectedDeathDate(birthDate: string, lifeExpectancy: string): Date {
  const birth = new Date(birthDate + 'T00:00:00');
  const lifeYears = parseInt(lifeExpectancy, 10);

  // NaN 검증
  if (Number.isNaN(lifeYears) || lifeYears < 1 || lifeYears > 150) {
    throw new Error('Invalid life expectancy');
  }

  const expectedDeath = new Date(birth);
  expectedDeath.setFullYear(birth.getFullYear() + lifeYears);
  return expectedDeath;
}

/**
 * Calculate remaining time until expected death
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @param lifeExpectancy - Expected life span in years
 * @returns Time left broken down by years, months, days, hours, minutes, seconds
 */
export function calculateTimeLeft(
  birthDate: string,
  lifeExpectancy: string
): TimeLeft {
  const expectedDeath = getExpectedDeathDate(birthDate, lifeExpectancy);
  const now = new Date();
  const difference = expectedDeath.getTime() - now.getTime();

  if (difference <= 0) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
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

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    hours: Math.max(0, hours),
    minutes: Math.max(0, minutes),
    seconds: Math.max(0, seconds),
  };
}

/**
 * Calculate total days remaining (accurate)
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @param lifeExpectancy - Expected life span in years
 * @returns Total days remaining
 */
export function calculateTotalDays(
  birthDate: string,
  lifeExpectancy: string
): number {
  const expectedDeath = getExpectedDeathDate(birthDate, lifeExpectancy);
  const now = new Date();
  const totalDays = Math.floor((expectedDeath.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, totalDays);
}

/**
 * Calculate total hours remaining (accurate)
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @param lifeExpectancy - Expected life span in years
 * @returns Total hours remaining
 */
export function calculateTotalHours(
  birthDate: string,
  lifeExpectancy: string
): number {
  const expectedDeath = getExpectedDeathDate(birthDate, lifeExpectancy);
  const now = new Date();
  const totalHours = Math.floor((expectedDeath.getTime() - now.getTime()) / (1000 * 60 * 60));
  return Math.max(0, totalHours);
}
