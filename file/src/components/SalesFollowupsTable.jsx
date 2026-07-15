import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  cancelFollowup,
  createFollowup,
  markFollowupDone,
  rescheduleFollowup,
} from "../services/followupApi";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const followupStatusOptions = [
  "Pending",
  "Done",
  "Missed",
  "Rescheduled",
  "Cancelled",
];

const nextActionOptions = [
  { value: "", label: "Choose option" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "create-next-follow-up", label: "Create next follow-up" },
  { value: "Qualified", label: "Mark Qualified" },
  { value: "In Sourcing", label: "Move to In Sourcing" },
  { value: "Visit Scheduled", label: "Schedule Visit" },
  { value: "In Closing", label: "Move to In Closing" },
  { value: "Booked", label: "Mark Booked" },
  { value: "Unqualified", label: "Mark Unqualified" },
  { value: "mark-done", label: "Mark Done" },
  { value: "reschedule", label: "Reschedule" },
  { value: "cancel", label: "Cancel" },
  { value: "open-lead", label: "Open Lead" },
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

const getContactValue = (value, keys = ["value", "phone", "number", "email"]) => {
  if (!value) return "-";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => getContactValue(item, keys)).find((item) => item && item !== "-") || "-";
  }
  if (typeof value === "object") {
    const match = keys.map((key) => value[key]).find(Boolean);
    return match || "-";
  }
  return "-";
};

const formatFollowupDateTime = (followup) => {
  const dateValue = followup?.followUpDate;
  const timeValue = followup?.followUpTime || "00:00";
  if (!dateValue) return { main: "-", sub: "Created At: -" };

  const datePart = String(dateValue).slice(0, 10);
  const date = new Date(`${datePart}T${String(timeValue).slice(0, 5)}:00`);

  if (Number.isNaN(date.getTime())) {
    return { main: `${datePart} ${timeValue}`, sub: "Created At: -" };
  }

  return {
    main: date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    sub: followup.createdAt
      ? `Created At: ${new Date(followup.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`
      : "Created At: -",
  };
};

const normalizeStatusClass = (status) =>
  String(status || "Pending")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\s+/g, "-");

const followupToRow = (followup) => {
  const lead = followup.lead || {};
  const schedule = formatFollowupDateTime(followup);

  return {
    raw: followup,
    lead,
    rawId: followup.id,
    rawLeadId: getLeadId(lead),
    id: followup.id ? `#${followup.id}` : "-",
    leadId: getLeadId(lead) ? `#${getLeadId(lead)}` : "-",
    leadName: followup.leadName || getDisplayValue(getLeadName(lead)),
    phone: followup.phone || getContactValue(lead.phones),
    type: followup.type || "-",
    scheduledOn: schedule.main,
    createdAt: schedule.sub,
    priority: followup.priority || "Medium",
    status: followup.effectiveStatus || followup.status || "Pending",
    leadStatus: followup.leadStatus || lead.status || "-",
    notes: followup.notes || "-",
    salesUser: getDisplayValue(followup.salesUser || lead.team),
  };
};

const SalesFollowupsTable = () => {
  const navigate = useNavigate();
  const [followupRows, setFollowupRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [nextActions, setNextActions] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const loadSalesFollowups = useCallback(async (showLoading = true) => {
    const token = localStorage.getItem("authToken");

    try {
      if (showLoading) setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/sales/followups?filter=all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || "Unable to load sales follow-ups");
      }

      const followups = Array.isArray(result) ? result : result?.data || [];
      setFollowupRows(followups.map(followupToRow));
    } catch (err) {
      setError(err.message || "Unable to load sales follow-ups");
      setFollowupRows([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const refresh = (showLoading = true) => {
      if (isMounted) loadSalesFollowups(showLoading);
    };

    refresh();
    const refreshId = window.setInterval(() => refresh(false), 15000);
    const handleFocus = () => refresh(false);
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      window.clearInterval(refreshId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadSalesFollowups]);

  const refreshRows = async () => {
    await loadSalesFollowups(false);
  };

  const handleCall = (row) => {
    const phone = String(row.phone || "").replace(/[^\d+]/g, "");
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (row) => {
    const phone = String(row.phone || "").replace(/[^\d]/g, "");
    if (!phone) return;
    window.open(`https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
  };

  const handleOpenLead = (row) => {
    if (row.lead) {
      window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(row.lead));
    }
    navigate(row.rawLeadId ? `/user/sales/details?leadId=${row.rawLeadId}` : "/user/sales/details", {
      state: row.lead ? { lead: row.lead } : undefined,
    });
  };

  const handleMarkDone = async (row, payload = {}) => {
    await markFollowupDone(row.rawId, payload);
    await refreshRows();
  };

  const goToLeadDetails = (row) => {
    if (row.lead) {
      window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(row.lead));
    }

    navigate(row.rawLeadId ? `/user/sales/details?leadId=${row.rawLeadId}` : "/user/sales/details", {
      state: row.lead ? { lead: row.lead, refreshPanel: true } : { refreshPanel: true },
    });
  };

  const handleReschedule = async (row) => {
    const nextDateTime = window.prompt("New follow-up date and time (YYYY-MM-DDTHH:mm)", "");
    if (!nextDateTime) return;
    const [followUpDate, followUpTime = "09:00"] = nextDateTime.split("T");

    await rescheduleFollowup(row.rawId, {
      followUpDate,
      followUpTime,
      priority: row.priority || "Medium",
      notes: row.notes === "-" ? "" : row.notes,
    });
    await refreshRows();
  };

  const handleCancel = async (row) => {
    const note = window.prompt("Cancellation note", "");
    await cancelFollowup(row.rawId, { note });
    await refreshRows();
  };

  const isActionDisabled = (row, action) => {
    if (!action) return true;
    if (["call", "whatsapp", "open-lead"].includes(action)) return false;
    if (action === "reschedule") return row.status === "Done";
    if (action === "cancel") return row.status === "Done" || row.status === "Cancelled";
    return row.status === "Done" || row.status === "Cancelled";
  };

  const handleProceed = async (row) => {
    const action = nextActions[row.rawId] || "";
    if (isActionDisabled(row, action)) return;

    if (action === "call") {
      handleCall(row);
      return;
    }

    if (action === "whatsapp") {
      handleWhatsApp(row);
      return;
    }

    if (action === "mark-done") {
      await handleMarkDone(row);
      return;
    }

    if (action === "reschedule") {
      await handleReschedule(row);
      return;
    }

    if (action === "cancel") {
      await handleCancel(row);
      return;
    }

    if (action === "open-lead") {
      handleOpenLead(row);
      return;
    }

    if (action === "create-next-follow-up") {
      const nextDateTime = window.prompt("Next follow-up date and time (YYYY-MM-DDTHH:mm)", "");
      if (!nextDateTime) return;
      const [followUpDate, followUpTime = "09:00"] = nextDateTime.split("T");
      await createFollowup({
        leadId: row.rawLeadId,
        type: row.type || "Call",
        followUpDate,
        followUpTime,
        priority: row.priority || "Medium",
        notes: row.notes === "-" ? "" : row.notes,
      });
      await handleMarkDone(row, {
        nextAction: "create-next-follow-up",
        note: "Follow-up completed. Next follow-up created.",
      });
      await refreshRows();
      goToLeadDetails(row);
      return;
    }

    if (action === "Visit Scheduled") {
      await handleMarkDone(row, { nextAction: action, note: "Follow-up completed. Schedule visit selected." });
      navigate(row.rawLeadId ? `/user/sales/site-visit?leadId=${row.rawLeadId}` : "/user/sales/site-visit", {
        state: row.lead ? { lead: row.lead, status: "Scheduled", refreshPanel: true } : { status: "Scheduled", refreshPanel: true },
      });
      return;
    }

    if (action === "Unqualified") {
      const reason = window.prompt("Reason required: Not Answering / Not Interested / Wrong Number / Budget Issue / Other", "");
      if (!reason) return;
      await handleMarkDone(row, {
        nextAction: "Unqualified",
        reason,
        note: reason,
      });
      goToLeadDetails(row);
      return;
    }

    await handleMarkDone(row, {
      nextAction: action,
      note: `Follow-up completed. Next action: ${action}`,
    });
    goToLeadDetails(row);
  };

  const statusOptions = useMemo(() => {
    const statuses = followupRows.map((row) => row.status).filter(Boolean);
    return ["All", ...Array.from(new Set([...followupStatusOptions, ...statuses]))];
  }, [followupRows]);

  const filteredTableData = useMemo(() => {
    if (statusFilter === "All") return followupRows;
    return followupRows.filter((row) => row.status === statusFilter);
  }, [followupRows, statusFilter]);

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
        {/* <p>Sales User Follow-ups</p> */}
        {/* <div className="site-visits-filter-row"> */}
          <div className="dropdown-wrapper followups-filter-wrapper">
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

          {/* <div className="filter-badge">
            <Icon icon="mdi:filter" width={16} height={16} />
            {followupRows.length > 0 && <span className="badge-count">{followupRows.length}</span>}
          </div> */}
        {/* </div> */}
      </div>

      {loading && <div className="site-visit-message">Loading sales follow-ups...</div>}
      {error && <div className="site-visit-message error">{error}.</div>}

      <div className="table-responsive">
        <table border="1" cellPadding="0" cellSpacing="0">
          <thead>
            <tr>
              <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px" }}>Follow-up ID</th>
              <th>Lead ID</th>
              <th>Lead Name</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Lead Status</th>
              <th>Sales User</th>
              <th>Follow-up On</th>
              <th>Notes</th>
              <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px" }}>Actions</th>
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
                <td>{row.phone}</td>
                <td>{row.type}</td>
                <td>{row.priority}</td>
                <td>
                  <span className={`status-pill status-${normalizeStatusClass(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td>{row.leadStatus}</td>
                <td>{row.salesUser}</td>
                <td>
                  <div className="scheduled-wrapper">
                    <span className="main-time">{row.scheduledOn}</span>
                    <span className="sub-time">{row.createdAt}</span>
                  </div>
                </td>
                <td>{row.notes}</td>
                <td>
                  <div className="followup-actions">
                    <div className="followup-next-action">
                      <select
                        value={nextActions[row.rawId] || ""}
                        onChange={(event) =>
                          setNextActions((current) => ({ ...current, [row.rawId]: event.target.value }))
                        }
                      >
                        {nextActionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleProceed(row)}
                        disabled={isActionDisabled(row, nextActions[row.rawId] || "")}
                      >
                        Proceed
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && tableData.length === 0 && (
              <tr>
                <td colSpan="12" className="site-visit-empty">
                  No sales follow-ups found.
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
            <strong>{filteredTableData.length}</strong> follow-ups
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

export default SalesFollowupsTable;
