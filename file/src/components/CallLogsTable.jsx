import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

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

const CallLogsTable = ({ scope = "admin" }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
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
      setLogs([]);
      setError(loadError.message || "Unable to load call logs");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  return (
    <section className="call-log-panel">
      <style>{`
        .call-log-panel { background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; }
        .call-log-head { align-items:center; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; padding:18px 20px; }
        .call-log-head h2 { color:#0f172a; font-size:18px; margin:0 0 3px; }
        .call-log-head p { color:#64748b; font-size:12px; margin:0; }
        .call-log-head button { align-items:center; background:#fff; border:1px solid #487fff; border-radius:7px; color:#2563eb; display:flex; gap:7px; padding:8px 12px; }
        .call-log-table-wrap { overflow-x:auto; }
        .call-log-table { border-collapse:collapse; min-width:1150px; width:100%; }
        .call-log-table th { background:#487fff; color:#fff; font-size:11px; letter-spacing:.25px; padding:13px 14px; text-align:left; text-transform:uppercase; }
        .call-log-table td { border-bottom:1px solid #e5e7eb; color:#334155; font-size:13px; padding:13px 14px; vertical-align:middle; }
        .call-log-table tbody tr:hover { background:#f8faff; }
        .call-log-name { color:#0f172a; display:block; font-weight:650; }
        .call-log-sub { color:#64748b; display:block; font-size:11px; margin-top:2px; }
        .call-log-status { background:#eef4ff; border-radius:999px; color:#2563eb; display:inline-flex; font-size:11px; font-weight:700; padding:4px 8px; text-transform:capitalize; }
        .call-log-recording { height:32px; max-width:220px; width:190px; }
        .call-log-empty { color:#64748b; padding:42px 20px; text-align:center; }
        .call-log-error { color:#dc2626; padding:18px 20px; }
        .call-log-notes { max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      `}</style>
      <div className="call-log-head">
        <div><h2>{scope === "admin" ? "All call logs" : "My call logs"}</h2><p>Live Exotel statuses, dispositions and recordings</p></div>
        <button type="button" onClick={loadLogs} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </div>
      {error ? <div className="call-log-error">{error}</div> : loading ? <div className="call-log-empty">Loading call logs...</div> : logs.length === 0 ? <div className="call-log-empty">No call logs found.</div> : (
        <div className="call-log-table-wrap"><table className="call-log-table"><thead><tr>
          <th>Lead</th><th>Agent</th><th>Lead Phone</th><th>Status</th><th>Duration</th><th>Disposition</th><th>Recording</th><th>Notes</th><th>Created</th>
        </tr></thead><tbody>{logs.map((log) => <tr key={log.id}>
          <td><span className="call-log-name">{getName(log.lead, `Lead #${log.leadId}`)}</span><span className="call-log-sub">#{log.leadId}</span></td>
          <td><span className="call-log-name">{getName(log.agent, "-")}</span></td>
          <td>{log.leadPhone || log.phone || "-"}</td>
          <td><span className="call-log-status">{String(log.status || "initiated").replace("-", " ")}</span></td>
          <td>{formatDuration(log.duration)}</td>
          <td>{log.disposition || "-"}</td>
          <td>{log.recordingUrl ? <audio className="call-log-recording" controls preload="none" src={log.recordingUrl}>Recording unavailable</audio> : "-"}</td>
          <td><div className="call-log-notes" title={log.notes || ""}>{log.notes || "-"}</div></td>
          <td>{formatDate(log.createdAt)}</td>
        </tr>)}</tbody></table></div>
      )}
    </section>
  );
};

export default CallLogsTable;
