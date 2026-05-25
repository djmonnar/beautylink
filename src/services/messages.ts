import { db } from "@/lib/firebase";
import { MessageTemplate, MessageLog } from "@/types";
import { MOCK_MESSAGE_LOGS } from "@/data/mock";
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";

const templateCol = (salonId: string) =>
  collection(db!, `salons/${salonId}/messageTemplates`);
const logCol = (salonId: string) =>
  collection(db!, `salons/${salonId}/messageLogs`);

// ── Templates ──────────────────────────────────────────────────────────────

export async function getMessageTemplates(salonId: string): Promise<MessageTemplate[]> {
  if (!db) return [];

  const snap = await getDocs(templateCol(salonId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MessageTemplate));
}

// ── Logs ───────────────────────────────────────────────────────────────────

export async function getMessageLogs(salonId: string, count = 50): Promise<MessageLog[]> {
  if (!db) {
    return MOCK_MESSAGE_LOGS;
  }

  const q = query(logCol(salonId), orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MessageLog));
}

export async function addMessageLog(
  salonId: string,
  data: Omit<MessageLog, "id">
): Promise<string> {
  if (!db) {
    // Demo: just return a fake id (no persistence)
    return `m_${Date.now()}`;
  }

  const ref = await addDoc(logCol(salonId), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
