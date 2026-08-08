import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterLayout from '../../masterLayout/MasterLayout';

const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? window.location.origin
    : "http://localhost:5000");
const authHeaders = () => ({ "Authorization": `Bearer ${localStorage.getItem("authToken")}`, "Content-Type": "application/json" });

const fmtDate = (v) => { if (!v) return "—"; return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const fmtTime = (v) => { if (!v) return "—"; return new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); };

const getCustomerName = (b) =>
  b?.customerName ||
  (b?.lead?.firstName && b?.lead?.lastName ? `${b.lead.firstName} ${b.lead.lastName}` : null) ||
  b?.lead?.firstName || "Customer";

const getBrandedDocumentHtml = (html = "") => {
  const logoUrl = `${window.location.origin}/assets/images/logo.png`;
  return String(html)
    .replace(
      /<div class="brand-name">Insite<span>Arc<\/span><\/div>/g,
      `<img class="brand-logo" src="${logoUrl}" alt="SWAMI" />`
    )
    .replace(
      /<\/style>/,
      `.brand-logo{display:block;height:auto;max-height:92px;object-fit:contain;width:92px;}</style>`
    )
    .replace(/src="\/assets\/images\/logo\.png"/g, `src="${logoUrl}"`)
    .replace(/Insite Arc Developers Pvt\. Ltd\./g, "SWAMI Developers Pvt. Ltd.")
    .replace(/Insite Arc CRM\s*·\s*Premium Post-Sales Housing Solutions/g, "SWAMI CRM - Premium Post-Sales Housing Solutions")
    .replace(/Insite Arc/g, "SWAMI");
};

const DOC_TYPES = [
  { type: "WELCOME_LETTER",      icon: "🏠", label: "Welcome Letter",          desc: "First letter sent on booking confirmation",     color: "#3b82f6", bg: "#eff6ff" },
  { type: "ALLOTMENT_LETTER",    icon: "📋", label: "Allotment Letter",         desc: "Formal unit allotment confirmation letter",     color: "#10b981", bg: "#f0fdf4" },
  { type: "AGREEMENT",           icon: "📝", label: "Agreement for Sale",       desc: "Full ATS summary with all terms",               color: "#8b5cf6", bg: "#f5f3ff" },
  { type: "PARKING_LETTER",      icon: "🚗", label: "Parking Allotment",        desc: "Dedicated parking slot assignment letter",      color: "#f59e0b", bg: "#fffbeb" },
  { type: "DEMAND_LETTER",       icon: "🧾", label: "Demand / Payment Notice",  desc: "Milestone billing notice with GST breakup",    color: "#ef4444", bg: "#fef2f2" },
  { type: "RECEIPT",             icon: "💰", label: "Payment Receipt",          desc: "Acknowledgement for payment received",          color: "#10b981", bg: "#f0fdf4" },
  { type: "POSSESSION_LETTER",   icon: "🔑", label: "Possession Offer Letter",  desc: "Handover offer on OC and zero dues clearance",  color: "#1d4ed8", bg: "#eff6ff" },
  { type: "NOC",                 icon: "✅", label: "No Objection Certificate", desc: "NOC for bank loan / property registration",    color: "#0ea5e9", bg: "#f0f9ff" },
  { type: "CANCELLATION_LETTER", icon: "❌", label: "Cancellation Letter",      desc: "Booking termination and refund statement",      color: "#dc2626", bg: "#fff1f2" },
];

const PostSalesDocuments = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [search, setSearch] = useState("");

  // Load booking list
  useEffect(() => {
    (async () => {
      try {
        setLoadingBookings(true);
        const r = await fetch(`${API_URL}/post-sales/bookings?limit=200`, { headers: authHeaders() });
        if (!r.ok) throw new Error();
        const result = await r.json();
        setBookings(result.data || []);
      } catch { console.error("Failed to load bookings"); }
      finally { setLoadingBookings(false); }
    })();
  }, []);

  // Load booking details when selected
  useEffect(() => {
    if (!selectedBookingId) { setBookingDetails(null); setAuditLogs([]); return; }
    (async () => {
      try {
        setLoadingDetails(true);
        const [detailsRes, logsRes] = await Promise.all([
          fetch(`${API_URL}/post-sales/bookings/${selectedBookingId}`, { headers: authHeaders() }),
          fetch(`${API_URL}/post-sales/bookings/${selectedBookingId}/audit-logs`, { headers: authHeaders() })
        ]);
        if (detailsRes.ok) setBookingDetails(await detailsRes.json());
        if (logsRes.ok) setAuditLogs(await logsRes.json());
      } catch { console.error("Failed to load details"); }
      finally { setLoadingDetails(false); }
    })();
  }, [selectedBookingId]);

  const filteredBookings = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter(b => {
      const name = getCustomerName(b).toLowerCase();
      const proj = (b.unit?.project?.name || b.projectDetails || "").toLowerCase();
      return !q || name.includes(q) || proj.includes(q) || String(b.id).includes(q);
    });
  }, [bookings, search]);

  const handleGenerate = async (type) => {
    if (!selectedBookingId) return alert("Please select a booking first.");
    setGenerating(type);
    try {
      const r = await fetch(`${API_URL}/post-sales/bookings/${selectedBookingId}/documents`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ type })
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      // Refresh details
      const fresh = await fetch(`${API_URL}/post-sales/bookings/${selectedBookingId}`, { headers: authHeaders() });
      if (fresh.ok) setBookingDetails(await fresh.json());
      const logsR = await fetch(`${API_URL}/post-sales/bookings/${selectedBookingId}/audit-logs`, { headers: authHeaders() });
      if (logsR.ok) setAuditLogs(await logsR.json());
      if (data.document?.htmlContent) setPreviewDoc(data.document);
    } catch { alert("Could not generate document. Please try again."); }
    finally { setGenerating(null); }
  };

  const handlePreview = (doc) => setPreviewDoc(doc);
  const handlePrint = (doc) => {
    const w = window.open("", "_blank");
    w.document.write(getBrandedDocumentHtml(doc.htmlContent));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };
  const handleDownload = (doc) => {
    const blob = new Blob([getBrandedDocumentHtml(doc.htmlContent)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title || doc.type}.html`;
    a.click();
    URL.revokeObjectURL(url);
    // Log download
    fetch(`${API_URL}/post-sales/documents/audit-log`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ bookingId: Number(selectedBookingId), type: doc.type, action: "DOWNLOAD", details: `Downloaded ${doc.type}` })
    }).catch(() => {});
  };

  const generatedDocs = bookingDetails?.generatedDocuments || [];
  const generatedTypes = new Set(generatedDocs.map(d => d.type));
  const customerName = bookingDetails ? getCustomerName(bookingDetails) : "";

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4">

        {/* ── Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Document Generation</h4>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
              Select a customer booking to generate SWAMI branded letters and documents
            </p>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Post Sales &gt; <span style={{ color: "#3b82f6" }}>Documents</span></div>
        </div>

        <div className="row g-4">
          {/* ── Left: Booking Selector ── */}
          <div className="col-12 col-lg-4">
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                📋 Select Booking
              </div>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                <input type="text" placeholder="Search name / project / ID…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
                {loadingBookings ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    <div className="spinner-border spinner-border-sm text-primary mb-2" /><br />Loading bookings…
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontSize: 13 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🏠</div>
                    No bookings found
                  </div>
                ) : filteredBookings.map(b => {
                  const name = getCustomerName(b);
                  const proj = b.unit?.project?.name || b.projectDetails || "—";
                  const unit = b.unit?.unitNo || b.unit?.name || "—";
                  const isSelected = String(b.id) === String(selectedBookingId);
                  const docCount = (b.generatedDocuments || []).length;
                  return (
                    <div key={b.id} onClick={() => setSelectedBookingId(String(b.id))}
                      style={{ padding: "12px 16px", borderBottom: "1px solid #f8fafc", cursor: "pointer", transition: "background 0.1s", background: isSelected ? "#eff6ff" : "transparent", borderLeft: isSelected ? "3px solid #1d4ed8" : "3px solid transparent" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{proj} · Unit {unit}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>BKG-{b.id}</span>
                        {docCount > 0 && <span style={{ fontSize: 10, background: "#d1fae5", color: "#065f46", padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>{docCount} docs</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right: Document Grid ── */}
          <div className="col-12 col-lg-8">

            {!selectedBookingId ? (
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", padding: "60px 40px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Select a Booking</div>
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Choose a customer booking from the left panel to generate and manage their documents</div>
              </div>
            ) : loadingDetails ? (
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", padding: "60px 40px", textAlign: "center" }}>
                <div className="spinner-border text-primary mb-3" />
                <div style={{ color: "#64748b", fontSize: 13 }}>Loading customer documents…</div>
              </div>
            ) : (
              <>
                {/* Customer Summary Bar */}
                <div style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", borderRadius: 12, padding: "16px 22px", marginBottom: 20, color: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800 }}>{customerName}</div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>
                        {bookingDetails?.unit?.project?.name || bookingDetails?.projectDetails || "—"} ·
                        Unit {bookingDetails?.unit?.unitNo || bookingDetails?.unit?.name || "—"} ·
                        BKG-{selectedBookingId}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ background: "rgba(255,255,255,0.2)", padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                        {generatedDocs.length} / {DOC_TYPES.length} Docs Generated
                      </span>
                      <button onClick={() => navigate(`/post-sales/details/${selectedBookingId}`)}
                        style={{ padding: "5px 14px", background: "#fff", color: "#1d4ed8", border: "none", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        View Profile →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Document Cards Grid */}
                <div className="row g-3 mb-4">
                  {DOC_TYPES.map(({ type, icon, label, desc, color, bg }) => {
                    const existing = generatedDocs.find(d => d.type === type);
                    const isGen = !!existing;
                    const isGenerating = generating === type;
                    return (
                      <div key={type} className="col-12 col-md-6">
                        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,.07)", borderLeft: `4px solid ${color}`, height: "100%" }}>
                          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <div style={{ fontSize: 26, background: bg, borderRadius: 10, padding: "8px", minWidth: 44, textAlign: "center" }}>{icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{label}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, marginBottom: 10 }}>{desc}</div>
                              {isGen ? (
                                <div>
                                  <div style={{ fontSize: 11, color: "#15803d", marginBottom: 8 }}>✓ {fmtDate(existing.createdAt)} at {fmtTime(existing.createdAt)}</div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <button onClick={() => handlePreview(existing)}
                                      style={{ padding: "5px 11px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                      👁️ Preview
                                    </button>
                                    <button onClick={() => handlePrint(existing)}
                                      style={{ padding: "5px 11px", background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                      🖨️ Print
                                    </button>
                                    <button onClick={() => handleDownload(existing)}
                                      style={{ padding: "5px 11px", background: "#fefce8", color: "#854d0e", border: "1px solid #fde047", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                      ⬇️ Download
                                    </button>
                                    <button onClick={() => handleGenerate(type)} disabled={isGenerating}
                                      style={{ padding: "5px 11px", background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                      🔄 Re-gen
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => handleGenerate(type)} disabled={isGenerating}
                                  style={{ padding: "7px 18px", background: color, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: isGenerating ? "not-allowed" : "pointer", opacity: isGenerating ? 0.7 : 1, transition: "opacity 0.2s" }}>
                                  {isGenerating ? "⏳ Generating…" : "📄 Generate"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Audit Log */}
                {auditLogs.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                      🕐 Document Activity Log
                    </div>
                    <div style={{ maxHeight: 280, overflowY: "auto" }}>
                      {auditLogs.map((log) => {
                        const icons = { GENERATE: "📄", PREVIEW: "👁️", DOWNLOAD: "⬇️", PRINT: "🖨️" };
                        return (
                          <div key={log.id} style={{ display: "flex", gap: 12, padding: "10px 20px", borderBottom: "1px solid #f8fafc", alignItems: "flex-start" }}>
                            <div style={{ fontSize: 18, minWidth: 28 }}>{icons[log.action] || "📌"}</div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                                {log.action} — {String(log.type).replace(/_/g, " ")}
                              </div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                {log.performedBy || "Admin"} · {new Date(log.createdAt).toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {previewDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setPreviewDoc(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "min(960px, 100%)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{previewDoc.title}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handlePrint(previewDoc)} style={{ padding: "7px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Print</button>
                <button onClick={() => handleDownload(previewDoc)} style={{ padding: "7px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⬇️ Download</button>
                <button onClick={() => setPreviewDoc(null)} style={{ padding: "7px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✕ Close</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <iframe srcDoc={getBrandedDocumentHtml(previewDoc.htmlContent)} style={{ width: "100%", height: "100%", minHeight: "70vh", border: "none" }} title="Document Preview" />
            </div>
          </div>
        </div>
      )}
    </MasterLayout>
  );
};

export default PostSalesDocuments;
