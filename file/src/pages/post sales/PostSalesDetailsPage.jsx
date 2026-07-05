import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import MasterLayout from '../../masterLayout/MasterLayout';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const authHeaders = () => ({ "Authorization": `Bearer ${localStorage.getItem("authToken")}`, "Content-Type": "application/json" });

const fmt = (v) => v !== undefined && v !== null && v !== "" ? `₹${Number(v).toLocaleString("en-IN")}` : "—";
const fmtDate = (v) => { if (!v) return "—"; return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const fmtDateTime = (v) => { if (!v) return "—"; return new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };

const getCustomerName = (b) =>
  b?.customerName ||
  (b?.lead?.firstName && b?.lead?.lastName ? `${b.lead.firstName} ${b.lead.lastName}` : null) ||
  b?.lead?.firstName || "Customer";

const parseMaybeJson = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!["[", "{"].includes(trimmed.charAt(0))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const getContactValue = (value, keys) => {
  const parsed = parseMaybeJson(value);
  if (parsed === undefined || parsed === null || parsed === "") return "";
  if (typeof parsed === "string" || typeof parsed === "number") return String(parsed);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => getContactValue(item, keys)).filter(Boolean).join(", ");
  }
  if (typeof parsed === "object") {
    for (const key of keys) {
      const nested = getContactValue(parsed[key], keys);
      if (nested) return nested;
    }
    return Object.values(parsed).map((item) => getContactValue(item, keys)).filter(Boolean).join(", ");
  }
  return "";
};

const getPhone = (lead) => {
  return getContactValue(lead?.phones || lead?.phone || lead?.mobile || lead?.mobileNumber, [
    "number",
    "phone",
    "mobile",
    "mobileNumber",
    "value",
    "label",
  ]) || "-";
};
const getEmail = (lead) => {
  return getContactValue(lead?.emails || lead?.email || lead?.emailAddress, [
    "email",
    "emailAddress",
    "value",
    "label",
  ]) || "-";
};

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

const DOC_META = {
  WELCOME_LETTER:     { icon: "🏠", label: "Welcome Letter",          color: "#3b82f6" },
  ALLOTMENT_LETTER:   { icon: "📋", label: "Allotment Letter",         color: "#10b981" },
  AGREEMENT:          { icon: "📝", label: "Agreement for Sale",       color: "#8b5cf6" },
  PARKING_LETTER:     { icon: "🚗", label: "Parking Allotment",        color: "#f59e0b" },
  DEMAND_LETTER:      { icon: "🧾", label: "Demand Letter",            color: "#ef4444" },
  RECEIPT:            { icon: "💰", label: "Payment Receipt",          color: "#10b981" },
  POSSESSION_LETTER:  { icon: "🔑", label: "Possession Offer Letter",  color: "#1d4ed8" },
  NOC:                { icon: "✅", label: "No Objection Certificate", color: "#0ea5e9" },
  CANCELLATION_LETTER:{ icon: "❌", label: "Cancellation Letter",      color: "#dc2626" },
};

const TABS = [
  { key: "customer",  icon: "👤", label: "Customer" },
  { key: "booking",   icon: "📋", label: "Booking" },
  { key: "unit",      icon: "🏠", label: "Unit" },
  { key: "costsheet", icon: "💰", label: "Cost Sheet" },
  { key: "payment",   icon: "📅", label: "Payment Plan" },
  { key: "documents", icon: "📄", label: "Documents" },
  { key: "demands",   icon: "🧾", label: "Demands" },
  { key: "collections",icon:"💳", label: "Collections" },
  { key: "ledger",    icon: "📒", label: "Ledger" },
  { key: "activity",  icon: "🕐", label: "Activity" },
];

const InfoRow = ({ label, value, bold }) => (
  <div style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
    <div style={{ width: "35%", color: "#64748b", fontSize: 13, fontWeight: 500 }}>{label}</div>
    <div style={{ flex: 1, color: "#1e293b", fontSize: 13, fontWeight: bold ? 700 : 400 }}>{value || "—"}</div>
  </div>
);

const SectionTitle = ({ title, sub }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{title}</div>
    {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,.07)", ...style }}>
    {children}
  </div>
);

const PostSalesDetailsPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const activeTab = searchParams.get('tab') || 'customer';
  const setTab = (t) => setSearchParams({ tab: t });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_URL}/post-sales/bookings/${bookingId}`, { headers: authHeaders() });
        if (!r.ok) throw new Error();
        setBooking(await r.json());
      } catch { setError("Could not load booking details."); }
      finally { setLoading(false); }
    })();
  }, [bookingId]);

  const handleGenerate = async (type) => {
    setGenerating(type);
    try {
      const r = await fetch(`${API_URL}/post-sales/bookings/${bookingId}/documents`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ type })
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      // Refetch to update document list
      const fresh = await fetch(`${API_URL}/post-sales/bookings/${bookingId}`, { headers: authHeaders() });
      if (fresh.ok) setBooking(await fresh.json());
      if (data.document?.htmlContent) setPreviewDoc(data.document);
    } catch { alert("Could not generate document."); }
    finally { setGenerating(null); }
  };

  const handlePreview = (doc) => setPreviewDoc(doc);
  const handlePrint = (doc) => {
    const w = window.open("", "_blank");
    w.document.write(getBrandedDocumentHtml(doc.htmlContent));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  if (loading) return (
    <MasterLayout>
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner-border text-primary mb-3" />
          <div style={{ color: "#64748b", fontSize: 13 }}>Loading customer profile…</div>
        </div>
      </div>
    </MasterLayout>
  );

  if (error || !booking) return (
    <MasterLayout>
      <div className="p-4"><div className="alert alert-danger">{error || "Booking not found."}</div></div>
    </MasterLayout>
  );

  const customerName = getCustomerName(booking);
  const lead = booking.lead || {};
  const unit = booking.unit || {};
  const project = unit.project || {};
  const tower = unit.tower || {};
  const generatedDocs = booking.generatedDocuments || [];
  const generatedTypes = new Set(generatedDocs.map(d => d.type));

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4">

        {/* ── Customer Header Banner ── */}
        <div style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", borderRadius: 14, padding: "24px 28px", marginBottom: 24, color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ width: 60, height: 60, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, flexShrink: 0 }}>
                {customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{customerName}</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                  {getPhone(lead)} &nbsp;·&nbsp; BKG-{booking.id} &nbsp;·&nbsp; {fmtDate(booking.bookedOn)}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{ background: "#fff", color: "#1d4ed8", padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                    {booking.stage || "Booked"}
                  </span>
                  {project.name && (
                    <span style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "3px 12px", borderRadius: 999, fontSize: 11 }}>
                      📍 {project.name}
                    </span>
                  )}
                  {unit.unitNo && (
                    <span style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "3px 12px", borderRadius: 999, fontSize: 11 }}>
                      🏠 Unit {unit.unitNo}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Agreement Value</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(booking.basePrice)}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Docs: {generatedDocs.length} / {Object.keys(DOC_META).length}</div>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setTab(tab.key)}
              style={{
                padding: "9px 16px", borderRadius: 9, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                fontSize: 12, fontWeight: 700, transition: "all 0.15s",
                background: activeTab === tab.key ? "#1d4ed8" : "#fff",
                color: activeTab === tab.key ? "#fff" : "#64748b",
                boxShadow: activeTab === tab.key ? "0 2px 8px rgba(29,78,216,.35)" : "0 1px 4px rgba(0,0,0,.07)"
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}

        {/* Customer Tab */}
        {activeTab === "customer" && (
          <Card>
            <SectionTitle title="Customer / Allottee Information" sub="Details from the booking lead record" />
            <InfoRow label="Full Name" value={customerName} bold />
            <InfoRow label="Mobile Number" value={getPhone(lead)} />
            <InfoRow label="Email Address" value={getEmail(lead)} />
            <InfoRow label="PAN Number" value={lead.panNumber || lead.pan || "—"} />
            <InfoRow label="Aadhaar Number" value={lead.aadhaarNumber ? `****${String(lead.aadhaarNumber).slice(-4)}` : "—"} />
            <InfoRow label="Lead Source" value={lead.source || booking.source || "—"} />
            <InfoRow label="Lead Status" value={lead.status || "—"} />
            {booking.lead?.leadAddress && <>
              <div style={{ marginTop: 20, marginBottom: 12, fontWeight: 700, color: "#475569", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Address</div>
              <InfoRow label="Street / Address" value={lead.leadAddress?.address || lead.leadAddress?.street || "—"} />
              <InfoRow label="City" value={lead.leadAddress?.city || "—"} />
              <InfoRow label="State" value={lead.leadAddress?.state || "—"} />
              <InfoRow label="PIN Code" value={lead.leadAddress?.zip || "—"} />
            </>}
          </Card>
        )}

        {/* Booking Tab */}
        {activeTab === "booking" && (
          <Card>
            <SectionTitle title="Booking Details" sub="Core booking record information" />
            <InfoRow label="Booking Reference" value={`BKG-${booking.id}`} bold />
            <InfoRow label="Booking Date" value={fmtDate(booking.bookedOn)} />
            <InfoRow label="Booking Stage" value={booking.stage} />
            <InfoRow label="Booked By" value={booking.bookedBy || "—"} />
            <InfoRow label="Source / Channel" value={booking.source || "—"} />
            <InfoRow label="Project Details" value={booking.projectDetails || project.name || "—"} />
            <InfoRow label="Saleable Area" value={booking.saleableArea ? `${booking.saleableArea} Sq.Ft.` : "—"} />
            <InfoRow label="Base Rate" value={booking.baseRate ? `₹${Number(booking.baseRate).toLocaleString("en-IN")} / Sq.Ft.` : "—"} />
            <InfoRow label="Base Price (Agreement Value)" value={fmt(booking.basePrice)} bold />
          </Card>
        )}

        {/* Unit Tab */}
        {activeTab === "unit" && (
          <Card>
            <SectionTitle title="Unit / Inventory Details" sub="Property linked to this booking" />
            <InfoRow label="Project Name" value={project.name || "—"} bold />
            <InfoRow label="RERA Number" value={project.reraProjectId ? `RERA/${project.reraProjectId}` : "—"} />
            <InfoRow label="Tower / Block" value={tower.name || "—"} />
            <InfoRow label="Floor Number" value={unit.floor || unit.floorNo || "—"} />
            <InfoRow label="Unit Number" value={unit.unitNo || unit.name || "—"} bold />
            <InfoRow label="Unit Type / Config" value={unit.type || unit.unitType || unit.configuration || "—"} />
            <InfoRow label="Carpet Area" value={unit.carpetArea ? `${unit.carpetArea} Sq.Ft.` : "—"} />
            <InfoRow label="Saleable Area" value={booking.saleableArea ? `${booking.saleableArea} Sq.Ft.` : unit.saleableArea ? `${unit.saleableArea} Sq.Ft.` : "—"} />
            <InfoRow label="Facing" value={unit.facing || "—"} />
            <InfoRow label="Unit Status" value={unit.status || "—"} />
          </Card>
        )}

        {/* Cost Sheet Tab */}
        {activeTab === "costsheet" && (
          <Card>
            <SectionTitle title="Cost Sheet" sub="Agreed pricing breakdown at time of booking" />
            {booking.costSheet?.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#eff6ff" }}>
                      {["Component", "Original Value", "Type", "Adjusted Value", "Final Value"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#1d4ed8", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #bfdbfe" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {booking.costSheet.map((row) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b" }}>{row.fieldName}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmt(row.orignalValue)}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: row.costType === "Discount" ? "#fef9c3" : "#dbeafe", color: row.costType === "Discount" ? "#a16207" : "#1d4ed8" }}>
                            {row.costType}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmt(row.inputField)}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>{fmt(row.newValue)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: "#eff6ff" }}>
                      <td colSpan={4} style={{ padding: "12px 14px", fontWeight: 800, color: "#1d4ed8", textAlign: "right", fontSize: 14 }}>Agreement Value (Total)</td>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#1d4ed8", fontSize: 14 }}>{fmt(booking.basePrice)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
                <div>No cost sheet available for this booking.</div>
              </div>
            )}
          </Card>
        )}

        {/* Payment Plan Tab */}
        {activeTab === "payment" && (
          <Card>
            <SectionTitle title="Payment Plan (Schedule)" sub="Milestone-wise payment breakdown" />
            {booking.paymentSchedule?.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#eff6ff" }}>
                      {["#", "Milestone", "Tower Stage", "% / Value", "Amount", "Taxes", "TDS", "Grand Total"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#1d4ed8", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #bfdbfe" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {booking.paymentSchedule.map((row, i) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{i + 1}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b" }}>{row.name}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{row.towerMilestone || "—"}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{row.value ? `${row.value}%` : "—"}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 600 }}>{fmt(row.amount)}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmt(row.taxes)}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmt(row.tds)}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1d4ed8" }}>{fmt(row.grandTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                <div>No payment plan schedule available.</div>
              </div>
            )}
          </Card>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div>
            <div className="row g-3 mb-4">
              {Object.entries(DOC_META).map(([type, meta]) => {
                const existing = generatedDocs.find(d => d.type === type);
                const isGenerated = !!existing;
                const isGenerating = generating === type;
                return (
                  <div key={type} className="col-12 col-md-6 col-lg-4">
                    <Card style={{ padding: "18px 20px" }}>
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ fontSize: 28, minWidth: 36 }}>{meta.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", marginBottom: 4 }}>{meta.label}</div>
                          {isGenerated ? (
                            <>
                              <div style={{ fontSize: 11, color: "#15803d", marginBottom: 10 }}>✓ Generated · {fmtDateTime(existing.createdAt)}</div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => handlePreview(existing)}
                                  style={{ padding: "5px 12px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                  👁️ Preview
                                </button>
                                <button onClick={() => handlePrint(existing)}
                                  style={{ padding: "5px 12px", background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                  🖨️ Print
                                </button>
                                <button onClick={() => handleGenerate(type)} disabled={isGenerating}
                                  style={{ padding: "5px 12px", background: "#fefce8", color: "#854d0e", border: "1px solid #fde047", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                  🔄 Re-gen
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>Not generated yet</div>
                              <button onClick={() => handleGenerate(type)} disabled={isGenerating}
                                style={{ padding: "6px 16px", background: meta.color, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: isGenerating ? "not-allowed" : "pointer", opacity: isGenerating ? 0.7 : 1 }}>
                                {isGenerating ? "⏳ Generating…" : "📄 Generate"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Demands Tab */}
        {activeTab === "demands" && (
          <Card>
            <SectionTitle title="Demand / Billing History" sub="All payment notices raised for this booking" />
            {booking.demands?.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#fef2f2" }}>
                      {["Demand No", "Description", "Principal", "GST", "Total", "Paid", "Outstanding", "Due Date", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", color: "#b91c1c", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #fecaca", textAlign: h === "Status" ? "center" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {booking.demands.map((dem) => (
                      <tr key={dem.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b", fontFamily: "monospace" }}>{dem.demandNo}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{dem.description || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>{fmt(dem.principal)}</td>
                        <td style={{ padding: "10px 14px" }}>{fmt(dem.gst)}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 700 }}>{fmt(dem.amount)}</td>
                        <td style={{ padding: "10px 14px", color: "#15803d" }}>{fmt(dem.paidAmount)}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#ef4444" }}>{fmt(dem.outstandingAmount)}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmtDate(dem.dueDate)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: dem.status === "PAID" ? "#d1fae5" : dem.status === "ISSUED" ? "#dbeafe" : "#fef3c7", color: dem.status === "PAID" ? "#065f46" : dem.status === "ISSUED" ? "#1d4ed8" : "#92400e" }}>{dem.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
                <div>No demands raised yet for this booking.</div>
              </div>
            )}
          </Card>
        )}

        {/* Collections Tab */}
        {activeTab === "collections" && (
          <Card>
            <SectionTitle title="Collections / Receipts" sub="All payments received for this booking" />
            {booking.receipts?.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f0fdf4" }}>
                      {["Receipt No", "Amount", "Mode", "Status", "Ref Number", "Received On"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", color: "#065f46", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #86efac" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {booking.receipts.map((rec) => (
                      <tr key={rec.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, fontFamily: "monospace" }}>{rec.receiptNo}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#15803d" }}>{fmt(rec.amount)}</td>
                        <td style={{ padding: "10px 14px" }}>{rec.mode || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "#d1fae5", color: "#065f46" }}>{rec.status}</span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{rec.referenceNumber || "—"}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmtDate(rec.receivedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
                <div>No collections recorded yet.</div>
              </div>
            )}
          </Card>
        )}

        {/* Ledger Tab */}
        {activeTab === "ledger" && (
          <Card>
            <SectionTitle title="Customer Ledger" sub="Running debit / credit statement for this booking" />
            {booking.ledgerEntries?.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#eff6ff" }}>
                      {["Date", "Description", "Type", "Amount", "Running Balance"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", color: "#1d4ed8", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #bfdbfe" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let balance = 0;
                      return booking.ledgerEntries.map((entry) => {
                        if (entry.type === "CREDIT") balance -= entry.amount;
                        else balance += entry.amount;
                        return (
                          <tr key={entry.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmtDate(entry.date)}</td>
                            <td style={{ padding: "10px 14px", color: "#1e293b" }}>{entry.description || "—"}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: entry.type === "CREDIT" ? "#d1fae5" : "#fef2f2", color: entry.type === "CREDIT" ? "#065f46" : "#b91c1c" }}>{entry.type}</span>
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: entry.type === "CREDIT" ? "#15803d" : "#ef4444" }}>{entry.type === "CREDIT" ? "-" : "+"}{fmt(entry.amount)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700 }}>{fmt(balance)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📒</div>
                <div>Ledger is empty. Generate a demand to create the first entry.</div>
              </div>
            )}
          </Card>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <Card>
            <SectionTitle title="Document Activity Log" sub="All actions performed on documents for this booking" />
            {booking.documentAuditLogs?.length > 0 ? (
              <div>
                {booking.documentAuditLogs.map((log) => {
                  const iconMap = { GENERATE: "📄", PREVIEW: "👁️", DOWNLOAD: "⬇️", PRINT: "🖨️" };
                  return (
                    <div key={log.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid #f1f5f9", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 22, minWidth: 32, textAlign: "center" }}>{iconMap[log.action] || "📌"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
                          {log.action} — {String(log.type).replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{log.details}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                          By: {log.performedBy || "Admin"} &nbsp;·&nbsp; {fmtDateTime(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div>
                <div>No activity logged yet. Generate a document to see the first entry.</div>
              </div>
            )}
          </Card>
        )}

      </div>

      {/* ── Document Preview Modal ── */}
      {previewDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setPreviewDoc(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "min(900px, 100%)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{previewDoc.title}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handlePrint(previewDoc)} style={{ padding: "7px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Print</button>
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

export default PostSalesDetailsPage;

