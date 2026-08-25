import React, { useCallback, useEffect, useState } from "react";
import { Download, Headphones, RefreshCw } from "lucide-react";
import BulkActionToolbar from "./table/BulkActionToolbar";
import BulkDeleteConfirmation from "./table/BulkDeleteConfirmation";
import { useTableSelection } from "./table/useTableSelection";
import CallDispositionModal from "../user/CallDispositionModal";

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

const getCallNumber = (log) =>
  log.callerNumber || log.customerNumber || log.leadPhone || log.phone || "-";

const getAgentName = (log) =>
  getName(log.agent, log.providerAgentName || log.agentName || log.agentPhone || log.agentNumber || "-");

const getCallStatus = (log) =>
  getStatusLabel(log.status || log.providerStatus);

const getRecordingPlaybackUrl = (recordingUrl) => {
  const url = String(recordingUrl || "").trim().replace(/\\\//g, "/");
  if (!url) return "";
  if (url.startsWith("http://")) return url.replace(/^http:\/\//, "https://");
  return url;
};

const ProtectedRecording = ({ callId, status, recordingUrl }) => {
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
      const directUrl = getRecordingPlaybackUrl(recordingUrl);
      if (directUrl) {
        setAudioUrl(directUrl);
        setError("");
      } else {
        setError(loadError.message || "Recording unavailable");
      }
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
      {!error && <small className="call-log-recording-sub">{getStatusLabel(status)} call recording</small>}
    </div>
  );
};

const RecordingCell = ({ log }) => {
  if (log.recordingUrl) return <ProtectedRecording callId={log.id} status={log.status} recordingUrl={log.recordingUrl} />;

  const status = String(log.status || "").toLowerCase();
  const waiting = ["initiated", "queued", "calling", "ringing", "connected", "in-progress"].includes(status);
  return (
    <div className="call-log-recording-box muted">
      <span className="call-log-recording-title">{waiting ? "Recording pending" : "No recording"}</span>
      <small className="call-log-recording-sub">{waiting ? "Available after call ends" : "Not saved for this call"}</small>
    </div>
  );
};

const detailRows = (log) => [
  ["Lead", log.lead ? getName(log.lead, `Lead #${log.leadId}`) : "Unknown Caller"],
  ["Lead ID", log.leadId ? `#${log.leadId}` : "-"],
  ["Direction", getDirectionLabel(log)],
  ["Disposition", log.disposition || "-"],
  ["Phone", getCallNumber(log)],
  ["Agent", getAgentName(log)],
  ["Status", getCallStatus(log)],
  ["Duration", formatDuration(log.duration)],
  ["Disconnected By", log.disconnectedBy || "-"],
  ["Recording", log.recordingUrl ? "Available" : "Not saved"],
  ["Created", formatDate(log.createdAt)],
  ["Started", formatDate(log.startedAt)],
  ["Ended", formatDate(log.endedAt)],
  ["Virtual Number", log.virtualNumber || "-"],
  ["Campaign / Group", [log.campaignName, log.queueName].filter(Boolean).join(" / ") || "-"],
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
  const [dispositionTarget, setDispositionTarget] = useState(null);
  const [pendingDeleteLog, setPendingDeleteLog] = useState(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
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
  const tableSelection = useTableSelection({ rows:paginatedLogs, disabled:bulkDeleting, pruneOnRowsChange:true });
  const selectedCount = tableSelection.selectedCount;
  const selectedLogIds = tableSelection.selectedIds.flatMap((id) => [id, Number(id)]);
  const allVisibleSelected = tableSelection.allVisibleSelected;
  const allMatchingSelected = false;
  const selectingAll = false;
  const inboundCount = logs.filter((log) => getDirectionLabel(log) === "inbound").length;
  const outboundCount = logs.filter((log) => getDirectionLabel(log) === "outbound").length;

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const { clearSelection } = tableSelection;

  useEffect(() => {
    clearSelection();
  }, [clearSelection, currentPage, effectiveDirection, recordingFilter, searchFilter, statusFilter]);

  useEffect(() => {
    if (isBulkConfirmOpen && selectedCount === 0) {
      setIsBulkConfirmOpen(false);
    }
  }, [isBulkConfirmOpen, selectedCount]);

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
      tableSelection.removeSelectedIds([log.id]);
      setSelectedLog((current) => current?.id === log.id ? null : current);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete call log");
    }
  };

  const handleDispositionSaved = (savedCallLog) => {
    if (savedCallLog?.id) {
      setLogs((current) => current.map((log) =>
        log.id === savedCallLog.id
          ? {
              ...log,
              ...savedCallLog,
              lead:savedCallLog.lead || log.lead,
              agent:savedCallLog.agent || log.agent,
              recordingUrl:savedCallLog.recordingUrl || log.recordingUrl,
            }
          : log
      ));
      setSelectedLog((current) => current?.id === savedCallLog.id
        ? {
            ...current,
            ...savedCallLog,
            lead:savedCallLog.lead || current.lead,
            agent:savedCallLog.agent || current.agent,
            recordingUrl:savedCallLog.recordingUrl || current.recordingUrl,
          }
        : current
      );
    }
    setDispositionTarget(null);
    loadLogs(false);
  };

  const deleteSelectedLogs = async () => {
    const idsToDelete = [...tableSelection.selectedIds];
    if (!idsToDelete.length) {
      setIsBulkConfirmOpen(false);
      return;
    }
    setBulkDeleting(true);
    setOpenActionLogId(null);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/calls/bulk`, {
        method:"DELETE",
        headers:{
          "Content-Type":"application/json",
          ...(token ? { Authorization:`Bearer ${token}` } : {}),
        },
        body:JSON.stringify({ ids:idsToDelete }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 207) {
        throw new Error(result?.message || "Unable to delete selected call logs");
      }
      const deletedIds = Array.isArray(result?.deletedIds) ? result.deletedIds.map(String) : idsToDelete.map(String);
      setLogs((current) => current.filter((item) => !deletedIds.includes(String(item.id))));
      setTotalItems((current) => Math.max(0, current - deletedIds.length));
      tableSelection.removeSelectedIds(deletedIds);
      setSelectedLog((current) => current && deletedIds.includes(String(current.id)) ? null : current);
      setIsBulkConfirmOpen(false);
      if (result?.failed > 0) {
        setError(`${result.deleted || 0} call logs deleted. ${result.failed} could not be deleted.`);
      }
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete selected call logs");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <section className="call-log-panel">
      
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
      {selectedCount > 0 && !selectedLog && (
        <BulkActionToolbar
          count={selectedCount}
          disabled={loading}
          entityLabel="call logs"
          isDeleting={bulkDeleting}
          onClear={tableSelection.clearSelection}
          onDelete={() => {
            if (selectedCount > 0) setIsBulkConfirmOpen(true);
          }}
        />
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
                aria-label="Select visible call logs"
                checked={tableSelection.allVisibleSelected}
                onChange={tableSelection.toggleVisible}
                disabled={bulkDeleting}
              />
              <span>{selectingAll ? "..." : allMatchingSelected || allVisibleSelected ? "✓" : ""}</span>
            </label>
          </th><th>Lead</th><th>Direction</th><th>Disposition</th><th>{effectiveDirection === "inbound" ? "Caller Number" : "Lead Number"}</th><th>Agent</th><th>Call Status</th><th>Duration</th><th>Disconnected By</th><th>After Call Recording</th><th>Created</th><th>Actions</th>
        </tr></thead><tbody>{paginatedLogs.map((log) => <tr className={tableSelection.isSelected(log.id) ? "selected" : ""} key={log.id}>
          <td className="call-log-select-col">
            <label className="call-log-check">
              <input
                type="checkbox"
                aria-label={`Select call log #${log.id}`}
                checked={tableSelection.isSelected(log.id)}
                onChange={() => tableSelection.toggleRow(log.id)}
              />
              <span>{selectedLogIds.includes(log.id) ? "✓" : ""}</span>
            </label>
          </td>
          <td><span className="call-log-name">{log.lead ? getName(log.lead, `Lead #${log.leadId}`) : "Unknown Caller"}</span><span className="call-log-sub">{log.leadId ? `#${log.leadId}` : "No linked lead"}</span></td>
          <td>{getDirectionLabel(log)}</td>
          <td>{log.disposition || "-"}</td>
          <td>{getCallNumber(log)}</td>
          <td><span className="call-log-name">{getAgentName(log)}</span></td>
          <td><span className="call-log-status">{getCallStatus(log)}</span></td>
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
                  <button type="button" onClick={() => {
                    setDispositionTarget(log);
                    setOpenActionLogId(null);
                  }}>
                    Dispose
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
      {isBulkConfirmOpen && selectedCount > 0 && (
        <BulkDeleteConfirmation
          count={selectedCount}
          entityLabel="call logs"
          isDeleting={bulkDeleting}
          names={tableSelection.selectedRows.map((log) => `#${log.id} ${getName(log.lead, "Unknown Caller")}`)}
          onCancel={() => setIsBulkConfirmOpen(false)}
          onConfirm={deleteSelectedLogs}
        />
      )}
      {dispositionTarget && (
        <CallDispositionModal
          lead={dispositionTarget.lead || null}
          callLog={dispositionTarget}
          onClose={() => setDispositionTarget(null)}
          onSaved={handleDispositionSaved}
        />
      )}
      {selectedLog && (
        <div className="call-log-confirm-backdrop" role="presentation" onClick={() => setSelectedLog(null)}>
          <section
            className="call-log-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="call-details-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "620px", textAlign: "left", width: "min(620px, 94%)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 id="call-details-modal-title" style={{ margin: "0 0 4px", fontSize: "18px", color: "#0f172a" }}>Call Details</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Record #{selectedLog.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: "none", border: "1px solid #cbd5e1", borderRadius: "6px", width: "32px", height: "32px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
              {detailRows(selectedLog).map(([label, value]) => (
                <div key={label} style={{ background: "#f8fafc", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>{label}</span>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>{value}</strong>
                </div>
              ))}
            </div>

            {selectedLog.recordingUrl && (
              <div style={{ marginTop: "16px", padding: "14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ display: "block", fontSize: "12px", color: "#64748b", fontWeight: "700", marginBottom: "8px" }}>Call Recording</span>
                <ProtectedRecording callId={selectedLog.id} status={selectedLog.status} recordingUrl={selectedLog.recordingUrl} />
              </div>
            )}

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary"
                style={{ padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default CallLogsTable;
