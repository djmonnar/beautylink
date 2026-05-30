import { db } from "@/lib/firebase";
import type { Reservation, ReservationStatus, PermissionRole, VisitRecord } from "@/types";
import { MOCK_RESERVATIONS, getReservations as lsGetReservations, saveReservations as lsSaveReservations } from "@/data/mock";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
  Unsubscribe,
} from "firebase/firestore";

const col = (salonId: string) => collection(db!, `salons/${salonId}/reservations`);

// ── Read ───────────────────────────────────────────────────────────────────

export async function getReservations(salonId: string, date?: string): Promise<Reservation[]> {
  if (!db) {
    const data = lsGetReservations();
    return date ? data.filter((r) => r.date === date) : data;
  }

  // 복합 인덱스 불필요: where만 사용하고 클라이언트에서 정렬
  const q = date
    ? query(col(salonId), where("date", "==", date))
    : query(col(salonId));

  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reservation));

  // 클라이언트 정렬: date ASC → time ASC
  return list.sort((a, b) => {
    const dateCompare = (a.date ?? "").localeCompare(b.date ?? "");
    if (dateCompare !== 0) return dateCompare;
    return (a.time ?? "").localeCompare(b.time ?? "");
  });
}

// ── Realtime ───────────────────────────────────────────────────────────────

export function subscribeReservations(
  salonId: string,
  date: string,
  callback: (reservations: Reservation[]) => void
): Unsubscribe {
  if (!db) {
    const data = lsGetReservations().filter((r) => r.date === date);
    callback(data);
    return () => {};
  }

  // 복합 인덱스 불필요: where만 사용하고 클라이언트에서 정렬
  const q = query(col(salonId), where("date", "==", date));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reservation));
    // 클라이언트 정렬: time ASC
    list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    callback(list);
  });
}

// ── Realtime (week range) ─────────────────────────────────────────────────

/**
 * 주간 예약 실시간 구독 (7일치 날짜 배열)
 * where("date", "in", weekDates) — 단일 필드 인덱스, 복합 인덱스 불필요
 * Firestore "in" 연산자는 최대 30개 값까지 지원 (7일이면 문제 없음)
 */
export function subscribeReservationsWeek(
  salonId: string,
  weekDates: string[],
  callback: (reservations: Reservation[]) => void
): Unsubscribe {
  if (!db) {
    const data = lsGetReservations().filter((r) => weekDates.includes(r.date));
    data.sort((a, b) => {
      const dc = (a.date ?? "").localeCompare(b.date ?? "");
      return dc !== 0 ? dc : (a.time ?? "").localeCompare(b.time ?? "");
    });
    callback(data);
    return () => {};
  }
  const q = query(col(salonId), where("date", "in", weekDates));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reservation));
    list.sort((a, b) => {
      const dc = (a.date ?? "").localeCompare(b.date ?? "");
      return dc !== 0 ? dc : (a.time ?? "").localeCompare(b.time ?? "");
    });
    callback(list);
  });
}

// ── 기간별 예약 조회 (단일 필드 range — 복합 인덱스 불필요) ────────────────

/**
 * 날짜 범위로 예약 조회.
 * where("date",">=",start).where("date","<=",end) — 동일 필드 range 이므로
 * 복합 인덱스 불필요, orderBy 미사용, 클라이언트 정렬.
 */
export async function getReservationsByDateRange(
  salonId: string,
  startDate: string, // "YYYY-MM-DD"
  endDate: string    // "YYYY-MM-DD"
): Promise<Reservation[]> {
  if (!db) {
    const data = lsGetReservations();
    return data
      .filter((r) => r.date >= startDate && r.date <= endDate)
      .sort((a, b) => {
        const dc = (a.date ?? "").localeCompare(b.date ?? "");
        return dc !== 0 ? dc : (a.time ?? "").localeCompare(b.time ?? "");
      });
  }
  const q = query(
    col(salonId),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reservation));
  return list.sort((a, b) => {
    const dc = (a.date ?? "").localeCompare(b.date ?? "");
    return dc !== 0 ? dc : (a.time ?? "").localeCompare(b.time ?? "");
  });
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function addReservation(
  salonId: string,
  data: Omit<Reservation, "id">,
  createdBy?: string
): Promise<string> {
  if (!db) {
    const newR: Reservation = { ...data, id: `r_${Date.now()}` };
    const all = lsGetReservations();
    lsSaveReservations([...all, newR]);
    return newR.id;
  }

  const ref = await addDoc(col(salonId), {
    ...data,
    createdBy: createdBy ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateReservation(
  salonId: string,
  reservationId: string,
  data: Partial<Reservation>
): Promise<void> {
  if (!db) {
    const all = lsGetReservations().map((r) =>
      r.id === reservationId ? { ...r, ...data } : r
    );
    lsSaveReservations(all);
    return;
  }

  await updateDoc(doc(db, `salons/${salonId}/reservations`, reservationId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── 상태 변경 (완전한 버전: 고객 이력 반영 + 접근 로그) ──────────────────

export async function changeReservationStatus(
  salonId: string,
  reservation: Reservation,
  newStatus: ReservationStatus,
  options?: {
    cancelReason?: string;
    updatedBy?: {
      uid: string;
      name: string;
      role: PermissionRole;
    };
  }
): Promise<void> {
  // Demo mode (no Firestore)
  if (!db) {
    const all = lsGetReservations().map((r) =>
      r.id === reservation.id
        ? { ...r, status: newStatus, cancelReason: options?.cancelReason }
        : r
    );
    lsSaveReservations(all);
    return;
  }

  const now = new Date().toISOString();
  const resRef = doc(db, `salons/${salonId}/reservations`, reservation.id);

  // 예약 문서 업데이트
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: serverTimestamp(),
    updatedBy: options?.updatedBy?.uid ?? null,
  };

  if (newStatus === "completed") {
    updateData.completedAt = now;
  } else if (newStatus === "noShow") {
    updateData.noShowAt = now;
  } else if (newStatus === "cancelled") {
    updateData.cancelledAt = now;
    updateData.cancelReason = options?.cancelReason ?? "";
  }

  await updateDoc(resRef, updateData);

  // 접근 로그 기록 (non-blocking)
  if (options?.updatedBy) {
    const actionMap: Partial<Record<ReservationStatus, string>> = {
      completed: "reservation_completed",
      noShow: "reservation_no_show",
      cancelled: "reservation_cancelled",
    };
    const action = actionMap[newStatus] ?? "reservation_status_changed";

    addDoc(collection(db, `salons/${salonId}/accessLogs`), {
      userId: options.updatedBy.uid,
      userName: options.updatedBy.name,
      role: options.updatedBy.role,
      action,
      targetType: "reservation",
      targetId: reservation.id,
      createdAt: serverTimestamp(),
    }).catch(() => {});
  }

  // 고객 문서 업데이트 (non-blocking)
  if (reservation.customerId) {
    const customerRef = doc(db, `salons/${salonId}/customers`, reservation.customerId);

    // 완료 처리 → 방문 이력 추가 (중복 방지: 이미 completed이면 스킵)
    if (newStatus === "completed" && reservation.status !== "completed") {
      const visitRecord: VisitRecord = {
        reservationId: reservation.id,
        date: reservation.date,
        serviceName: reservation.serviceName,
        designerName: reservation.designerName,
        memo: reservation.note ?? "",
        price: reservation.price,
      };
      updateDoc(customerRef, {
        visitHistory: arrayUnion(visitRecord),
        lastVisitDate: reservation.date,
        totalVisits: increment(1),
        totalSpent: increment(reservation.price),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }

    // 노쇼 처리 → 노쇼 카운트 증가 (중복 방지)
    if (newStatus === "noShow" && reservation.status !== "noShow") {
      updateDoc(customerRef, {
        noShowCount: increment(1),
        lastNoShowDate: reservation.date,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }
}

// ── 접근 로그 기록 (non-blocking) ──────────────────────────────────────────

export function logReservationAccess(
  salonId: string,
  action: string,
  reservationId: string,
  user: { uid: string; name: string; role: PermissionRole }
): void {
  if (!db) return;
  addDoc(collection(db, `salons/${salonId}/accessLogs`), {
    userId: user.uid,
    userName: user.name,
    role: user.role,
    action,
    targetType: "reservation",
    targetId: reservationId,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}
