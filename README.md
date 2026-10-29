# 공룡 러너

티라노가 달리며 장애물은 피하고 초식 공룡을 잡아먹는 안드로이드 게임.
1000점마다 바다로 뛰어들어 헤엄치고, 600점 뒤에 다시 땅으로 올라온다.

- 게임 본체: `www/` (HTML5 Canvas + 순수 JS, 빌드 도구 없음)
- 안드로이드 앱: Capacitor로 `www/`를 감싸서 APK로 만든다

## 브라우저에서 해보기

```bash
npm run serve
```

브라우저에서 http://localhost:5173 을 연다. 조작:

| | 땅 | 바다 |
|---|---|---|
| 화면 오른쪽 탭 / Space / ↑ | 점프 (길게 누르면 더 높이) | 누르고 있으면 위로 헤엄 |
| 화면 왼쪽 누르고 있기 / ↓ | 숙이기 | 누르고 있으면 위로 헤엄 |
| P / Esc | 잠깐 멈춤 | |
| M | 소리 끄기/켜기 | |

## 안드로이드 APK 만들기

### 처음 한 번 준비

1. **Node.js 22 이상** 설치 (Capacitor 8 요구사항)
2. **Android Studio** 설치 → 처음 실행할 때 SDK를 설치하게 둔다 (JDK 21이 함께 들어 있음)
3. 환경 변수
   - `JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr`
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
4. 프로젝트 폴더에서:

```bash
npm install
```

```bash
npm run android:setup
```

`android:setup`은 `android/` 프로젝트를 만들고 가로 고정, 전체화면, 화면 꺼짐 방지를 설정한다.

### 빌드

```bash
npm run android:build
```

결과물: `android/app/build/outputs/apk/debug/app-debug.apk` — 폰에 복사해서 설치하거나,
USB 디버깅을 켠 폰을 연결하고 `npm run android:open`으로 Android Studio에서 실행한다.

`www/`를 고친 뒤에는 `npm run android:build`를 다시 실행하면 된다.

## 파일 구성

| 파일 | 내용 |
|---|---|
| `www/js/main.js` | 게임 루프, 상태(시작/플레이/멈춤/끝), 땅↔바다 전환, 난이도 숫자 |
| `www/js/player.js` | 티라노: 점프·숙이기·헤엄, 무적 |
| `www/js/entities.js` | 장애물·먹이 종류와 색, 이동, 충돌 상자 |
| `www/js/spawner.js` | 무엇이 언제 나올지 (등장 점수, 간격) |
| `www/js/world.js` | 배경, 밤/낮, 바다, 해변, 카메라 |
| `www/js/sprites.js` | 픽셀 그림 데이터 |
| `www/js/hud.js` | 배부름 바, 점수, 버튼, 안내 문구, 화면 글씨 |
| `www/js/audio.js` | 효과음 (파일 없이 소리 합성) |
| `www/js/native.js` | 안드로이드 연결: 진동, 뒤로가기, 상태바 |
| `scripts/android-setup.js` | 안드로이드 가로 고정·전체화면 설정 |
