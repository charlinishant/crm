import React, { useCallback, useEffect, useState } from "react";
import { Download, Headphones, RefreshCw } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getName = (value, fallback) =>
  [value?.firstName, value?.lastName].filter(Boolean).join(" ") ||
  value?.username || value?.email || fallback;

const formatDuration = (seconds) => {
  const total = Math.max(0, Number(seconds) || 0);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN", {
  day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit",
}) : "-";

const getStatusLabel = (value) => {
  const status = String(value || "initiated").toLowerCase();
  if (["initiated", "queued"].includes(status)) return "queued";
  if (["calling", "ringing", "connected", "in-progress"].includes(status)) return "in progress";
  return status.replace(/-/g, " ");
};

const getDirectionLabel = (log) => {
  const direction = String(log.direction || "").toLowerCase();
  if (direction === "inbound") return "inbound";
  if (direction === "outbound") return "outbound";
  const notes = String(log.notes || "").toLowerCase();
  if (notes.includes("inbound")) return "inbound";
  if (notes.includes("outbound")) return "outbound";
  return "-";
};

const ProtectedRecording = ({ callId, status }) => {
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const loadRecording = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/calls/recording/${callId}`, {
        headers:token ? { Authorization:`Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.message || "Unable to load recording");
      }
      setAudioUrl(URL.createObjectURL(await response.blob()));
    } catch (loadError) {
      setError(loadError.message || "Recording unavailable");
    } finally {
      setLoading(false);
    }
  };

  if (audioUrl) {
    return (
      <div className="call-log-recording-player">
        <audio className="call-log-recording" controls preload="metadata" src={audioUrl}>Recording unavailable</audio>
        <a className="call-log-download-recording" href={audioUrl} download={`call-recording-${callId}.mp3`}>
          <Download size={13} /> Save
        </a>
      </div>
    );
  }
  return (
    <div className="call-log-recording-box">
      <span className="call-log-recording-saved"><Headphones size={13} /> Saved in CRM</span>
      <button type="button" className="call-log-load-recording" onClick={loadRecording} disabled={loading}>
        {loading ? "Loading..." : "Play"}
      </button>
      {error && <span className="call-log-recording-error">{error}</span>}
      {!error && <small>{getStatusLabel(status)} call recording</small>}
    </div>
  );
};

const RecordingCell = ({ log }) => {
  if (log.recordingUrl) return <ProtectedRecording callId={log.id} status={log.status} />;

  const status = String(log.status || "").toLowerCase();
  const waiting = ["initiated", "queued", "calling", "ringing", "connected", "in-progress"].includes(status);
  return (
    <div className="call-log-recording-box muted">
      <span>{waiting ? "Recording pending" : "No recording"}</span>
      <small>{waiting ? "Available after call ends" : "Not saved for this call"}</small>
    </div>
  );
};

const detailRows = (log) => [
  ["Lead", log.lead ? getName(log.lead, `Lead #${log.leadId}`) : "Unknown Caller"],
  ["Lead ID", log.leadId ? `#${log.leadId}` : "-"],
  ["Direction", getDirectionLabel(log)],
  ["Disposition", log.disposition || "-"],
  ["Phone", log.callerNumber || log.customerNumber || log.leadPhone || log.phone || "-"],
  ["Agent", getName(log.agent, "-")],
  ["Status", getStatusLabel(log.status)],
  ["Duration", formatDuration(log.duration)],
  ["Disconnected By", log.disconnectedBy || "-"],
  ["Recording", log.recordingUrl ? "Available" : "Not saved"],
  ["Created", formatDate(log.createdAt)],
  ["Started", formatDate(log.startedAt)],
  ["Ended", formatDate(log.endedAt)],
  ["Notes", log.notes || "-"],
];

const CallLogsTable = ({ scope = "admin", direction = "" }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [recordingFilter, setRecordingFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [openActionLogId, setOpenActionLogId] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [pendingDeleteLog, setPendingDeleteLog] = useState(null);
  const [selectedLogIds, setSelectedLogIds] = useState([]);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const recordsPerPage = 10;
  const [totalItems, setTotalItems] = useState(0);
  const effectiveDirection = direction || directionFilter;

  const loadLogs = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    if (showLoading) setError("");
    try {
      const token = localStorage.getItem("authToken");
      const endpoint = effectiveDirection === "inbound" && scope !== "admin" ? "/api/calls/inbound" : scope === "admin" ? "/api/calls/admin/all" : "/api/calls/my";
      const params = new URLSearchParams({ page:String(currentPage), limit:String(recordsPerPage) });
      if (effectiveDirection) params.set("direction", effectiveDirection);
      if (statusFilter) params.set("status", statusFilter);
      if (searchFilter) params.set("callerNumber", searchFilter);
      if (recordingFilter) params.set("recordingAvailable", recordingFilter);
      const response = await fetch(`${API_URL}${endpoint}?${params.toString()}`, {
        headers:token ? { Authorization:`Bearer ${token}` } : {},
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to load call logs");
      setLogs(Array.isArray(result?.data) ? result.data : []);
      setTotalItems(Number(result?.totalItems) || 0);
    } catch (loadError) {
      if (showLoading) {
        setLogs([]);
        setTotalItems(0);
        setError(loadError.message || "Unable to load call logs");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentPage, effectiveDirection, recordingFilter, scope, searchFilter, statusFilter]);

  const buildLogRequestUrl = useCallback((page, limit = recordsPerPage) => {
    const endpoint = effectiveDirection === "inbound" && scope !== "admin" ? "/api/calls/inbound" : scope === "admin" ? "/api/calls/admin/all" : "/api/calls/my";
    const params = new URLSearchParams({ page:String(page), limit:String(limit) });
    if (effectiveDirection) params.set("direction", effectiveDirection);
    if (statusFilter) params.set("status", statusFilter);
    if (searchFilter) params.set("callerNumber", searchFilter);
    if (recordingFilter) params.set("recordingAvailable", recordingFilter);
    return `${API_URL}${endpoint}?${params.toString()}`;
  }, [effectiveDirection, recordingFilter, scope, searchFilter, statusFilter]);

  useEffect(() => {
    loadLogs();
    const interval = window.setInterval(() => loadLogs(false), 5000);
    return () => window.clearInterval(interval);
  }, [loadLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveDirection, recordingFilter, searchFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(totalItems / recordsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * recordsPerPage;
  const pageEnd = Math.min(pageStart + logs.length, totalItems);
  const paginatedLogs = logs;
  const visibleLogIds = paginatedLogs.map((log) => log.id);
  const allVisibleSelected = visibleLogIds.length > 0 && visibleLogIds.every((id) => selectedLogIds.includes(id));
  const allMatchingSelected = totalItems > 0 && selectedLogIds.length >= totalItems;
  const inboundCount = logs.filter((log) => getDirectionLabel(log) === "inbound").length;
  const outboundCount = logs.filter((log) => getDirectionLabel(log) === "outbound").length;

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setSelectedLogIds([]);
  }, [currentPage, effectiveDirection, recordingFilter, searchFilter, statusFilter]);

  useEffect(() => {
    const closeMenu = () => setOpenActionLogId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const deleteLog = async (log) => {
    setOpenActionLogId(null);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/calls/${log.id}`, {
        method:"DELETE",
        headers:token ? { Authorization:`Bearer ${token}` } : {},
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to delete call log");
      setLogs((current) => current.filter((item) => item.id !== log.id));
      setTotalItems((current) => Math.max(0, current - 1));
      setPendingDeleteLog(null);
      setSelectedLogIds((current) => current.filter((id) => id !== log.id));
      setSelectedLog((current) => current?.id === log.id ? null : current);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete call log");
    }
  };

  const toggleLogSelection = (id) => {
    setSelectedLogIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  };

  const toggleVisibleSelection = () => {
    if (allMatchingSelected) {
      setSelectedLogIds([]);
      return;
    }
    selectAllMatchingLogs();
  };

  const selectAllMatchingLogs = async () => {
    setSelectingAll(true);
    setError("");
    try {
      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization:`Bearer ${token}` } : {};
      const limit = 100;
      let page = 1;
      let allIds = [];
      let expectedTotal = totalItems;
      while (page === 1 || allIds.length < expectedTotal) {
        const response = await fetch(buildLogRequestUrl(page, limit), { headers });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.message || "Unable to select all call logs");
        const pageLogs = Array.isArray(result?.data) ? result.data : [];
        expectedTotal = Number(result?.totalItems) || pageLogs.length;
        allIds = [...allIds, ...pageLogs.map((log) => log.id).filter(Boolean)];
        if (!pageLogs.length || pageLogs.length < limit) break;
        page += 1;
      }
      setSelectedLogIds(Array.from(new Set(allIds)));
    } catch (selectError) {
      setError(selectError.message || "Unable to select all call logs");
    } finally {
      setSelectingAll(false);
    }
  };

  const deleteSelectedLogs = async () => {
    const idsToDelete = [...pendingBulkDeleteIds];
    if (!idsToDelete.length) return;
    setBulkDeleting(true);
    setOpenActionLogId(null);
    try {
      const token = localStorage.getItem("authToken");
      const deletedIds = [];
      for (const id of idsToDelete) {
        const response = await fetch(`${API_URL}/api/calls/${id}`, {
          method:"DELETE",
          headers:token ? { Authorization:`Bearer ${token}` } : {},
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.message || `Unable to delete call log #${id}`);
        deletedIds.push(id);
      }
      setLogs((current) => current.filter((item) => !deletedIds.includes(item.id)));
      setTotalItems((current) => Math.max(0, current - deletedIds.length));
      setSelectedLogIds((current) => current.filter((id) => !deletedIds.includes(id)));
      setSelectedLog((current) => current && deletedIds.includes(current.id) ? null : current);
      setPendingBulkDeleteIds([]);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete selected call logs");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <section className="call-log-panel">
      <style>{`
        .call-log-panel { background:#fff; border:1px solid #dbe3ef; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,.05); overflow:hidden; }
        .call-log-head { align-items:center; background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%); border-bottom:1px solid #dbe3ef; display:flex; gap:16px; justify-content:space-between; padding:20px 24px; }
        .call-log-head h2 { color:#0f172a; font-size:20px; margin:0 0 4px; }
        .call-log-head p { color:#64748b; font-size:13px; margin:0; }
        .call-log-head button, .call-log-load-recording, .call-log-download-recording { align-items:center; background:#fff; border:1px solid #c7d8ff; border-radius:8px; color:#2563eb; cursor:pointer; display:inline-flex; gap:7px; min-height:34px; padding:0 12px; text-decoration:none; }
        .call-log-head button:hover, .call-log-load-recording:hover:not(:disabled), .call-log-download-recording:hover { background:#eef4ff; border-color:#8fb3ff; }
        .call-log-head button:disabled, .call-log-load-recording:disabled { cursor:not-allowed; opacity:.58; }
        .call-log-summary { display:grid; gap:12px; grid-template-columns:repeat(4,minmax(150px,1fr)); padding:16px 20px; }
        .call-log-summary-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; }
        .call-log-summary-card span { color:#64748b; display:block; font-size:11px; font-weight:700; text-transform:uppercase; }
        .call-log-summary-card strong { color:#0f172a; display:block; font-size:22px; line-height:1; margin-top:8px; }
        .call-log-table-wrap { border-top:1px solid #e2e8f0; overflow-x:auto; padding:24px; }
        .call-log-table { border-collapse:collapse; color:#334155; font-size:14px; min-width:1340px; width:100%; }
        .call-log-table th { background:#487fff; border:0; color:#ffffff; font-size:14px; font-weight:700; letter-spacing:0; padding:18px 20px; text-align:left; text-transform:none; white-space:nowrap; }
        .call-log-table th:first-child { border-radius:8px 0 0 8px; }
        .call-log-table th:last-child { border-radius:0 8px 8px 0; }
        .call-log-table td { border-bottom:1px solid #e2e8f0; color:#334155; font-size:14px; padding:18px 20px; vertical-align:middle; }
        .call-log-table tbody tr:nth-child(even) { background:#f8fafc; }
        .call-log-table tbody tr:hover, .call-log-table tbody tr:nth-child(even):hover { background:#f1f5f9; }
        .call-log-table tbody tr.selected, .call-log-table tbody tr.selected:nth-child(even) { background:#eaf3ff; box-shadow:inset 4px 0 0 #2563eb; }
        .call-log-select-col { text-align:center !important; width:48px; }
        .call-log-check { align-items:center; cursor:pointer; display:inline-flex; height:24px; justify-content:center; width:24px; }
        .call-log-check input { height:1px; opacity:0; position:absolute; width:1px; }
        .call-log-check span { align-items:center; background:#fff; border:2px solid #94a3b8; border-radius:6px; color:#fff; display:inline-flex; font-size:15px; font-weight:900; height:22px; justify-content:center; line-height:1; transition:all .15s ease; width:22px; }
        .call-log-check:hover span { border-color:#2563eb; }
        .call-log-check input:checked + span { background:#2563eb; border-color:#2563eb; }
        .call-log-check input:focus-visible + span { box-shadow:0 0 0 3px rgba(37,99,235,.22); }
        .call-log-name { color:#0f172a; display:block; font-size:15px; font-weight:700; }
        .call-log-sub { color:#64748b; display:block; font-size:12px; margin-top:4px; }
        .call-log-status { background:#eef4ff; border-radius:999px; color:#0f172a; display:inline-flex; font-size:12px; font-weight:700; padding:8px 12px; text-transform:capitalize; }
        .call-log-recording-player { align-items:flex-start; display:grid; gap:7px; min-width:240px; }
        .call-log-recording { height:34px; max-width:250px; width:230px; }
        .call-log-load-recording, .call-log-download-recording { font-size:11px; min-height:30px; padding:0 9px; width:max-content; }
        .call-log-recording-box { align-items:flex-start; display:grid; gap:5px; min-width:180px; }
        .call-log-recording-box small { color:#64748b; font-size:10px; }
        .call-log-recording-box.muted span { color:#94a3b8; font-size:14px; font-weight:700; }
        .call-log-recording-saved { align-items:center; color:#166534; display:inline-flex; font-size:11px; font-weight:800; gap:5px; text-transform:uppercase; }
        .call-log-recording-error { color:#dc2626; display:block; font-size:10px; margin-top:4px; max-width:180px; }
        .call-log-filters { border-top:1px solid #e2e8f0; display:grid; gap:12px; grid-template-columns:2fr 1fr 1fr 1fr; padding:16px 20px; }
        .call-log-filters input, .call-log-filters select { background:#fff; border:1px solid #cbd5e1; border-radius:8px; color:#0f172a; font-size:13px; min-height:38px; padding:0 12px; }
        .call-log-bulk-actions { align-items:center; background:#fff7ed; border-top:1px solid #fed7aa; display:flex; gap:12px; justify-content:space-between; padding:12px 20px; }
        .call-log-bulk-actions span { color:#9a3412; font-size:13px; font-weight:800; }
        .call-log-bulk-actions button { background:#dc2626; border:0; border-radius:8px; color:#fff; cursor:pointer; font-size:13px; font-weight:800; min-height:34px; padding:0 14px; }
        .call-log-bulk-actions button:hover { background:#b91c1c; }
        .call-log-empty { color:#64748b; padding:42px 20px; text-align:center; }
        .call-log-error { color:#dc2626; padding:18px 20px; }
        .call-log-notes { max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .call-log-actions { display:inline-flex; justify-content:center; position:relative; }
        .call-log-action-btn { align-items:center; background:#fff; border:1px solid #cbd5e1; border-radius:8px; color:#0f172a; cursor:pointer; display:inline-flex; font-size:22px; font-weight:800; height:36px; justify-content:center; line-height:1; width:42px; }
        .call-log-action-btn:hover { background:#eef4ff; border-color:#8fb3ff; color:#2563eb; }
        .call-log-action-menu { background:#fff; border:1px solid #dbe3ef; border-radius:8px; box-shadow:0 16px 36px rgba(15,23,42,.16); display:grid; min-width:128px; padding:6px; position:absolute; right:0; top:calc(100% + 6px); z-index:12; }
        .call-log-action-menu button { background:transparent; border:0; border-radius:6px; color:#334155; cursor:pointer; font-size:13px; font-weight:700; min-height:34px; padding:0 10px; text-align:left; }
        .call-log-action-menu button:hover { background:#f1f5f9; color:#2563eb; }
        .call-log-action-menu button.danger { color:#dc2626; }
        .call-log-action-menu button.danger:hover { background:#fff1f2; color:#be123c; }
        .call-log-confirm-backdrop { align-items:center; background:rgba(15,23,42,.45); display:flex; inset:0; justify-content:center; padding:24px; position:fixed; z-index:1400; }
        .call-log-confirm-modal { background:#fff; border-radius:10px; box-shadow:0 24px 70px rgba(15,23,42,.24); max-width:390px; padding:24px 24px; text-align:center; width:min(390px,100%); }
        .call-log-confirm-icon { align-items:center; background:#fee2e2; border-radius:50%; color:#dc2626; display:inline-flex; font-size:22px; font-weight:900; height:48px; justify-content:center; margin-bottom:14px; width:48px; }
        .call-log-confirm-modal h3 { color:#0f172a; font-size:22px; line-height:1.22; margin:0 0 8px; }
        .call-log-confirm-modal p { color:#475569; font-size:14px; margin:0 0 20px; }
        .call-log-confirm-actions { display:flex; gap:12px; justify-content:center; }
        .call-log-confirm-actions button { border:0; border-radius:8px; cursor:pointer; font-size:13px; font-weight:800; min-height:38px; min-width:92px; padding:0 16px; }
        .call-log-confirm-actions .primary { background:#dc2626; color:#fff; }
        .call-log-confirm-actions .secondary { background:#e2e8f0; color:#0f172a; }
        .call-log-detail-page { border-top:1px solid #e2e8f0; padding:22px 24px 28px; }
        .call-log-detail-head { align-items:center; display:flex; gap:16px; justify-content:space-between; margin-bottom:16px; }
        .call-log-detail-head h3 { color:#0f172a; font-size:22px; margin:0; }
        .call-log-detail-head button { background:#fff; border:1px solid #cbd5e1; border-radius:8px; color:#0f172a; cursor:pointer; font-size:14px; font-weight:800; min-height:38px; padding:0 14px; }
        .call-log-detail-head button:hover { background:#eff6ff; border-color:#93c5fd; color:#2563eb; }
        .call-log-modal-grid { display:grid; gap:12px; grid-template-columns:repeat(2,minmax(0,1fr)); }
        .call-log-modal-field { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:11px 12px; }
        .call-log-modal-field span { color:#64748b; display:block; font-size:11px; font-weight:800; margin-bottom:5px; text-transform:uppercase; }
        .call-log-modal-field strong { color:#0f172a; display:block; font-size:14px; overflow-wrap:anywhere; }
        .call-log-modal-field.wide { grid-column:1 / -1; }
        .call-log-pagination { align-items:center; border-top:1px solid #e2e8f0; display:flex; gap:16px; justify-content:space-between; padding:16px 24px 22px; }
        .call-log-pagination span { color:#64748b; font-size:14px; }
        .call-log-pagination strong { color:#0f172a; }
        .call-log-page-actions { display:flex; gap:10px; }
        .call-log-page-actions button { background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; color:#0f172a; cursor:pointer; font-size:14px; font-weight:700; min-height:38px; padding:0 16px; }
        .call-log-page-actions button:hover:not(:disabled) { background:#eff6ff; border-color:#93c5fd; color:#2563eb; }
        .call-log-page-actions button:disabled { color:#94a3b8; cursor:not-allowed; opacity:.7; }
        @media (max-width:900px) { .call-log-head { align-items:flex-start; flex-direction:column; } .call-log-summary { grid-template-columns:repeat(2,minmax(0,1fr)); } .call-log-filters { grid-template-columns:1fr; } }
        @media (max-width:560px) { .call-log-summary { grid-template-columns:1fr; } .call-log-pagination { align-items:flex-start; flex-direction:column; } .call-log-modal-grid { grid-template-columns:1fr; } .call-log-detail-head { align-items:flex-start; flex-direction:column; } }
      `}</style>
      <div className="call-log-head">
        <div></div>
        <button type="button" onClick={loadLogs} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </div>
      {!loading && !error && totalItems > 0 && (
        <div className="call-log-summary">
          <div className="call-log-summary-card"><span>Total calls</span><strong>{totalItems}</strong></div>
          <div className="call-log-summary-card"><span>Inbound calls</span><strong>{inboundCount}</strong></div>
          <div className="call-log-summary-card"><span>Outbound calls</span><strong>{outboundCount}</strong></div>
          <div className="call-log-summary-card"><span>Recordings saved</span><strong>{logs.filter((log) => log.recordingUrl).length}</strong></div>
        </div>
      )}
      <div className="call-log-filters">
        <input value={searchFilter} onChange={(event) => setSearchFilter(event.target.value)} placeholder={effectiveDirection === "inbound" ? "Caller number" : "Phone number"} />
        {!direction && (
          <select value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value)}>
            <option value="">All directions</option>
            <option value="inbound">Inbound Calling</option>
            <option value="outbound">Outbound Calling</option>
          </select>
        )}
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          <option value="calling">Ringing</option>
          <option value="connected">Connected</option>
          <option value="completed">Completed</option>
          <option value="missed">Missed</option>
          <option value="busy">Busy</option>
          <option value="failed">Failed</option>
        </select>
        <select value={recordingFilter} onChange={(event) => setRecordingFilter(event.target.value)}>
          <option value="">All recordings</option>
          <option value="true">Recording available</option>
          <option value="false">Recording pending</option>
        </select>
      </div>
      {selectedLogIds.length > 0 && !selectedLog && (
        <div className="call-log-bulk-actions">
          <span>{allMatchingSelected ? `All ${totalItems} matching call logs selected` : `${selectedLogIds.length} selected`}</span>
          <button type="button" onClick={() => setPendingBulkDeleteIds(selectedLogIds)}>
            Delete selected
          </button>
        </div>
      )}
      {selectedLog ? (
        <div className="call-log-detail-page">
          <div className="call-log-detail-head">
            <h3>Call Details #{selectedLog.id}</h3>
            <button type="button" onClick={() => setSelectedLog(null)}>Back to call logs</button>
          </div>
          <div className="call-log-modal-grid">
            {detailRows(selectedLog).map(([label, value]) => (
              <div className={`call-log-modal-field ${label === "Notes" ? "wide" : ""}`} key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : error ? <div className="call-log-error">{error}</div> : loading ? <div className="call-log-empty">Loading call logs...</div> : totalItems === 0 ? <div className="call-log-empty">No call logs found.</div> : (
        <>
        <div className="call-log-table-wrap"><table className="call-log-table"><thead><tr>
          <th className="call-log-select-col">
            <label className="call-log-check">
              <input
                type="checkbox"
                aria-label="Select all matching call logs"
                checked={allMatchingSelected || allVisibleSelected}
                onChange={toggleVisibleSelection}
                disabled={selectingAll}
              />
              <span>{selectingAll ? "..." : allMatchingSelected || allVisibleSelected ? "✓" : ""}</span>
            </label>
          </th><th>Lead</th><th>Direction</th><th>Disposition</th><th>{effectiveDirection === "inbound" ? "Caller Number" : "Lead Number"}</th><th>Agent</th><th>Call Status</th><th>Duration</th><th>Disconnected By</th><th>After Call Recording</th><th>Created</th><th>Actions</th>
        </tr></thead><tbody>{paginatedLogs.map((log) => <tr className={selectedLogIds.includes(log.id) ? "selected" : ""} key={log.id}>
          <td className="call-log-select-col">
            <label className="call-log-check">
              <input
                type="checkbox"
                aria-label={`Select call log #${log.id}`}
                checked={selectedLogIds.includes(log.id)}
                onChange={() => toggleLogSelection(log.id)}
              />
              <span>{selectedLogIds.includes(log.id) ? "✓" : ""}</span>
            </label>
          </td>
          <td><span className="call-log-name">{log.lead ? getName(log.lead, `Lead #${log.leadId}`) : "Unknown Caller"}</span><span className="call-log-sub">{log.leadId ? `#${log.leadId}` : "No linked lead"}</span></td>
          <td>{getDirectionLabel(log)}</td>
          <td>{log.disposition || "-"}</td>
          <td>{log.callerNumber || log.customerNumber || log.leadPhone || log.phone || "-"}</td>
          <td><span className="call-log-name">{getName(log.agent, "-")}</span></td>
          <td><span className="call-log-status">{getStatusLabel(log.status)}</span></td>
          <td>{formatDuration(log.duration)}</td>
          <td>{log.disconnectedBy || "-"}</td>
          <td><RecordingCell log={log} /></td>
          <td>{formatDate(log.createdAt)}</td>
          <td>
            <div className="call-log-actions">
              <button
                type="button"
                className="call-log-action-btn"
                aria-label={`Actions for call #${log.id}`}
                aria-expanded={openActionLogId === log.id}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenActionLogId((current) => current === log.id ? null : log.id);
                }}
              >
                ⋮
              </button>
              {openActionLogId === log.id && (
                <div className="call-log-action-menu" onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => {
                    setSelectedLog(log);
                    setOpenActionLogId(null);
                  }}>
                    View
                  </button>
                  <button type="button" className="danger" onClick={() => {
                    setPendingDeleteLog(log);
                    setOpenActionLogId(null);
                  }}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>)}</tbody></table></div>
        <div className="call-log-pagination">
          <span>
            Showing <strong>{pageStart + 1}-{pageEnd}</strong> of <strong>{totalItems}</strong> call logs
          </span>
          <div className="call-log-page-actions">
            <button
              type="button"
              disabled={activePage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={activePage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              Next
            </button>
          </div>
        </div>
        </>
      )}
      {pendingDeleteLog && (
        <div className="call-log-confirm-backdrop" role="presentation">
          <section className="call-log-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-call-log-title">
            <div className="call-log-confirm-icon">!</div>
            <h3 id="delete-call-log-title">Delete Call Log?</h3>
            <p>Are you sure you want to delete call log #{pendingDeleteLog.id}?</p>
            <div className="call-log-confirm-actions">
              <button type="button" className="secondary" onClick={() => setPendingDeleteLog(null)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={() => deleteLog(pendingDeleteLog)}>
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
      {pendingBulkDeleteIds.length > 0 && (
        <div className="call-log-confirm-backdrop" role="presentation">
          <section className="call-log-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-selected-call-logs-title">
            <div className="call-log-confirm-icon">!</div>
            <h6 id="delete-selected-call-logs-title">Delete Selected Logs?</h6>
            <p>Are you sure you want to delete {pendingBulkDeleteIds.length} selected call logs?</p>
            <div className="call-log-confirm-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setPendingBulkDeleteIds([])}
                disabled={bulkDeleting}
              >
                Cancel
              </button>
              <button type="button" className="primary" onClick={deleteSelectedLogs} disabled={bulkDeleting}>
                {bulkDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default CallLogsTable;
