import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ExternalLink, Search, X } from "lucide-react";

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

const ReportDrilldownModal = ({ isOpen, onClose, title, leads = [], loading = false, filterContext = {} }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

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

  const exportCsv = () => {
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

  const openLead = (leadId) => {
    onClose();
    navigate(`/user/sales/details?leadId=${leadId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block report-drilldown-modal-backdrop" tabIndex="-1" role="dialog" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
        <div className="modal-content shadow-lg border-0" style={{ borderRadius: "12px", overflow: "hidden" }}>
          <div className="modal-header bg-light d-flex justify-content-between align-items-center py-3 px-4 border-bottom">
            <div className="d-flex align-items-center gap-3">
              <div>
                <h5 className="modal-title fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                  <span>{title || "Drilldown Leads"}</span>
                  <span className="badge bg-primary rounded-pill px-3 py-1 fs-6">
                    {loading ? "..." : `${leads.length} Leads`}
                  </span>
                </h5>
                <small className="text-muted">
                  Filtered by active reporting period & salesperson scope
                </small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {leads.length > 0 && (
                <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={exportCsv}>
                  <Download size={15} /> Export CSV
                </button>
              )}
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
          </div>

          <div className="modal-body p-4" style={{ minHeight: "360px", maxHeight: "68vh" }}>
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div className="input-group" style={{ maxWidth: "340px" }}>
                <span className="input-group-text bg-white border-end-0">
                  <Search size={16} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by name, phone, status..."
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
                Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> records
              </div>
            </div>

            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="text-muted fw-semibold">Loading drilldown lead records...</div>
              </div>
            ) : filteredLeads.length === 0 ? (
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
                      <tr key={lead.id} style={{ cursor: "pointer" }} onClick={() => openLead(lead.id)}>
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
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                            onClick={() => openLead(lead.id)}
                            title="View Lead Details"
                          >
                            <span>Open</span> <ExternalLink size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="modal-footer bg-light py-2 px-4 border-top d-flex justify-content-between align-items-center">
            <small className="text-muted">
              💡 Tip: Click any row or &quot;Open&quot; button to drill directly into the lead record.
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
