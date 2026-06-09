# 뷰티링크 — 네이버예약 API 요구사항 정의

> 문서 용도: 네이버예약 API 제휴 협의 시 연동 범위 사전 정의
> 작성일: 2026-06-09
> 주의: 이 문서는 요구사항 정의용이며, 실제 API 호출은 제휴 승인 후 구현됩니다.

---

## 필요 데이터 범위

### 매장 정보

| 필드 | 용도 | 비고 |
|------|------|------|
| 매장 ID / 상점 ID | 연동 식별자 | 내부 salonId와 매핑 |
| 매장명 | 화면 표시 | |
| 네이버플레이스 URL | 연동 상태 확인 | |
| 영업시간 | 예약 가능 시간 검증 | |

### 예약 데이터

| 필드 | 용도 | 비고 |
|------|------|------|
| 예약 ID | 중복 방지, 상태 추적 | |
| 예약자명 | 고객 매칭 | 개인정보 처리 기준 협의 필요 |
| 예약 날짜 / 시간 | 캘린더 표시 | |
| 예약 상태 | confirmed / cancelled / noshow | |
| 담당 디자이너 | 내부 디자이너와 매핑 | |
| 시술 메뉴 | 내부 시술 메뉴와 매핑 | |
| 예약 경로 | naver로 구분 | |
| 취소 사유 | 분석용 | optional |

### 디자이너 / 직원 정보

| 필드 | 용도 | 비고 |
|------|------|------|
| 디자이너 ID / 이름 | 내부 디자이너와 1:1 매핑 | |
| 담당 시술 범위 | 예약 가능 시술 검증 | |
| 휴무일 / 스케줄 | 예약 가능 시간 계산 | optional |

### 시술 메뉴 정보

| 필드 | 용도 | 비고 |
|------|------|------|
| 메뉴 ID / 이름 | 내부 시술 메뉴와 1:1 매핑 | |
| 소요 시간 | 예약 슬롯 계산 | |
| 가격 | 내부 매출 계산 | optional |
| 활성화 여부 | 비활성 메뉴 필터 | |

---

## 연동 방향 (4단계 로드맵)

### 1단계 — 읽기 전용 동기화 (Read Only)
> 네이버예약 데이터를 뷰티링크 내부 캘린더에 표시

- 네이버예약 목록 가져오기 (오늘 ~ N일 범위)
- 내부 예약 캘린더에 네이버 경로로 통합 표시
- 고객명·시술명·시간 표시 (연락처 미노출)

### 2단계 — 내부 예약과 네이버예약 매핑
> 동일 고객의 예약을 내부 CRM과 연결

- 예약자명 기반 고객 매칭
- 방문 이력에 네이버예약 이력 통합
- 디자이너/시술 매핑 자동 적용

### 3단계 — 상태 동기화
> 예약 완료·노쇼·취소 상태를 양쪽에서 반영

- 내부에서 상태 변경 → 네이버 상태 업데이트 (쓰기 권한 필요)
- 네이버에서 취소 → 내부 캘린더 자동 업데이트

### 4단계 — 양방향 예약 관리
> 뷰티링크에서 직접 네이버예약 생성/수정

- 전화 예약 → 네이버 캘린더에도 등록
- 디자이너 휴무 → 네이버예약 차단 자동 설정

---

## 보안 원칙

| 원칙 | 설명 |
|------|------|
| **최소 권한** | 필요한 범위의 읽기/쓰기 권한만 요청 |
| **매장 단위 승인** | 각 매장별 독립적 API 키 발급 및 승인 |
| **고객 원본 연락처 보호** | 전화번호 등 개인식별정보는 서버 처리, UI 마스킹 |
| **accessLog 기록** | 모든 API 연동 호출을 Firestore accessLogs에 기록 |
| **API Key 서버 보관** | Firebase Functions 또는 Next.js API Route에서만 처리 |
| **클라이언트 노출 금지** | API Key, Secret을 클라이언트 코드에 절대 포함하지 않음 |
| **매장 데이터 격리** | `salons/{salonId}` 구조로 타 매장 데이터 접근 불가 |

---

## 현재 구현된 준비 사항

| 항목 | 상태 |
|------|------|
| 내부 디자이너 목록 관리 | ✅ |
| 내부 시술 메뉴 목록 관리 | ✅ |
| 네이버 디자이너명 매핑 필드 (`naverName`) | ✅ |
| 네이버 시술 메뉴명 매핑 필드 (`naverMenuName`) | ✅ |
| 연동 준비율 자동 계산 (`calcSyncReadyPercent`) | ✅ |
| 네이버 상점 ID 저장 필드 | ✅ |
| 네이버플레이스 URL 저장 필드 | ✅ |
| 연동 상태 관리 (pending/ready/approved/disabled) | ✅ |
| accessLog 기록 구조 | ✅ |
| 예약 경로 `source: "naver"` 구분 | ✅ |
| Firestore 보안 규칙 역할별 분리 | ✅ |

---

## 미구현 (제휴 승인 후 개발 예정)

| 항목 | 예상 구현 방법 |
|------|--------------|
| 네이버 API 인증 처리 | Firebase Functions → API Key 서버 보관 |
| 예약 목록 가져오기 | Server Action 또는 Functions Cron |
| 예약 상태 쓰기 | Functions HTTPS callable |
| WebHook 수신 | Next.js API Route (`/api/naver/webhook`) |
| 고객 자동 매칭 | 예약자명 기반 Fuzzy matching |

---

## 데이터 저장 구조 (현재)

```
salons/{salonId}/
  integrationSettings/naver
    - storeId: string
    - shopName: string
    - naverPlaceUrl: string
    - status: "pending" | "ready" | "approved" | "disabled"
    - designerMapping: Record<internalId, naverName>
    - serviceMapping: Record<internalId, naverMenuName>
    - updatedAt: Timestamp
    - updatedBy: string
```

API 연동 후 추가 예정 필드:
```
    - apiConnectedAt: Timestamp
    - lastSyncAt: Timestamp
    - syncStatus: "syncing" | "success" | "error"
```
