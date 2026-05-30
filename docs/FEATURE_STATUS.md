# 기능별 완료 상태표

> 마지막 업데이트: 2026-05-30 (Phase 11 — 문자·알림톡·노쇼 관리 Firestore 연동 완료)

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
| 기간 선택 탭 | ✅ | `dashboard/page.tsx` | 오늘 / 최근 7일 / 최근 30일 (Phase 10) |
| 통계 카드 실데이터 | ✅ | `dashboard/page.tsx` | 예약수/완료매출/노쇼취소/신규고객 (Phase 10) |
| 시간대별/일별 차트 | ✅ | recharts BarChart | 오늘→시간대별, 7일/30일→일별 (Phase 10) |
| 예약 출처 파이차트 | ✅ | recharts PieChart | Firestore 실데이터 집계 (Phase 10) |
| 예약 목록 테이블 | ✅ | `dashboard/page.tsx` | 모바일 카드 뷰 + 날짜 컬럼 (기간 선택 시) |
| 디자이너별 예약 수 | ✅ | `dashboard/page.tsx` | 진행바 최대값 상대 비율 (Phase 10) |
| Firestore 실데이터 연동 | ✅ | `services/reservations.ts` | 오늘=단일 where, 7/30일=range 쿼리 (Phase 10) |
| salonId null safety | ✅ | `dashboard/page.tsx` | `?? null` + 가드 UI |
| 데모 모드 유지 | ✅ | `dashboard/page.tsx` | db=null이면 DEMO_DATE 기준 |
| 로딩/에러/빈 상태 | ✅ | `dashboard/page.tsx` | Loader2 스피너, 에러 배너, 빈 텍스트 |

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
| 주간 뷰 실제 구현 | ✅ | `calendar/page.tsx` | 데스크탑 7컬럼 그리드 + 모바일 요일칩 (Phase 8) |
| 월별 뷰 | 🔲 | 미구현 | 버튼 "준비중" 비활성화 처리 |
| salonId null safety | ✅ | `calendar/page.tsx` | `?? null` + 가드 UI (안정화 패치) |
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
| 휴무일 캘린더 편집 | ✅ | daysOff 배열 | 월간 달력 클릭 UI |
| 반복 휴무 보조 버튼 | ✅ | daysOff 배열 | 매요일 일괄 추가/제거 (Phase 7.5) |
| 스케줄 변경 accessLog | ✅ | logDesignerAccess | designer_schedule/work_days/days_off_updated |
| accessLog 기록 | ✅ | logDesignerAccess | |
| 스케줄 헬퍼 공유 함수 | ✅ | `src/lib/designerSchedule.ts` | isDesignerWorkingOnDate / isDesignerDayOff / getDesignerWorkStatus |

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
| 템플릿 목록 / 상세 UI | ✅ | `messages/page.tsx` | Firestore CRUD, 카드 그리드 (Phase 11) |
| 템플릿 등록 / 수정 | ✅ | `messages/page.tsx` | 바텀시트 모달, 변수 치환 미리보기 (Phase 11) |
| 템플릿 비활성화 (소프트) | ✅ | `services/messages.ts` | `active=false` (deleteDoc 금지) (Phase 11) |
| 기본 템플릿 5종 시드 | ✅ | `services/messages.ts` | 예약확정/리마인드/취소/노쇼/재방문 (Phase 11) |
| Mock 발송 테스트 탭 | ✅ | `messages/page.tsx` | 변수 치환 미리보기 → `messageLogs` 저장 (Phase 11) |
| 노쇼 관리 탭 | ✅ | `messages/page.tsx` | 노쇼 예약 목록 + 행별 발송 버튼 (Phase 11) |
| 발송 이력 탭 | ✅ | `messages/page.tsx` | type/channel/status 3중 필터 (Phase 11) |
| accessLog 기록 5종 | ✅ | `services/messages.ts` | template_created/updated/deactivated/mock_sent/noshow_sent (Phase 11) |
| 보안 페이지 메시지 액션 필터 | ✅ | `security/page.tsx` | 4종 액션 필터 추가 (Phase 11) |
| 실제 SMS 발송 | ⏸ | 미착수 | SENS API 연동 예정 |
| 실제 알림톡 발송 | ⏸ | 미착수 | 카카오 API 연동 예정 |
| 노쇼 자동 알림 (예약 시 자동) | ❌ | 미착수 | 수동 발송 UI는 구현됨 |

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
| accessLog 기록 | ✅ | 예약/고객/디자이너/시술/설정 | |
| accessLog 조회 UI | ✅ | `security/page.tsx` | Firestore 연동, 필터·요약카드·모바일카드뷰 |
| 설정 관련 액션 필터 | ✅ | `security/page.tsx` | user_profile_updated / salon_info_updated / password_reset_requested (Phase 9) |
| 권한 관리 편집 UI | ❌ | 미착수 | |

---

## 설정

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| 매장 정보 표시 | ✅ | `settings/page.tsx` | Firestore getSalon 연동 |
| 매장 정보 편집 | ✅ | `settings/page.tsx` | name/phone/address/description/naverPlaceUrl |
| 영업시간 구조적 편집 | ✅ | `settings/page.tsx` | 평일/주말 시간 picker + 정기 휴무 토글 (Phase 9) |
| 내 정보 편집 | ✅ | `settings/page.tsx` | name/phone 수정 + role/salonId/designerId 읽기 전용 |
| 비밀번호 변경 | ✅ | `settings/page.tsx` | sendPasswordResetEmail (이메일 발송) |
| accessLog 기록 | ✅ | `services/settings.ts` | user_profile_updated / salon_info_updated / password_reset_requested |
| 역할별 접근 제어 | ✅ | `settings/page.tsx` | 매장 정보: owner/manager만 수정 가능 |
| 모바일 탭 UI | ✅ | `settings/page.tsx` | 가로 스크롤 탭 칩 |
| 데스크탑 사이드바 UI | ✅ | `settings/page.tsx` | w-44 좌측 탭 메뉴 |

---

## 인프라 / 배포

| 기능 | 상태 | 관련 파일 | 비고 |
|------|------|----------|------|
| npm run build | ✅ | — | TypeScript strict 통과 |
| 모바일 UI (390px) | ✅ | — | Chrome DevTools 기준 |
| Vercel 배포 | ✅ | beautylink-alpha.vercel.app | 운영 테스트 중 |
| QA 검수센터 (/qa) | ✅ | `src/app/qa/page.tsx` | owner 전용, 연결 진단+쓰기 테스트 |
