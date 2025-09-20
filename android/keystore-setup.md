# Android Release Keystore 생성 가이드

## 1. Java JDK 설치 확인
Windows에서 Java가 설치되어 있지 않은 것 같습니다. 다음 중 하나를 실행하세요:

### 방법 1: Android Studio에서 생성
1. Android Studio 열기
2. Build > Generate Signed Bundle / APK 클릭
3. APK 선택 > Next
4. "Create new..." 클릭
5. 다음 정보 입력:
   - Key store path: `android/app/release.keystore`
   - Password: `deathclock2025`
   - Key alias: `death-clock-key`
   - Key password: `deathclock2025`
   - Validity (years): 25
   - Certificate:
     - First and Last Name: Death Clock
     - Organizational Unit: Mobile Apps
     - Organization: Kim Daesoo
     - City: Seoul
     - State: Seoul
     - Country: KR

### 방법 2: 명령행에서 생성 (Java 설치 필요)
```bash
# Windows Command Prompt에서 실행
keytool -genkey -v -keystore android\app\release.keystore -alias death-clock-key -keyalg RSA -keysize 2048 -validity 10000 -storepass deathclock2025 -keypass deathclock2025 -dname "CN=Death Clock, OU=Mobile Apps, O=Kim Daesoo, L=Seoul, ST=Seoul, C=KR"
```

## 2. build.gradle 설정 (이미 준비됨)
release.keystore 파일이 생성되면 build.gradle에서 다음과 같이 수정:

```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file('release.keystore')
        storePassword 'deathclock2025'
        keyAlias 'death-clock-key'
        keyPassword 'deathclock2025'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        debuggable false
    }
}
```

## 3. 보안 주의사항
- release.keystore 파일을 안전한 곳에 백업하세요
- 비밀번호를 안전하게 보관하세요
- Git에 커밋하지 마세요 (.gitignore에 추가)

## 4. .gitignore 추가
```
# Keystore files
*.keystore
*.jks
release.keystore
```