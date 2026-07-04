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
      <span className="call-log-recording-saved"><Headphones size={13} /> Saved</span>
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

const CallLogsTable = ({ scope = "admin" }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    if (showLoading) setError("");
    try {
      const token = localStorage.getItem("authToken");
      const endpoint = scope === "admin" ? "/api/calls/admin/all" : "/api/calls/my";
      const response = await fetch(`${API_URL}${endpoint}?limit=100`, {
        headers:token ? { Authorization:`Bearer ${token}` } : {},
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to load call logs");
      setLogs(Array.isArray(result?.data) ? result.data : []);
    } catch (loadError) {
      if (showLoading) {
        setLogs([]);
        setError(loadError.message || "Unable to load call logs");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    loadLogs();
    const interval = window.setInterval(() => loadLogs(false), 5000);
    return () => window.clearInterval(interval);
  }, [loadLogs]);

  return (
    <section className="call-log-panel">
      <style>{`
        .call-log-panel { background:#fff; border:1px solid #dbe3ef; border-radius:10px; box-shadow:0 10px 30px rgba(15,23,42,.04); overflow:hidden; }
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
        .call-log-table-wrap { border-top:1px solid #e2e8f0; overflow-x:auto; }
        .call-log-table { border-collapse:separate; border-spacing:0; min-width:1320px; width:100%; }
        .call-log-table th { background:#f1f5f9; border-bottom:1px solid #dbe3ef; color:#475569; font-size:11px; letter-spacing:.25px; padding:12px 14px; text-align:left; text-transform:uppercase; }
        .call-log-table td { border-bottom:1px solid #e5e7eb; color:#334155; font-size:13px; padding:14px; vertical-align:middle; }
        .call-log-table tbody tr:hover { background:#f8fbff; }
        .call-log-name { color:#0f172a; display:block; font-weight:650; }
        .call-log-sub { color:#64748b; display:block; font-size:11px; margin-top:2px; }
        .call-log-status { background:#eef4ff; border-radius:999px; color:#2563eb; display:inline-flex; font-size:11px; font-weight:700; padding:4px 8px; text-transform:capitalize; }
        .call-log-recording-player { align-items:flex-start; display:grid; gap:7px; min-width:240px; }
        .call-log-recording { height:34px; max-width:250px; width:230px; }
        .call-log-load-recording, .call-log-download-recording { font-size:11px; min-height:30px; padding:0 9px; width:max-content; }
        .call-log-recording-box { align-items:flex-start; display:grid; gap:5px; min-width:180px; }
        .call-log-recording-box small { color:#64748b; font-size:10px; }
        .call-log-recording-box.muted span { color:#94a3b8; font-size:12px; font-weight:700; }
        .call-log-recording-saved { align-items:center; color:#166534; display:inline-flex; font-size:11px; font-weight:800; gap:5px; text-transform:uppercase; }
        .call-log-recording-error { color:#dc2626; display:block; font-size:10px; margin-top:4px; max-width:180px; }
        .call-log-empty { color:#64748b; padding:42px 20px; text-align:center; }
        .call-log-error { color:#dc2626; padding:18px 20px; }
        .call-log-notes { max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        @media (max-width:900px) { .call-log-head { align-items:flex-start; flex-direction:column; } .call-log-summary { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width:560px) { .call-log-summary { grid-template-columns:1fr; } }
      `}</style>
      <div className="call-log-head">
        <div><h2>{scope === "admin" ? "All call logs" : "My call logs"}</h2><p>Live Twilio statuses, dispositions and recordings</p></div>
        <button type="button" onClick={loadLogs} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </div>
      {!loading && !error && logs.length > 0 && (
        <div className="call-log-summary">
          <div className="call-log-summary-card"><span>Total calls</span><strong>{logs.length}</strong></div>
          <div className="call-log-summary-card"><span>Recordings saved</span><strong>{logs.filter((log) => log.recordingUrl).length}</strong></div>
          <div className="call-log-summary-card"><span>Connected</span><strong>{logs.filter((log) => String(log.status).toLowerCase() === "connected" || String(log.status).toLowerCase() === "completed").length}</strong></div>
          <div className="call-log-summary-card"><span>Failed / missed</span><strong>{logs.filter((log) => ["failed", "no-answer", "busy", "canceled"].includes(String(log.status).toLowerCase())).length}</strong></div>
        </div>
      )}
      {error ? <div className="call-log-error">{error}</div> : loading ? <div className="call-log-empty">Loading call logs...</div> : logs.length === 0 ? <div className="call-log-empty">No call logs found.</div> : (
        <div className="call-log-table-wrap"><table className="call-log-table"><thead><tr>
          <th>Lead</th><th>Lead Number</th><th>Lead Status</th><th>Agent</th><th>Call Status</th><th>Duration</th><th>Disposition</th><th>After Call Recording</th><th>Notes</th><th>Created</th>
        </tr></thead><tbody>{logs.map((log) => <tr key={log.id}>
          <td><span className="call-log-name">{getName(log.lead, `Lead #${log.leadId}`)}</span><span className="call-log-sub">#{log.leadId}</span></td>
          <td>{log.leadPhone || log.phone || "-"}</td>
          <td>{String(log.lead?.status || "-").replace(/_/g, " ")}</td>
          <td><span className="call-log-name">{getName(log.agent, "-")}</span></td>
          <td><span className="call-log-status">{getStatusLabel(log.status)}</span></td>
          <td>{formatDuration(log.duration)}</td>
          <td>{log.disposition || "-"}</td>
          <td><RecordingCell log={log} /></td>
          <td><div className="call-log-notes" title={log.notes || ""}>{log.notes || "-"}</div></td>
          <td>{formatDate(log.createdAt)}</td>
        </tr>)}</tbody></table></div>
      )}
    </section>
  );
};

export default CallLogsTable;
