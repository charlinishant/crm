import React, { useEffect, useState, useMemo } from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import { FaFileExcel, FaFilePdf, FaPrint, FaRedo, FaSearch, FaHistory, FaTimes } from 'react-icons/fa';

const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? window.location.origin
    : "http://localhost:5000");

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

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let query = `${API_URL}/api/admin/booking-invoices?limit=100`;
      if (selectedProjectId) query += `&projectId=${selectedProjectId}`;
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;

      const res = await fetch(query, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load booking invoices");
      const result = await res.json();
      setInvoices(result.data || []);
    } catch (err) {
      console.error(err);
      setActionMessage("Could not load invoices. Please try again.");
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
      return cust.includes(q) || proj.includes(q) || unit.includes(q) || idStr.includes(q);
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

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Booking Invoices & Cost Sheets</h4>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
              Authoritative Jaiganga-style Cost Sheets, Excel Master Workbooks, and Payment Schedules
            </p>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Post Sales &gt; <span style={{ color: "#3b82f6", fontWeight: 600 }}>Booking Invoices</span>
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

        {/* Invoices Table */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: "hidden" }}>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <tr>
                    <th className="py-3 px-3">Booking #</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Project / Tower</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3">Booking Date</th>
                    <th className="py-3 px-3 text-end">Agreement Value</th>
                    <th className="py-3 px-3 text-end">Final Sold Price</th>
                    <th className="py-3 px-3 text-center">Docs Filed</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        <div className="spinner-border spinner-border-sm text-primary me-2" />
                        Loading Booking Invoices...
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                        No booking invoices found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((b) => {
                      const customerName = b.customerName || `${b.lead?.firstName || ''} ${b.lead?.lastName || ''}`.trim() || "Customer";
                      const projectName = b.unit?.project?.name || b.projectDetails || "—";
                      const towerName = b.unit?.tower?.name || "—";
                      const unitName = b.unitItem?.name || b.unit?.unitNo || b.unit?.name || `Unit #${b.unitId || b.id}`;
                      const docCount = (b.generatedDocuments || []).length;
                      const hasXlsx = (b.generatedDocuments || []).some(d => d.type === 'BOOKING_COST_SHEET_XLSX');
                      const hasPdf = (b.generatedDocuments || []).some(d => d.type === 'BOOKING_COST_SHEET_PDF');

                      return (
                        <tr key={b.id}>
                          <td className="py-3 px-3 font-monospace fw-bold text-primary">
                            BKG-{b.id}
                          </td>
                          <td className="py-3 px-3">
                            <div className="fw-bold text-dark">{customerName}</div>
                            <small className="text-muted">{b.lead?.phone || b.phone || ""}</small>
                          </td>
                          <td className="py-3 px-3">
                            <div>{projectName}</div>
                            <small className="text-muted">{towerName}</small>
                          </td>
                          <td className="py-3 px-3 fw-semibold">
                            {unitName}
                          </td>
                          <td className="py-3 px-3 text-muted">
                            {fmtDate(b.bookedOn || b.createdAt)}
                          </td>
                          <td className="py-3 px-3 text-end fw-semibold">
                            {fmtMoney(b.agreementValue ?? b.basePrice)}
                          </td>
                          <td className="py-3 px-3 text-end fw-bold text-success">
                            {fmtMoney(b.soldPrice ?? b.totalPrice ?? b.agreementValue)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="d-flex justify-content-center gap-1">
                              <span className={`badge ${hasXlsx ? 'bg-success' : 'bg-secondary'}`} title="Excel Master">
                                XLSX
                              </span>
                              <span className={`badge ${hasPdf ? 'bg-danger' : 'bg-secondary'}`} title="Customer PDF">
                                PDF
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="btn-group btn-group-sm" role="group">
                              <button
                                className="btn btn-outline-success"
                                title="Download Excel Master with Live Formulas"
                                onClick={() => handleDownloadExcel(b.id)}
                              >
                                <FaFileExcel />
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                title="View Customer Cost Sheet PDF"
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
                                title="View Audit Logs"
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
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setAuditModalBooking(null)}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    Audit Log for Booking #{auditModalBooking.id} ({auditModalBooking.unitItem?.name || auditModalBooking.unit?.unitNo || auditModalBooking.unit?.name || 'Unit'})
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setAuditModalBooking(null)} />
                </div>
                <div className="modal-body p-3" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                  {(auditModalBooking.documentAuditLogs || []).length === 0 ? (
                    <div className="text-center py-4 text-muted">No audit activity logged for this booking yet.</div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {auditModalBooking.documentAuditLogs.map((log) => (
                        <li key={log.id} className="list-group-item d-flex justify-content-between align-items-start px-0">
                          <div>
                            <span className="badge bg-primary me-2">{log.action}</span>
                            <span className="fw-semibold text-dark">{log.type}</span>
                            <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                              {log.details}
                            </div>
                          </div>
                          <div className="text-end text-muted" style={{ fontSize: 11 }}>
                            <div>{log.performedBy || "Admin"}</div>
                            <div>{new Date(log.createdAt).toLocaleString("en-IN")}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setAuditModalBooking(null)}>
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
