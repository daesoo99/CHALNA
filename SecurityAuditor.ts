// 간소화된 SecurityAuditor - CHALNA 앱 필수 검증만
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
      return { isValid: false, message: '생년월일을 입력해주세요' };
    }

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return { isValid: false, message: '올바른 날짜를 입력해주세요' };
    }

    // 미래 날짜 방지
    if (date > new Date()) {
      return { isValid: false, message: '미래 날짜는 입력할 수 없습니다' };
    }

    // 150년 이전 방지
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 150);
    if (date < minDate) {
      return { isValid: false, message: '너무 오래된 날짜입니다' };
    }

    return { isValid: true };
  }

  // 수명 검증
  validateLifeExpectancy(value: any): ValidationResult {
    const num = Number(value);

    if (isNaN(num) || !Number.isInteger(num)) {
      return { isValid: false, message: '올바른 숫자를 입력해주세요' };
    }

    if (num < 1 || num > 150) {
      return { isValid: false, message: '1-150 사이의 수명을 입력해주세요' };
    }

    return { isValid: true };
  }
}

export default SecurityAuditor;