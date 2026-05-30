# AI_HANDOFF.md — 뷰티링크 인수인계 문서

> Claude Code가 작업 완료 후 매번 업데이트하는 문서입니다.
> ChatGPT 검수 시 이 파일 + `docs/QA_CHECKLIST.md` + `docs/FEATURE_STATUS.md`를 함께 확인하세요.

---

## 마지막 업데이트

- **날짜**: 2026-05-30
- **작업자**: Claude Code (Sonnet 4.6)
- **작업 단계**: Phase 9 — 설정 페이지 편집 UI (내 정보 / 매장 정보 / 비밀번호 / accessLog)

---

## 최근 작업 요약

### Phase 9 — 설정 페이지 편집 UI

#### 주요 변경 파일
- **`src/types/index.ts`**: `Salon` 인터페이스 확장
  - `weekdayStart`, `weekdayEnd`, `weekendStart`, `weekendEnd`, `regularClosedDays` 필드 추가
- **`src/services/settings.ts`**: 전면 재작성
  - `SalonUpdate` 타입에 구조적 영업시간 필드 추가
  - `getSalon` 데모 fallback에 신규 필드 반영
  - `SettingsAction` 타입: `user_profile_updated | salon_info_updated | password_reset_requested`
  - `logSettingsAccess(salonId, action, userId, userName, role)` 신규 추가 → `salons/{salonId}/accessLogs`
- **`src/app/security/page.tsx`**: `ACTION_FILTERS` + `actionDisplay` 에 설정 관련 액션 3종 추가
- **`src/app/settings/page.tsx`**: 전면 재작성
  - **AdminLayout 래핑** (기존 raw div → AdminLayout)
  - **탭 구조**: 모바일 가로 스크롤 칩 / 데스크탑 w-44 좌측 사이드바
  - **내 정보 탭**: name/phone 수정 가능, email 읽기 전용, role/salonId/designerId/isActive 읽기 전용
  - **비밀번호 탭**: `sendPasswordResetEmail` 호출 (직접 변경 불가, 이메일 발송)
  - **매장 정보 탭**: name/phone/address/description/naverPlaceUrl 편집
    - 평일/주말 시작·종료 `<input type="time">` 피커
    - 정기 휴무일 토글 버튼 (일~토, 선택 시 인디고 강조)
    - `deriveBusinessHoursString(form)` → 레거시 `businessHours` 문자열 자동 생성
  - **권한 가드**: `isOM(=owner|manager)`만 매장 정보 수정 가능, designer는 읽기 전용
  - **salonId null 가드**: 황색 배너 + 탭 비활성화
  - **`ROLE_MAP as const`**: `userData.role` → `PermissionRole` 타입 안전 매핑
  - **accessLog**: 각 저장 액션마다 `logSettingsAccess` 호출

#### 빌드 상태
- `npm run build` 통과 (TypeScript strict, 16개 페이지 정상)

#### 남은 보완 (다음 작업 후보)
- 예약 캘린더 월간 뷰 구현
- 대시보드 실데이터 연동

---

### Phase 8 + 안정화 패치 — 예약 캘린더 주간 뷰 + 안정화

#### 주요 변경 파일
- **`src/services/reservations.ts`**: `subscribeReservationsWeek` 추가
  - Firestore `where("date", "in", weekDates[7개])` — 단일 필드 인덱스, 복합 인덱스 불필요
  - demo mode fallback (localStorage)
- **`src/app/calendar/page.tsx`**: 전면 개편
  - **salonId null safety**: `?? "salon1"` → `?? null`, 가드 UI (`bg-amber-50` 배너)
  - **null guard**: subscribeReservations / subscribeReservationsWeek / getDesigners 모두 `if (!salonId) return` 추가
  - **월 버튼 비활성화**: `<span>` + "준비중" 배지로 교체 (클릭 불가)
  - **주간 헬퍼**: `getWeekMonday`, `getWeekDates`, `formatWeekRange`
  - **데스크탑 주간 뷰**: 7컬럼 날짜 그리드 (월~일), 날짜별 예약 카드 (시간·고객·디자이너·상태)
  - **모바일 주간 뷰**: 요일 칩 탭 (월~일, 예약 건수 표시) + 선택 날짜 예약 리스트
  - **이전/다음 주 이동**: 월요일 기준 ±7일 스냅
  - **오늘·토·일 색상 강조**: 파란 배경(오늘), 파랑(토), 빨강(일)
  - **사이드바**: 주간 뷰 시 "이번 주 전체" 통계 표시
  - `isDesignerWorkingOnDate` 연동으로 휴무 판단 정확도 향상 (workDays + daysOff 통합)
  - **일별 뷰**: 기존 시간×디자이너 그리드 완전 유지

#### 빌드 상태
- `npm run build` 통과 (TypeScript strict, 16개 페이지 정상)
- Vercel `/calendar` 배포 확인 필요

#### 남은 보완 (다음 작업 후보)
- 월간 뷰 실제 구현 (현재 버튼 비활성화 "준비중" 처리)
- 대시보드 실시간 데이터 연동 (현재 데모 날짜 고정)
- 설정 페이지 매장 정보 편집 UI

---

### Phase 7.5 — 디자이너 스케줄 고도화
- **`src/lib/designerSchedule.ts`** 확장:
  - `getDesignerWorkStatus(designer, date)` — 5단계 상태 반환 (inactive/off/day_off/non_work_day/working)
  - `getWeekdayDatesInMonth(year, month, dow)` — 반복 휴무 보조용, 특정 월의 특정 요일 날짜 배열
  - `DesignerWorkStatus` 타입 export
- **`src/app/designers/page.tsx`** 개선:
  - **반복 휴무 보조 버튼**: "매일/매월/매화..." 버튼으로 해당 월 해당 요일 전체 일괄 추가/제거
    - 전체 추가됨 → 주황 버튼, 일부만 → 연한 주황, 없음 → 회색
    - 날짜 개수 표시 (예: 매월(4))
  - **근무 스케줄 구분선**: 색상/담당시술 섹션과 스케줄 섹션 사이에 시각적 구분선 추가
- **`src/app/reservations/new/page.tsx`** 강화:
  - `getDesignerWorkStatus` 헬퍼 import → inline 로직 교체
  - 디자이너 드롭다운에 `[비근무]` 배지 추가 (기존 `[휴무]`, `[특정휴무]`에 더해)
  - `selectedDate`를 `T00:00:00` 로컬 파싱으로 UTC 오프셋 방지

### Phase 7 — 디자이너 관리 고도화 (휴무일 캘린더 편집)
- **`src/lib/designerSchedule.ts`** 신규 생성 — 스케줄 관련 공유 헬퍼 함수
  - `isDesignerWorkingOnDate(designer, date)` — workDays + daysOff 통합 근무 여부 판단
  - `isDesignerDayOff(designer, date)` — 특정 휴무일 포함 여부
  - `formatDateStr(date)` — 로컬 시간 기준 YYYY-MM-DD 변환 (UTC toISOString 대신)
- **`src/app/designers/page.tsx`** DesignerFormModal 개선:
  - 기존 `<input type="date">` + "추가" 버튼 → **월간 달력 UI**로 교체
  - 이전/다음 달 이동 버튼 (ChevronLeft/Right)
  - 날짜 클릭 시 daysOff 토글 (주황색 강조)
  - 비근무 요일(workDays 미포함) 회색 표시
  - 오늘 날짜 파란 테두리 표시
  - 선택된 휴무일 목록 태그 + X 버튼 (달력과 동기화)
  - 범례 (휴무/오늘/비근무요일)
- **스케줄 변경 별도 accessLog**: `designer_schedule_updated`, `designer_work_days_updated`, `designer_days_off_updated`
- **`src/app/security/page.tsx`** actionDisplay + ACTION_FILTERS에 새 액션 5종 추가
  - `designer_schedule_updated`, `designer_work_days_updated`, `designer_days_off_updated`
  - `designer_status_changed`, `designer_deactivated`
- `npm run build` 통과 (TypeScript strict, 16개 페이지 모두 정상)

### Phase 6 — 보안/권한 관리 페이지 고도화
- `/security` 페이지 전면 재작성 (MOCK → Firestore 실 연동)
- 인증 가드 5단계 추가 (authLoading → !user → !userData → !isOM → designer 차단)
- **보안 요약 카드**: 최근 7일 접근 로그 통계 6종 (원본 조회/권한 오류 등 위험 강조)
- **접근 로그 테이블/카드**: Firestore `accessLogs` 최대 200건 조회, `orderBy("createdAt","desc")`
- **3단 필터**: 날짜(오늘/7일/30일/전체) + 액션(11종) + 사용자명 검색
- **위험 이벤트 강조**: `DANGER_ACTIONS` Set 기반 빨간 배경 + AlertTriangle 아이콘
- **모바일 카드형/데스크탑 테이블형** 분기 (`md:hidden` / `hidden md:block`)
- 역할별 권한 테이블 + 역할 상세 설명 섹션 유지·개선
- QA 검수센터 바로가기 링크 (owner 전용)
- Firestore Timestamp 처리 (`toDate()` 또는 string 양쪽 대응)

### Phase 5 보완 — ChatGPT 검수 반영
- `firestore.rules`: `qaChecks` owner 전용 규칙 추가
- `/qa` 권한 매트릭스: 예약 읽기/쓰기에 "designer는 본인 예약만 가능" note 표시
- 문서 상태 업데이트 (Vercel 배포 ✅)

### Phase 5 — QA 검수센터 추가 (이슈 #3)
- `/qa` 페이지 신규 생성 — owner 전용 Firestore 진단 페이지
- 5개 섹션: 계정 상태 / Firestore 연결 / 데이터 현황 / 권한 체크 / 쓰기 테스트
- `AppSidebar`에 "QA 검수센터" 메뉴 추가 (owner에게만 노출)
- `NavItem` 인터페이스 도입으로 `ownerOnly`, `badge` 속성 지원
- Firebase 미연결(데모 모드) 시 graceful fallback 처리

### Phase 4 — 모바일 UI 안정화
- `src/app/services/page.tsx` 전면 재작성
- Firestore `salons/{salonId}/services` 컬렉션 연동
- 카테고리 필터, 활성/비활성 토글, 담당 디자이너 연결

### Phase 2 — 예약 등록 UX 고도화
- `src/app/reservations/new/page.tsx` 전면 재작성
- 디자이너↔시술 양방향 필터링
- 고객 인라인 생성 (NewCustomerModal)
- 중복 예약 감지 (시간 겹침 체크)
- 휴무일/비근무일 체크
- 저장 후 패널 (캘린더 이동 / 동일 고객 재예약 / 초기화)

### Phase 3 — 시술 메뉴 안정화
- `salonId = userData?.salonId ?? null` (기본값 "salon1" 제거)
- "스타일링" 카테고리 추가
- 필수값 검증 강화 (price ≥ 0, duration ≥ 10 및 10분 단위)
- 빈 상태 UI 개선

### Phase 4 — 모바일 UI 안정화
- `AdminLayout.tsx`: `h-screen` → `h-dvh` (iOS Safari 대응)
- `MobileBottomNav.tsx` 신규 생성 (대시보드/캘린더/예약등록/고객/더보기)
- `AppSidebar.tsx`: safe-area-inset-bottom 적용
- `calendar/page.tsx`: 모바일 리스트 뷰 + 요약 스트립 + 바텀시트 모달
- `customers/page.tsx`: 모바일 고객 상세 전체화면 오버레이
- `dashboard/page.tsx`: 차트 overflow 보호 + 예약 목록 모바일 카드
- `services/page.tsx`: 바텀시트 모달 + 폼 그리드 반응형

---

## 변경한 주요 파일

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/app/settings/page.tsx` | 전면 재작성 | Phase 9: 내 정보/매장 정보/비밀번호 탭 편집 UI |
| `src/services/settings.ts` | 전면 재작성 | Phase 9: logSettingsAccess, 구조적 영업시간 필드 |
| `src/types/index.ts` | 수정 | Phase 9: Salon 인터페이스 영업시간 구조 확장 |
| `src/app/security/page.tsx` | 수정 | Phase 9: 설정 관련 액션 3종 추가 |
| `src/app/calendar/page.tsx` | 수정 | Phase 8: 주간 뷰, salonId null safety, 월 버튼 준비중 처리 |
| `src/services/reservations.ts` | 수정 | Phase 8: subscribeReservationsWeek 추가 |
| `src/lib/designerSchedule.ts` | 신규 | 스케줄 공유 헬퍼 (isDesignerWorkingOnDate, isDesignerDayOff) |
| `src/app/designers/page.tsx` | 수정 | 휴무일 달력 UI, 스케줄 accessLog 분리 |
| `src/app/security/page.tsx` | 수정 | actionDisplay + ACTION_FILTERS에 새 액션 5종 추가 |
| `src/app/qa/page.tsx` | 신규 | QA 검수센터 페이지 |
| `src/components/layout/AppSidebar.tsx` | 수정 | NavItem 인터페이스, ownerOnly 필터, QA 메뉴 추가 |

### Phase 4 이전 변경 파일

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/components/layout/MobileBottomNav.tsx` | 신규 | 모바일 하단 네비게이션 |
| `src/components/layout/AdminLayout.tsx` | 수정 | h-dvh, MobileBottomNav 연결, pb-20 |
| `src/components/layout/AppSidebar.tsx` | 수정 | safe-area-inset-bottom |
| `src/app/calendar/page.tsx` | 수정 | 모바일 리스트 뷰, 바텀시트 모달, 범례 숨김 |
| `src/app/customers/page.tsx` | 수정 | 모바일 오버레이, 바텀시트 모달 |
| `src/app/dashboard/page.tsx` | 수정 | 차트 overflow, 모바일 카드 뷰 |
| `src/app/services/page.tsx` | 수정 | 바텀시트 모달, 폼 반응형 |
| `src/app/reservations/new/page.tsx` | 전면 재작성 | 예약 등록 UX 전체 |
| `src/services/reservations.ts` | 수정 | addReservation createdBy, logReservationAccess |
| `src/services/services.ts` | 수정 | logServiceAccess 추가 |
| `src/types/index.ts` | 수정 | ServiceMenu 카테고리 + 필드 추가 |

---

## 새로 추가된 기능

- ✅ QA 검수센터 (`/qa`) — owner 전용 Firestore 진단 페이지
  - 로그인 계정 상태 (uid/email/name/role/salonId/designerId/isActive)
  - Firestore 9개 경로 연결 상태 + 문서 수 (`getCountFromServer`)
  - 데이터 현황 13개 항목 (활성 필터 포함)
  - 역할별 권한 체크 매트릭스
  - `qaChecks` 컬렉션 쓰기 테스트
  - 데모 모드(Firebase 미연결) graceful fallback
- ✅ 시술 메뉴 CRUD (Firestore 연동, 소프트 삭제 active=false)
- ✅ 예약 등록: 고객 인라인 생성
- ✅ 예약 등록: 디자이너↔시술 양방향 필터
- ✅ 예약 등록: 중복/휴무/비근무일 사전 차단
- ✅ 예약 등록: accessLog 기록
- ✅ 모바일 하단 네비게이션 바
- ✅ 캘린더 모바일 리스트 뷰
- ✅ 고객 상세 모바일 전체화면 오버레이
- ✅ 전체 모달 바텀시트 스타일 (모바일)

---

## 아직 미완성인 기능

| 기능 | 상태 | 비고 |
|------|------|------|
| 실제 SMS/알림톡 발송 | 보류 | Mock UI만 구현됨 |
| 실제 네이버예약 API | 보류 | 공식 제휴 후 연동 예정 |
| 디자이너 관리 고도화 | ✅ 완료 | 휴무일 달력 편집 UI 완성 (Phase 7) |
| 예약 캘린더 주간 뷰 | ✅ 완료 | 데스크탑 7컬럼 + 모바일 요일칩 (Phase 8) |
| 예약 캘린더 월간 뷰 | 🔲 미구현 | 버튼 "준비중" 비활성화 처리됨 |
| calendar salonId null safety | ✅ 완료 | `?? null` + 가드 UI (안정화 패치) |
| 설정 페이지 | ✅ 완료 | 내 정보/매장 정보/비밀번호 탭 편집 UI (Phase 9) |
| 보안/권한 관리 페이지 | ✅ 완료 | Phase 6에서 Firestore 연동 완료 |
| QA 검수센터 보완 | ✅ 완료 | firestore.rules qaChecks 규칙 추가, 권한 매트릭스 note 보정 |
| Vercel 배포 | ✅ 완료 | beautylink-alpha.vercel.app (운영 테스트 중) |

---

## 주의해야 할 점

### salonId null 안전성
```ts
// 모든 페이지에서 반드시 이 패턴 사용
const salonId = userData?.salonId ?? null;
if (!salonId) return <가드 UI />;
// async handler 안에서도
async function handleSave() {
  if (!salonId) return;
  ...
}
```

### Firestore 복합 인덱스 회피
- `orderBy` + `where` 조합 금지 (복합 인덱스 필요)
- 단일 `where`만 사용 후 클라이언트 정렬

### 소프트 삭제 원칙
- 시술 메뉴: `active=false` (절대 `deleteDoc` 금지)
- 디자이너: `status="inactive"` (절대 `deleteDoc` 금지)

### Firebase 미설정 시 데모 모드
```ts
if (!db) { return 로컬스토리지 Mock 데이터 }
```
Firebase 설정 없이도 앱이 동작함 (`.env.local` 미설정 상태)

---

## 테스트한 항목

- ✅ `npm run build` 통과 (Phase 9 포함, 16개 페이지 정상)
- ✅ Phase 9 TypeScript strict 오류 없음
- ✅ settings.ts `logSettingsAccess` 타입 안전 (ROLE_MAP as const)
- ✅ `deriveBusinessHoursString` 로직 코드 검토
- ✅ 설정 페이지 탭 전환 조건부 렌더링 구조
- ✅ salonId null 가드 — 매장 정보 탭 황색 배너
- ✅ security/page.tsx ACTION_FILTERS 3종 추가 빌드 통과
- ✅ `npm run build` 통과 (Phase 5~8 포함)
- ✅ QA 페이지 TypeScript 타입 오류 없음
- ✅ AppSidebar ownerOnly 필터링 로직
- ✅ 데모 모드(!db) graceful fallback UI
- ✅ 시술 메뉴 등록/수정/비활성화 (데모 모드)
- ✅ 예약 등록 폼 유효성 검사
- ✅ 예약 등록: 중복 감지 로직
- ✅ 모바일 하단 네비게이션 렌더링
- ✅ 모달 바텀시트 CSS 구조
- ✅ 캘린더 모바일 리스트 뷰 조건부 렌더링

## 테스트 못 한 항목

- ❌ 설정 페이지 실제 Firestore 저장 확인 (내 정보/매장 정보)
- ❌ 비밀번호 재설정 이메일 실제 수신 확인
- ❌ designer 역할로 설정 페이지 접근 시 매장 정보 탭 읽기 전용 동작 확인
- ❌ accessLog 보안 페이지에서 설정 관련 액션 필터 동작 확인
- ❌ 실제 Firebase 로그인 후 Firestore 읽기/쓰기
- ❌ 실제 모바일 기기(iPhone/Android) 직접 테스트
- ❌ 예약 등록 → Firestore 실제 저장 확인
- ❌ 권한별 접근 제한 (owner/manager/designer 실제 계정)
- ❌ 네이버예약 연동 실제 데이터

---

## ChatGPT에게 검수 요청할 포인트

1. **QA 페이지 구조**: 5개 섹션 순서와 정보 배치가 진단 목적에 적합한지 검토
2. **권한 체크 매트릭스**: designer 역할에서 예약 읽기/쓰기 "가능"이 맞는지 (본인 예약만 가능한데 UI에서 "가능"으로 표시됨) 검토 필요
3. **모바일 UX**: 스크린샷 첨부 후 바텀시트/리스트 뷰/하단 탭 UX 검수
2. **예약 등록 플로우**: 중복 감지 / 휴무일 차단 / 저장 후 패널 시나리오 검토
3. **권한 로직**: owner/manager/designer 역할별 UI 노출 기준 검토
4. **에러 처리**: salonId null 가드 / auth loading 가드 일관성 검토
5. **FEATURE_STATUS.md**: 다음 우선순위 작업 의견 요청

---

## 다음 추천 작업

우선순위 순:
1. **예약 캘린더 월간 뷰** — 현재 "준비중" 비활성화 처리됨, 실제 구현 필요
2. **대시보드 실데이터 연동** — 차트를 Firestore 예약 데이터로 집계
3. **권한 관리 편집 UI** — 역할별 권한 변경 기능
