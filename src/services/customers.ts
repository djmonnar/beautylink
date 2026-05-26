import { db } from "@/lib/firebase";
import { Customer, CustomerPrivate } from "@/types";
import { MOCK_CUSTOMERS, getCustomers as lsGetCustomers, saveCustomers as lsSaveCustomers } from "@/data/mock";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const col = (salonId: string) => collection(db!, `salons/${salonId}/customers`);
// 고객 민감정보: salons/{salonId}/customerPrivate/{customerId}
const privateDoc = (salonId: string, customerId: string) =>
  doc(db!, `salons/${salonId}/customerPrivate/${customerId}`);

// ── Read ───────────────────────────────────────────────────────────────────

export async function getCustomers(salonId: string): Promise<Customer[]> {
  if (!db) {
    return lsGetCustomers();
  }

  const q = query(col(salonId), orderBy("lastVisitDate", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
}

export async function getCustomer(salonId: string, customerId: string): Promise<Customer | null> {
  if (!db) {
    return MOCK_CUSTOMERS.find((c) => c.id === customerId) ?? null;
  }

  const snap = await getDoc(doc(db, `salons/${salonId}/customers`, customerId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Customer;
}

export async function getCustomerPrivate(
  salonId: string,
  customerId: string
): Promise<CustomerPrivate | null> {
  if (!db) {
    // Demo: return stub private data
    return { phoneRaw: "010-0000-0000" };
  }

  const snap = await getDoc(privateDoc(salonId, customerId));
  if (!snap.exists()) return null;
  return snap.data() as CustomerPrivate;
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function addCustomer(
  salonId: string,
  data: Omit<Customer, "id">,
  privateData?: CustomerPrivate
): Promise<string> {
  if (!db) {
    const newC: Customer = { ...data, id: `c_${Date.now()}` };
    const all = lsGetCustomers();
    lsSaveCustomers([...all, newC]);
    return newC.id;
  }

  const ref = await addDoc(col(salonId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (privateData) {
    // setDoc: 문서가 없어도 생성 (updateDoc은 기존 문서가 있어야 해서 버그)
    await setDoc(privateDoc(salonId, ref.id), {
      ...privateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return ref.id;
}

export async function updateCustomer(
  salonId: string,
  customerId: string,
  data: Partial<Customer>
): Promise<void> {
  if (!db) {
    const all = lsGetCustomers().map((c) =>
      c.id === customerId ? { ...c, ...data } : c
    );
    lsSaveCustomers(all);
    return;
  }

  await updateDoc(doc(db, `salons/${salonId}/customers`, customerId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function saveCustomerPrivate(
  salonId: string,
  customerId: string,
  data: Partial<CustomerPrivate>
): Promise<void> {
  if (!db) return;

  // merge: true → 기존 필드 유지하면서 부분 업데이트
  await setDoc(privateDoc(salonId, customerId), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
