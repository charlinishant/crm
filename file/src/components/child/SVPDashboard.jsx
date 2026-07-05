import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";

const getLeadId = (lead) => lead?.id || lead?._id || lead?.lead_id || "";

const getLeadName = (lead) => {
  const fullName = [lead?.firstName, lead?.lastName].filter(Boolean).join(" ");
  return lead?.name || lead?.full_name || lead?.customer_name || fullName || "-";
};

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

const getUserName = (user) => getDisplayValue(user);

const escapeCsvValue = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const formatVisitDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
};

const formatVisitDay = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { weekday: "long" });
};

const formatVisitTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeStatus = (value) => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized === "visit done" || normalized === "conducted" || normalized === "done") {
    return "Visit Done";
  }
  if (normalized === "visit missed" || normalized === "missed") return "Visit Missed";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  if (normalized === "rescheduled") return "Rescheduled";
  if (normalized === "confirmed") return "Confirmed";
  return "Scheduled";
};

const getStatusClass = (status) =>
  String(status || "Scheduled")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\s+/g, "-");

const getVisitLead = (visit) => visit?.lead || visit?.Lead || {};

const hasScheduledVisitData = (lead) =>
  Boolean(
    lead?.conductSiteVisit ||
      lead?.conductSiteDate ||
      lead?.siteVisitProject ||
      lead?.siteVisitDate ||
      lead?.siteVisitStatus ||
      lead?.visitStatus ||
      lead?.conductSiteStatus
  );

const leadToVisit = (lead) => ({
  id: lead?.siteVisitId || getLeadId(lead),
  lead,
  project: getDisplayValue(
    lead?.siteVisitProject || lead?.conductSiteVisit || lead?.interestedProjects || lead?.project
  ),
  status: normalizeStatus(lead?.siteVisitStatus || lead?.visitStatus || lead?.conductSiteStatus),
  scheduledOn: lead?.conductSiteDate || lead?.siteVisitDate,
  salesExecutive: lead?.siteVisitExecutive || lead?.team,
  location: getDisplayValue(lead?.siteVisitLocation || lead?.meetingPoint || lead?.locationPreferences),
});

const scheduleVisitToVisit = (visit) => {
  const lead = getVisitLead(visit);

  return {
    id: visit?.id || getLeadId(lead),
    lead,
    project: getDisplayValue(visit?.project || lead?.siteVisitProject || lead?.conductSiteVisit),
    status: normalizeStatus(visit?.status || lead?.siteVisitStatus || lead?.visitStatus || lead?.conductSiteStatus),
    scheduledOn: visit?.scheduledOn || lead?.conductSiteDate || lead?.siteVisitDate,
    salesExecutive: visit?.salesExecutive || lead?.siteVisitExecutive || lead?.team,
    location: getDisplayValue(visit?.meetingPoint || lead?.siteVisitLocation || lead?.meetingPoint),
  };
};

const SVPDashboard = () => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const recordsPerPage = 10;
  const navigate = useNavigate();
  const [scheduledVisits, setScheduledVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchScheduledVisits = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);

      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const response = await fetch(`${API_URL}/schedule-visits`, { headers });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result?.message || "Unable to load scheduled visits");

      const visits = Array.isArray(result) ? result : result?.data || result?.visits || [];
      setScheduledVisits(visits.map(scheduleVisitToVisit));
      setError("");
    } catch (err) {
      console.error("Unable to load scheduled visits:", err);
      setError(err.message || "Unable to load scheduled visits");

      try {
        const token = localStorage.getItem("authToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const fallbackResponse = await fetch(`${API_URL}/leads/`, { headers });
        const fallbackResult = await fallbackResponse.json().catch(() => ({}));
        const leads = Array.isArray(fallbackResult)
          ? fallbackResult
          : fallbackResult?.data || fallbackResult?.leads || [];
        setScheduledVisits(leads.filter(hasScheduledVisitData).map(leadToVisit));
      } catch {
        setScheduledVisits([]);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchScheduledVisits(true);
    const intervalId = window.setInterval(() => fetchScheduledVisits(false), 15000);
    const handleFocus = () => fetchScheduledVisits(false);
    const handleSiteVisitStatusUpdated = () => fetchScheduledVisits(false);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("siteVisitStatusUpdated", handleSiteVisitStatusUpdated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("siteVisitStatusUpdated", handleSiteVisitStatusUpdated);
    };
  }, [fetchScheduledVisits]);

  const totalPages = Math.max(1, Math.ceil(scheduledVisits.length / recordsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * recordsPerPage;
  const paginatedVisits = scheduledVisits.slice(pageStartIndex, pageStartIndex + recordsPerPage);
  const pageEndIndex = Math.min(pageStartIndex + paginatedVisits.length, scheduledVisits.length);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleEdit = (lead) => {
    window.sessionStorage.setItem("selectedLeadEdit", JSON.stringify(lead));
    const leadId = getLeadId(lead);
    navigate(leadId ? `/add-lead?editLeadId=${leadId}` : "/add-lead", { state: { lead } });
  };

  const handleExport = () => {
    const headers = [
      "Lead ID",
      "Lead Name",
      "Project",
      "Status",
      "Scheduled Date",
      "Day",
      "Time",
      "Sales Executive",
      "Location",
    ];

    const rows = scheduledVisits.map((visit) => {
      const lead = visit.lead || {};
      const leadId = getLeadId(lead);

      return [
        leadId ? `#${leadId}` : "-",
        getLeadName(lead),
        visit.project,
        visit.status,
        formatVisitDate(visit.scheduledOn),
        formatVisitDay(visit.scheduledOn),
        formatVisitTime(visit.scheduledOn),
        getUserName(visit.salesExecutive),
        visit.location,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `svp-scheduled-visits-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="table-section site-visits-section">
      <div className="site-visits-title-row">
        <p>Scheduled Visit Planned</p>
        <button
          className="btn btn-primary svp-export-btn text-sm btn-sm px-16 py-8 radius-8"
          type="button"
          onClick={handleExport}
          disabled={scheduledVisits.length === 0}
        >
          Export
        </button>
      </div>

      {isLoading && <div className="site-visit-message">Loading scheduled visits...</div>}
      {error && <div className="site-visit-message error">{error}.</div>}

      <div className="table-responsive">
        <table border="1" cellPadding="0" cellSpacing="0">
          <thead>
            <tr>
              <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px" }}>Lead ID</th>
              <th>Lead Name</th>
              <th>Project</th>
              <th>Status</th>
              <th>Scheduled Date</th>
              <th>Day</th>
              <th>Time</th>
              <th>Sales Executive</th>
              <th>Location</th>
              <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px" }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {paginatedVisits.map((visit) => {
              const lead = visit.lead || {};
              const leadId = getLeadId(lead);

              return (
                <tr key={visit.id || leadId || `${getLeadName(lead)}-${visit.scheduledOn}`}>
                  <td className="text-muted">{leadId ? `#${leadId}` : "-"}</td>
                  <td>
                    <div className="lead-name-main" style={{ fontSize: "14px" }}>
                      {getLeadName(lead)}
                    </div>
                  </td>
                  <td>{visit.project}</td>
                  <td>
                    <span className={`status-pill status-${getStatusClass(visit.status)}`}>
                      {visit.status}
                    </span>
                  </td>
                  <td>{formatVisitDate(visit.scheduledOn)}</td>
                  <td>{formatVisitDay(visit.scheduledOn)}</td>
                  <td>{formatVisitTime(visit.scheduledOn)}</td>
                  <td>{getUserName(visit.salesExecutive)}</td>
                  <td>{visit.location}</td>
                  <td>
                    <button
                      type="button"
                      className="lead-action-btn"
                      onClick={() => handleEdit(lead)}
                      aria-label="Edit scheduled visit lead"
                    >
                      <Icon icon="mdi:pencil" width={16} height={16} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {!isLoading && scheduledVisits.length === 0 && (
              <tr>
                <td colSpan="10" className="site-visit-empty">
                  No scheduled visit planned leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {scheduledVisits.length > 0 && (
          <div className="lead-pagination">
            <div className="lead-pagination-info">
              Showing <strong>{pageStartIndex + 1}</strong> to <strong>{pageEndIndex}</strong> of{" "}
              <strong>{scheduledVisits.length}</strong> scheduled visits
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
              <span className="lead-pagination-page">{activePage} / {totalPages}</span>
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
    </div>
  );
};

export default SVPDashboard;
