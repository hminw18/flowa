# 문제 해결 가이드

## Socket.io 연결 문제

### 증상: Railway 배포 후 연결 상태가 "error"

**원인:**
- 클라이언트가 잘못된 URL로 연결 시도
- CORS 설정 문제
- WebSocket transport 차단

**해결 방법:**

#### 1. 자동 URL 감지 (이미 적용됨)

클라이언트는 자동으로 현재 도메인을 감지합니다:
- 로컬: `http://localhost:3000`
- Railway: `https://your-app.railway.app`

코드 (lib/socket-client.ts:17):
```typescript
const url = typeof window !== 'undefined'
  ? window.location.origin
  : 'http://localhost:3000';
```

#### 2. CORS 설정 확인

서버는 모든 origin을 허용하도록 설정되어 있습니다 (데모용).

특정 도메인만 허용하려면 Railway 환경 변수에 추가:
```
ALLOWED_ORIGIN=https://your-app.railway.app
```

#### 3. 브라우저 콘솔 확인

F12 → Console에서 에러 메시지 확인:

**정상:**
```
[Socket] Connected: abc123
[Room] Joined successfully
```

**에러:**
```
[Socket] Connection error: ...
```

#### 4. Transport 설정

Socket.io는 자동으로 WebSocket → Polling 순서로 시도합니다.

수동 설정 (이미 적용됨):
```typescript
transports: ['websocket', 'polling']
```

### 증상: 연결은 되는데 메시지가 전송 안 됨

**원인:**
- 서버 로그 확인 필요
- 이벤트 리스너 누락

**해결:**

1. Railway 로그 확인:
   ```
   railway logs
   ```
   또는 Railway 대시보드 → Deployments → View Logs

2. 서버 로그에서 확인:
   ```
   [Socket] Client connected: xxx
   [Room] Client xxx joined room yyy
   ```

3. 메시지 전송 로그:
   ```
   [Translation] Success for message xxx
   ```

### 증상: "Translation timeout" 에러

**원인:**
- OpenAI API 응답 지연 (10초 초과)
- 네트워크 문제

**해결:**

1. OpenAI 상태 확인: https://status.openai.com

2. 타임아웃 증가 (server/translate.ts:11):
   ```typescript
   const TIMEOUT_MS = 15000; // 10초 → 15초
   ```

3. Fallback 확인:
   - 타임아웃 발생 시 자동으로 stub 번역 사용
   - 서버 로그: `[Translation] Timeout, falling back to stub`

## OpenAI API 문제

### 증상: "OpenAI API not configured" 경고

**원인:**
- `OPENAI_API_KEY` 환경 변수 미설정

**해결:**

**로컬:**
1. `.env.local` 파일 생성
2. API 키 입력:
   ```env
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
   ```
3. 서버 재시작

**Railway:**
1. Railway 대시보드 → Variables
2. 추가:
   ```
   OPENAI_API_KEY = sk-proj-xxxxxxxxxxxxxxxxxxxxx
   ```
3. 자동 재배포됨

### 증상: "Rate limit exceeded"

**원인:**
- OpenAI API 호출 한도 초과
- 무료 티어 제한

**해결:**

1. OpenAI 대시보드 확인: https://platform.openai.com/usage

2. 결제 방법 추가: https://platform.openai.com/account/billing

3. Usage limit 증가:
   - Settings → Organization → Limits
   - Hard limit 증가

4. 잠시 대기 후 재시도 (1분)

### 증상: API 키가 작동하지 않음

**확인 사항:**

1. 키 형식 확인:
   ```
   sk-proj-... (프로젝트 키)
   sk-... (레거시 키)
   ```

2. 키 권한 확인:
   - OpenAI 대시보드에서 키 상태 확인
   - 필요시 삭제 후 재발급

3. 환경 변수 확인:
   ```bash
   # Railway
   railway variables

   # 로컬
   cat .env.local
   ```

## 배포 문제

### 증상: Railway 빌드 실패

**원인:**
- 의존성 설치 실패
- TypeScript 컴파일 에러

**해결:**

1. 로컬에서 빌드 테스트:
   ```bash
   npm run build
   ```

2. 에러 확인 및 수정

3. 다시 푸시:
   ```bash
   git add .
   git commit -m "Fix build errors"
   git push
   ```

### 증상: Railway 서버 시작 실패

**원인:**
- 포트 바인딩 실패
- 환경 변수 누락

**해결:**

1. Railway 로그 확인:
   ```
   railway logs
   ```

2. 서버 시작 로그 확인:
   ```
   [Server] Socket.io initialized
   [Server] Ready on http://0.0.0.0:xxxx
   ```

3. 환경 변수 확인:
   - `OPENAI_API_KEY` 필수
   - `PORT` 자동 설정됨

### 증상: 도메인 접속 안 됨

**해결:**

1. Railway 대시보드 확인:
   - Settings → Networking
   - Public Networking 활성화 확인

2. 도메인 생성:
   - Generate Domain 클릭

3. 배포 상태 확인:
   - Deployments 탭
   - 최신 배포가 "Success" 상태인지 확인

## 성능 문제

### 증상: 번역이 느림

**원인:**
- OpenAI API 응답 지연
- 모델 선택

**해결:**

1. 더 빠른 모델 사용:
   ```env
   OPENAI_MODEL=gpt-3.5-turbo  # 가장 빠름
   ```

2. 타임아웃 조정:
   - 현재: 10초
   - 필요시 server/translate.ts에서 수정

### 증상: 메시지 전송 느림

**원인:**
- 서버 지연
- 네트워크 문제

**해결:**

1. Railway 지역 확인:
   - 가까운 지역 선택 (아시아: Singapore)

2. 클라이언트 네트워크 확인

3. Rate limiting 확인:
   - 현재: 초당 2메시지
   - server/socket-server.ts:30에서 조정 가능

## 비용 문제

### 증상: OpenAI 비용이 높음

**해결:**

1. 모델 변경:
   ```env
   OPENAI_MODEL=gpt-4o-mini  # 가장 저렴
   ```

2. Usage limit 설정:
   - https://platform.openai.com/account/billing/limits
   - Hard limit: $10/월 추천

3. 사용량 모니터링:
   - https://platform.openai.com/usage
   - 일일 확인

### 증상: Railway 비용이 높음

**해결:**

1. 사용하지 않을 때 일시정지:
   - Railway 대시보드 → 프로젝트
   - Pause Project

2. 리소스 모니터링:
   - Dashboard에서 사용량 확인
   - CPU/RAM 최적화

## 보안 문제

### API 키 노출됨

**즉시 조치:**

1. OpenAI API 키 삭제:
   - https://platform.openai.com/api-keys
   - 노출된 키 삭제

2. 새 키 발급

3. Railway 환경 변수 업데이트:
   ```bash
   railway variables set OPENAI_API_KEY=새키
   ```

4. GitHub에서 키 제거:
   - 커밋 히스토리에서 완전 삭제
   - 또는 저장소 재생성

### Git에 .env 파일 커밋됨

**조치:**

1. 즉시 키 삭제 및 재발급 (위 참조)

2. Git 히스토리에서 제거:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all

   git push --force --all
   ```

3. `.gitignore` 확인:
   ```
   .env
   .env*.local
   ```

## 추가 도움

여전히 문제가 해결되지 않으면:

1. GitHub Issues에 문의
2. Railway Discord: https://discord.gg/railway
3. OpenAI Support: https://help.openai.com

**문의 시 포함 사항:**
- 에러 메시지 전문
- 서버 로그
- 브라우저 콘솔 로그
- 환경 (로컬/Railway)
