# Railway 배포 가이드

이 가이드는 CI Messenger를 Railway에 배포하는 방법을 설명합니다.

## 사전 준비

1. **GitHub 계정** - Railway는 GitHub 연동을 통해 배포합니다
2. **Railway 계정** - https://railway.app 에서 가입 (GitHub 계정으로 로그인 가능)
3. **Git 저장소** - 프로젝트를 GitHub에 푸시해야 합니다

## 배포 방법

### 방법 1: Railway 웹사이트 (추천)

가장 쉬운 방법입니다.

#### 1단계: GitHub에 코드 푸시

```bash
# Git 초기화 (아직 안했다면)
git init
git add .
git commit -m "Initial commit"

# GitHub 저장소 생성 후
git remote add origin https://github.com/your-username/your-repo.git
git branch -M main
git push -u origin main
```

#### 2단계: Railway에서 프로젝트 생성

1. https://railway.app 접속
2. **"New Project"** 클릭
3. **"Deploy from GitHub repo"** 선택
4. GitHub 저장소 연결 및 권한 부여
5. 배포할 저장소 선택

#### 3단계: 환경 변수 설정 (필수)

**중요**: 번역 기능을 위해 OpenAI API 키를 설정해야 합니다.

Railway 대시보드에서:
1. 프로젝트 클릭
2. **"Variables"** 탭 클릭
3. 환경 변수 추가:
   - `OPENAI_API_KEY` = `sk-proj-xxxxx` (필수)
   - `OPENAI_MODEL` = `gpt-4o-mini` (선택사항, 기본값)
   - `NODE_ENV` = `production` (자동 설정됨)

**OpenAI API 키 발급**: [상세 가이드 보기](./OPENAI_SETUP.md#1-openai-api-키-발급)

#### 4단계: 배포 완료

- Railway가 자동으로 빌드하고 배포합니다
- 배포 완료 후 URL이 생성됩니다 (예: `https://your-app.railway.app`)
- **"Settings"** → **"Generate Domain"**에서 공개 URL 생성

---

### 방법 2: Railway CLI

CLI를 선호하는 경우 이 방법을 사용하세요.

#### 1단계: Railway CLI 설치

```bash
# macOS (Homebrew)
brew install railway

# npm
npm install -g @railway/cli

# Windows (Scoop)
scoop install railway
```

#### 2단계: 로그인

```bash
railway login
```

브라우저가 열리고 GitHub로 인증합니다.

#### 3단계: 프로젝트 초기화

```bash
# 프로젝트 디렉토리에서
railway init
```

프로젝트 이름을 입력하고 생성합니다.

#### 4단계: 환경 변수 설정 (필수)

```bash
# OpenAI API 키 설정 (필수)
railway variables set OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# 모델 설정 (선택사항)
railway variables set OPENAI_MODEL=gpt-4o-mini

# 또는 .env 파일에서 일괄 업로드
railway variables set -f .env
```

**OpenAI API 키 발급**: [상세 가이드](./OPENAI_SETUP.md#1-openai-api-키-발급)

#### 5단계: 배포

```bash
# 배포 실행
railway up

# 또는 Git 연동 후 자동 배포
railway link
git push
```

#### 6단계: 도메인 생성

```bash
railway domain
```

생성된 URL로 앱에 접속할 수 있습니다.

---

## 배포 후 확인사항

### 1. 로그 확인

**웹 대시보드:**
- Railway 프로젝트 → "Deployments" → 최신 배포 클릭 → "View Logs"

**CLI:**
```bash
railway logs
```

다음 로그가 보이면 정상입니다:
```
[Socket.io] Server initialized
[Server] Socket.io initialized
[Server] Ready on http://0.0.0.0:3000
```

### 2. Socket.io 연결 테스트

1. 배포된 URL 접속 (예: https://your-app.railway.app)
2. 새 룸 생성
3. 다른 브라우저/탭에서 같은 룸 접속
4. 메시지 전송 테스트

### 3. 브라우저 콘솔 확인

개발자 도구 → Console에서:
```
[Socket] Connected: xxxxx
[Room] Joined successfully
```

---

## 문제 해결

### 배포 실패

**빌드 에러:**
```bash
# 로컬에서 빌드 테스트
npm run build
```

**시작 에러:**
```bash
# 로컬에서 프로덕션 모드 테스트
NODE_ENV=production npm start
```

### Socket.io 연결 실패

**증상:** 브라우저 콘솔에 연결 에러

**해결:**
1. Railway 대시보드 → "Settings" → "Networking"
2. Public Networking이 활성화되어 있는지 확인
3. 도메인이 생성되어 있는지 확인

### CORS 에러

환경 변수 추가:
```bash
railway variables set ALLOWED_ORIGIN=https://your-app.railway.app
```

---

## 자동 배포 설정

Railway는 기본적으로 GitHub의 main 브랜치에 푸시할 때마다 자동 배포됩니다.

**자동 배포 비활성화:**
1. Railway 대시보드 → "Settings"
2. "Deployment Triggers" 수정

**특정 브랜치만 배포:**
1. "Settings" → "Service"
2. "Branch" 변경

---

## 비용 관련

### Railway 호스팅 비용
- **Developer Plan**: $5/월 - 500시간 + $0.000231/분
- **Hobby Plan**: $20/월 - 무제한

### OpenAI API 비용
- **gpt-4o-mini**: $0.150 (입력) / $0.600 (출력) per 1M tokens
- **예상 비용**: 메시지 1,000개당 약 $0.03

### 총 예상 비용
- **Railway**: $20/월 (Hobby Plan)
- **OpenAI**: ~$1-3/월 (일반적인 사용)
- **총**: 약 $21-23/월

**비용 절감 팁:**
- 사용하지 않을 때는 Railway 프로젝트 일시정지
- OpenAI 사용량 제한 설정 (Billing → Usage limits)
- Railway/OpenAI 대시보드에서 사용량 모니터링

---

## 추가 설정

### 커스텀 도메인

1. Railway 대시보드 → "Settings" → "Domains"
2. "Custom Domain" 추가
3. DNS 설정 (CNAME 또는 A 레코드)

### 데이터베이스 추가 (향후 확장)

```bash
# PostgreSQL 추가
railway add postgresql

# Redis 추가
railway add redis
```

환경 변수에 DATABASE_URL이 자동 추가됩니다.

---

## 참고 자료

- Railway 공식 문서: https://docs.railway.app
- Socket.io 문서: https://socket.io/docs
- Next.js 배포 가이드: https://nextjs.org/docs/deployment

---

## 빠른 배포 체크리스트

- [ ] GitHub에 코드 푸시
- [ ] Railway 계정 생성
- [ ] Railway에서 GitHub 저장소 연결
- [ ] 프로젝트 배포 (자동)
- [ ] 공개 도메인 생성
- [ ] Socket.io 연결 테스트
- [ ] 두 브라우저로 실시간 채팅 테스트

완료!
