/**
 * 디자이너 스케줄 관련 공유 헬퍼 함수
 *
 * - formatDateStr              : Date → "YYYY-MM-DD" 로컬 날짜 문자열 변환
 * - isDesignerWorkingOnDate    : 특정 날짜에 디자이너가 근무하는지 (workDays + daysOff 통합 판단)
 * - isDesignerDayOff           : 특정 날짜가 디자이너의 특정 휴무일(daysOff)에 포함되는지
 * - getDesignerWorkStatus      : 특정 날짜 디자이너 상태 상세 반환 (5단계)
 * - getWeekdayDatesInMonth     : 특정 월에서 특정 요일의 모든 날짜 문자열 배열 반환
 */

import type { Designer } from "@/types";

/**
 * Date 객체를 로컬 시간 기준 "YYYY-MM-DD" 문자열로 변환합니다.
 * (toISOString()은 UTC 기준이라 한국 시간에서 날짜가 달라질 수 있어 사용하지 않습니다)
 */
export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 특정 날짜에 디자이너가 근무하는지 확인합니다.
 *
 * 조건:
 * 1. daysOff(특정 휴무일)에 해당 날짜가 없어야 함
 * 2. workDays(근무 요일 배열, 0=일~6=토)에 해당 날짜의 요일이 포함되어야 함
 *
 * @param designer - 디자이너 객체
 * @param date     - 확인할 날짜 (Date 객체)
 * @returns        근무 예정이면 true, 휴무면 false
 */
export function isDesignerWorkingOnDate(designer: Designer, date: Date): boolean {
  const dateStr = formatDateStr(date);
  // 특정 휴무일 체크
  if (designer.daysOff.includes(dateStr)) return false;
  // 근무 요일 체크 (0=일, 1=월, ..., 6=토)
  const dayOfWeek = date.getDay();
  return designer.workDays.includes(dayOfWeek);
}

/**
 * 특정 날짜가 디자이너의 특정 휴무일(daysOff)에 포함되는지 확인합니다.
 * workDays(비근무 요일)는 고려하지 않습니다.
 *
 * @param designer - 디자이너 객체
 * @param date     - 확인할 날짜 (Date 객체)
 * @returns        특정 휴무일이면 true
 */
export function isDesignerDayOff(designer: Designer, date: Date): boolean {
  return designer.daysOff.includes(formatDateStr(date));
}

/**
 * 특정 날짜에 디자이너의 근무 상태를 5단계로 반환합니다.
 *
 * 반환값:
 * - "inactive"    : 비활성화된 디자이너 (status === "inactive")
 * - "off"         : 현재 휴무 상태 (status === "off")
 * - "day_off"     : 특정 휴무일 (daysOff에 해당 날짜 포함)
 * - "non_work_day": 비근무 요일 (workDays에 해당 요일 미포함)
 * - "working"     : 정상 근무 예정
 */
export type DesignerWorkStatus =
  | "inactive"
  | "off"
  | "day_off"
  | "non_work_day"
  | "working";

export function getDesignerWorkStatus(
  designer: Designer,
  date: Date
): DesignerWorkStatus {
  if (designer.status === "inactive") return "inactive";
  if (designer.status === "off")      return "off";
  if (isDesignerDayOff(designer, date)) return "day_off";
  if (!designer.workDays.includes(date.getDay())) return "non_work_day";
  return "working";
}

/**
 * 특정 연월(year, month)에서 특정 요일(dayOfWeek, 0=일~6=토)의
 * 모든 날짜를 "YYYY-MM-DD" 문자열 배열로 반환합니다.
 *
 * 반복 휴무 보조 기능(매주 X요일 일괄 추가)에 사용합니다.
 *
 * @param year      - 연도 (예: 2025)
 * @param month     - 월 (0-indexed, 0=1월 ~ 11=12월)
 * @param dayOfWeek - 요일 (0=일, 1=월, ..., 6=토)
 * @returns         해당 월의 모든 해당 요일 날짜 문자열 배열
 */
export function getWeekdayDatesInMonth(
  year: number,
  month: number,
  dayOfWeek: number
): string[] {
  const results: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() === dayOfWeek) {
      results.push(formatDateStr(new Date(year, month, d)));
    }
  }
  return results;
}
