# OpenAI API 설정 가이드

CI Messenger는 OpenAI API를 사용하여 한국어를 영어로 번역합니다.

## 1. OpenAI API 키 발급

### 단계별 가이드

1. **OpenAI 계정 생성**
   - https://platform.openai.com 접속
   - Sign up 또는 Log in

2. **API 키 생성**
   - 대시보드 → https://platform.openai.com/api-keys
   - "Create new secret key" 클릭
   - 키 이름 입력 (예: "CI Messenger")
   - **중요**: 키를 복사해서 안전한 곳에 저장 (다시 볼 수 없음)

3. **결제 정보 등록** (필수)
   - https://platform.openai.com/account/billing/overview
   - "Add payment method" 클릭
   - 신용카드 등록

4. **사용량 제한 설정** (권장)
   - Billing → Usage limits
   - Hard limit 설정 (예: $10/월)

## 2. 로컬 개발 환경 설정

### 환경 변수 파일 생성

프로젝트 루트에 `.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
```

### API 키 입력

`.env.local` 파일을 열고 발급받은 키 입력:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
```

### 서버 재시작

```bash
# 개발 서버 재시작
npm run dev
```

## 3. Railway 배포 환경 설정

### Railway 대시보드에서 환경 변수 설정

1. Railway 프로젝트 선택
2. **"Variables"** 탭 클릭
3. 환경 변수 추가:

```
OPENAI_API_KEY = sk-proj-xxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL = gpt-4o-mini
```

4. 자동으로 재배포됨

### Railway CLI로 설정

```bash
railway variables set OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
railway variables set OPENAI_MODEL=gpt-4o-mini
```

## 4. 모델 선택 가이드

### 추천: gpt-4o-mini (기본값)

- **가격**: $0.150 (입력) / $0.600 (출력) per 1M tokens
- **속도**: 매우 빠름
- **품질**: 번역에 충분히 우수
- **예상 비용**: 메시지 1,000개당 약 $0.05~0.10

### 대안: gpt-4o

- **가격**: $5 (입력) / $15 (출력) per 1M tokens
- **속도**: 빠름
- **품질**: 최고 수준
- **예상 비용**: 메시지 1,000개당 약 $1.50~3.00
- **추천 대상**: 최고 품질이 필요한 경우

### 저렴한 옵션: gpt-3.5-turbo

- **가격**: $0.50 (입력) / $1.50 (출력) per 1M tokens
- **속도**: 가장 빠름
- **품질**: 기본적인 번역에 적합
- **예상 비용**: 메시지 1,000개당 약 $0.01~0.02

## 5. 비용 계산 예시

### 일반적인 사용 시나리오

**가정:**
- 메시지 평균 길이: 20단어 (약 30 토큰)
- 번역 평균 길이: 25단어 (약 35 토큰)
- 모델: gpt-4o-mini

**비용 계산:**
```
1,000개 메시지 = 30,000 입력 토큰 + 35,000 출력 토큰
입력: (30,000 / 1,000,000) × $0.150 = $0.0045
출력: (35,000 / 1,000,000) × $0.600 = $0.021
총 비용: $0.0255 (약 35원)
```

**월간 예상 비용 (활발한 사용):**
- 하루 100개 메시지 × 30일 = 3,000개/월
- 예상 비용: **$0.08/월** (약 100원)

## 6. 동작 확인

### 번역이 작동하는지 확인

1. 앱 실행 후 룸 입장
2. 한국어 메시지 전송 (예: "오늘 날씨가 정말 좋네요")
3. 번역 보기 클릭
4. 영어 번역 확인 (예: "The weather is really nice today")

### 서버 로그 확인

**정상 작동 시:**
```
[Translation] Success for message xxx
```

**API 키 없을 때:**
```
OpenAI API not configured, using stub translation
```

**API 에러 시:**
```
[Translation] OpenAI error: ...
[Translation] API error, falling back to stub
```

## 7. Fallback 동작

OpenAI API가 실패하면 자동으로 stub 번역으로 전환됩니다:

- API 키가 없을 때
- API 호출 실패 시
- 타임아웃 발생 시 (10초)
- 네트워크 에러 시

**Stub 번역**: 25개의 일반적인 한국어 문구를 하드코딩으로 번역

## 8. 보안 주의사항

### API 키 관리

- ✅ **절대 Git에 커밋하지 마세요**
- ✅ `.env.local`은 `.gitignore`에 포함되어 있음
- ✅ Railway 환경 변수로만 설정
- ✅ 키가 노출되면 즉시 삭제하고 재발급

### 키 노출 시 조치

1. https://platform.openai.com/api-keys 접속
2. 노출된 키 삭제
3. 새 키 발급
4. 환경 변수 업데이트

## 9. 문제 해결

### "OpenAI API not configured" 경고

**원인**: 환경 변수가 설정되지 않음

**해결:**
```bash
# .env.local 파일 확인
cat .env.local

# 파일이 없으면 생성
cp .env.local.example .env.local
# 키 입력 후 서버 재시작
```

### "Translation timeout" 에러

**원인**: API 응답이 10초 이상 걸림

**해결:**
- 네트워크 연결 확인
- OpenAI 상태 확인: https://status.openai.com
- 타임아웃 증가 (server/translate.ts에서 TIMEOUT_MS 수정)

### "Rate limit exceeded" 에러

**원인**: API 호출 제한 초과

**해결:**
- OpenAI 대시보드에서 사용량 확인
- Rate limit 증가 요청
- 잠시 대기 후 재시도

### 번역 품질이 낮음

**해결:**
- 모델을 gpt-4o로 변경
- System prompt 조정 (server/translate.ts)
- Temperature 조정 (현재 0.3)

## 10. API 사용량 모니터링

### OpenAI 대시보드

- https://platform.openai.com/usage
- 일별/월별 사용량 확인
- 비용 추이 확인
- 사용량 알림 설정

### 예상 트래픽별 월 비용 (gpt-4o-mini)

| 일일 메시지 | 월간 메시지 | 예상 비용 |
|------------|-----------|----------|
| 50         | 1,500     | $0.04    |
| 100        | 3,000     | $0.08    |
| 500        | 15,000    | $0.38    |
| 1,000      | 30,000    | $0.77    |

## 참고 자료

- OpenAI API 문서: https://platform.openai.com/docs
- 가격 정보: https://openai.com/api/pricing
- 모델 비교: https://platform.openai.com/docs/models
- 상태 확인: https://status.openai.com
