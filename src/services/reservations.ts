import { db } from "@/lib/firebase";
import { Reservation } from "@/types";
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

export async function updateReservationStatus(
  salonId: string,
  reservationId: string,
  status: Reservation["status"]
): Promise<void> {
  return updateReservation(salonId, reservationId, { status });
}
