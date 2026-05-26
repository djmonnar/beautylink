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
  orderBy,
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

  const q = date
    ? query(col(salonId), where("date", "==", date), orderBy("time"))
    : query(col(salonId), orderBy("date"), orderBy("time"));

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reservation));
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

  const q = query(col(salonId), where("date", "==", date), orderBy("time"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reservation)));
  });
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function addReservation(salonId: string, data: Omit<Reservation, "id">): Promise<string> {
  if (!db) {
    const newR: Reservation = { ...data, id: `r_${Date.now()}` };
    const all = lsGetReservations();
    lsSaveReservations([...all, newR]);
    return newR.id;
  }

  const ref = await addDoc(col(salonId), {
    ...data,
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
