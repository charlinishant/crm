import React, { useCallback, useEffect, useState } from "react";
import "./SalesUserPanel.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const formatCallDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getAgentName = (agent) =>
  [agent?.firstName, agent?.lastName].filter(Boolean).join(" ") ||
  agent?.username ||
  agent?.email ||
  "-";

const CallHistory = ({ leadId = "", agentId = "", scope = "lead", refreshKey = 0 }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCalls = useCallback(async () => {
    const id = scope === "agent" ? agentId : leadId;
    if (!id) return;

    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/calls/${scope}/${id}?limit=20`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to load call history");
      setCalls(Array.isArray(result) ? result : result.data || []);
    } catch (err) {
      setError(err.message || "Unable to load call history");
    } finally {
      setLoading(false);
    }
  }, [agentId, leadId, scope]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls, refreshKey]);

  return (
    <div className="call-history-card">
      <div className="call-history-head">
        <div>
          <h3>Call History</h3>
          <p>{loading ? "Loading calls..." : `${calls.length} call records`}</p>
        </div>
        <button type="button" onClick={loadCalls}>Refresh</button>
      </div>

      {error && <div className="call-history-error">{error}</div>}
      {!loading && calls.length === 0 && !error && (
        <div className="call-history-empty">No call history found.</div>
      )}

      {calls.length > 0 && (
        <div className="call-history-table">
          <div className="call-history-row header">
            <span>Date</span>
            <span>Phone</span>
            <span>Agent</span>
            <span>Duration</span>
            <span>Status</span>
            <span>Disposition</span>
            <span>Recording</span>
          </div>
          {calls.map((call) => (
            <div className="call-history-row" key={call.id}>
              <span>{formatCallDate(call.createdAt || call.startedAt)}</span>
              <span>{call.phone}</span>
              <span>{getAgentName(call.agent)}</span>
              <span>{call.duration ? `${call.duration} sec` : "-"}</span>
              <span>{call.status || "-"}</span>
              <span>{call.disposition || "-"}</span>
              <span>
                {call.recordingUrl ? (
                  <audio controls src={call.recordingUrl}>
                    <a href={call.recordingUrl}>Recording</a>
                  </audio>
                ) : (
                  "-"
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CallHistory;
