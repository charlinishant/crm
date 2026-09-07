import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react/dist/iconify.js";
import TableSelectionCheckbox from "./table/TableSelectionCheckbox";
import { useTableSelection } from "./table/useTableSelection";
import BulkActionToolbar from "./table/BulkActionToolbar";
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

const getStatusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "done" || s === "completed") return "bg-success-focus text-success-main";
  if (s === "missed") return "bg-danger-focus text-danger-main";
  if (s === "rescheduled") return "bg-warning-focus text-warning-main";
  if (s === "cancelled") return "bg-neutral-200 text-neutral-600";
  return "bg-info-focus text-info-main";
};

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
  const [searchQuery, setSearchQuery] = useState("");
  const [nextActions, setNextActions] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
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
    const leadId = row.rawLeadId || row.lead?.id || row.leadId;
    if (leadId) {
      navigate(`/user/sales/calls?leadId=${leadId}`, {
        state: row.lead ? { lead: row.lead } : undefined,
      });
      return;
    }

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
    const query = searchQuery.trim().toLowerCase();
    return followupRows.filter((row) => {
      if (statusFilter !== "All" && row.status !== statusFilter) return false;
      if (!query) return true;

      const leadName = String(row.leadName || "").toLowerCase();
      const leadId = String(row.leadId || "").toLowerCase();
      const id = String(row.id || "").toLowerCase();
      const phone = String(row.phone || "").toLowerCase();
      const salesUser = String(row.salesUser || "").toLowerCase();
      const notes = String(row.notes || "").toLowerCase();
      const type = String(row.type || "").toLowerCase();

      return (
        leadName.includes(query) ||
        leadId.includes(query) ||
        id.includes(query) ||
        phone.includes(query) ||
        salesUser.includes(query) ||
        notes.includes(query) ||
        type.includes(query)
      );
    });
  }, [followupRows, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTableData.length / recordsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * recordsPerPage;
  const tableData = filteredTableData.slice(pageStartIndex, pageStartIndex + recordsPerPage);
  const pageEndIndex = Math.min(pageStartIndex + tableData.length, filteredTableData.length);
  const showingFrom = filteredTableData.length === 0 ? 0 : pageStartIndex + 1;
  const showingTo = pageEndIndex;

  const tableSelection = useTableSelection({
    rows: tableData,
    getRowId: (item) => item.rawId,
    disabled: bulkDeleting,
    pruneOnRowsChange: true,
  });

  const handleBulkDelete = () => {
    if (tableSelection.selectedCount === 0) return;
    if (!window.confirm(`Are you sure you want to dismiss/clear ${tableSelection.selectedCount} selected follow-up(s)?`)) {
      return;
    }
    setBulkDeleting(true);
    setFollowupRows((prev) => prev.filter((item) => !tableSelection.selectedIds.includes(item.rawId)));
    tableSelection.clearSelection();
    setStatusMessage("Selected follow-ups cleared.");
    setBulkDeleting(false);
    setTimeout(() => setStatusMessage(""), 4000);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  return (
    <div className="floor-dashboard booking-dashboard">
      <div className="floor-card booking-card">
        {/* Header Controls */}
        <div className="floor-header d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <select
              className="form-select booking-dropdown"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter follow-up status"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <span className="item-count">{filteredTableData.length} items.</span>
          </div>

          <div className="action-wrapper d-flex align-items-center gap-2">
            <div className="search-container">
              <input
                type="text"
                className="form-control form-control-sm search-input-override"
                placeholder="Search follow-ups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline-primary d-inline-flex align-items-center gap-2 flex-shrink-0"
              style={{ height: "40px", borderRadius: "8px", fontWeight: 600, fontSize: "14px", padding: "0 16px", whiteSpace: "nowrap" }}
              onClick={() => loadSalesFollowups(true)}
              disabled={loading}
              title="Refresh follow-ups"
            >
              <Icon icon="tabler:refresh" className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div className="booking-status-message mb-3">{statusMessage}</div>
        )}
        {error && <div className="admin-email-error mb-3">{error}.</div>}

        {/* Bulk Action Toolbar */}
        {tableSelection.selectedCount > 0 && (
          <BulkActionToolbar
            count={tableSelection.selectedCount}
            entityLabel="follow-ups"
            isDeleting={bulkDeleting}
            onClear={() => {
              tableSelection.clearSelection();
              setStatusMessage("");
            }}
            onDelete={handleBulkDelete}
            deleteLabel="Clear selected"
          />
        )}

        {/* Table View */}
        <div className="table-responsive">
          <table className="floor-table">
            <thead>
              <tr>
                <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px", width: "48px", textAlign: "center", padding: "14px 12px" }}>
                  <TableSelectionCheckbox
                    checked={tableSelection.allVisibleSelected}
                    indeterminate={tableSelection.isHeaderIndeterminate}
                    label="Select visible follow-ups"
                    onChange={tableSelection.toggleVisible}
                    disabled={bulkDeleting || tableData.length === 0}
                  />
                </th>
                <th>Follow-up ID</th>
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
                <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="13" className="text-center py-4 text-muted">
                    Loading sales follow-ups...
                  </td>
                </tr>
              ) : tableData.length === 0 ? (
                <tr>
                  <td colSpan="13" className="text-center py-5 text-muted">
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      {searchQuery ? "No matching follow-ups found" : "No sales follow-ups found."}
                    </div>
                    <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                      All clear! No pending follow-ups in this view.
                    </div>
                  </td>
                </tr>
              ) : (
                tableData.map((row) => (
                  <tr
                    key={row.rawId || row.id}
                    className={tableSelection.isSelected(row.rawId) ? "selected" : ""}
                  >
                    <td style={{ textAlign: "center", padding: "14px 12px" }}>
                      <TableSelectionCheckbox
                        checked={tableSelection.isSelected(row.rawId)}
                        label={`Select follow-up ${row.id}`}
                        onChange={() => tableSelection.toggleRow(row.rawId)}
                        disabled={bulkDeleting}
                      />
                    </td>
                    <td>
                      <span className="admin-email-id">{row.id}</span>
                    </td>
                    <td className="text-muted">{row.leadId}</td>
                    <td>
                      <strong style={{ color: "#0f172a", fontSize: "14px" }}>
                        {row.leadName}
                      </strong>
                    </td>
                    <td>{row.phone}</td>
                    <td>{row.type}</td>
                    <td>{row.priority}</td>
                    <td>
                      <span
                        className={`badge ${getStatusBadgeClass(row.status)}`}
                        style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "20px" }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>{row.leadStatus}</td>
                    <td>{row.salesUser}</td>
                    <td>
                      <div className="scheduled-wrapper">
                        <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "13px", display: "block" }}>
                          {row.scheduledOn}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "2px" }}>
                          {row.createdAt}
                        </span>
                      </div>
                    </td>
                    <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.notes}>
                      {row.notes}
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <select
                          className="form-select form-select-sm"
                          style={{ minWidth: "120px", fontSize: "12px", height: "34px", borderRadius: "6px" }}
                          value={nextActions[row.rawId] || ""}
                          onChange={(event) =>
                            setNextActions((current) => ({ ...current, [row.rawId]: event.target.value }))
                          }
                          aria-label={`Select action for ${row.id}`}
                        >
                          {nextActionOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          style={{ height: "34px", padding: "0 12px", fontWeight: 600, fontSize: "12px", borderRadius: "6px", whiteSpace: "nowrap" }}
                          onClick={() => handleProceed(row)}
                          disabled={isActionDisabled(row, nextActions[row.rawId] || "")}
                        >
                          Proceed
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredTableData.length > 0 && (
          <div className="booking-pagination">
            <span className="booking-pagination-info">
              Showing {showingFrom}-{showingTo} of {filteredTableData.length}
            </span>
            <div className="booking-pagination-actions">
              <button
                type="button"
                className="booking-page-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={activePage === 1}
              >
                Previous
              </button>
              <span className="booking-page-count">
                Page {activePage} of {totalPages}
              </span>
              <button
                type="button"
                className="booking-page-button"
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

export default SalesFollowupsTable;
