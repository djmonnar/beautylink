# AI_HANDOFF.md — 뷰티링크 인수인계 문서

> Claude Code가 작업 완료 후 매번 업데이트하는 문서입니다.
> ChatGPT 검수 시 이 파일 + `docs/QA_CHECKLIST.md` + `docs/FEATURE_STATUS.md`를 함께 확인하세요.

---

## 마지막 업데이트

- **날짜**: 2026-06-02
- **작업자**: Claude Code (Sonnet 4.6)
- **작업 단계**: Phase 15 — MVP 안정화 QA

---

## 최근 작업 요약

### Phase 15 — MVP 안정화 QA

#### 주요 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `docs/MVP_QA_SCENARIOS.md` | **신규** — 전체 시나리오 체크리스트 (A~N + 모바일) |
| `docs/KNOWN_ISSUES.md` | 전면 최신화 — 4분류, 코드 스캔 결과 포함 |
| `docs/QA_CHECKLIST.md` | 설정 페이지 owner/manager 권한 설명 오류 수정 |
| `AI_HANDOFF.md` | Phase 15 섹션 추가 |

#### Firebase 직접 수정 (MCP)

| 항목 | 내용 |
|------|------|
| `beautylink@gmail.com` Firestore 문서 생성 | `users/XNDnPs0acTPCzfVYuWBl4oScn7V2` — role=manager, salonId=salon1 |
| 데모 예약 날짜 현재화 | r1~r6: 2026-05-31, r7~r8: 2026-06-01, r9~r10: 2026-05-29 |

#### 코드 위험 패턴 스캔 결과

| 패턴 | 결과 |
|------|------|
| `?? "salon1"` 기본값 | ✅ 없음 |
| `deleteDoc` 실사용 | ✅ 주석에만 (금지 언급) |
| `phoneRaw` UI 노출 | ✅ customers/private 전용, 안전 |
| API Key / Secret 하드코딩 | ✅ 없음 |
| MOCK_ 데이터 운영 노출 | ✅ `!db` 조건 하에서만 |
| `noshow` 오타 | ✅ 의도적 구분 (ReservationStatus=`noShow`, MessageType=`noshow`) |
| 복합 인덱스 위험 쿼리 | ✅ `orderBy+where` 조합 없음 |
| 무한 로딩 | ✅ 모든 async에 try/catch + setLoading(false) |

#### 확인된 접근 권한 매트릭스

| 페이지 | owner | manager | designer | 비고 |
|--------|-------|---------|---------|------|
| `/dashboard` | 읽기+통계 | 읽기+통계 | 읽기+통계 | 전체 공개 |
| `/calendar` | 전체 | 전체 | 본인 예약만 | isOM 체크 |
| `/reservations/new` | 전체 | 전체 | 본인 designerId 강제 | |
| `/customers` | 전체 (phoneRaw 포함) | 전체 (phoneRaw 포함) | 읽기 (phoneMasked만) | |
| `/designers` | 전체 | 등록/수정 | 읽기 | `canManageDesigners` |
| `/services` | 전체 | 등록/수정 | 읽기 | isOM 체크 |
| `/messages` | 전체 | 전체 | 읽기 전용 | isOM 체크 |
| `/integrations/naver` | 전체 (상태 변경 포함) | 매핑 수정 | 읽기 | isOwner / isOM |
| `/security` | 전체 (직원 수정 포함) | 접근 로그/직원 목록 읽기 | 접근 거부 | isOM 체크 |
| `/settings` | 전체 (매장 정보 수정) | 내 정보만 수정 | 내 정보만 수정 | **매장 정보: owner only** |
| `/qa` | 전체 | 접근 거부 | 접근 거부 | `role !== "owner"` 가드 |
| `/setup` | 전체 | 접근 거부 | 접근 거부 | `role !== "owner"` 가드 |

> ⚠️ 주의: `/settings` 매장 정보 탭은 **owner만** 수정 가능. Firestore rules `isOwnerOf(salonId)` 와 일치. 매니저는 읽기 전용.

#### 발견된 이슈 요약

| 분류 | 내용 | 심각도 |
|------|------|--------|
| 문서 오류 | QA_CHECKLIST 설정 페이지 "owner/manager 편집 가능" → "owner만" 수정 | 낮음 (수정 완료) |
| 미확인 | `beautylink@gmail.com` manager 역할로 앱 실동작 미확인 | 낮음 (Firestore 문서 생성 완료) |
| 외부 의존 | SMS/알림톡 실발송, 네이버예약 API | 보류 |

#### 빌드 상태
- `npm run build` 통과 (TypeScript strict, 16개 페이지 정상)

---

### Phase 14 — 예약 캘린더 월간 뷰 구현

#### 주요 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/calendar/page.tsx` | 전면 재작성 — 월간 뷰 추가 (기존 일/주 뷰 유지) |

#### `src/app/calendar/page.tsx` 주요 변경

**신규 헬퍼 함수**
- `dateToStr(d)` — `new Date(y,m,d)` 로컬 기준 `YYYY-MM-DD` 변환 (UTC toISOString 대신, KST 안전)
- `buildMonthGrid(year, month)` — 6×7=42셀 배열, 월요일 시작 오프셋 계산 (`firstDow===0 ? -6 : 1-firstDow`)
- `CalendarCell` 인터페이스 — `{ dateStr, isCurrentMonth, day, dow }`
- `formatMonthDisplay(dateStr)` — "2026년 5월" 형식
- `formatMonthDayHeader(dateStr)` — "5.14 (목)" 형식

**신규 상태 / useMemo**
- `monthReservations: Reservation[]` — 월간 예약 배열
- `monthLoading: boolean` — 월간 데이터 로딩 상태
- `selectedMonthDate: string | null` — 날짜 클릭 선택 상태
- `monthStats` useMemo — `{ total, completed, completedRevenue, noShow, cancelled, remaining }`
- `calendarGrid` useMemo — `buildMonthGrid(monthYear, monthMonth)` 결과
- `monthResByDate` useMemo — `Record<string, Reservation[]>` (날짜별 예약 맵)
- `selectedDateRes` useMemo — 선택된 날짜의 예약 배열

**loadMonthReservations (useCallback)**
- `getReservationsByDateRange(salonId, firstDay, lastDay)` 재사용
- 월 첫날: `new Date(y, m, 1)` → `dateToStr()`
- 월 마지막날: `new Date(y, m+1, 0)` → `dateToStr()`
- `view === "월"` 전환 또는 월 이동 시 자동 호출

**뷰 전환 변경**
- "월" 버튼 — `<span>준비중</span>` 제거 → 정상 클릭 가능
- 이전/다음 날 이동: `view === "월"` 시 `setDate(1)` 후 `setMonth(±1)` (월 이동)
- `navigatePrev/Next` 분기 추가 (일/주/월 각각)

**월간 뷰 UI (데스크탑)**
- 요일 헤더 7칸 (월~일)
- 6행×7열 달력 그리드
  - 이번 달 셀: 날짜숫자(오늘=파란 원) + 예약 pill 최대 3개 + "+N 더보기" 배지
  - 다른 달 셀: 회색 표시, 예약 pill 없음
  - 선택된 날짜: 인디고 테두리 강조
  - 예약 pill: 상태별 색상 (확정=인디고, 완료=초록, 노쇼=빨강, 취소=회색, 대기=노랑)
- 우측 사이드바: 월간 통계 (총 예약/완료/노쇼/취소/매출) + 선택 날짜 예약 상세 패널

**월간 뷰 UI (모바일)**
- 통계 스트립 (2행×4칸: 총예약/완료/노쇼취소/매출)
- 7열 미니 캘린더 (날짜 + 예약 건수 점)
- 선택된 날짜 예약 리스트 (카드 형태)

**기존 뷰 유지**
- 일별 그리드 뷰: 완전 유지
- 주간 7컬럼 뷰: 완전 유지
- `selectedReservation` 검색: `reservations` + `monthReservations` 양쪽 탐색

#### Firestore 쿼리 전략
- `getReservationsByDateRange(salonId, firstDay, lastDay)` — 이미 Phase 10/대시보드에서 검증된 함수 재사용
- `where("date",">=",firstDay).where("date","<=",lastDay)` — 동일 필드 range, 복합 인덱스 불필요
- 월간 데이터: 실시간 `onSnapshot` 아님, 일회성 `getDocs` (개요 조회 목적)

#### 보안 준수
- 실제 네이버예약 API 호출 없음
- 문자/알림톡 실발송 없음
- 기존 예약 데이터 삭제/deleteDoc 없음

#### 빌드 상태
- `npm run build` 통과 (TypeScript strict, 16개 페이지 정상)

---

### Phase 13 — 직원/권한 관리 편집 UI

#### 주요 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/services/staff.ts` | **신규** — 직원 CRUD 서비스 |
| `src/app/security/page.tsx` | 탭 구조 전면 재작성 (접근 로그 / 권한 안내 / 직원 관리) |
| `firestore.rules` | `users/{uid}` 규칙 보완 — owner/manager 직원 조회 허용 |

#### `src/services/staff.ts` (신규)
- `StaffMember` 인터페이스: `uid, email, name, role, salonId, designerId?, phoneMasked?, isActive`
- `getStaffMembers(salonId)` — `where("salonId","==",salonId)` 단일 쿼리 후 클라이언트 정렬 (원장→매니저→디자이너, 이름순)
- `updateStaffRole(uid, role)` — `updateDoc` 역할 변경
- `updateStaffActive(uid, isActive)` — `updateDoc` 활성 상태 변경
- `updateStaffDesignerLink(uid, designerId|null)` — `updateDoc` 디자이너 연결
- `logStaffAccess(salonId, action, targetUid, user)` — accessLogs 4종 기록

#### `src/app/security/page.tsx` 탭 구조
- **탭 1 — 접근 로그**: 기존 보안 요약 카드(6개) + 로그 테이블 (필터 23→27종)
- **탭 2 — 권한 안내**: 개인정보 보호 설정 / 역할별 권한 테이블 / 역할 상세 / 처리 방침 / QA 링크
- **탭 3 — 직원 관리**:
  - 데스크탑 테이블 / 모바일 카드 이중 레이아웃
  - 이름·이메일·역할·연결 디자이너·활성 상태 표시
  - 본인(나) 배지 표시
  - 비활성 직원 숨김 토글
  - 수정 모달 (owner 전용): 역할 select / isActive 토글 / designerId select
  - 초대 준비 안내 섹션 (3단계 수동 등록 가이드)

#### 보안 가드 (클라이언트)
- 자기 자신 비활성화 불가 → editError 표시
- 마지막 원장 역할 변경 불가 → editError 표시
- 비밀번호/이메일/uid/salonId 수정 UI 없음
- manager: 목록 읽기 전용 (수정 버튼 없음)

#### `firestore.rules` 변경 — `users/{uid}`
```
allow read: if isLoggedIn() && (
  request.auth.uid == uid ||
  (resource.data.salonId == me().salonId && me().role in ['owner', 'manager'])
);
allow create: if isLoggedIn() && request.auth.uid == uid;
allow update: if isLoggedIn() && (
  // 본인: role·salonId 변경 불가
  (request.auth.uid == uid && 역할/salonId 불변 조건) ||
  // owner가 타직원: uid·email·salonId 변경 불가
  (request.auth.uid != uid && 같은salonId owner && 핵심필드 불변 조건)
);
allow delete: if false;
```

#### accessLog 4종 (신규)
| action | 발생 시점 |
|--------|----------|
| `user_role_updated` | 역할 변경 저장 |
| `user_active_status_updated` | 활성 상태 변경 저장 |
| `user_designer_linked` | 디자이너 연결 변경 저장 |
| `user_permission_viewed` | owner가 직원 관리 탭 최초 진입 |

#### 빌드 상태
- `npm run build` 통과 (TypeScript strict, 16개 페이지 정상)

---

### Phase 12 — 네이버예약 연동 준비 화면 고도화

#### 주요 변경 파일
- **`src/types/index.ts`**: 타입 재설계
  - `NaverDesignerMapping` / `NaverMenuMapping` → `NaverDesignerMappingEntry` / `NaverServiceMappingEntry` (Record 맵 구조)
  - `NaverIntegrationSettings`: `naverPlaceUrl`, `apiRequestedAt/At`, `designerMapping` Record, `serviceMapping` Record, `lastCheckedAt`, `updatedBy` 필드 추가
- **`src/services/integrations.ts`**: 전면 재작성
  - 경로: `salons/{salonId}/integrationSettings/naver` (단일 `setDoc`)
  - `getNaverSettings`: 구버전 배열 타입 호환 처리 포함
  - `saveNaverSettings`: `setDoc` 전체 저장
  - `calcSyncReadyPercent`: 순수 함수, 5항목 100점제 (상점ID 20 + 매장명 10 + URL 10 + 디자이너 30 + 시술 30)
  - `logNaverAccess` + `NaverAccessAction` 4종
- **`src/data/mock.ts`**: import 타입명 갱신 (NaverDesignerMappingEntry, NaverServiceMappingEntry)
- **`src/app/integrations/naver/page.tsx`**: 전면 재작성
  - `salonId ?? null` + 가드 UI
  - 병렬 로드: `getNaverSettings` + `getDesigners` + `getServices`
  - **① 기본 설정**: storeId/shopName/naverPlaceUrl 입력, 상태 select (원장만)
  - **② 연동 준비율**: 실시간 progress bar + 5항목 체크리스트
  - **③ 디자이너 매핑**: inactive 숨김 토글, 모바일 카드/데스크탑 테이블, inline 입력
  - **④ 시술 메뉴 매핑**: inactive 숨김 토글, 카테고리·가격·소요시간 표시, inline 입력
  - 저장: 기존 매핑 항목 보존 + 현재 목록 갱신 (`...settings.designerMapping` 스프레드)
  - accessLog 4종, 권한(owner/manager/designer), toast, 무한 로딩 없음
- **`firestore.rules`**: `integrationSettings` write → `isOwnerOrManagerOf` (매니저도 저장 가능)
- **`src/app/security/page.tsx`**: 네이버 액션 4종 ACTION_FILTERS + actionDisplay 추가

#### 연동 준비율 계산 공식
| 항목 | 조건 | 점수 |
|------|------|------|
| 상점 ID | 비어있지 않음 | 20점 |
| 매장명 | 비어있지 않음 | 10점 |
| 네이버플레이스 URL | 비어있지 않음 | 10점 |
| 디자이너 매핑 | mapped/active × 30 (active=0이면 만점) | 30점 |
| 시술 메뉴 매핑 | mapped/active × 30 (active=0이면 만점) | 30점 |

#### 보안 준수
- 실제 네이버 API 호출 없음
- API Key 입력란 없음
- 민감정보 저장 없음
- phoneRaw 표시 없음

#### 빌드 상태
- `npm run build` 통과 (TypeScript strict, 16개 페이지 정상)

#### 남은 보완
- 예약 캘린더 월간 뷰
- 권한 관리 편집 UI

---

### Phase 11 — 문자·알림톡·노쇼 관리 Firestore 연동

#### 주요 변경 파일
- **`src/types/index.ts`**: 타입 확장
  - `MessageType`: `"revisit"` 추가 (5종 완비)
  - `MessageChannel`: `"알림톡" | "LMS"` 추가 (4종 완비)
  - `MessageTemplate`: `createdBy?`, `updatedBy?` 추가
  - `MessageLog`: `templateId?`, `templateTitle?`, `reservationId?`, `errorMessage?`, `createdBy?` 추가; status에 `"mock_sent"` 추가
- **`src/services/messages.ts`**: 전면 재작성
  - `DEFAULT_TEMPLATES` 5종 (reservation_confirm / reminder / cancel / noshow / revisit)
  - `getMessageTemplates` / `addMessageTemplate` / `updateMessageTemplate` / `toggleTemplateActive` / `seedDefaultTemplates`
  - `getMessageLogs` / `addMessageLog` (항상 `status: "mock_sent"` — 실발송 없음)
  - `getNoShowReservations`: `where("status","==","noShow")` — 단일 필드, 복합 인덱스 불필요
  - `logMessageAccess` + `MessageAccessAction` 타입 (5종)
  - `applyVars(content, vars)` — `{고객명}` 치환 헬퍼
  - `PREVIEW_SAMPLE_VARS`, `CHANNEL_OPTIONS`, `TYPE_OPTIONS`, `TYPE_LABELS`, `TYPE_COLORS`
- **`src/app/security/page.tsx`**: `ACTION_FILTERS` + `actionDisplay` 에 메시지 관련 액션 4종 추가
  - `message_template_created`, `message_template_updated`, `message_mock_sent`, `no_show_message_mock_sent`, `message_template_deactivated`
- **`src/app/messages/page.tsx`**: 전면 재작성
  - **4탭 구조**: 템플릿 관리 / Mock 발송 테스트 / 노쇼 관리 / 발송 이력
  - **탭 1**: 템플릿 카드 그리드, active 토글, 바텀시트 모달 (등록/편집), 기본 템플릿 5개 시드 버튼
  - **탭 2**: 활성 템플릿 선택 → `applyVars` 미리보기 → mockName/mockPhone 입력 → Mock 발송 → `messageLogs` 저장
  - **탭 3**: 노쇼 예약 목록 (모바일 카드 / 데스크탑 테이블), 행별 "노쇼 안내 발송" 버튼
  - **탭 4**: 발송 이력 (type/channel/status 3중 필터, 모바일 카드 / 데스크탑 테이블)
  - **권한**: owner/manager(isOM)만 템플릿 CRUD + 발송, designer는 읽기 전용
  - **salonId null 가드** + **Mock 안내 배너** 상시 표시
  - **accessLog**: 5종 액션 (template_created/updated/deactivated/mock_sent/no_show_mock_sent)
  - **보안**: `phoneMasked`만 표시 (phoneRaw 절대 노출 없음), 실발송 API 호출 없음

#### Firestore 쿼리 전략
- 노쇼 조회: `where("status","==","noShow")` — 단일 필드 인덱스, 복합 인덱스 불필요
- 로그 정렬: `getDocs` 후 `tsMs(val)` 헬퍼로 클라이언트 내림차순 정렬
- 템플릿 정렬: `getDocs` 후 `tsMs(val)` 헬퍼로 클라이언트 오름차순 정렬

#### 변수 치환 지원 변수
| 변수 | 설명 |
|------|------|
| `{고객명}` | 고객 이름 |
| `{예약일}` | YYYY-MM-DD |
| `{예약시간}` | HH:mm |
| `{디자이너명}` | 디자이너 이름 |
| `{시술명}` | 시술 이름 |
| `{매장명}` | 매장 이름 |
| `{매장전화}` | 매장 전화번호 |

#### 빌드 상태
- `npm run build` 통과 (TypeScript strict, 16개 페이지 정상)

#### 남은 보완 (다음 작업 후보)
- 예약 캘린더 월간 뷰 구현
- 권한 관리 편집 UI

---

### Phase 10 — 대시보드 실데이터 연동

#### 주요 변경 파일
- **`src/services/reservations.ts`**: `getReservationsByDateRange` 추가
  - `where("date",">=",start).where("date","<=",end)` — 동일 필드 range 쿼리, 복합 인덱스 불필요
  - 데모 모드: localStorage 필터링
- **`src/app/dashboard/page.tsx`**: 전면 재작성
  - `salonId = userData?.salonId ?? null` + 가드 UI (황색 배너)
  - `isDemo = !db` 판별 → 데모 모드 시 DEMO_DATE 기준 집계
  - **기간 선택 탭**: 오늘 / 최근 7일 / 최근 30일 (인디고 pill 버튼)
  - **통계 카드 실데이터**: 예약건수 / 완료매출 / 노쇼+취소 / 신규고객(오늘) or 완료예약(7/30일)
  - **차트 실데이터**: 오늘→시간대별, 7/30일→일별 Bar차트 + 출처 Pie차트
  - **예약 목록**: 기간별 최신순 20건, 기간 선택 시 날짜 컬럼 추가
  - **디자이너별 진행바**: 하드코딩 10 → 기간 내 최대값 기준 상대 비율
  - **운영 요약**: 오늘 탭에서만 "가장 바쁜 시간대" 및 신규고객 표시
  - `Loader2` 스피너, 에러 배너 (다시 시도 버튼), 빈 상태 UI
  - 데모 모드: "※ 데모 모드: DEMO_DATE 기준" 안내 문구

#### 집계 로직
| 지표 | 산식 |
|------|------|
| 예약 건수 | `reservations.length` |
| 완료 매출 | `completed` 예약 price 합계 |
| 예상 누계 | `confirmed+pending+completed` price 합계 |
| 노쇼+취소 | `noShow`+`cancelled` 건수 |
| 신규 고객 | `registeredAt.startsWith(todayStr)` 건수 (오늘 탭만) |
| 출처 비율 | source별 건수 / 전체 × 100 |

#### Firestore 쿼리 전략
- 오늘: `where("date","==",today)` — 단일 필드 인덱스
- 7/30일: `where("date",">=",start).where("date","<=",end)` — 단일 필드 range, 복합 인덱스 불필요

#### 빌드 상태
- `npm run build` 통과 (TypeScript strict, 16개 페이지 정상)

#### 남은 보완 (다음 작업 후보)
- 예약 캘린더 월간 뷰 구현
- 권한 관리 편집 UI

---

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
| `src/types/index.ts` | 수정 | Phase 11: MessageType/Channel 확장, MessageTemplate/Log 필드 추가 |
| `src/services/messages.ts` | 전면 재작성 | Phase 11: 템플릿 CRUD, 로그, 노쇼 조회, accessLog, applyVars |
| `src/app/messages/page.tsx` | 전면 재작성 | Phase 11: 4탭 UI, Mock 발송, 노쇼 관리, 발송 이력, 권한 가드 |
| `src/app/security/page.tsx` | 수정 | Phase 11: 메시지 관련 액션 4종 필터 추가 |
| `src/app/dashboard/page.tsx` | 전면 재작성 | Phase 10: 기간 선택, Firestore 실집계, 차트/카드 실데이터화 |
| `src/services/reservations.ts` | 수정 | Phase 10: getReservationsByDateRange 추가 |
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
| 실제 SMS/알림톡 발송 | 보류 | Mock UI 구현 완료 (Phase 11), 실발송 API 미연동 |
| 실제 네이버예약 API | 보류 | 공식 제휴 후 연동 예정 |
| 디자이너 관리 고도화 | ✅ 완료 | 휴무일 달력 편집 UI 완성 (Phase 7) |
| 예약 캘린더 주간 뷰 | ✅ 완료 | 데스크탑 7컬럼 + 모바일 요일칩 (Phase 8) |
| 예약 캘린더 월간 뷰 | ✅ 완료 | 6×7 그리드, 날짜 클릭 상세, 월간 통계 (Phase 14) |
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

- ✅ `npm run build` 통과 (Phase 14 포함, 16개 페이지 정상)
- ✅ Phase 14 TypeScript strict 오류 없음
- ✅ `buildMonthGrid(year, month)` 6×7 그리드 로직 검토 (월요일 시작 오프셋 처리)
- ✅ `dateToStr()` — `new Date(y,m,d)` 로컬 기준 (UTC offset 회피, KST 안전)
- ✅ `loadMonthReservations` — `getReservationsByDateRange` 재사용, 복합 인덱스 불필요 확인
- ✅ `monthResByDate` useMemo — `Record<string, Reservation[]>` 날짜 키 맵 구조
- ✅ `monthStats` useMemo — completed/noShow/cancelled/revenue 집계 로직
- ✅ `navigatePrev/Next` — 월간 뷰 시 `setDate(1)` 후 `setMonth(±1)` 패턴
- ✅ 기존 일별/주간 뷰 완전 유지 (모바일 `view === "일"` 명시 분기)
- ✅ 월간 뷰 "월" 버튼 — `준비중` span 제거, 정상 클릭 가능
- ✅ `selectedReservation` — `reservations` + `monthReservations` 양쪽 검색
- ✅ Phase 11 TypeScript strict 오류 없음
- ✅ `applyVars` 변수 치환 로직 코드 검토
- ✅ `getNoShowReservations` — 단일 `where("status","==","noShow")` 복합 인덱스 불필요 확인
- ✅ `toggleTemplateActive` — `active=false` 소프트 비활성화 (deleteDoc 금지)
- ✅ `addMessageLog` — 항상 `status: "mock_sent"` 설정, 실발송 API 없음
- ✅ `tsMs(val)` 타임스탬프 헬퍼 (string / Firestore Timestamp / {seconds}) 타입 처리
- ✅ salonId null 가드 + Mock 안내 배너 구조
- ✅ `ROLE_MAP as const` 타입 안전 매핑
- ✅ security/page.tsx 액션 필터 4종 추가 빌드 통과
- ✅ Phase 10 TypeScript strict 오류 없음
- ✅ `buildHourlyData` / `buildDailyData` / `buildSourceData` / `getBusiestHour` 로직 코드 검토
- ✅ salonId null 가드 (황색 배너)
- ✅ `getReservationsByDateRange` range 쿼리 — 복합 인덱스 불필요 확인
- ✅ 데모 모드(db=null) DEMO_DATE 기준 분기 로직
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

- ❌ 월간 뷰 실제 Firestore 데이터로 달력 렌더링 확인 (예약 pill 표시)
- ❌ 월간 뷰 날짜 클릭 → 우측 상세 패널 예약 목록 표시 확인
- ❌ 월간 뷰 이전/다음 달 이동 + 데이터 재로드 확인
- ❌ 월간 뷰 월간 통계(완료매출 포함) 정확도 확인
- ❌ 월간 뷰 모바일 미니 캘린더 + 선택 날짜 리스트 확인
- ❌ 일/주/월 뷰 전환 전후 상태 초기화 정상 동작 확인
- ❌ 메시지 템플릿 Firestore 실제 저장/조회 확인
- ❌ 기본 템플릿 5개 시드 — 실제 Firestore에 중복 없이 저장되는지 확인
- ❌ 발송 이력 Firestore `messageLogs` 컬렉션 저장 확인
- ❌ 노쇼 예약 Firestore 실데이터 조회 확인
- ❌ designer 역할로 messages 페이지 접근 시 읽기 전용 동작 확인
- ❌ 보안 페이지에서 메시지 관련 액션 필터 (4종) 동작 확인
- ❌ 대시보드 실제 Firestore 데이터로 기간별 집계 확인 (오늘/7일/30일)
- ❌ 30일 range 쿼리 Firestore 단일 필드 인덱스 동작 확인
- ❌ 신규 고객 수 Firestore registeredAt 필드 포맷 일치 여부 확인
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
1. **Vercel 재배포** — Phase 13~15 변경사항 반영 후 실 브라우저 테스트
2. **실제 로그인 시나리오 수행** — `docs/MVP_QA_SCENARIOS.md` 기준으로 직접 체크
3. **고객 삭제 (소프트)** — `isDeleted=true` 정책 결정 및 구현
4. **문자 실발송 연동** — SENS API / 카카오 알림톡 (외부 승인 후)
