import React, { useEffect, useMemo, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const statusOptions = ["All", "Available", "On Break", "Logged Out"];

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDuration = (seconds = 0) => {
  const totalSeconds = Number(seconds) || 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours) return `${hours}h ${minutes}m ${remainingSeconds}s`;
  if (minutes) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
};

const secondsSince = (timestamp, now) => {
  if (!timestamp) return 0;
  return Math.max(0, Math.floor((now - timestamp) / 1000));
};

const getLiveTodayLoginSeconds = (row, now) =>
  (Number(row.todayLoginSeconds) || 0) +
  (row.loginAt && !row.logoutAt && row.status !== "Logged Out" ? secondsSince(row.loadedAt, now) : 0);

const getLiveTodayBreakSeconds = (row, now) =>
  (Number(row.todayBreakSeconds) || 0) +
  (row.breakStartedAt && !row.breakEndedAt ? secondsSince(row.loadedAt, now) : 0);

const statusClass = (status) =>
  String(status || "Available")
    .toLowerCase()
    .replace(/\s+/g, "-");

const Attendance = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [now, setNow] = useState(Date.now());
  const recordsPerPage = 10;

  useEffect(() => {
    let isMounted = true;

    const loadAttendance = async () => {
      const token = localStorage.getItem("authToken");

      try {
        setLoading(true);
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

        if (isMounted) {
          const loadedAt = Date.now();
          setRows(Array.isArray(result?.data) ? result.data.map((row) => ({ ...row, loadedAt })) : []);
          setTotalItems(Number(result?.totalItems) || 0);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load attendance records");
          setRows([]);
          setTotalItems(0);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAttendance();
    const refreshId = window.setInterval(loadAttendance, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshId);
    };
  }, [currentPage, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    const tickId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tickId);
  }, []);

  const visibleRows = useMemo(() => rows, [rows]);
  const pageStartIndex = (currentPage - 1) * recordsPerPage;
  const pageEndIndex = Math.min(pageStartIndex + visibleRows.length, totalItems);

  return (
    <div className="table-section attendance-section fa-2x">
      <div className="attendance-title-row">
        <p>User Attendance Data</p>
        <div className="attendance-filter-row">
          <div className="dropdown-wrapper">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
              <th>Today Login</th>
              <th>Break Start</th>
              <th>Break End</th>
              <th>Today Break</th>
              <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px" }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id}>
                <td className="text-muted">#{row.userId}</td>
                <td>
                  <div className="attendance-user-name">{row.userName || "User"}</div>
                </td>
                <td>{row.user?.email || "-"}</td>
                <td>
                  <span className={`attendance-status status-${statusClass(row.status)}`}>
                    {row.status || "Available"}
                  </span>
                </td>
                <td>{formatDateTime(row.loginAt)}</td>
                <td>{formatDateTime(row.logoutAt)}</td>
                <td>{formatDuration(getLiveTodayLoginSeconds(row, now))}</td>
                <td>{formatDateTime(row.breakStartedAt)}</td>
                <td>{formatDateTime(row.breakEndedAt)}</td>
                <td>{formatDuration(getLiveTodayBreakSeconds(row, now))}</td>
                <td>{row.user?.role || "-"}</td>
              </tr>
            ))}
            {!loading && visibleRows.length === 0 && (
              <tr>
                <td colSpan="11" className="attendance-empty">
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
