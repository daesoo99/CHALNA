# ⏳ CHALNA

**찰나(刹那) - Every Moment Matters**

CHALNA는 시간의 소중함을 깨닫게 해주는 철학적 시간 관리 앱입니다. 불교 철학의 "찰나" 개념을 현대적으로 해석하여, 매 순간을 의미있게 살도록 동기부여를 제공합니다.

## 🎯 핵심 철학

CHALNA는 "Memento Mori"(죽음을 기억하라)의 현대적 해석으로, 시간의 유한성을 통해 삶의 우선순위를 재정립하고 매 순간을 소중히 여기도록 돕습니다.

## ✨ 주요 기능

- **⏳ 실시간 생명 시계**: 생년월일과 예상 수명을 기반으로 남은 시간을 실시간 계산
- **🎨 명상적 UI**: 따뜻한 골드 톤의 평온한 디자인
- **🌍 다국어 지원**: 한국어, 영어, 일본어, 중국어
- **🌙 테마 지원**: 다크/라이트 테마 전환
- **📱 위젯 지원**: Android 홈 화면 위젯
- **🔔 알림 시스템**: 마일스톤 및 일일 알림
- **♿ 접근성**: 스크린 리더 및 접근성 최적화

## 🚀 기술 스택

- **React Native 0.73+**
- **TypeScript**
- **i18next** (다국어)
- **AsyncStorage** (로컬 저장)
- **React Native Push Notification**

## 📱 지원 플랫폼

- Android (API 21+)
- iOS (iOS 12+) - 예정

## 🛠 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- React Native CLI
- Android Studio (Android 개발)
- JDK 17+

### 설치 및 실행

```bash
# 의존성 설치
npm install

# Metro 번들러 시작
npm start

# Android 빌드 및 실행
npx react-native run-android

# iOS 빌드 및 실행 (macOS만)
npx react-native run-ios
```

### 빌드

```bash
# Android Debug APK
cd android && ./gradlew assembleDebug

# Android Release AAB (Play Store용)
cd android && ./gradlew bundleRelease
```

## 🌍 다국어 지원

```bash
# 다국어 파일 동기화
npm run i18n:sync

# 자동 번역 동기화 시작
npm run start-auto-i18n
```

## 📄 앱 구조

```
src/
├── App.tsx                 # 메인 앱 컴포넌트
├── themes.ts              # 테마 설정
├── i18n.ts               # 다국어 설정
├── SecurityAuditor.ts    # 입력 검증
├── StorageManager.ts     # 로컬 저장소 관리
├── CrashReporter.ts      # 오류 보고
├── ErrorBoundary.tsx     # 오류 경계
└── locales/              # 다국어 파일
    ├── ko.json           # 한국어
    ├── en.json           # 영어
    ├── ja.json           # 일본어
    └── zh.json           # 중국어
```

## 🎨 브랜딩 변화

### 이전 (Death Clock)
- 💀 어두운 해골 테마
- 부정적 연상
- 죽음에 초점

### 현재 (CHALNA)
- ⏳ 따뜻한 모래시계 테마
- 철학적 깊이
- 시간의 소중함에 초점

## 📊 성능 최적화

- **React.memo** 및 **useCallback** 활용
- **useMemo**로 비용이 큰 계산 최적화
- 메모리 누수 방지를 위한 cleanup 로직
- 백그라운드 상태 최적화

## 🔒 보안 및 개인정보

- 모든 데이터 로컬 저장
- 네트워크 통신 없음
- 개인정보 수집 최소화
- GDPR 및 개인정보보호법 준수

## 📱 Google Play Store 출시 준비

- ✅ 콘텐츠 정책 준수 (민감성 이슈 해결)
- ✅ 다국어 지원
- ✅ 접근성 최적화
- ✅ 개인정보처리방침 완비
- ✅ Teen(13+) 등급 적합

## 🤝 기여하기

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 연락처

- 개발자: Kim Daesoo
- 프로젝트: CHALNA

---

**"찰나의 소중함을 느끼세요" - CHALNA**

> 매 순간이 새로운 시작입니다. CHALNA와 함께 시간의 진정한 가치를 발견하세요.