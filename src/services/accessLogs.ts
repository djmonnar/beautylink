import { db } from "@/lib/firebase";
import { AccessLog } from "@/types";
import { MOCK_ACCESS_LOGS } from "@/data/mock";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";

const col = (salonId: string) => collection(db!, `salons/${salonId}/accessLogs`);

// ── Read ───────────────────────────────────────────────────────────────────

export async function getAccessLogs(salonId: string, count = 50): Promise<AccessLog[]> {
  if (!db) {
    return MOCK_ACCESS_LOGS;
  }

  const q = query(col(salonId), orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccessLog));
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function addAccessLog(
  salonId: string,
  data: Omit<AccessLog, "id" | "createdAt">
): Promise<void> {
  if (!db) return;

  await addDoc(col(salonId), {
    ...data,
    createdAt: serverTimestamp(),
  });
}
