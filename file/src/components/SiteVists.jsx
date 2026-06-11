import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const visitStatusOptions = [
  "Scheduled",
  "Confirmed",
  "Visit Done",
  "Visit Missed",
  "Cancelled",
  "Rescheduled",
];

const getLeadId = (lead) => lead?.id || lead?._id || lead?.lead_id || "";

const getDisplayValue = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number") return value;

  if (Array.isArray(value)) {
    return value.map((item) => getDisplayValue(item, "")).find(Boolean) || fallback;
  }

  if (typeof value === "object") {
    return (
      [value.firstName, value.lastName].filter(Boolean).join(" ") ||
      value.username ||
      value.name ||
      value.email ||
      value.label ||
      value.value ||
      fallback
    );
  }

  return fallback;
};

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.name ||
  lead?.full_name ||
  lead?.customer_name ||
  lead?.companyName ||
  `Lead #${getLeadId(lead) || "-"}`;

const formatDateTime = (value, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatCreatedAt = (value) => {
  if (!value) return "Created At: -";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Created At: -";

  return `Created At: ${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
};

const normalizeStatusClass = (status) =>
  String(status || "Scheduled")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\s+/g, "-");

const normalizeVisitStatus = (value) => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match = visitStatusOptions.find((status) => status.toLowerCase() === normalized);
  if (match) return match;
  if (normalized === "conducted" || normalized === "done") return "Visit Done";
  if (normalized === "missed") return "Visit Missed";
  if (normalized === "canceled") return "Cancelled";
  return "Scheduled";
};

const getLeadFromVisit = (visit) => visit?.lead || visit?.Lead || {};

const scheduleVisitToRow = (visit) => {
  const lead = getLeadFromVisit(visit);
  const status = normalizeVisitStatus(
    visit.status || lead.siteVisitStatus || lead.visitStatus || lead.conductSiteStatus
  );
  const isDone = status === "Visit Done";
  const owner = getDisplayValue(visit.salesExecutive || lead.siteVisitExecutive || lead.team);

  return {
    id: visit.id ? `#${visit.id}` : "-",
    leadId: getLeadId(lead) ? `#${getLeadId(lead)}` : "-",
    leadName: getDisplayValue(getLeadName(lead)),
    project: getDisplayValue(visit.project || lead.siteVisitProject || lead.conductSiteVisit),
    initiatedBy: getDisplayValue(visit.initiatedBy || lead.siteVisitInitiatedBy || lead.owner || lead.team),
    status,
    activityOwner: owner,
    scheduledOn: getDisplayValue(formatDateTime(visit.scheduledOn || lead.conductSiteDate || lead.siteVisitDate)),
    createdAt: formatCreatedAt(visit.createdAt || lead.createdAt || lead.created_at),
    conductedOn: isDone ? getDisplayValue(formatDateTime(visit.conductedOn || lead.siteVisitConductedOn || lead.updatedAt)) : "-",
    conductedBy: isDone ? getDisplayValue(visit.conductedBy || owner) : "-",
    meetingPoint: getDisplayValue(visit.meetingPoint || lead.siteVisitLocation || lead.meetingPoint),
    note: getDisplayValue(visit.note || lead.siteVisitNote),
  };
};

const SiteVists = () => {
  const [visitRows, setVisitRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    let isMounted = true;

    const loadSiteVisits = async (showLoading = true) => {
      const token = localStorage.getItem("authToken");

      try {
        if (showLoading) setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/schedule-visits`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result?.message || "Unable to load site visits");
        }

        const visits = Array.isArray(result) ? result : result?.data || result?.visits || [];
        if (isMounted) setVisitRows(visits.map(scheduleVisitToRow));
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load site visits");
          setVisitRows([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSiteVisits();
    const refreshId = window.setInterval(() => loadSiteVisits(false), 15000);
    const handleFocus = () => loadSiteVisits(false);
    const handleSiteVisitStatusUpdated = () => loadSiteVisits(false);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("siteVisitStatusUpdated", handleSiteVisitStatusUpdated);

    return () => {
      isMounted = false;
      window.clearInterval(refreshId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("siteVisitStatusUpdated", handleSiteVisitStatusUpdated);
    };
  }, []);

  const statusOptions = useMemo(() => {
    const statuses = visitRows.map((row) => row.status).filter(Boolean);
    return ["All", ...Array.from(new Set([...visitStatusOptions, ...statuses]))];
  }, [visitRows]);

  const filteredTableData = useMemo(() => {
    if (statusFilter === "All") return visitRows;
    return visitRows.filter((row) => row.status === statusFilter);
  }, [statusFilter, visitRows]);

  const totalPages = Math.max(1, Math.ceil(filteredTableData.length / recordsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * recordsPerPage;
  const tableData = filteredTableData.slice(pageStartIndex, pageStartIndex + recordsPerPage);
  const pageEndIndex = Math.min(pageStartIndex + tableData.length, filteredTableData.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  return (
    <div className="table-section site-visits-section fa-2x">
      <div className="site-visits-title-row">
        <p>Site Visit Data</p>
        <div className="site-visits-filter-row">
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

          <div className="filter-badge">
            <Icon icon="mdi:filter" width={16} height={16} />
            {visitRows.length > 0 && <span className="badge-count">{visitRows.length}</span>}
          </div>
        </div>
      </div>

      {loading && <div className="site-visit-message">Loading site visits...</div>}
      {error && <div className="site-visit-message error">{error}.</div>}

      <div className="table-responsive">
        <table border="1" cellPadding="0" cellSpacing="0">
          <thead>
            <tr>
              <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px" }}>Visit ID</th>
              <th>Lead ID</th>
              <th>Lead Name</th>
              <th>Project</th>
              <th>Initiated By</th>
              <th>Status</th>
              <th>Activity Owner</th>
              <th>Scheduled On</th>
              <th>Meeting Point</th>
              <th>Conducted On</th>
              <th>Conducted By</th>
              <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px" }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row.id}>
                <td className="text-muted">{row.id}</td>
                <td className="text-muted">{row.leadId}</td>
                <td>
                  <div className="lead-name-main" style={{ fontSize: "14px" }}>
                    {row.leadName}
                  </div>
                </td>
                <td>{row.project}</td>
                <td>{row.initiatedBy}</td>
                <td>
                  <span className={`status-pill status-${normalizeStatusClass(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td>{row.activityOwner}</td>
                <td>
                  <div className="scheduled-wrapper">
                    <span className="main-time">{row.scheduledOn}</span>
                    <span className="sub-time">{row.createdAt}</span>
                  </div>
                </td>
                <td>{row.meetingPoint}</td>
                <td>{row.conductedOn}</td>
                <td>{row.conductedBy}</td>
                <td>{row.note}</td>
              </tr>
            ))}
            {!loading && tableData.length === 0 && (
              <tr>
                <td colSpan="12" className="site-visit-empty">
                  No scheduled site visits found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredTableData.length > 0 && (
        <div className="lead-pagination">
          <div className="lead-pagination-info">
            Showing <strong>{pageStartIndex + 1}</strong> to <strong>{pageEndIndex}</strong> of{" "}
            <strong>{filteredTableData.length}</strong> site visits
          </div>
          <div className="lead-pagination-actions">
            <button
              type="button"
              className="lead-pagination-btn"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={activePage === 1}
            >
              Previous
            </button>
            <span className="lead-pagination-page">
              {activePage} / {totalPages}
            </span>
            <button
              type="button"
              className="lead-pagination-btn"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={activePage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteVists;
