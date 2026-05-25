# 뷰티링크 (BeautyLink)

미용실·네일샵·뷰티샵 전용 예약관리 CRM MVP

## 실행 방법

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 빌드 후 실행
npm start
```

개발 서버: http://localhost:3000

## 페이지 구조

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | 랜딩페이지 | 서비스 소개, 네이버 제휴 제안서용 |
| `/dashboard` | 대시보드 | 오늘의 매장 운영 현황 |
| `/calendar` | 예약 통합 캘린더 | 디자이너별 예약 시간표 |
| `/reservations/new` | 예약 등록 | 전화/방문 예약 직접 등록 |
| `/customers` | 고객관리 CRM | 고객 방문이력·시술메모 관리 |
| `/designers` | 디자이너 관리 | 근무시간·휴무·담당시술 관리 |
| `/services` | 시술 메뉴 관리 | 가격·소요시간·담당자 관리 |
| `/integrations/naver` | 네이버예약 연동 준비 | API 승인 전 설정 화면 |
| `/messages` | 문자·알림톡·노쇼 관리 | 알림 템플릿·발송이력·노쇼 관리 |
| `/security` | 보안 및 권한 관리 | 개인정보 보호·역할별 권한 |

## 주요 기능

- **예약 통합 캘린더**: 디자이너별 시간표, 예약 출처 색상 구분 (네이버/전화/방문/카카오)
- **고객관리 CRM**: 방문이력 타임라인, 시술 메모, 재방문 주기 관리
- **디자이너 관리**: 근무시간·휴무·담당시술, 주간 스케줄표
- **시술 메뉴 관리**: 카테고리별 필터, 사용 여부 토글
- **네이버예약 연동 준비**: 디자이너/메뉴 매칭, 동기화 상태 90%
- **문자·알림톡**: 4종 템플릿, 노쇼 관리, 취소 사유 분석
- **보안 관리**: 연락처 마스킹, 역할별 권한 표, 접근 로그

## 데이터 저장

- 초기 데이터: `src/data/mock.ts`에 정의된 mock data
- 예약 등록/고객 추가/메뉴 수정: localStorage에 저장됨
- 새로고침해도 데이터 유지
- 대시보드 우상단 "데모 데이터 초기화" 버튼으로 리셋 가능

## 아직 실제 연동되지 않은 기능

- **네이버예약 API**: API 제휴 검토 중, 승인 후 연동 예정
- **문자/카카오 알림 실제 발송**: mock 발송 처리 (토스트 메시지만 표시)
- **실시간 동기화**: localStorage 기반 단방향 저장
- **회원가입/로그인**: 데모 버전 (김지연 원장으로 고정)

## 네이버예약 API 승인 후 연결 포인트

1. `src/app/integrations/naver/page.tsx` — API 키 입력 및 연결 확인 로직
2. `src/data/mock.ts` — `getReservations()` 함수를 실제 API 호출로 교체
3. `src/app/calendar/page.tsx` — 실시간 예약 데이터 fetch
4. `src/app/dashboard/page.tsx` — 실시간 통계 연동
5. `src/app/reservations/new/page.tsx` — 네이버예약 소스 실제 연동

## 기술 스택

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **lucide-react** (아이콘)
- **recharts** (차트)
- **localStorage** (데이터 저장)

## 배포

Vercel에 바로 배포 가능:
```bash
vercel deploy
```
