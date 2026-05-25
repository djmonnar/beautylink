import { db } from "@/lib/firebase";
import { Designer } from "@/types";
import { MOCK_DESIGNERS } from "@/data/mock";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const col = (salonId: string) => collection(db!, `salons/${salonId}/designers`);

// ── Read ───────────────────────────────────────────────────────────────────

export async function getDesigners(salonId: string): Promise<Designer[]> {
  if (!db) {
    return MOCK_DESIGNERS;
  }

  const q = query(col(salonId), orderBy("joinedAt"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Designer));
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function addDesigner(
  salonId: string,
  data: Omit<Designer, "id">
): Promise<string> {
  if (!db) {
    // Demo mode: no persistence (readonly mock)
    return `d_${Date.now()}`;
  }

  const ref = await addDoc(col(salonId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDesigner(
  salonId: string,
  designerId: string,
  data: Partial<Designer>
): Promise<void> {
  if (!db) return;

  await updateDoc(doc(db, `salons/${salonId}/designers`, designerId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateDesignerStatus(
  salonId: string,
  designerId: string,
  status: Designer["status"]
): Promise<void> {
  return updateDesigner(salonId, designerId, { status });
}
