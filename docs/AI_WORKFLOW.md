# AI 협업 워크플로우

뷰티링크 프로젝트에서 **Claude Code**와 **ChatGPT**가 같은 기준으로 작업·검수·인수인계하는 협업 규칙입니다.

---

## 역할 분담

### Claude Code (구현 담당)
- 기능 구현, 리팩터링, 버그 수정
- TypeScript 빌드 통과 확인 (`npm run build`)
- 작업 완료 시 `AI_HANDOFF.md` 업데이트
- Firestore Rules / Auth 설정은 변경하지 않음
- 민감정보(API Key, 비밀번호, phoneRaw)는 절대 코드에 하드코딩하지 않음

### ChatGPT (검수/기획 담당)
- `AI_HANDOFF.md` + `docs/QA_CHECKLIST.md` + `docs/FEATURE_STATUS.md` 기반으로 검수
- UX 개선 의견, 코드 리뷰, 다음 작업 프롬프트 작성
- 실제 로그인/데이터 접근 불가 → 스크린샷 또는 GitHub 코드 기준으로 검수
- Vercel 배포 후 공개 URL이 있으면 비로그인 화면(/, /login) 직접 확인 가능

### 사용자 (최종 승인 담당)
- 실제 로그인 후 기능 테스트
- 스크린샷 제공 (모바일/데스크탑)
- ChatGPT 검수 결과 → Claude에게 다음 작업 지시
- 머지(merge) 최종 승인

---

## 작업 사이클

```
사용자 요청
    ↓
Claude Code — 구현 + build 통과 확인
    ↓
AI_HANDOFF.md 업데이트
    ↓
사용자 — 머지 확인 ("머지했어")
    ↓
ChatGPT — AI_HANDOFF.md + 스크린샷으로 검수
    ↓
검수 결과 → 사용자 → 다음 작업 지시
    ↓
반복
```

---

## 문서 업데이트 규칙

| 문서 | 업데이트 시점 | 담당 |
|------|-------------|------|
| `AI_HANDOFF.md` | Phase 작업 완료마다 | Claude |
| `docs/FEATURE_STATUS.md` | 기능 상태 변경마다 | Claude |
| `docs/KNOWN_ISSUES.md` | 이슈 발견/해결마다 | Claude 또는 ChatGPT |
| `docs/QA_CHECKLIST.md` | 새 기능 추가 시 | Claude |

---

## Phase 단위 작업 기준

큰 작업은 Phase로 나누어 진행:

- **Phase 1~3**: 핵심 기능 (시술/예약/고객)
- **Phase 4**: 모바일 UI
- **Phase 5**: 디자이너 관리 고도화 (예정)
- **Phase 6**: 캘린더 뷰 개선 (예정)
- **Phase 7**: 알림/메시지 실제 연동 (예정)
- **Phase 8**: Vercel 배포 + 운영 안정화 (예정)

---

## 보안 규칙

**절대 문서에 기록하지 않을 정보:**
- Firebase API Key, Secret
- Firestore Service Account 키
- 문자/알림톡 API Key (SENS, 카카오 등)
- 사용자 비밀번호
- `customerPrivate.phoneRaw` (고객 원본 연락처)
- 실제 사용자 UID

**환경변수는 `.env.local`에만 저장, GitHub에 올리지 않음 (`.gitignore` 확인)**

---

## ChatGPT 검수 요청 방법

### 방법 1: 스크린샷 + AI_HANDOFF.md 붙여넣기
```
[AI_HANDOFF.md 내용 붙여넣기]
[스크린샷 첨부]
"위 내용 기준으로 UX/코드 검수해줘."
```

### 방법 2: GitHub 코드 직접 링크
```
"이 파일 검수해줘: https://github.com/[repo]/blob/main/src/app/calendar/page.tsx"
```

### 방법 3: Vercel 배포 후 URL 공유 (ChatGPT Plus)
```
"이 URL 열어서 비로그인 화면 검수해줘: https://beautylink.vercel.app"
```
