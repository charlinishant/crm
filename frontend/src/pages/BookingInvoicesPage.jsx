import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterLayout from '../masterLayout/MasterLayout';
import { FaFileExcel, FaFilePdf, FaPrint, FaRedo, FaSearch, FaHistory, FaTimes, FaExternalLinkAlt, FaUser } from 'react-icons/fa';

const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? window.location.origin
    : "http://localhost:5002");

const authHeaders = () => ({
  "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
  "Content-Type": "application/json"
});

const fmtMoney = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "—";
  return `₹${Number(val).toLocaleString("en-IN")}`;
};

const fmtDate = (val) => {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getStatusBadge = (stage) => {
  const norm = String(stage || "").toLowerCase();
  if (norm.includes("confirm") || norm.includes("booked") || norm.includes("registered")) {
    return { bg: "bg-success text-white", label: stage || "Confirmed" };
  }
  if (norm.includes("held")) {
    return { bg: "bg-warning text-dark", label: "Held" };
  }
  if (norm.includes("cancel")) {
    return { bg: "bg-danger text-white", label: "Cancelled" };
  }
  return { bg: "bg-primary text-white", label: stage || "Active" };
};

const BookingInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [auditModalBooking, setAuditModalBooking] = useState(null);
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let query = `${API_URL}/api/admin/booking-invoices?limit=150`;
      if (selectedProjectId) query += `&projectId=${selectedProjectId}`;
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;

      const res = await fetch(query, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load booking invoices");
      const result = await res.json();
      setInvoices(result.data || []);
    } catch (err) {
      console.error(err);
      setActionMessage("Could not load booking invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchInvoices();
  }, [selectedProjectId, startDate, endDate]);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((b) => {
      const cust = (b.customerName || `${b.lead?.firstName || ''} ${b.lead?.lastName || ''}`).toLowerCase();
      const proj = (b.unit?.project?.name || b.projectDetails || '').toLowerCase();
      const unit = (b.unitItem?.name || b.unit?.unitNo || b.unit?.name || '').toLowerCase();
      const idStr = String(b.id);
      const leadIdStr = String(b.leadId || b.lead?.id || '');
      const invStr = `inv-${b.id}`.toLowerCase();
      const bkgStr = `bkg-${b.id}`.toLowerCase();
      return (
        cust.includes(q) ||
        proj.includes(q) ||
        unit.includes(q) ||
        idStr.includes(q) ||
        leadIdStr.includes(q) ||
        invStr.includes(q) ||
        bkgStr.includes(q)
      );
    });
  }, [invoices, search]);

  const handleDownloadExcel = (bookingId) => {
    window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet`, "_blank");
  };

  const handleViewPdf = (bookingId) => {
    window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf`, "_blank");
  };

  const handlePrint = (bookingId) => {
    const printWindow = window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf?action=print`, "_blank");
    if (printWindow) {
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (_) {}
      }, 800);
    }
  };

  const handleRegenerate = async (bookingId) => {
    try {
      setActionMessage(`Regenerating Cost Sheet for Booking #${bookingId}...`);
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cost-sheet/regenerate`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error("Regeneration failed");
      const data = await res.json();
      setActionMessage(`Cost Sheet ${data.version || 'new version'} generated successfully.`);
      fetchInvoices();
    } catch (err) {
      console.error(err);
      setActionMessage(`Failed to regenerate Cost Sheet for Booking #${bookingId}.`);
    }
  };

  const openLead = (leadId) => {
    if (!leadId) return;
    let isSales = false;
    try {
      const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      const role = String(authUser?.role || authUser?.department || "").toUpperCase();
      isSales = ["SALES", "PRE_SALES", "POST_SALES", "AGENT", "AGENCY_USER", "CHANNEL_PARTNER"].includes(role);
    } catch (_) {}

    if (isSales) {
      navigate(`/user/sales/details?leadId=${leadId}`);
    } else {
      navigate(`/details?leadId=${leadId}`);
    }
  };

  const openPostSales = (bookingId) => {
    if (!bookingId) return;
    navigate(`/post-sales/details/${bookingId}`);
  };

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        {/* Header & Breadcrumb */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Booking Invoices</h4>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
              Auto-filed customer cost sheets, payment schedules &amp; live-formula Excel workbooks populated on booking confirmation
            </p>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Dashboard &gt; <span style={{ color: "#3b82f6", fontWeight: 600 }}>Booking Invoices</span>
          </div>
        </div>

        {actionMessage && (
          <div className="alert alert-info py-2 px-3 mb-3 d-flex justify-content-between align-items-center" style={{ fontSize: 13 }}>
            <span>{actionMessage}</span>
            <button className="btn-close" style={{ fontSize: 10 }} onClick={() => setActionMessage("")} />
          </div>
        )}

        {/* Filters Bar */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
          <div className="card-body p-3">
            <div className="row g-3 align-items-center">
              <div className="col-12 col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted">
                    <FaSearch />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by customer, unit, project, or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                  {search && (
                    <button
                      className="btn btn-outline-secondary border-start-0"
                      type="button"
                      onClick={() => setSearch("")}
                    >
                      <FaTimes size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="col-12 col-md-3">
                <select
                  className="form-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  style={{ fontSize: 13 }}
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-2">
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="From Date"
                  style={{ fontSize: 13 }}
                />
              </div>

              <div className="col-12 col-md-2">
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="To Date"
                  style={{ fontSize: 13 }}
                />
              </div>

              <div className="col-12 col-md-1 text-end">
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    setSearch("");
                    setSelectedProjectId("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  style={{ fontSize: 12 }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Table Card */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: "hidden" }}>
          <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
            <span className="fw-semibold text-muted" style={{ fontSize: 13 }}>
              {filteredInvoices.length} items. Sorted by &apos;Created at desc&apos;
            </span>
            <div className="text-muted small">
              Single document of record filed on booking confirmation
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <tr className="text-muted text-uppercase" style={{ fontSize: "11px", letterSpacing: "0.5px" }}>
                    <th className="py-3 px-3">INVOICE ID</th>
                    <th className="py-3 px-3">LEAD ID</th>
                    <th className="py-3 px-3">BOOKING ID</th>
                    <th className="py-3 px-3">INVOICE TO</th>
                    <th className="py-3 px-3">BOOKING NAME</th>
                    <th className="py-3 px-3">STATUS</th>
                    <th className="py-3 px-3 text-end">TOTAL AMOUNT</th>
                    <th className="py-3 px-3 text-end">DUE ON</th>
                    <th className="py-3 px-3 text-center">DOCS FILED</th>
                    <th className="py-3 px-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm text-primary me-2" />
                        Loading Booking Invoices...
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-5 text-muted">
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                        No booking invoices found.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((b) => {
                      const customerName =
                        b.customerName ||
                        [b.lead?.firstName, b.lead?.lastName].filter(Boolean).join(" ") ||
                        "Customer";
                      const customerPhone = b.lead?.phone || b.phone || "";
                      const projectName = b.unit?.project?.name || b.projectDetails || "Project";
                      const towerName = b.unit?.tower?.name || "";
                      const unitName = b.unitItem?.name || b.unit?.unitNo || b.unit?.name || `Unit #${b.unitId || b.id}`;
                      const hasXlsx = (b.generatedDocuments || []).some((d) => d.type === 'BOOKING_COST_SHEET_XLSX');
                      const hasPdf = (b.generatedDocuments || []).some((d) => d.type === 'BOOKING_COST_SHEET_PDF');
                      const statusBadge = getStatusBadge(b.stage);

                      return (
                        <tr key={b.id}>
                          {/* Invoice ID */}
                          <td className="py-3 px-3 font-monospace fw-bold text-dark">
                            INV-{b.id}
                          </td>

                          {/* Lead ID */}
                          <td className="py-3 px-3">
                            {b.leadId || b.lead?.id ? (
                              <button
                                type="button"
                                className="btn btn-link text-decoration-none p-0 fw-bold text-primary d-inline-flex align-items-center gap-1"
                                onClick={() => openLead(b.leadId || b.lead?.id)}
                                title="Open CRM Lead details"
                              >
                                #{b.leadId || b.lead?.id} <FaExternalLinkAlt size={10} />
                              </button>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>

                          {/* Booking ID */}
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              className="btn btn-link text-decoration-none p-0 font-monospace fw-bold text-primary d-inline-flex align-items-center gap-1"
                              onClick={() => openPostSales(b.id)}
                              title="Open Post-Sales Booking record"
                            >
                              BKG-{b.id} <FaExternalLinkAlt size={10} />
                            </button>
                          </td>

                          {/* Invoice To */}
                          <td className="py-3 px-3">
                            <div className="fw-bold text-dark">{customerName}</div>
                            {customerPhone && <small className="text-muted">{customerPhone}</small>}
                          </td>

                          {/* Booking Name */}
                          <td className="py-3 px-3">
                            <div className="fw-semibold text-dark">{unitName}</div>
                            <small className="text-muted">
                              {projectName} {towerName ? `• ${towerName}` : ''}
                            </small>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <span className={`badge ${statusBadge.bg} px-2 py-1`}>
                              {statusBadge.label}
                            </span>
                          </td>

                          {/* Total Amount */}
                          <td className="py-3 px-3 text-end fw-bold text-success">
                            {fmtMoney(b.soldPrice ?? b.totalPrice ?? b.agreementValue ?? b.basePrice)}
                          </td>

                          {/* Due On */}
                          <td className="py-3 px-3 text-end text-muted">
                            {fmtDate(b.bookedOn || b.createdAt)}
                          </td>

                          {/* Docs Filed */}
                          <td className="py-3 px-3 text-center">
                            <div className="d-flex justify-content-center gap-1">
                              <span
                                className={`badge ${hasXlsx ? 'bg-success' : 'bg-secondary'}`}
                                title="Excel Master Cost Sheet"
                              >
                                XLSX
                              </span>
                              <span
                                className={`badge ${hasPdf ? 'bg-danger' : 'bg-secondary'}`}
                                title="Customer Cost Sheet PDF"
                              >
                                PDF
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            <div className="btn-group btn-group-sm" role="group">
                              <button
                                className="btn btn-outline-success"
                                title="Download Excel Master Cost Sheet (.xlsx with live formulas)"
                                onClick={() => handleDownloadExcel(b.id)}
                              >
                                <FaFileExcel />
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                title="View Customer Cost Sheet PDF (A-G breakdown & payment schedule)"
                                onClick={() => handleViewPdf(b.id)}
                              >
                                <FaFilePdf />
                              </button>
                              <button
                                className="btn btn-outline-secondary"
                                title="Print Cost Sheet"
                                onClick={() => handlePrint(b.id)}
                              >
                                <FaPrint />
                              </button>
                              <button
                                className="btn btn-outline-primary"
                                title="Regenerate New Version"
                                onClick={() => handleRegenerate(b.id)}
                              >
                                <FaRedo />
                              </button>
                              <button
                                className="btn btn-outline-info"
                                title="View Document Audit History"
                                onClick={() => setAuditModalBooking(b)}
                              >
                                <FaHistory />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit Modal */}
        {auditModalBooking && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content" style={{ borderRadius: 12 }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    Document Audit History — Booking #{auditModalBooking.id}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setAuditModalBooking(null)}
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <strong>Customer:</strong> {auditModalBooking.customerName || auditModalBooking.lead?.firstName || "Customer"}<br />
                    <strong>Unit:</strong> {auditModalBooking.unitItem?.name || auditModalBooking.unit?.unitNo || auditModalBooking.unit?.name || "Unit"}<br />
                    <strong>Agreement Value:</strong> {fmtMoney(auditModalBooking.agreementValue ?? auditModalBooking.basePrice)}
                  </div>
                  <h6>Audit Trail:</h6>
                  {(auditModalBooking.documentAuditLogs || []).length === 0 ? (
                    <div className="text-muted small">No audit logs recorded for this booking yet.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Action</th>
                            <th>Performed By</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditModalBooking.documentAuditLogs.map((log) => (
                            <tr key={log.id}>
                              <td style={{ whiteSpace: "nowrap" }}>{fmtDate(log.createdAt)}</td>
                              <td><span className="badge bg-secondary">{log.action}</span></td>
                              <td>{log.performedBy || "System"}</td>
                              <td style={{ fontSize: 11 }}>{log.details}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAuditModalBooking(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MasterLayout>
  );
};

export default BookingInvoicesPage;
