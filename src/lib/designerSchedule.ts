/**
 * 디자이너 스케줄 관련 공유 헬퍼 함수
 *
 * - isDesignerWorkingOnDate : 특정 날짜에 디자이너가 근무하는지 (workDays + daysOff 통합 판단)
 * - isDesignerDayOff        : 특정 날짜가 디자이너의 특정 휴무일(daysOff)에 포함되는지
 * - formatDateStr           : Date → "YYYY-MM-DD" 로컬 날짜 문자열 변환
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
