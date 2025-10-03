// 간소화된 SecurityAuditor - CHALNA 앱 필수 검증만
import i18n from './i18n';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export class SecurityAuditor {
  private static instance: SecurityAuditor;

  static getInstance(): SecurityAuditor {
    if (!SecurityAuditor.instance) {
      SecurityAuditor.instance = new SecurityAuditor();
    }
    return SecurityAuditor.instance;
  }

  // 날짜 검증 (생년월일)
  validateBirthDate(dateValue: any): ValidationResult {
    if (!dateValue) {
      return { isValid: false, message: i18n.t('validationBirthDateRequired') };
    }

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return { isValid: false, message: i18n.t('validationBirthDateInvalid') };
    }

    // 미래 날짜 방지
    if (date > new Date()) {
      return { isValid: false, message: i18n.t('validationBirthDateFuture') };
    }

    // 150년 이전 방지
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 150);
    if (date < minDate) {
      return { isValid: false, message: i18n.t('validationBirthDateTooOld') };
    }

    return { isValid: true };
  }

  // 수명 검증
  validateLifeExpectancy(value: any): ValidationResult {
    const num = Number(value);

    if (isNaN(num) || !Number.isInteger(num)) {
      return { isValid: false, message: i18n.t('validationLifeExpectancyInvalid') };
    }

    if (num < 1 || num > 150) {
      return { isValid: false, message: i18n.t('validationLifeExpectancyRange') };
    }

    return { isValid: true };
  }
}

export default SecurityAuditor;