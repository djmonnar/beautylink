# 뷰티링크 (BeautyLink)

미용실 예약관리 CRM — 네이버예약·전화예약·방문예약을 한 화면에서 통합 관리

**Stack**: Next.js 16 · TypeScript · Tailwind CSS · Firebase (Auth + Firestore) · Vercel

---

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. Firebase 환경변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

> Firebase Console → 프로젝트 설정 → 앱 → SDK 구성에서 복사

### 3. 개발 서버 실행

```bash
npm run dev
```

---

## Firebase 초기 설정

### Authentication

Firebase Console → Authentication → Sign-in method → **이메일/비밀번호** 활성화

### Firestore Database

Firebase Console → Firestore Database → 데이터베이스 만들기 (프로덕션 모드)

### 초기 데이터 세팅 (`/setup`)

1. Firebase Authentication에서 원장 계정으로 회원가입 또는 생성
2. 앱에서 해당 계정으로 로그인
3. `/setup` 페이지 접속 → **Firestore 초기 세팅 시작** 클릭
4. 성공 후 대시보드로 이동

> `/setup`은 **owner 역할의 계정만** 접근 가능합니다.

---

## Firestore 보안 규칙 적용

### Firebase CLI로 배포 (권장)

```bash
# Firebase CLI 설치 (최초 1회)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 연결 (최초 1회)
firebase use beautylink-55cbb

# 규칙만 배포
firebase deploy --only firestore:rules
```

### Firebase Console에서 직접 적용

1. [Firebase Console](https://console.firebase.google.com) → 프로젝트 선택
2. 왼쪽 메뉴 → **Firestore Database** → **규칙** 탭
3. `firestore.rules` 파일 전체 내용을 복사해서 붙여넣기
4. **게시** 클릭

---

## Firestore 보안 규칙 구조

```
users/{uid}                               본인만 읽기/쓰기
salons/{salonId}                          소속 멤버 읽기 / owner 수정
salons/{salonId}/designers/{id}           전체 읽기 / owner·manager 수정 / owner 삭제
salons/{salonId}/services/{id}            전체 읽기 / owner·manager 수정 / owner 삭제
salons/{salonId}/customers/{id}           전체 읽기 / owner·manager 수정 / owner 삭제
salons/{salonId}/customerPrivate/{id}     owner·manager만 읽기/쓰기
salons/{salonId}/reservations/{id}        owner·manager 전체 / designer 본인 예약만
salons/{salonId}/messageTemplates/{id}    전체 읽기 / owner·manager 수정 / owner 삭제
salons/{salonId}/messageLogs/{id}         owner·manager 읽기/생성 / owner 수정·삭제
salons/{salonId}/integrationSettings/{id} 전체 읽기 / owner만 수정
salons/{salonId}/accessLogs/{id}          전체 생성 / owner·manager 읽기 / 수정·삭제 불가
```

### 역할별 권한 요약

| 기능 | owner | manager | designer |
|------|:-----:|:-------:|:--------:|
| 매장 정보 수정 | ✅ | ❌ | ❌ |
| 디자이너 관리 | ✅ | ✅ | ❌ |
| 시술 메뉴 관리 | ✅ | ✅ | ❌ |
| 고객 기본정보 | ✅ | ✅ | 읽기만 |
| 고객 민감정보 | ✅ | ✅ | ❌ |
| 예약 전체 관리 | ✅ | ✅ | 본인만 |
| 메시지 관리 | ✅ | ✅ | ❌ |
| 접근 로그 조회 | ✅ | ✅ | ❌ |
| 데이터 삭제 | ✅ | ❌ | ❌ |
| `/setup` 접근 | ✅ | ❌ | ❌ |

---

## Vercel 환경변수 설정

1. [Vercel Dashboard](https://vercel.com) → 프로젝트 → **Settings** → **Environment Variables**
2. 위의 `.env.local` 항목들을 **Production** + **Preview** 환경에 추가
3. 재배포: **Deployments** → 최신 배포 → **Redeploy**

> `Development` 환경은 민감정보 보호 정책으로 잠길 수 있습니다. 로컬 개발은 `.env.local` 사용.

---

## 네이버예약 연동 안내

현재 네이버예약 API는 **공식 제휴 검토 후 연동 예정**입니다.
API 승인 후 `/integrations/naver` 페이지에서 활성화됩니다.

---

## 주요 명령어

```bash
npm run dev      # 개발 서버 (Turbopack)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
firebase deploy --only firestore:rules  # 보안규칙만 배포
```

---

## AI 협업 하네스

Claude Code와 ChatGPT가 같은 기준으로 작업·검수·인수인계하는 문서 체계입니다.

### 문서 구조

| 파일 | 설명 | 업데이트 주체 |
|------|------|-------------|
| `AI_HANDOFF.md` | Phase 작업 완료 시 인수인계 요약 | Claude (작업마다) |
| `docs/AI_WORKFLOW.md` | 협업 규칙 및 역할 정의 | 필요 시 |
| `docs/QA_CHECKLIST.md` | 기능별 검수 체크리스트 | Claude (기능 추가 시) |
| `docs/FEATURE_STATUS.md` | 기능별 완료 상태표 | Claude (작업마다) |
| `docs/KNOWN_ISSUES.md` | 알려진 이슈 및 후순위 항목 | Claude / ChatGPT |

### 협업 방법

**Claude 작업 후:**
1. `AI_HANDOFF.md` 업데이트
2. `docs/FEATURE_STATUS.md` 상태 갱신
3. `npm run build` 통과 확인
4. 사용자 머지 후 ChatGPT 검수 요청

**ChatGPT 검수 시:**
- `AI_HANDOFF.md` + `docs/QA_CHECKLIST.md` + `docs/FEATURE_STATUS.md` 함께 확인
- 스크린샷 첨부 또는 GitHub 코드 링크로 검수

### 보안 원칙

> 아래 정보는 절대 문서에 기록하지 않습니다:
> - Firebase API Key, Secret
> - SMS/알림톡 API Key
> - 사용자 비밀번호
> - `customerPrivate.phoneRaw` (고객 원본 연락처)
> - 실제 사용자 UID
