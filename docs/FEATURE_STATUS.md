# 기능별 완료 상태표

> 마지막 업데이트: 2026-05-27 (Phase 4 — 모바일 UI 안정화 완료)

---

## 범례
- ✅ **완료** — 기능 구현 및 빌드 통과
- 🔶 **부분완료** — 기본 동작은 하나 일부 미흡
- 🔲 **미완성** — 착수했으나 핵심 기능 미구현
- ⏸ **보류** — 외부 의존성(API 승인 등)으로 대기
- ❌ **미착수** — 계획만 있음

---

## 인프라 / 공통

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| Firebase Auth 연동 | ✅ | `src/context/AuthContext.tsx` | 이메일/비밀번호 |
| Firestore 연동 | ✅ | `src/lib/firebase.ts` | 멀티테넌트 salons/{salonId} |
| 데모 모드 (Firebase 미설정) | ✅ | `src/data/mock.ts` | localStorage 기반 |
| Firestore 보안 규칙 | ✅ | `firestore.rules` | 역할별 권한 분리 |
| 환경변수 분리 | ✅ | `.env.local` | .gitignore 처리됨 |
| TypeScript strict mode | ✅ | `tsconfig.json` | 빌드 통과 |
| 초기 데이터 세팅 | ✅ | `/setup` | owner 전용 |

---

## 레이아웃 / 공통 UI

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| AdminLayout | ✅ | `AdminLayout.tsx` | h-dvh, 인증 가드 |
| 사이드바 | ✅ | `AppSidebar.tsx` | 모바일 오버레이, safe-area |
| 상단 헤더 | ✅ | `TopHeader.tsx` | 햄버거, 알림, 매장선택 |
| 모바일 하단 탭바 | ✅ | `MobileBottomNav.tsx` | 5탭, iOS 홈바 대응 |
| Toast 알림 | ✅ | services/page.tsx 내부 | 전역 컴포넌트 아님 |

---

## 대시보드

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| 오늘 예약 통계 카드 | ✅ | `dashboard/page.tsx` | 건수/매출/노쇼 |
| 시간대별 차트 | ✅ | recharts BarChart | Mock 데이터 |
| 예약 출처 파이차트 | ✅ | recharts PieChart | Mock 데이터 |
| 예약 목록 테이블 | ✅ | dashboard/page.tsx | 모바일 카드 뷰 포함 |
| 디자이너별 예약 수 | ✅ | dashboard/page.tsx | 프로그레스 바 |
| 실시간 데이터 연동 | 🔶 | getReservations | 데모날짜 고정 |

---

## 예약 등록

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| 고객 검색/선택 | ✅ | `reservations/new/page.tsx` | |
| 고객 인라인 생성 | ✅ | NewCustomerModal 컴포넌트 | |
| 디자이너 선택 + 필터링 | ✅ | 양방향 필터 | |
| 시술 선택 + 필터링 | ✅ | 양방향 필터 | |
| 가격/소요시간 자동입력 | ✅ | handleServiceChange | |
| 날짜/시간 선택 | ✅ | | |
| 중복 예약 감지 | ✅ | timeToMin() 겹침 체크 | |
| 휴무일/비근무일 경고 | ✅ | workDays, daysOff 체크 | |
| 저장 후 패널 | ✅ | 캘린더/재예약/초기화 버튼 | |
| accessLog 기록 | ✅ | logReservationAccess | |
| 권한별 접근 제한 | ✅ | designer = 본인 예약만 | |

---

## 예약 캘린더

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| 일별 그리드 뷰 | ✅ | `calendar/page.tsx` | 디자이너 컬럼 |
| 실시간 예약 구독 | ✅ | subscribeReservations | onSnapshot |
| 예약 상세 모달 | ✅ | ReservationModal | 바텀시트 |
| 상태 변경 (확정/완료/노쇼/취소) | ✅ | changeReservationStatus | |
| 완료 → 고객 방문이력 추가 | ✅ | customerRef arrayUnion | |
| 노쇼 → 고객 카운트 증가 | ✅ | customerRef increment | |
| 취소 사유 선택 | ✅ | CANCEL_REASONS | |
| 주간 뷰 실제 구현 | 🔲 | 버튼은 있으나 미구현 | 날짜 주간 범위 표시 안 됨 |
| 월별 뷰 | 🔲 | 미구현 | |
| 모바일 리스트 뷰 | ✅ | md 미만 표시 | |
| 모바일 요약 스트립 | ✅ | md 미만 표시 | |

---

## 고객 관리

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| 고객 목록/검색/필터 | ✅ | `customers/page.tsx` | |
| 고객 상세 패널 | ✅ | CustomerDetail | |
| 원본 연락처 조회 | ✅ | customerPrivate | owner/manager만 |
| 방문 이력 타임라인 | ✅ | visitHistory | |
| 고객 등록 | ✅ | CustomerFormModal | |
| 고객 수정 | ✅ | CustomerFormModal | |
| 연락처 중복 감지 | ✅ | phoneMasked 비교 | |
| 고객 삭제 | ❌ | 미착수 | 소프트 삭제 정책 결정 필요 |
| 모바일 오버레이 | ✅ | fixed overlay | |
| 모바일 바텀시트 모달 | ✅ | | |
| accessLog 기록 | ✅ | logCustomerAccess | |

---

## 디자이너 관리

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| 디자이너 목록 | ✅ | `designers/page.tsx` | |
| 디자이너 등록/수정 | ✅ | 모달 | |
| 상태 변경 (active/off/inactive) | ✅ | updateDesignerStatus | |
| 비활성화 (status=inactive) | ✅ | deactivateDesigner | deleteDoc 금지 |
| 근무 요일 설정 | ✅ | workDays 배열 | |
| 근무 시간 설정 | ✅ | startTime/endTime | |
| 담당 시술 연결 | ✅ | serviceIds | |
| 오늘 예약 현황 연동 | 🔶 | todayReservations 필드 | 자동 갱신 미구현 |
| 휴무일 캘린더 편집 | 🔲 | daysOff 배열 | 날짜 선택 UI 없음 |
| accessLog 기록 | ✅ | logDesignerAccess | |

---

## 시술 메뉴 관리

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| 시술 목록/카테고리 필터 | ✅ | `services/page.tsx` | |
| 시술 등록 | ✅ | addService | |
| 시술 수정 | ✅ | updateService | |
| 비활성화 (active=false) | ✅ | toggleServiceActive | deleteDoc 금지 |
| 담당 디자이너 연결 | ✅ | assignedDesignerIds | |
| 네이버 메뉴명 연결 | ✅ | naverMenuName | |
| 필수값 검증 | ✅ | price≥0, duration≥10, 10분 단위 | |
| 모바일 바텀시트 | ✅ | | |
| 모바일 폼 반응형 | ✅ | grid-cols-1 sm:grid-cols-2 | |
| accessLog 기록 | ✅ | logServiceAccess | |

---

## 문자 / 알림톡

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| 템플릿 목록 UI | 🔶 | `messages/page.tsx` | 기본 UI만 |
| 템플릿 편집 | 🔶 | Mock | Firestore 연동 필요 |
| 발송 이력 UI | 🔶 | Mock | |
| 실제 SMS 발송 | ⏸ | 미착수 | SENS API 연동 예정 |
| 실제 알림톡 발송 | ⏸ | 미착수 | 카카오 API 연동 예정 |
| 노쇼 자동 알림 | ❌ | 미착수 | |

---

## 네이버예약 연동

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| 연동 준비 UI | 🔶 | `integrations/naver/page.tsx` | |
| 디자이너 매핑 | 🔶 | Firestore 실제 데이터 반영 | |
| 시술 메뉴 매핑 | 🔶 | naverMenuName 기반 | |
| 실제 API 연동 | ⏸ | 미착수 | 공식 제휴 검토 후 |

---

## 보안 / 권한

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| Firestore Rules | ✅ | `firestore.rules` | |
| 역할별 UI 접근 제한 | ✅ | 각 페이지 가드 | |
| accessLog 기록 | ✅ | 예약/고객/디자이너/시술 | |
| accessLog 조회 UI | 🔲 | `security/page.tsx` 미완성 | |
| 권한 관리 편집 UI | ❌ | 미착수 | |

---

## 설정

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| 매장 정보 표시 | 🔶 | `settings/page.tsx` | |
| 매장 정보 편집 | ❌ | 미착수 | |
| 영업시간 설정 | ❌ | 미착수 | |

---

## 인프라 / 배포

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| npm run build | ✅ | — | TypeScript strict 통과 |
| 모바일 UI (390px) | ✅ | — | Chrome DevTools 기준 |
| Vercel 배포 | ❌ | 미착수 | 환경변수 설정 후 가능 |
| QA 검수센터 (/qa) | ❌ | 미착수 | Firestore 연결 진단 |
