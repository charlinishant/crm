import React, { useEffect, useMemo, useState } from "react";
import { subscribeToCRMEvent } from "../services/socketClient";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const statusOptions = ["All", "Online", "Logged Out", "Session Expired", "Forced Logout"];

const formatTimeOnly = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatSecondsToUsage = (totalSeconds = 0) => {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h 0m`;
  if (minutes > 0) return `${minutes}m`;
  return "0m";
};

const getStatusBadgeStyle = (status) => {
  const s = String(status || "").toLowerCase().trim();
  if (s === "online" || s === "active" || s === "available") {
    return {
      bg: "rgba(16, 185, 129, 0.12)",
      text: "#059669",
      border: "1px solid rgba(16, 185, 129, 0.25)",
      label: "Online",
    };
  }
  if (s === "session expired" || s === "expired") {
    return {
      bg: "rgba(245, 158, 11, 0.12)",
      text: "#d97706",
      border: "1px solid rgba(245, 158, 11, 0.25)",
      label: "Session Expired",
    };
  }
  if (s === "forced logout" || s === "forced_logout") {
    return {
      bg: "rgba(239, 68, 68, 0.12)",
      text: "#dc2626",
      border: "1px solid rgba(239, 68, 68, 0.25)",
      label: "Forced Logout",
    };
  }
  return {
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#475569",
    border: "1px solid rgba(100, 116, 139, 0.25)",
    label: "Logged Out",
  };
};

const Attendance = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [now, setNow] = useState(Date.now());
  const recordsPerPage = 10;

  const loadAttendance = async (showLoading = false) => {
    const token = localStorage.getItem("authToken");

    try {
      if (showLoading) setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(recordsPerPage),
        status: statusFilter,
      });

      const response = await fetch(`${API_URL}/attendance?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || "Unable to load attendance records");
      }

      const loadedAt = Date.now();
      setRows(
        Array.isArray(result?.data)
          ? result.data.map((row) => ({
              ...row,
              loadedAt,
              liveUsageSeconds: Number(row.todayUsageSeconds) || 0,
            }))
          : []
      );
      setTotalItems(Number(result?.totalItems) || 0);
    } catch (err) {
      setError(err.message || "Unable to load attendance records");
      setRows([]);
      setTotalItems(0);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance(true);
  }, [currentPage, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Live seconds ticker for active sessions
  useEffect(() => {
    const tickId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tickId);
  }, []);

  // Real-time WebSocket subscriptions
  useEffect(() => {
    let unsubscribeAttendance = () => {};
    let unsubscribeUserStatus = () => {};

    const setupSubscriptions = async () => {
      unsubscribeAttendance = await subscribeToCRMEvent("attendance:updated", (data) => {
        loadAttendance(false);
      });

      unsubscribeUserStatus = await subscribeToCRMEvent("user:statusChanged", (data) => {
        loadAttendance(false);
      });
    };

    setupSubscriptions();

    // Periodic background sync every 10 seconds (auto-refresh)
    const REFRESH_INTERVAL_MS = 10 * 1000;
    const intervalId = window.setInterval(() => loadAttendance(false), REFRESH_INTERVAL_MS);

    return () => {
      unsubscribeAttendance();
      unsubscribeUserStatus();
      window.clearInterval(intervalId);
    };
  }, [currentPage, statusFilter]);

  const visibleRows = useMemo(() => rows, [rows]);
  const pageStartIndex = (currentPage - 1) * recordsPerPage;
  const pageEndIndex = Math.min(pageStartIndex + visibleRows.length, totalItems);

  const getDynamicTodayUsage = (row) => {
    if (!row.isOnline && row.status !== "Online") {
      return row.todayUsage || formatSecondsToUsage(row.todayUsageSeconds);
    }
    const elapsedSeconds = Math.max(0, Math.floor((now - (row.loadedAt || now)) / 1000));
    const totalSec = (Number(row.todayUsageSeconds) || 0) + elapsedSeconds;
    return formatSecondsToUsage(totalSec);
  };

  return (
    <div className="table-section attendance-section fa-2x">
      <div className="attendance-title-row">
        <div className="attendance-filter-row">
          <div className="dropdown-wrapper">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter Attendance By Status"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="attendance-message">Loading attendance records...</div>}
      {error && <div className="attendance-message error">{error}.</div>}

      <div className="table-responsive">
        <table border="1" cellPadding="0" cellSpacing="0">
          <thead>
            <tr>
              <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px" }}>User ID</th>
              <th>User Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Login Time</th>
              <th>Logout Time</th>
              <th>Today's Usage</th>
              <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px" }}>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const badge = getStatusBadgeStyle(row.status);
              const loginTime = row.loginTimeFormatted || formatTimeOnly(row.loginAt);
              const logoutTime = row.isOnline || row.status === "Online" ? "—" : (row.logoutTimeFormatted || formatTimeOnly(row.logoutAt));
              const lastActivity = row.lastActivityFormatted || formatTimeOnly(row.lastActivityAt);

              return (
                <tr key={row.id || `row-${row.userId}`}>
                  <td className="text-muted">#{row.userId}</td>
                  <td>
                    <div className="attendance-user-name" style={{ fontWeight: 600 }}>
                      {row.userName || "User"}
                    </div>
                  </td>
                  <td>{row.email || row.user?.email || "-"}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: badge.border,
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{loginTime}</td>
                  <td style={{ fontWeight: 500 }}>{logoutTime}</td>
                  <td style={{ fontWeight: 600, color: "#2563eb" }}>
                    {getDynamicTodayUsage(row)}
                  </td>
                  <td style={{ color: "#64748b" }}>{lastActivity}</td>
                </tr>
              );
            })}
            {!loading && visibleRows.length === 0 && (
              <tr>
                <td colSpan="8" className="attendance-empty" style={{ textAlign: "center", padding: "24px" }}>
                  No attendance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="lead-pagination">
        <div className="lead-pagination-info">
          Showing <strong>{visibleRows.length ? pageStartIndex + 1 : 0}</strong> to{" "}
          <strong>{pageEndIndex}</strong> of <strong>{totalItems}</strong> attendance records
        </div>
        <div className="lead-pagination-actions">
          <button
            type="button"
            className="lead-pagination-btn"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="lead-pagination-page">{currentPage}</span>
          <button
            type="button"
            className="lead-pagination-btn"
            onClick={() => setCurrentPage((page) => page + 1)}
            disabled={currentPage * recordsPerPage >= totalItems}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
