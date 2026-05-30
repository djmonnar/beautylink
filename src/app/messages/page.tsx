"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/context/AuthContext";
import {
  MessageSquare,
  Bell,
  Send,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  X,
  Info,
} from "lucide-react";
import type { MessageTemplate, MessageLog, MessageType, MessageChannel, Reservation } from "@/types";
import {
  getMessageTemplates,
  addMessageTemplate,
  updateMessageTemplate,
  toggleTemplateActive,
  seedDefaultTemplates,
  getMessageLogs,
  addMessageLog,
  getNoShowReservations,
  logMessageAccess,
  applyVars,
  PREVIEW_SAMPLE_VARS,
  CHANNEL_OPTIONS,
  TYPE_OPTIONS,
  TYPE_LABELS,
  TYPE_COLORS,
} from "@/services/messages";

// ── 권한 매핑 ─────────────────────────────────────────────────────────────
const ROLE_MAP = { owner: "원장", manager: "매니저", designer: "디자이너" } as const;

// ── 탭 타입 ──────────────────────────────────────────────────────────────
type Tab = "templates" | "send" | "noshow" | "logs";
const TABS: { key: Tab; label: string }[] = [
  { key: "templates", label: "템플릿 관리" },
  { key: "send",      label: "Mock 발송 테스트" },
  { key: "noshow",    label: "노쇼 관리" },
  { key: "logs",      label: "발송 이력" },
];

// ── Timestamp 표시 헬퍼 ───────────────────────────────────────────────────
function fmt(raw: unknown): string {
  if (!raw) return "—";
  if (typeof raw === "string") return raw.slice(0, 16).replace("T", " ");
  const ts = raw as { toDate?: () => Date; seconds?: number };
  if (typeof ts.toDate === "function") {
    return ts.toDate().toLocaleString("ko-KR", { hour12: false }).slice(0, 16);
  }
  if (typeof ts.seconds === "number") {
    return new Date(ts.seconds * 1000).toLocaleString("ko-KR", { hour12: false }).slice(0, 16);
  }
  return String(raw);
}

// ── 상태 배지 ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: MessageLog["status"] }) {
  if (status === "mock_sent" || status === "sent")
    return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Mock 발송됨</span>;
  if (status === "failed")
    return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">실패</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">대기</span>;
}

// ── 기본 폼 값 ────────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  title: "",
  type: "reservation_confirm" as MessageType,
  channel: "SMS" as MessageChannel,
  content: "",
  active: true,
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { userData } = useAuth();
  const salonId = userData?.salonId ?? null;
  const isOM = userData?.role === "owner" || userData?.role === "manager";

  const [tab, setTab] = useState<Tab>("templates");

  // ── 데이터 상태 ───────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [noShowRes, setNoShowRes] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── 템플릿 모달 ───────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<MessageTemplate | null>(null);
  const [form, setForm] = useState<typeof DEFAULT_FORM>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);

  // ── Mock 발송 탭 ──────────────────────────────────────────────────────
  const [sendTemplate, setSendTemplate] = useState<MessageTemplate | null>(null);
  const [mockName, setMockName] = useState("테스트 고객");
  const [mockPhone, setMockPhone] = useState("010-****-0000");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendToast, setSendToast] = useState<string | null>(null);

  // ── 로그 필터 ─────────────────────────────────────────────────────────
  const [logTypeFilter, setLogTypeFilter] = useState<string>("");
  const [logChannelFilter, setLogChannelFilter] = useState<string>("");
  const [logStatusFilter, setLogStatusFilter] = useState<string>("");

  // ── 노쇼 발송 중 상태 ─────────────────────────────────────────────────
  const [noshowSending, setNoshowSending] = useState<string | null>(null);

  // ── 데이터 로드 ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!salonId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [tmpl, logList, noshow] = await Promise.all([
        getMessageTemplates(salonId),
        getMessageLogs(salonId),
        getNoShowReservations(salonId),
      ]);
      setTemplates(tmpl);
      setLogs(logList);
      setNoShowRes(noshow.sort((a, b) => (b.noShowAt ?? b.date ?? "").localeCompare(a.noShowAt ?? a.date ?? "")));
      if (tmpl.length > 0 && !sendTemplate) setSendTemplate(tmpl[0]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [salonId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (templates.length > 0 && !sendTemplate) setSendTemplate(templates[0]); }, [templates]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 토스트 헬퍼 ───────────────────────────────────────────────────────
  function showToast(msg: string) {
    setSendToast(msg);
    setTimeout(() => setSendToast(null), 2800);
  }

  // ── 씨드 ─────────────────────────────────────────────────────────────
  async function handleSeed() {
    if (!salonId || !isOM) return;
    setSeedLoading(true);
    try {
      await seedDefaultTemplates(salonId, userData?.uid);
      await load();
      showToast("기본 템플릿 5개가 생성되었습니다.");
    } catch {
      setError("기본 템플릿 생성에 실패했습니다.");
    } finally {
      setSeedLoading(false);
    }
  }

  // ── 템플릿 저장 ───────────────────────────────────────────────────────
  function openAdd() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  }
  function openEdit(t: MessageTemplate) {
    setEditTarget(t);
    setForm({ title: t.title, type: t.type, channel: t.channel, content: t.content, active: t.active });
    setShowModal(true);
  }

  async function handleSave() {
    if (!salonId || !form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const user = userData;
      const role = ROLE_MAP[user?.role ?? "designer"];
      if (editTarget) {
        await updateMessageTemplate(salonId, editTarget.id, form, user?.uid);
        if (user) logMessageAccess(salonId, "message_template_updated", editTarget.id, { uid: user.uid ?? "", name: user.name ?? "", role });
      } else {
        const newId = await addMessageTemplate(salonId, form, user?.uid);
        if (user) logMessageAccess(salonId, "message_template_created", newId, { uid: user.uid ?? "", name: user.name ?? "", role });
      }
      await load();
      setShowModal(false);
      showToast(editTarget ? "템플릿이 수정되었습니다." : "템플릿이 추가되었습니다.");
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  // ── 활성/비활성 토글 ──────────────────────────────────────────────────
  async function handleToggle(t: MessageTemplate) {
    if (!salonId || !isOM) return;
    try {
      await toggleTemplateActive(salonId, t.id, !t.active, userData?.uid);
      if (!t.active === false && userData) {
        const role = ROLE_MAP[userData.role ?? "designer"];
        logMessageAccess(salonId, "message_template_deactivated", t.id, { uid: userData.uid ?? "", name: userData.name ?? "", role });
      }
      await load();
    } catch {
      setError("상태 변경에 실패했습니다.");
    }
  }

  // ── Mock 발송 ─────────────────────────────────────────────────────────
  async function handleMockSend() {
    if (!salonId || !sendTemplate || !mockName.trim()) return;
    setSendLoading(true);
    try {
      const content = applyVars(sendTemplate.content, {
        ...PREVIEW_SAMPLE_VARS,
        고객명: mockName,
      });
      const logId = await addMessageLog(salonId, {
        templateId: sendTemplate.id,
        templateTitle: sendTemplate.title,
        type: sendTemplate.type,
        customerName: mockName,
        phoneMasked: mockPhone,
        content,
        channel: sendTemplate.channel,
        status: "mock_sent",
        createdBy: userData?.uid,
      });
      const user = userData;
      if (user) {
        const role = ROLE_MAP[user.role ?? "designer"];
        logMessageAccess(salonId, "message_mock_sent", logId, { uid: user.uid ?? "", name: user.name ?? "", role });
      }
      await load();
      showToast("Mock 발송 로그가 저장되었습니다.");
    } catch {
      setError("Mock 발송에 실패했습니다.");
    } finally {
      setSendLoading(false);
    }
  }

  // ── 노쇼 Mock 발송 ───────────────────────────────────────────────────
  async function handleNoShowSend(r: Reservation) {
    if (!salonId || !isOM) return;
    const noShowTmpl = templates.find((t) => t.type === "noshow" && t.active);
    if (!noShowTmpl) {
      showToast("활성 노쇼 안내 템플릿이 없습니다. 템플릿 관리에서 먼저 생성해 주세요.");
      return;
    }
    setNoshowSending(r.id);
    try {
      const content = applyVars(noShowTmpl.content, {
        고객명: r.customerName,
        예약일: r.date,
        예약시간: r.time,
        디자이너명: r.designerName,
        시술명: r.serviceName,
        매장명: "뷰티링크 헤어",
        매장전화: "02-1234-5678",
      });
      const logId = await addMessageLog(salonId, {
        templateId: noShowTmpl.id,
        templateTitle: noShowTmpl.title,
        type: "noshow",
        customerId: r.customerId,
        customerName: r.customerName,
        phoneMasked: r.customerPhoneMasked,
        reservationId: r.id,
        content,
        channel: noShowTmpl.channel,
        status: "mock_sent",
        createdBy: userData?.uid,
      });
      const user = userData;
      if (user) {
        const role = ROLE_MAP[user.role ?? "designer"];
        logMessageAccess(salonId, "no_show_message_mock_sent", logId, { uid: user.uid ?? "", name: user.name ?? "", role });
      }
      await load();
      showToast(`${r.customerName}님께 노쇼 안내 Mock 발송 완료`);
    } catch {
      setError("노쇼 발송에 실패했습니다.");
    } finally {
      setNoshowSending(null);
    }
  }

  // ── 로그 필터링 ───────────────────────────────────────────────────────
  const filteredLogs = logs.filter((l) => {
    if (logTypeFilter && l.type !== logTypeFilter) return false;
    if (logChannelFilter && l.channel !== logChannelFilter) return false;
    if (logStatusFilter && l.status !== logStatusFilter) return false;
    return true;
  });

  // ── 렌더 ─────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="문자·알림톡·노쇼 관리" description="메시지 템플릿 관리, Mock 발송 테스트, 노쇼 관리">
      {/* 토스트 */}
      {sendToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm">
          <CheckCircle size={16} className="text-green-400" />
          {sendToast}
        </div>
      )}

      <div className="space-y-6">
        {/* Mock 안내 배너 */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            현재는 실제 문자/알림톡 발송이 아닌 <strong>mock 로그 저장 단계</strong>입니다.
            발송 버튼을 클릭하면 Firestore에 발송 이력만 저장됩니다.
          </p>
        </div>

        {/* salonId null guard */}
        {!salonId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
            <p className="text-amber-800 font-semibold mb-1">매장 정보가 연결되지 않았습니다.</p>
            <p className="text-sm text-amber-600">users/{userData?.uid ?? "—"}.salonId를 확인해주세요.</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-xs underline flex-shrink-0">닫기</button>
          </div>
        ) : null}

        {/* 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                tab === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
              {key === "noshow" && noShowRes.length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {noShowRes.length}
                </span>
              )}
              {key === "logs" && logs.length > 0 && (
                <span className="ml-1.5 bg-gray-400 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {logs.length}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={load}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        {/* 로딩 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-400" />
          </div>
        ) : !salonId ? null : (

          <>
            {/* ═══════════════════════════════ 탭 1: 템플릿 관리 ═══════════════════════════ */}
            {tab === "templates" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-gray-900">
                    메시지 템플릿 <span className="text-sm font-normal text-gray-400">({templates.length}개)</span>
                  </h2>
                  <div className="flex gap-2">
                    {templates.length === 0 && isOM && (
                      <button
                        onClick={handleSeed}
                        disabled={seedLoading}
                        className="flex items-center gap-1.5 text-sm text-amber-700 border border-amber-300 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        {seedLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        기본 템플릿 5개 생성
                      </button>
                    )}
                    {isOM && (
                      <button
                        onClick={openAdd}
                        className="flex items-center gap-1.5 text-sm text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus size={13} />
                        템플릿 추가
                      </button>
                    )}
                  </div>
                </div>

                {templates.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-200 py-16 text-center">
                    <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-1">등록된 템플릿이 없습니다.</p>
                    {isOM && <p className="text-xs text-gray-400">위의 "기본 템플릿 5개 생성" 버튼을 눌러 시작하세요.</p>}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {templates.map((t) => (
                      <div
                        key={t.id}
                        className={`bg-white rounded-xl border p-4 shadow-sm transition-opacity ${t.active ? "border-gray-100" : "border-gray-100 opacity-60"}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[t.type]}`}>
                              {TYPE_LABELS[t.type]}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 truncate">{t.title}</span>
                          </div>
                          {isOM && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => handleToggle(t)} className={`p-1.5 rounded-lg hover:bg-gray-100 ${t.active ? "text-blue-500" : "text-gray-300"}`}>
                                {t.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line line-clamp-3 mb-3">
                          {t.content}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">{t.channel}</span>
                          <span className={`text-xs font-medium ${t.active ? "text-green-600" : "text-gray-400"}`}>
                            {t.active ? "활성" : "비활성"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════ 탭 2: Mock 발송 테스트 ══════════════════════ */}
            {tab === "send" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 왼쪽: 설정 */}
                <div className="space-y-4">
                  <h2 className="font-semibold text-gray-900">Mock 발송 설정</h2>

                  {/* 템플릿 선택 */}
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">템플릿 선택</label>
                      <select
                        value={sendTemplate?.id ?? ""}
                        onChange={(e) => setSendTemplate(templates.find((t) => t.id === e.target.value) ?? null)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {templates.filter((t) => t.active).map((t) => (
                          <option key={t.id} value={t.id}>
                            [{TYPE_LABELS[t.type]}] {t.title}
                          </option>
                        ))}
                      </select>
                      {templates.filter((t) => t.active).length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">활성 템플릿이 없습니다. 먼저 템플릿을 생성하세요.</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Mock 고객명</label>
                      <input
                        type="text"
                        value={mockName}
                        onChange={(e) => setMockName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 홍길동"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Mock 연락처 (마스킹)</label>
                      <input
                        type="text"
                        value={mockPhone}
                        onChange={(e) => setMockPhone(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="010-****-0000"
                      />
                      <p className="text-xs text-gray-400 mt-1">실제 연락처 입력 금지. 마스킹 형식만 허용.</p>
                    </div>

                    <button
                      onClick={handleMockSend}
                      disabled={sendLoading || !sendTemplate || !isOM}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {isOM ? "Mock 발송 (로그 저장)" : "권한 없음 (owner/manager만)"}
                    </button>
                  </div>
                </div>

                {/* 오른쪽: 미리보기 */}
                <div className="space-y-4">
                  <h2 className="font-semibold text-gray-900">메시지 미리보기</h2>
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    {sendTemplate ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[sendTemplate.type]}`}>
                            {TYPE_LABELS[sendTemplate.type]}
                          </span>
                          <span className="text-xs text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">{sendTemplate.channel}</span>
                        </div>
                        <p className="font-medium text-gray-900 text-sm mb-3">{sendTemplate.title}</p>
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed border border-gray-100">
                          {applyVars(sendTemplate.content, {
                            ...PREVIEW_SAMPLE_VARS,
                            고객명: mockName || "홍길동",
                          })}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">
                          * 위 내용은 샘플 변수가 적용된 미리보기입니다. 실제 발송 아님.
                        </p>
                      </>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-400">
                        왼쪽에서 템플릿을 선택해 주세요.
                      </div>
                    )}
                  </div>

                  {/* 변수 안내 */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs font-medium text-blue-900 mb-2">사용 가능한 변수</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["{고객명}", "{예약일}", "{예약시간}", "{디자이너명}", "{시술명}", "{매장명}", "{매장전화}"].map((v) => (
                        <code key={v} className="text-[10px] bg-white text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">{v}</code>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════ 탭 3: 노쇼 관리 ═══════════════════════════ */}
            {tab === "noshow" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  <h2 className="font-semibold text-gray-900">
                    노쇼 예약
                    <span className="ml-2 text-sm font-normal text-gray-400">({noShowRes.length}건)</span>
                  </h2>
                </div>

                {noShowRes.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-200 py-16 text-center">
                    <CheckCircle size={32} className="text-green-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">노쇼 기록이 없습니다.</p>
                  </div>
                ) : (
                  <>
                    {/* 모바일 카드 */}
                    <div className="md:hidden space-y-3">
                      {noShowRes.map((r) => (
                        <div key={r.id} className="bg-white rounded-xl border border-red-100 p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <p className="font-medium text-gray-900">{r.customerName}</p>
                              <p className="text-xs text-gray-500">{r.customerPhoneMasked}</p>
                            </div>
                            {isOM && (
                              <button
                                onClick={() => handleNoShowSend(r)}
                                disabled={noshowSending === r.id}
                                className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 flex-shrink-0"
                              >
                                {noshowSending === r.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                노쇼 안내 발송
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <p>📅 {r.date} {r.time}</p>
                            <p>💇 {r.serviceName}</p>
                            <p>👤 {r.designerName}</p>
                            {r.noShowAt && <p className="text-gray-400">처리일: {r.noShowAt.slice(0, 10)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 데스크탑 테이블 */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {["고객명", "연락처(마스킹)", "예약일", "시간", "시술", "디자이너", "처리일", ""].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {noShowRes.map((r) => (
                            <tr key={r.id} className="hover:bg-red-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">{r.customerName}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs tabular-nums">{r.customerPhoneMasked}</td>
                              <td className="px-4 py-3 text-gray-600 tabular-nums">{r.date}</td>
                              <td className="px-4 py-3 text-gray-600 tabular-nums">{r.time}</td>
                              <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{r.serviceName}</td>
                              <td className="px-4 py-3 text-gray-600">{r.designerName}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">
                                {r.noShowAt ? r.noShowAt.slice(0, 10) : "—"}
                              </td>
                              <td className="px-4 py-3">
                                {isOM && (
                                  <button
                                    onClick={() => handleNoShowSend(r)}
                                    disabled={noshowSending === r.id}
                                    className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                  >
                                    {noshowSending === r.id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                    노쇼 안내 발송
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                  ⚠ "노쇼 안내 발송" 클릭 시 실제 문자가 발송되지 않습니다. Firestore messageLogs에 mock 기록만 저장됩니다.
                </div>
              </div>
            )}

            {/* ═══════════════════════════════ 탭 4: 발송 이력 ════════════════════════════ */}
            {tab === "logs" && (
              <div className="space-y-4">
                {/* 필터 */}
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={logTypeFilter}
                    onChange={(e) => setLogTypeFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">전체 유형</option>
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <select
                    value={logChannelFilter}
                    onChange={(e) => setLogChannelFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">전체 채널</option>
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={logStatusFilter}
                    onChange={(e) => setLogStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">전체 상태</option>
                    <option value="mock_sent">Mock 발송됨</option>
                    <option value="sent">발송완료</option>
                    <option value="failed">실패</option>
                    <option value="pending">대기</option>
                  </select>
                  {(logTypeFilter || logChannelFilter || logStatusFilter) && (
                    <button
                      onClick={() => { setLogTypeFilter(""); setLogChannelFilter(""); setLogStatusFilter(""); }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <X size={11} />필터 초기화
                    </button>
                  )}
                  <span className="ml-auto text-xs text-gray-400">{filteredLogs.length}건</span>
                </div>

                {filteredLogs.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-200 py-16 text-center">
                    <Bell size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">발송 이력이 없습니다.</p>
                  </div>
                ) : (
                  <>
                    {/* 모바일 카드 */}
                    <div className="md:hidden space-y-3">
                      {filteredLogs.map((l) => (
                        <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[l.type]}`}>
                                {TYPE_LABELS[l.type]}
                              </span>
                              <StatusBadge status={l.status} />
                            </div>
                            <span className="text-[10px] text-gray-400 tabular-nums">{fmt(l.createdAt)}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{l.customerName}</p>
                          <p className="text-xs text-gray-500">{l.phoneMasked} · {l.channel}</p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{l.content}</p>
                        </div>
                      ))}
                    </div>

                    {/* 데스크탑 테이블 */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {["유형", "고객명", "연락처", "채널", "내용", "발송시각", "상태"].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredLogs.map((l) => (
                            <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[l.type]}`}>
                                  {TYPE_LABELS[l.type]}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">{l.customerName}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs tabular-nums">{l.phoneMasked}</td>
                              <td className="px-4 py-3 text-xs text-gray-600">{l.channel}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{l.content}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">{fmt(l.createdAt)}</td>
                              <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════ 템플릿 추가/수정 모달 ══════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-2 flex items-center justify-between border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {editTarget ? "템플릿 수정" : "템플릿 추가"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* 제목 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">제목 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="예: 예약 확정 안내"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 유형 + 채널 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">유형</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as MessageType }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">채널</label>
                  <select
                    value={form.channel}
                    onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as MessageChannel }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CHANNEL_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 내용 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">내용 *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={6}
                  placeholder="{고객명}, {예약일}, {예약시간}, {디자이너명}, {시술명}, {매장명}, {매장전화} 사용 가능"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">변수: {"{고객명} {예약일} {예약시간} {디자이너명} {시술명} {매장명} {매장전화}"}</p>
              </div>

              {/* 미리보기 */}
              {form.content && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-[10px] font-medium text-gray-500 mb-1.5">미리보기 (샘플 값 적용)</p>
                  <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                    {applyVars(form.content, PREVIEW_SAMPLE_VARS)}
                  </p>
                </div>
              )}

              {/* 활성 여부 */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">활성 상태</span>
                <button
                  onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${form.active ? "text-blue-600" : "text-gray-400"}`}
                >
                  {form.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  {form.active ? "활성" : "비활성"}
                </button>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.content.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editTarget ? "수정 저장" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
