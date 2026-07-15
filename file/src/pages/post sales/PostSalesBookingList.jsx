import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterLayout from '../../masterLayout/MasterLayout';

const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? window.location.origin
    : "http://localhost:5000");
const authHeaders = () => ({ "Authorization": `Bearer ${localStorage.getItem("authToken")}` });

const fmt = (v) => v !== undefined && v !== null && v !== "" ? `₹${Number(v).toLocaleString("en-IN")}` : "—";
const fmtDate = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const getCustomerName = (item) =>
  item.customerName ||
  (item.lead?.firstName && item.lead?.lastName ? `${item.lead.firstName} ${item.lead.lastName}` : null) ||
  item.lead?.firstName || "Customer";

const getPhone = (item) => {
  const p = item.lead?.phones;
  if (!p) return "—";
  try { const a = JSON.parse(p); return Array.isArray(a) ? a[0] || "—" : String(p); } catch { return String(p); }
};

const DOC_TYPES = ["WELCOME_LETTER","ALLOTMENT_LETTER","AGREEMENT","PARKING_LETTER","DEMAND_LETTER","RECEIPT","POSSESSION_LETTER","NOC","CANCELLATION_LETTER"];

const PostSalesBookingList = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(null); // bookingId being acted on
  const PER_PAGE = 12;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_URL}/post-sales/bookings?limit=200`, { headers: authHeaders() });
        if (!r.ok) throw new Error();
        const result = await r.json();
        setBookings(result.data || []);
      } catch {
        setError("Could not load bookings. Please refresh.");
      } finally { setLoading(false); }
    })();
  }, []);

  const projects = useMemo(() => {
    const names = [...new Set(bookings.map(b => b.unit?.project?.name || b.projectDetails).filter(Boolean))];
    return ["All", ...names];
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter(b => {
      const name = getCustomerName(b).toLowerCase();
      const proj = (b.unit?.project?.name || b.projectDetails || "").toLowerCase();
      const unit = (b.unit?.unitNo || b.unit?.name || "").toLowerCase();
      const matchQ = !q || name.includes(q) || proj.includes(q) || unit.includes(q) || String(b.id).includes(q);
      const matchP = projectFilter === "All" || (b.unit?.project?.name || b.projectDetails) === projectFilter;
      return matchQ && matchP;
    });
  }, [bookings, search, projectFilter]);

  useEffect(() => setPage(1), [search, projectFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleGenerate = async (bookingId, type) => {
    setGenerating(bookingId);
    try {
      const r = await fetch(`${API_URL}/post-sales/bookings/${bookingId}/documents`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      if (!r.ok) throw new Error();
      const doc = await r.json();
      // Open preview in new tab
      const win = window.open("", "_blank");
      if (win && doc.document?.htmlContent) {
        win.document.write(doc.document.htmlContent);
        win.document.close();
      } else {
        navigate(`/post-sales/details/${bookingId}?tab=documents`);
      }
    } catch {
      alert("Could not generate document. Please try again.");
    } finally { setGenerating(null); }
  };

  const docGeneratedCount = (item) => (item.generatedDocuments || []).length;

  return (
    <MasterLayout>
      <style>{`
        .ps-booking-list-table-card {
          background: #ffffff !important;
          border: 1px solid #e2e8f0;
          border-radius: 10px !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05) !important;
          overflow: hidden;
        }

        .ps-booking-list-table-wrap {
          overflow-x: auto;
          padding: 24px;
        }

        .ps-booking-list-table {
          border-collapse: collapse !important;
          color: #334155;
          font-size: 14px !important;
          min-width: 1280px;
          width: 100%;
        }

        .ps-booking-list-table thead tr {
          background: transparent !important;
          border-bottom: 0 !important;
        }

        .ps-booking-list-table thead th {
          background: #487fff !important;
          border: 0 !important;
          color: #ffffff !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          letter-spacing: 0 !important;
          padding: 18px 20px !important;
          text-align: left !important;
          text-transform: none !important;
          white-space: nowrap;
        }

        .ps-booking-list-table thead th:first-child {
          border-radius: 8px 0 0 8px;
        }

        .ps-booking-list-table thead th:last-child {
          border-radius: 0 8px 8px 0;
        }

        .ps-booking-list-table tbody tr {
          border-bottom: 1px solid #e2e8f0 !important;
          transition: background 0.2s;
        }

        .ps-booking-list-table tbody tr:nth-child(even) {
          background: #f8fafc !important;
        }

        .ps-booking-list-table tbody tr:hover,
        .ps-booking-list-table tbody tr:nth-child(even):hover {
          background: #f1f5f9 !important;
        }

        .ps-booking-list-table tbody td {
          border-bottom: 1px solid #e2e8f0 !important;
          color: #334155 !important;
          font-size: 14px !important;
          padding: 18px 20px !important;
          vertical-align: middle;
        }

        .ps-booking-list-table tbody td strong,
        .ps-booking-list-customer {
          color: #0f172a !important;
          font-size: 15px;
          font-weight: 700;
        }

        .ps-booking-list-pagination {
          border-top: 1px solid #e2e8f0 !important;
          padding: 16px 24px !important;
        }
      `}</style>
      <div className="floor-dashboard p-4">

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Post-Sales Booking List</h4>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
              All confirmed bookings ready for document generation and milestone tracking
            </p>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Post Sales &gt; <span style={{ color: "#3b82f6" }}>Booking List</span>
          </div>
        </div>

        {/* ── Filters ── */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", marginBottom: 20, boxShadow: "0 1px 6px rgba(0,0,0,.07)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8" }}>🔍</span>
            <input
              type="text"
              placeholder="Search customer, project, unit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "9px 12px 9px 34px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", color: "#1e293b" }}
            />
          </div>
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            style={{ padding: "9px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#1e293b", background: "#fff", cursor: "pointer" }}
          >
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>
            <strong style={{ color: "#3b82f6" }}>{filtered.length}</strong> bookings found
          </div>
        </div>

        {/* ── Table ── */}
        <div className="ps-booking-list-table-card" style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", overflow: "hidden" }}>
          {error && <div className="alert alert-danger m-3">{error}</div>}
          <div className="ps-booking-list-table-wrap" style={{ overflowX: "auto" }}>
            <table className="ps-booking-list-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {["Booking No","Customer","Project","Tower","Unit","Date","Agreement Value","Docs","Status","Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: h === "Agreement Value" ? "right" : "left", color: "#475569", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                    <div className="spinner-border spinner-border-sm text-primary me-2" />Loading confirmed bookings…
                  </td></tr>
                ) : current.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
                    <div style={{ color: "#64748b", fontSize: 14, fontWeight: 600 }}>No confirmed bookings found</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Change a booking status to "Confirmed" to see it here</div>
                  </td></tr>
                ) : current.map(item => {
                  const customerName = getCustomerName(item);
                  const phone = getPhone(item);
                  const projectName = item.unit?.project?.name || item.projectDetails || "—";
                  const towerName = item.unit?.tower?.name || "—";
                  const unitNo = item.unit?.unitNo || item.unit?.name || (item.unitId ? `#${item.unitId}` : "—");
                  const docCount = docGeneratedCount(item);
                  const isGenerating = generating === item.id;
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontWeight: 700, color: "#1d4ed8", fontFamily: "monospace", fontSize: 12 }}>BKG-{item.id}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="ps-booking-list-customer" style={{ fontWeight: 700, color: "#1e293b" }}>{customerName}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{phone}</div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#475569" }}>{projectName}</td>
                      <td style={{ padding: "12px 16px", color: "#475569" }}>{towerName}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontWeight: 700, color: "#1e293b" }}>{unitNo}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b", fontSize: 12 }}>{fmtDate(item.bookedOn)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#1e293b" }}>{fmt(item.basePrice)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%", fontSize: 10, fontWeight: 800,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: docCount >= DOC_TYPES.length ? "#d1fae5" : docCount > 0 ? "#dbeafe" : "#f1f5f9",
                            color: docCount >= DOC_TYPES.length ? "#065f46" : docCount > 0 ? "#1d4ed8" : "#94a3b8"
                          }}>{docCount}</div>
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>/ {DOC_TYPES.length}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "#d1fae5", color: "#065f46" }}>
                          ✓ Confirmed
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                          <button
                            onClick={() => navigate(`/post-sales/details/${item.id}`)}
                            style={{ padding: "6px 12px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            View Profile
                          </button>
                          <button
                            onClick={() => handleGenerate(item.id, "WELCOME_LETTER")}
                            disabled={isGenerating}
                            style={{ padding: "6px 12px", background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: isGenerating ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: isGenerating ? 0.7 : 1 }}
                          >
                            {isGenerating ? "⏳ …" : "📄 Welcome"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PER_PAGE && (
            <div className="ps-booking-list-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: "1px solid #f1f5f9", fontSize: 12 }}>
              <span style={{ color: "#64748b" }}>
                Showing {Math.min((page-1)*PER_PAGE+1, filtered.length)}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: page === 1 ? "#f8fafc" : "#fff", cursor: page === 1 ? "default" : "pointer", color: "#475569", fontWeight: 600, fontSize: 12 }}>
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = i + 1;
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: page === pg ? "#1d4ed8" : "#fff", color: page === pg ? "#fff" : "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      {pg}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: page === totalPages ? "#f8fafc" : "#fff", cursor: page === totalPages ? "default" : "pointer", color: "#475569", fontWeight: 600, fontSize: 12 }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MasterLayout>
  );
};

export default PostSalesBookingList;
