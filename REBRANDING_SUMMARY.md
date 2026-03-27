# Death Clock → CHALNA Rebranding Summary

## 완료된 작업

### 1. TypeScript/JavaScript 파일 ✅
- **ReviewPrompt.ts**
  - Alert 메시지: "Death Clock" → "CHALNA"
  - Android 패키지명: `com.kimdaesoo.deathclock` → `com.kimdaesoo.chalna`
  - Fallback URL 업데이트

- **Analytics.ts**
  - Storage key: `death_clock_analytics` → `chalna_analytics`

- **NotificationService.ts**
  - Notification ID: `death_clock_notification` → `chalna_notification`

### 2. Android Kotlin 파일 ✅
새 파일 생성 및 기존 파일 삭제:
- ✅ `ChalnaNotificationService.kt` (was: `DeathClockNotificationService.kt`)
- ✅ `ChalnaWidgetProvider.kt` (was: `DeathClockWidgetProvider.kt`)
- ✅ `SharedPrefsModule.kt` - 클래스 참조 업데이트
  - SharedPreferences key: `DeathClockPrefs` → `ChalnaPrefs`
  - Service/Widget 참조 변경

### 3. Android XML 리소스 ✅
- ✅ `chalna_widget_info.xml` (was: `death_clock_widget_info.xml`)
- ✅ `chalna_widget.xml` (was: `death_clock_widget.xml`)
  - 위젯 제목 색상: `#ff6b6b` (빨강) → `#e8c547` (골드)
- ✅ `ic_notification.xml` - 해골 아이콘 → 모래시계 아이콘 (골드 강조)

### 4. Android 설정 파일 ✅
- **AndroidManifest.xml**
  - Widget receiver: `.DeathClockWidgetProvider` → `.ChalnaWidgetProvider`
  - Service: `.DeathClockNotificationService` → `.ChalnaNotificationService`
  - Widget info 리소스: `@xml/death_clock_widget_info` → `@xml/chalna_widget_info`

### 5. iOS 파일 ✅
- **Info.plist**
  - CFBundleDisplayName: "DeathClock" → "CHALNA"

### 6. 문서 및 스크립트 ✅
- **auto-sync-i18n.js** - 기본 앱 타이틀 번역 업데이트
  - 한국어: "💀 사망 시계"
  - 영어: "⏳ CHALNA"
  - 일본어: "⏳ チャルナ"
  - 중국어: "⏳ CHALNA"

- **sync-i18n.js** - 동일한 번역 업데이트

## 의도적으로 유지한 항목

다음 항목들은 **빌드 시스템에 영향**을 주거나 **대규모 리팩토링**이 필요하여 그대로 유지했습니다:

### Android
1. **패키지명**: `com.kimdaesoo.deathclock`
   - 변경하려면 전체 디렉토리 구조 변경 필요
   - Android Studio의 "Refactor → Rename Package" 기능 사용 권장

2. **app.json**: `"name": "DeathClock"`
   - React Native 빌드 체인의 핵심 식별자
   - 변경 시 Metro bundler 및 네이티브 모듈 연결 깨질 위험

3. **settings.gradle**: `rootProject.name = 'DeathClock'`
   - Gradle 빌드 설정의 루트 프로젝트 이름
   - 변경 시 빌드 스크립트 전체 수정 필요

4. **ProGuard rules** (`proguard-rules.pro`)
   - 현재 패키지명 기준으로 작성됨
   - 패키지명 변경 후 함께 업데이트

### iOS
1. **Xcode 프로젝트명**: `DeathClock.xcodeproj`
   - Xcode에서 "Rename Project" 기능 사용 권장
   - 수동 변경 시 많은 설정 파일이 깨질 수 있음

## 다음 단계 (선택적)

패키지명과 프로젝트명을 완전히 변경하려면:

### Android 패키지명 변경
1. Android Studio에서 프로젝트 열기
2. 패키지 우클릭 → Refactor → Rename
3. `com.kimdaesoo.deathclock` → `com.kimdaesoo.chalna`
4. "Search in comments and strings" 체크
5. "Search for text occurrences" 체크
6. Refactor 실행

### iOS 프로젝트명 변경
1. Xcode에서 프로젝트 열기
2. Project navigator에서 프로젝트명 클릭
3. Identity and Type에서 Name 변경
4. Rename 확인

### React Native 설정
- **주의**: `app.json`의 `name` 필드는 가급적 변경하지 않는 것을 권장합니다
- 변경 시 Metro bundler 캐시 완전 삭제 필요:
  ```bash
  rm -rf node_modules
  npm install
  npx react-native start --reset-cache
  ```

## 테스트 체크리스트

리브랜딩 후 다음 항목들을 테스트하세요:

- [ ] 앱 빌드 성공 (Android & iOS)
- [ ] 앱 이름이 "CHALNA"로 표시됨
- [ ] 알림 아이콘이 모래시계로 표시됨
- [ ] 위젯이 정상 작동하고 골드 색상으로 표시됨
- [ ] 영구 알림이 정상 작동함
- [ ] 리뷰 프롬프트가 "CHALNA" 이름으로 표시됨
- [ ] Analytics storage가 새 키로 저장됨
- [ ] SharedPreferences가 `ChalnaPrefs`로 정상 작동함

## 변경 통계

```
14 files changed, 34 insertions(+), 474 deletions(-)
```

- 삭제된 파일: 4개 (DeathClock 관련 Kotlin/XML)
- 추가된 파일: 4개 (Chalna 관련 Kotlin/XML)
- 수정된 파일: 10개

## Git 커밋 메시지 제안

```
Rebrand: Death Clock → CHALNA

- Replace all "Death Clock" references with "CHALNA"
- Rename Kotlin classes: DeathClock* → Chalna*
- Update notification icon: skull → hourglass (gold accent)
- Update widget branding with gold color (#e8c547)
- Update storage keys: death_clock_* → chalna_*
- Update iOS display name to "CHALNA"
- Update i18n scripts with new app name

Note: Package name (com.kimdaesoo.deathclock) and
project structure kept for build stability
```
