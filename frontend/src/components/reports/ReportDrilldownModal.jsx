import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ExternalLink, FileText, Search, X, Volume2, PhoneCall } from "lucide-react";

const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const getLeadPhone = (lead) => {
  if (!lead) return "-";
  if (Array.isArray(lead.phones)) {
    const first = lead.phones[0];
    if (!first) return "-";
    return typeof first === "object" ? first.value || "-" : first;
  }
  if (typeof lead.phones === "object") return lead.phones.value || "-";
  return lead.phones || lead.phone || "-";
};

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  `Lead #${lead?.id || ""}`;

const getStatusBadgeClass = (status) => {
  const norm = String(status || "").toLowerCase().replace(/[_\s-]+/g, "");
  if (norm.includes("qual")) return "badge-success";
  if (norm.includes("book")) return "badge-warning";
  if (norm.includes("sourc") || norm.includes("clos")) return "badge-primary";
  if (norm.includes("nurt")) return "badge-info";
  if (norm.includes("unqual") || norm.includes("lost") || norm.includes("junk")) return "badge-danger";
  return "badge-secondary";
};

const getCallStatusBadge = (status) => {
  const norm = String(status || "").toLowerCase().replace(/[\s_-]+/g, "");
  if (norm.includes("connected") || norm.includes("completed") || norm.includes("answered")) {
    return { className: "bg-success text-white", label: "Connected" };
  }
  if (norm === "missed") {
    return { className: "bg-danger text-white", label: "Missed" };
  }
  if (norm === "busy") {
    return { className: "bg-warning text-dark", label: "Busy" };
  }
  if (norm.includes("noanswer")) {
    return { className: "bg-warning-subtle text-dark border border-warning", label: "No Answer" };
  }
  if (norm.includes("fail") || norm.includes("reject") || norm.includes("cancel")) {
    return { className: "bg-danger-subtle text-danger border border-danger", label: "Failed" };
  }
  return { className: "bg-info text-white", label: status || "Initiated" };
};

const renderDirectionBadge = (direction) => {
  const isDirInbound = String(direction || "").toLowerCase() === "inbound";
  return (
    <span
      className={`badge ${
        isDirInbound ? "bg-info-subtle text-info border border-info" : "bg-primary-subtle text-primary border border-primary"
      } px-2 py-1 fw-semibold`}
    >
      {isDirInbound ? "📥 Inbound" : "📤 Outbound"}
    </span>
  );
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ReportDrilldownModal = ({
  isOpen,
  onClose,
  title,
  leads = [],
  calls = [],
  mode = "leads", // "leads" | "calls"
  loading = false,
  filterContext = {},
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const isCallMode = mode === "calls" || (Array.isArray(calls) && calls.length > 0 && (!leads || leads.length === 0));

  const isAdmin = useMemo(() => {
    try {
      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      const role = String(authUser?.role || authUser?.department || "").toUpperCase();
      return role === "ADMIN" || role === "SUPER_ADMIN";
    } catch (_) {
      return false;
    }
  }, []);

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const q = searchTerm.toLowerCase().trim();
    return leads.filter((l) => {
      const name = getLeadName(l).toLowerCase();
      const phone = String(getLeadPhone(l)).toLowerCase();
      const id = String(l.id || "").toLowerCase();
      const project = String(l.interestedProjects || l.siteVisitProject || "").toLowerCase();
      const source = String(l.channelPartner || l.fundingSource || "").toLowerCase();
      const status = String(l.status || "").toLowerCase();
      const user = String(l.team?.firstName || l.team?.username || "").toLowerCase();
      return (
        name.includes(q) ||
        phone.includes(q) ||
        id.includes(q) ||
        project.includes(q) ||
        source.includes(q) ||
        status.includes(q) ||
        user.includes(q)
      );
    });
  }, [leads, searchTerm]);

  const filteredCalls = useMemo(() => {
    if (!searchTerm.trim()) return calls;
    const q = searchTerm.toLowerCase().trim();
    return calls.filter((c) => {
      const lead = String(c.leadName || "").toLowerCase();
      const phone = String(c.phone || "").toLowerCase();
      const id = String(c.id || "").toLowerCase();
      const leadId = String(c.leadId || "").toLowerCase();
      const dir = String(c.direction || "").toLowerCase();
      const status = String(c.status || "").toLowerCase();
      const agent = String(c.agentName || "").toLowerCase();
      const disposition = String(c.disposition || "").toLowerCase();
      const project = String(c.projectName || "").toLowerCase();
      return (
        lead.includes(q) ||
        phone.includes(q) ||
        id.includes(q) ||
        leadId.includes(q) ||
        dir.includes(q) ||
        status.includes(q) ||
        agent.includes(q) ||
        disposition.includes(q) ||
        project.includes(q)
      );
    });
  }, [calls, searchTerm]);

  const exportLeadsCsv = () => {
    if (!leads.length) return;
    const headers = ["Lead ID", "Name", "Phone", "Status", "Source", "Project", "Assigned User", "Latest Call", "Created At"];
    const rows = leads.map((l) => [
      l.id,
      `"${getLeadName(l).replace(/"/g, '""')}"`,
      `"${getLeadPhone(l)}"`,
      `"${l.status || "New"}"`,
      `"${l.channelPartner || l.fundingSource || "-"}"`,
      `"${l.interestedProjects || l.siteVisitProject || "-"}"`,
      `"${[l.team?.firstName, l.team?.lastName].filter(Boolean).join(" ") || l.team?.username || "Unassigned"}"`,
      `"${l.latestCallDisposition || "-"}"`,
      `"${formatDateTime(l.createdAt)}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report_drilldown_${(title || "leads").toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCallsCsv = () => {
    if (!calls.length) return;
    const headers = ["Call ID", "Lead Name", "Lead ID", "Phone", "Direction", "Status", "Duration", "Agent", "Time", "Disposition", "Recording Available"];
    const rows = calls.map((c) => [
      c.id,
      `"${(c.leadName || "Unlinked").replace(/"/g, '""')}"`,
      c.leadId || "-",
      `"${c.phone || "-"}"`,
      c.direction || "outbound",
      c.status || "initiated",
      `"${c.durationClock || c.durationFormatted || "0s"}"`,
      `"${(c.agentName || "-").replace(/"/g, '""')}"`,
      `"${formatDateTime(c.time || c.createdAt)}"`,
      `"${(c.disposition || "-").replace(/"/g, '""')}"`,
      isAdmin ? (c.recordingUrl ? "Yes" : "No") : "Restricted",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `call_records_${(title || "calls").toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openLead = (leadOrId) => {
    let lead = null;
    let leadId = null;

    if (typeof leadOrId === "object" && leadOrId !== null) {
      lead = leadOrId;
      leadId = lead.id || lead._id || lead.leadId || lead.lead_id || "";
    } else if (leadOrId) {
      leadId = leadOrId;
      lead =
        leads.find((l) => String(l.id || l._id || l.leadId) === String(leadId)) ||
        calls.find((c) => String(c.leadId) === String(leadId))?.lead ||
        null;
    }

    if (!leadId) {
      console.warn("No lead id found for row click");
      return;
    }

    if (lead) {
      try {
        window.sessionStorage.setItem("selectedLeadPreview", JSON.stringify(lead));
        window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(lead));
      } catch (_) {}
    }

    onClose();

    // Determine user role (Sales goes to /user/sales/details, Admin/Manager goes to /details)
    let isSales = false;
    try {
      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      const role = String(authUser?.role || authUser?.department || "").toUpperCase();
      isSales = ["SALES", "PRE_SALES", "POST_SALES", "AGENT", "AGENCY_USER", "CHANNEL_PARTNER"].includes(role);
    } catch (_) {}

    if (isSales) {
      navigate(`/user/sales/details?leadId=${leadId}`, { state: { lead } });
    } else {
      navigate(`/details?leadId=${leadId}`, { state: { lead } });
    }
  };

  const openPostSales = (bookingId) => {
    if (!bookingId) return;
    onClose();
    navigate(`/post-sales/details/${bookingId}`);
  };

  const openCostSheetPdf = (bookingId) => {
    if (!bookingId) return;
    window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf`, "_blank");
  };

  if (!isOpen) return null;

  const currentCount = isCallMode ? calls.length : leads.length;
  const currentFilteredCount = isCallMode ? filteredCalls.length : filteredLeads.length;

  return (
    <div
      className="modal show d-block report-drilldown-modal-backdrop"
      tabIndex="-1"
      role="dialog"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
        <div className="modal-content shadow-lg border-0" style={{ borderRadius: "12px", overflow: "hidden" }}>
          {/* ── HEADER ── */}
          <div className="modal-header bg-light d-flex justify-content-between align-items-center py-3 px-4 border-bottom">
            <div className="d-flex align-items-center gap-3">
              <div>
                <h5 className="modal-title fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                  <span>{title || (isCallMode ? "Call Records Drilldown" : "Drilldown Leads")}</span>
                  <span className="badge bg-primary rounded-pill px-3 py-1 fs-6">
                    {loading ? "..." : `${currentCount} ${isCallMode ? "Calls" : "Leads"}`}
                  </span>
                </h5>
                <small className="text-muted">
                  Filtered by active reporting period &amp; salesperson/project scope
                </small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {currentCount > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                  onClick={isCallMode ? exportCallsCsv : exportLeadsCsv}
                >
                  <Download size={15} /> Export CSV
                </button>
              )}
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="modal-body p-4" style={{ minHeight: "360px", maxHeight: "68vh" }}>
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div className="input-group" style={{ maxWidth: "340px" }}>
                <span className="input-group-text bg-white border-end-0">
                  <Search size={16} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder={isCallMode ? "Search by phone, lead, agent, status..." : "Search by name, phone, status..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="btn btn-outline-secondary border-start-0" type="button" onClick={() => setSearchTerm("")}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="text-muted small">
                Showing <strong>{currentFilteredCount}</strong> of <strong>{currentCount}</strong> records
              </div>
            </div>

            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="text-muted fw-semibold">
                  Loading drilldown {isCallMode ? "call" : "lead"} records...
                </div>
              </div>
            ) : isCallMode ? (
              /* ── CALL DRILLDOWN TABLE ── */
              filteredCalls.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <PhoneCall size={32} className="text-muted mb-2 opacity-50" />
                  <p className="fs-5 mb-1">No call records found for this segment.</p>
                  <small>Try clearing your search query or adjusting report filters.</small>
                </div>
              ) : (
                <div className="table-responsive border rounded-3 bg-white">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-muted small text-uppercase">
                      <tr>
                        <th style={{ width: "60px" }}>ID</th>
                        <th>Lead</th>
                        <th>Number</th>
                        <th>Direction</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Agent</th>
                        <th>Time</th>
                        <th>Disposition</th>
                        <th>Recording</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCalls.map((call) => {
                        const statusBadge = getCallStatusBadge(call.status);
                        return (
                          <tr
                            key={call.id}
                            style={{ cursor: call.leadId ? "pointer" : "default" }}
                            onClick={() => {
                              if (call.leadId) openLead(call.lead || call.leadId);
                            }}
                          >
                            <td className="fw-bold text-muted">#{call.id}</td>
                            <td>
                              {call.leadId ? (
                                <div>
                                  <button
                                    type="button"
                                    className="btn btn-link text-decoration-none p-0 fw-bold text-primary text-start d-block"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openLead(call.lead || call.leadId);
                                    }}
                                  >
                                    {call.leadName || `Lead #${call.leadId}`}
                                  </button>
                                  {call.projectName && call.projectName !== "-" && (
                                    <small className="text-muted d-block">{call.projectName}</small>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <span className="text-muted fst-italic">Direct / Unlinked</span>
                                  {call.projectName && call.projectName !== "-" && (
                                    <small className="text-muted d-block">{call.projectName}</small>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="fw-semibold text-dark">{call.phone || "-"}</span>
                            </td>
                            <td>{renderDirectionBadge(call.direction)}</td>
                            <td>
                              <span className={`badge ${statusBadge.className} px-2 py-1`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td>
                              <span className="fw-bold text-dark">
                                {call.durationClock || call.durationFormatted || "0s"}
                              </span>
                            </td>
                            <td>
                              <span className="text-dark small fw-medium">{call.agentName || "-"}</span>
                            </td>
                            <td>
                              <span className="text-muted small">{formatDateTime(call.time || call.createdAt)}</span>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border px-2 py-1">
                                {call.disposition || "-"}
                              </span>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              {isAdmin && call.recordingUrl ? (
                                <audio
                                  controls
                                  preload="none"
                                  src={call.recordingUrl}
                                  style={{ height: "28px", width: "150px" }}
                                />
                              ) : isAdmin ? (
                                <span className="text-muted small">No recording</span>
                              ) : (
                                <span className="text-muted small fst-italic" title="Recordings are admin-only">
                                  🔒 Admin only
                                </span>
                              )}
                            </td>
                            <td className="text-end" onClick={(e) => e.stopPropagation()}>
                              {call.leadId ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                                  onClick={() => openLead(call.lead || call.leadId)}
                                  title="View Lead Details"
                                >
                                  <span>Open Lead</span> <ExternalLink size={13} />
                                </button>
                              ) : (
                                <span className="text-muted small">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* ── LEAD DRILLDOWN TABLE ── */
              filteredLeads.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p className="fs-5 mb-1">No leads found for this segment.</p>
                  <small>Try clearing your search query or adjusting report filters.</small>
                </div>
              ) : (
                <div className="table-responsive border rounded-3 bg-white">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-muted small text-uppercase">
                      <tr>
                        <th style={{ width: "80px" }}>ID</th>
                        <th>Lead Details</th>
                        <th>Phone</th>
                        <th>Source</th>
                        <th>Project</th>
                        <th>Stage / Status</th>
                        <th>Assigned To</th>
                        <th>Latest Activity</th>
                        <th>Received On</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} style={{ cursor: "pointer" }} onClick={() => openLead(lead)}>
                          <td className="fw-bold text-muted">#{lead.id}</td>
                          <td>
                            <div className="fw-bold text-dark">{getLeadName(lead)}</div>
                            {lead.budget && (
                              <small className="text-muted">Budget: {lead.budget}</small>
                            )}
                          </td>
                          <td>
                            <span className="fw-semibold text-dark">{getLeadPhone(lead)}</span>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border px-2 py-1">
                              {lead.channelPartner || lead.fundingSource || "Direct"}
                            </span>
                          </td>
                          <td>
                            <span className="text-dark small fw-medium">
                              {lead.interestedProjects || lead.siteVisitProject || "-"}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(lead.status)} px-2 py-1`}>
                              {lead.status || "New"}
                            </span>
                          </td>
                          <td>
                            <span className="text-dark small">
                              {[lead.team?.firstName, lead.team?.lastName].filter(Boolean).join(" ") ||
                                lead.team?.username ||
                                "Unassigned"}
                            </span>
                          </td>
                          <td>
                            {lead.latestCallDisposition ? (
                              <div>
                                <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                                  📞 {lead.latestCallDisposition}
                                </span>
                              </div>
                            ) : lead.bookingStage ? (
                              <div>
                                <span className="badge bg-warning-subtle text-warning px-2 py-1">
                                  📑 {lead.bookingStage}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </td>
                          <td>
                            <span className="text-muted small">{formatDate(lead.createdAt)}</span>
                          </td>
                          <td className="text-end" onClick={(e) => e.stopPropagation()}>
                            <div className="d-inline-flex align-items-center gap-1 justify-content-end flex-wrap">
                              {lead.bookingId && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 px-2 py-1"
                                    onClick={() => openCostSheetPdf(lead.bookingId)}
                                    title="One-click Cost Sheet PDF"
                                    style={{ fontSize: 11, fontWeight: 600 }}
                                  >
                                    <FileText size={12} /> <span>PDF</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 px-2 py-1"
                                    onClick={() => openPostSales(lead.bookingId)}
                                    title="View Post-Sales Customer Record"
                                    style={{ fontSize: 11, fontWeight: 600 }}
                                  >
                                    <span>Post-Sales</span> <ExternalLink size={12} />
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                                onClick={() => openLead(lead)}
                                title="View Lead Details"
                              >
                                <span>Open</span> <ExternalLink size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="modal-footer bg-light py-2 px-4 border-top d-flex justify-content-between align-items-center">
            <small className="text-muted">
              💡 Tip: Click any row or &quot;Open Lead&quot; button to drill directly into the lead record.
            </small>
            <button type="button" className="btn btn-secondary px-4" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDrilldownModal;
