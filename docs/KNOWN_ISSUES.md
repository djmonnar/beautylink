# 알려진 이슈 및 후순위 항목

> 마지막 업데이트: 2026-06-02 (Phase 15 — MVP 안정화 QA)
> 즉각 수정이 필요하지 않은 이슈, 외부 의존 이슈, 나중에 개선할 사항 목록

---

## 🔴 즉시 수정 필요

현재 즉시 수정이 필요한 코드 버그는 없음. 빌드 통과, TypeScript strict 통과.

---

## 🟡 나중에 개선

### [UI-1] 설정 페이지 — 매장 정보 매니저 수정 권한 불일치
- **현상**: QA 체크리스트에 "owner/manager 편집 가능"으로 기술되어 있으나, 코드(`settings/page.tsx`)는 `isOwner`만 수정 허용. Firestore rules도 `isOwnerOf(salonId)`만 허용.
- **결론**: 코드와 rules가 일치함 (owner only). QA 체크리스트 설명이 부정확.
- **처리**: QA_CHECKLIST.md 설명 보완 (manager는 읽기 전용 명시)
- **우선순위**: 낮음 (실제 버그 아님, 문서 오류)

### [UI-2] 시술 메뉴 모달 모바일 스크롤 김
- **현상**: 입력 항목이 많아 모바일에서 스크롤이 김
- **현재 처리**: `max-h-[90dvh]` 내 스크롤 가능
- **개선 여지**: 스텝 UI 또는 아코디언 적용 가능
- **우선순위**: 낮음

### [UI-3] 대시보드 신규 고객 카운트 — registeredAt 필드 의존
- **현상**: 신규 고객 수 = `registeredAt.startsWith(todayStr)` 로직. Firestore에 저장 시 `createdAt`이 아닌 `registeredAt` 필드가 있어야 동작.
- **확인 필요**: `/setup`이나 고객 등록 시 `registeredAt` 필드 저장 여부 확인
- **우선순위**: 중간

### [UI-4] 캘린더 월간 뷰 — 오늘 날짜 기본값 (데모 데이터와 1년 차이)
- **현상**: Firestore 데모 예약 데이터를 2026-05-31 기준으로 업데이트 완료. 새로 추가되는 실데이터는 실시간으로 반영됨.
- **상태**: Phase 15에서 Firebase 직접 접속해 데모 데이터 날짜 현재화 완료
- **우선순위**: 해결됨

### [LOGIC-1] 고객 삭제 기능 없음
- **현상**: 소프트 삭제 정책 미결정
- **개선 방향**: `isDeleted=true` 플래그 + 목록에서 필터 처리
- **우선순위**: 낮음 (소프트 삭제 정책 합의 필요)

### [LOGIC-2] 예약 상태 변경 시 accessLog 미기록 가능성
- **현상**: 예약 완료/노쇼/취소 처리 시 `changeReservationStatus()`가 Firestore를 직접 업데이트하지만 accessLog 기록 로직이 포함되어 있는지 불명확
- **확인 필요**: `src/services/reservations.ts`의 `changeReservationStatus` 함수 내 logReservationAccess 포함 여부
- **우선순위**: 중간

### [LOGIC-3] 디자이너 페이지 — role 기반 UI 가드 명시적 isOM 미적용
- **현상**: `/designers` 페이지가 Firestore rules에 의해 디자이너의 쓰기를 차단하나, UI에서 명시적 `isOM` 체크로 편집 버튼을 숨기는 처리가 불완전할 수 있음
- **실질 위험**: 낮음 (Firestore rules가 최종 방어선으로 작동)
- **개선 방향**: UI에서도 owner/manager만 편집 버튼 표시되도록 명시적 처리
- **우선순위**: 낮음

### [LOGIC-4] `/setup` 페이지 중복 실행 보호
- **현상**: 초기 데이터 세팅 중복 실행 시 데이터가 덮어쓰여질 수 있음
- **현재 처리**: `setDoc`으로 덮어쓰기 방식 (기존 데이터 사라짐)
- **개선 방향**: 이미 데이터가 있으면 경고 + 확인 다이얼로그
- **우선순위**: 낮음 (개발/초기 세팅 전용 페이지)

---

## ⏸ 외부 API 승인 후 처리

### [EXT-1] 실제 SMS/알림톡 API 미연동
- **현상**: 문자 발송이 Mock 상태 (status: "mock_sent")
- **이유**: SENS API / 카카오 비즈니스 계약 필요
- **개선 방향**: API Key 획득 후 Firebase Functions 또는 Server Action으로 연동
- **우선순위**: 외부 의존 (보류)

### [EXT-2] 실제 네이버예약 API 미연동
- **현상**: 연동 준비 UI만 있고 실제 예약 동기화 없음
- **이유**: 네이버 공식 제휴 승인 필요
- **개선 방향**: `/integrations/naver` 실제 API 연동
- **우선순위**: 외부 의존 (보류)

---

## 🧪 사용자가 실제 화면 테스트해야 하는 항목

| # | 항목 | 이유 |
|---|------|------|
| T-1 | 실제 로그인 후 전 페이지 동작 확인 | Claude Code는 브라우저 접속 불가 |
| T-2 | 모바일 실기기(iPhone/Android) 테스트 | DevTools 에뮬레이션과 실제 동작 차이 가능 |
| T-3 | Firestore 규칙 실제 위반 시도 | designer 계정으로 owner 전용 동작 시도 |
| T-4 | iOS Safari Safe Area 확인 | 홈바 침범 여부 실기기에서만 확인 가능 |
| T-5 | 예약 완료 처리 후 visitHistory 반영 | Firestore arrayUnion 실동작 확인 |
| T-6 | 노쇼 처리 후 고객 noShowCount 반영 | Firestore increment 실동작 확인 |
| T-7 | 기본 템플릿 5개 생성 후 중복 재시도 | 중복 생성 방어 로직 실동작 확인 |
| T-8 | 보안 페이지 accessLog 실데이터 확인 | 위 시나리오 수행 후 각 액션 로그 존재 여부 |
| T-9 | Vercel 환경변수 6개 설정 후 배포 | 배포 환경에서 Firebase 연결 확인 |
| T-10 | `beautylink@gmail.com` 로그인 | manager 역할로 앱 전체 동작 확인 |

---

## 코드 위험 패턴 스캔 결과 (Phase 15)

| 패턴 | 검색 결과 | 판정 |
|------|----------|------|
| `?? "salon1"` 기본값 하드코딩 | **없음** | ✅ 안전 |
| `deleteDoc` 실사용 | 주석에만 1건 ("금지" 언급) | ✅ 안전 |
| `phoneRaw` UI 노출 | `customers/private` 전용, 적절히 사용 | ✅ 안전 |
| API Key 하드코딩 | **없음** | ✅ 안전 |
| Secret 하드코딩 | **없음** | ✅ 안전 |
| MOCK_ 데이터 운영 노출 | `!db` 조건 하에서만 사용 (데모 모드) | ✅ 안전 |
| `noshow` 오타 | `noShow`(상태)와 `noshow`(메시지타입) 구분 사용, 의도적 | ✅ 정상 |
| 복합 인덱스 위험 쿼리 | `orderBy`+`where` 조합 없음 | ✅ 안전 |
| 무한 로딩 가능성 | 모든 async에 try/catch + setLoading(false) | ✅ 안전 |

---

## 해결된 이슈 (참고용)

| 이슈 | 해결일 | 해결 방법 |
|------|--------|----------|
| `h-screen` iOS Safari 뷰포트 오류 | 2026-05-27 | `h-dvh`로 교체 |
| `salonId ?? "salon1"` 기본값 보안 이슈 | 2026-05-27 | `?? null` + null 가드 |
| 시술 메뉴 "스타일링" 카테고리 없음 | 2026-05-27 | ServiceMenu category union에 추가 |
| 예약 등록 중복 체크 없음 | 2026-05-27 | `timeToMin()` 겹침 감지 로직 추가 |
| /security MOCK 데이터 전용 접근 로그 | 2026-05-27 | Firestore accessLogs 실 연동 |
| qaChecks Firestore 규칙 누락 | 2026-05-27 | firestore.rules에 owner 전용 규칙 추가 |
| 디자이너 휴무일 편집 UI 없음 | 2026-05-29 | 월간 달력 클릭 UI 구현 |
| 캘린더 주간 뷰 미구현 | 2026-05-29 | Phase 8: 7컬럼 그리드 + 모바일 요일칩 |
| 캘린더 월간 뷰 미구현 | 2026-05-31 | Phase 14: 6×7 그리드 + 월간 통계 |
| 직원/권한 관리 편집 UI 없음 | 2026-05-31 | Phase 13: /security 직원 관리 탭 추가 |
| beautylink@gmail.com Firestore 문서 없음 | 2026-06-02 | Firebase MCP로 직접 users 문서 생성 |
| 예약 데모 데이터 날짜 2025년 | 2026-06-02 | Firebase MCP로 직접 날짜 현재화 (2026-05~06) |
