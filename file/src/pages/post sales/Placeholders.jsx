import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MasterLayout from '../../masterLayout/MasterLayout';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem("authToken")}` });
const fmt = (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—";
const getName = (b) => b.customerName || (b.lead?.firstName && b.lead?.lastName ? `${b.lead.firstName} ${b.lead.lastName}` : b.lead?.firstName) || "Customer";

export const PostSalesPaymentPlans = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/post-sales/payment-plans`, { headers: authH() });
        if (!r.ok) throw new Error();
        const res = await r.json();
        setData(res.data || []);
      } catch { setError("Could not load payment plans."); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter(b => {
      const name = getName(b).toLowerCase();
      const proj = (b.unit?.project?.name || "").toLowerCase();
      return !q || name.includes(q) || proj.includes(q) || String(b.id).includes(q);
    });
  }, [data, search]);

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Payment Plans</h4>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Milestone-wise payment schedules for all confirmed bookings</p>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Post Sales › <span style={{ color: "#3b82f6" }}>Payment Plans</span></div>
        </div>

        {/* Stats row */}
        <div className="row g-3 mb-4">
          {[
            { label: "Total Bookings",  val: data.length,                            color: "#3b82f6", icon: "🏠" },
            { label: "With Schedules",  val: data.filter(b => b.milestonesCount > 0).length, color: "#10b981", icon: "📅" },
            { label: "No Schedule Yet", val: data.filter(b => b.milestonesCount === 0).length, color: "#f59e0b", icon: "⚠️" },
            { label: "Total Milestones",val: data.reduce((s, b) => s + b.milestonesCount, 0), color: "#8b5cf6", icon: "📌" },
          ].map(c => (
            <div key={c.label} className="col-6 col-md-3">
              <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", borderLeft: `4px solid ${c.color}`, boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>{c.icon} {c.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input type="text" placeholder="🔍  Search by customer, project…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "10px 16px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, width: "100%", maxWidth: 380, outline: "none" }} />
        </div>

        {/* Booking cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><div className="spinner-border text-primary" /></div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 12, padding: "60px 40px", textAlign: "center", color: "#94a3b8", boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#475569" }}>No payment plans found</div>
          </div>
        ) : filtered.map(b => {
          const name = getName(b);
          const proj = b.unit?.project?.name || b.projectDetails || "—";
          const unit = b.unit?.unitNo || b.unit?.name || "—";
          const tower = b.unit?.tower?.name || "—";
          const isOpen = expanded === b.id;
          return (
            <div key={b.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,.07)", overflow: "hidden" }}>
              {/* Header row */}
              <div onClick={() => setExpanded(isOpen ? null : b.id)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", cursor: "pointer", borderLeft: "4px solid #3b82f6" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, background: "#eff6ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#1d4ed8", fontSize: 16 }}>
                    {name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{proj} · {tower} · Unit {unit} · <span style={{ fontFamily: "monospace" }}>BKG-{b.id}</span></div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Agreement Value</div>
                    <div style={{ fontWeight: 800, color: "#1e293b", fontSize: 14 }}>{fmt(b.basePrice)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Milestones</div>
                    <div style={{ fontWeight: 800, color: "#3b82f6", fontSize: 14 }}>{b.milestonesCount}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Scheduled</div>
                    <div style={{ fontWeight: 800, color: "#10b981", fontSize: 14 }}>{fmt(b.totalGrandTotal)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/post-sales/details/${b.id}?tab=payment`); }}
                      style={{ padding: "5px 12px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      View Profile
                    </button>
                    <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#94a3b8", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</div>
                  </div>
                </div>
              </div>

              {/* Expanded schedule table */}
              {isOpen && (
                <div style={{ borderTop: "1px solid #f1f5f9", overflowX: "auto" }}>
                  {b.paymentSchedule.length === 0 ? (
                    <div style={{ padding: "24px 20px", color: "#94a3b8", textAlign: "center", fontSize: 13 }}>
                      No payment schedule milestones configured for this booking.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {["#", "Milestone Label", "Construction Stage", "% of Value", "Base Amount", "Taxes", "TDS", "Grand Total"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {b.paymentSchedule.map((m, i) => (
                          <tr key={m.id} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafbff" }}>
                            <td style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>{m.name}</td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{m.towerMilestone || "—"}</td>
                            <td style={{ padding: "10px 14px", color: "#8b5cf6", fontWeight: 700 }}>{m.value ? `${m.value}%` : "—"}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{fmt(m.amount)}</td>
                            <td style={{ padding: "10px 14px", color: "#f59e0b" }}>{fmt(m.taxes)}</td>
                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmt(m.tds)}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 800, color: "#1d4ed8" }}>{fmt(m.grandTotal)}</td>
                          </tr>
                        ))}
                        <tr style={{ background: "#eff6ff" }}>
                          <td colSpan={7} style={{ padding: "12px 14px", fontWeight: 800, color: "#1d4ed8", textAlign: "right" }}>Total Grand Total</td>
                          <td style={{ padding: "12px 14px", fontWeight: 800, color: "#1d4ed8", fontSize: 14 }}>{fmt(b.totalGrandTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MasterLayout>
  );
};

export const PostSalesDemands = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusCounts, setStatusCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const load = async (status) => {
    try {
      setLoading(true);
      const q = status && status !== "ALL" ? `?status=${status}` : "";
      const r = await fetch(`${API_URL}/post-sales/demands${q}`, { headers: authH() });
      if (!r.ok) throw new Error();
      const res = await r.json();
      setData(res.data || []);
      setStats(res.stats);
      setStatusCounts(res.statusCounts || []);
    } catch { console.error("Failed to load demands"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const statusColor = (s) => ({ PAID: "#065f46", ISSUED: "#1d4ed8", PARTIALLY_PAID: "#92400e", DRAFT: "#475569", OVERDUE: "#b91c1c", CANCELLED: "#6b7280" }[s] || "#475569");
  const statusBg   = (s) => ({ PAID: "#d1fae5", ISSUED: "#dbeafe", PARTIALLY_PAID: "#fef3c7", DRAFT: "#f1f5f9", OVERDUE: "#fee2e2", CANCELLED: "#f1f5f9" }[s] || "#f1f5f9");

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Demands</h4>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>All milestone billing notices and payment demands</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="row g-3 mb-4">
          {[
            { label: "Total Demanded",  val: fmt(stats?._sum?.amount),          color: "#3b82f6", icon: "🧾" },
            { label: "Amount Paid",     val: fmt(stats?._sum?.paidAmount),       color: "#10b981", icon: "✅" },
            { label: "Outstanding",     val: fmt(stats?._sum?.outstandingAmount),color: "#ef4444", icon: "⚠️" },
            { label: "Total Demands",   val: stats?._count?.id || 0,            color: "#8b5cf6", icon: "📋" },
          ].map(c => (
            <div key={c.label} className="col-6 col-md-3">
              <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", borderLeft: `4px solid ${c.color}`, boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>{c.icon} {c.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["ALL", "DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all 0.15s", background: statusFilter === s ? "#1d4ed8" : "#fff", color: statusFilter === s ? "#fff" : "#64748b", boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {["Demand No","Customer","Project / Unit","Principal","GST","Total","Paid","Outstanding","Due Date","Status","Action"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}><div className="spinner-border spinner-border-sm text-primary me-2" />Loading demands…</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: "center", padding: "50px 20px" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
                    <div style={{ color: "#475569", fontWeight: 600 }}>No demands found</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Demands are created when a payment milestone is triggered</div>
                  </td></tr>
                ) : data.map(dem => {
                  const name = dem.booking?.customerName || (dem.booking?.lead ? `${dem.booking.lead.firstName || ""} ${dem.booking.lead.lastName || ""}`.trim() : "Customer");
                  const proj = dem.booking?.unit?.project?.name || "—";
                  const unit = dem.booking?.unit?.unitNo || dem.booking?.unit?.name || "—";
                  return (
                    <tr key={dem.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "11px 14px", fontWeight: 700, fontFamily: "monospace", color: "#1d4ed8" }}>{dem.demandNo}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>{name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>BKG-{dem.bookingId}</div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ color: "#475569" }}>{proj}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Unit {unit}</div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>{fmt(dem.principal)}</td>
                      <td style={{ padding: "11px 14px" }}>{fmt(dem.gst)}</td>
                      <td style={{ padding: "11px 14px", fontWeight: 700 }}>{fmt(dem.amount)}</td>
                      <td style={{ padding: "11px 14px", color: "#15803d" }}>{fmt(dem.paidAmount)}</td>
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: "#ef4444" }}>{fmt(dem.outstandingAmount)}</td>
                      <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 12 }}>{dem.dueDate ? new Date(dem.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: statusBg(dem.status), color: statusColor(dem.status) }}>{dem.status}</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <button onClick={() => navigate(`/post-sales/details/${dem.bookingId}?tab=demands`)}
                          style={{ padding: "5px 12px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export const PostSalesCollections = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [modeCounts, setModeCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState("ALL");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const q = modeFilter !== "ALL" ? `?mode=${modeFilter}` : "";
        const r = await fetch(`${API_URL}/post-sales/collections${q}`, { headers: authH() });
        if (!r.ok) throw new Error();
        const res = await r.json();
        setData(res.data || []);
        setStats(res.stats);
        setModeCounts(res.modeCounts || []);
      } catch { console.error("Failed to load collections"); }
      finally { setLoading(false); }
    })();
  }, [modeFilter]);

  const modes = ["ALL", ...new Set(data.map(r => r.mode).filter(Boolean))];

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Collections</h4>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>All payment receipts and collections recorded</p>
          </div>
        </div>

        <div className="row g-3 mb-4">
          {[
            { label: "Total Collected", val: fmt(stats?._sum?.amount), color: "#10b981", icon: "💰" },
            { label: "Total Receipts",  val: stats?._count?.id || 0,   color: "#3b82f6", icon: "🧾" },
            { label: "Payment Modes",   val: modeCounts.length || 0,    color: "#8b5cf6", icon: "💳" },
            { label: "This Month",      val: fmt(data.filter(r => { const d = new Date(r.receivedAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, r) => s + r.amount, 0)), color: "#f59e0b", icon: "📅" },
          ].map(c => (
            <div key={c.label} className="col-6 col-md-3">
              <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", borderLeft: `4px solid ${c.color}`, boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>{c.icon} {c.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Mode Chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {modes.map(m => (
            <button key={m} onClick={() => setModeFilter(m)}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: modeFilter === m ? "#10b981" : "#fff", color: modeFilter === m ? "#fff" : "#64748b", boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
              {m}
            </button>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f0fdf4", borderBottom: "2px solid #86efac" }}>
                  {["Receipt No","Customer","Project / Unit","Amount","Mode","Against Demand","Ref No","Date","Action"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", color: "#065f46", fontWeight: 700, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}><div className="spinner-border spinner-border-sm text-success me-2" />Loading collections…</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "50px 20px" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>💰</div>
                    <div style={{ color: "#475569", fontWeight: 600 }}>No collections recorded yet</div>
                  </td></tr>
                ) : data.map(rec => {
                  const name = rec.booking?.customerName || (rec.booking?.lead ? `${rec.booking.lead.firstName || ""} ${rec.booking.lead.lastName || ""}`.trim() : "Customer");
                  const proj = rec.booking?.unit?.project?.name || "—";
                  const unit = rec.booking?.unit?.unitNo || rec.booking?.unit?.name || "—";
                  return (
                    <tr key={rec.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "11px 14px", fontWeight: 700, fontFamily: "monospace", color: "#15803d" }}>{rec.receiptNo}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>{name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>BKG-{rec.bookingId}</div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ color: "#475569" }}>{proj}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Unit {unit}</div>
                      </td>
                      <td style={{ padding: "11px 14px", fontWeight: 800, color: "#15803d", fontSize: 14 }}>{fmt(rec.amount)}</td>
                      <td style={{ padding: "11px 14px" }}><span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: 999, fontWeight: 700, fontSize: 11 }}>{rec.mode}</span></td>
                      <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 12 }}>{rec.demand?.demandNo || "—"}</td>
                      <td style={{ padding: "11px 14px", color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>{rec.referenceNumber || "—"}</td>
                      <td style={{ padding: "11px 14px", color: "#64748b", fontSize: 12 }}>{rec.receivedAt ? new Date(rec.receivedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <button onClick={() => navigate(`/post-sales/details/${rec.bookingId}?tab=collections`)}
                          style={{ padding: "5px 12px", background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export const PostSalesLedger = () => {
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/post-sales/ledger`, { headers: authH() });
        if (!r.ok) throw new Error();
        const res = await r.json();
        setSummaryData(res.data || []);
      } catch { console.error("Failed to load ledger"); }
      finally { setLoading(false); }
    })();
  }, []);

  const loadLedger = async (bookingId) => {
    try {
      setLoadingLedger(true);
      const r = await fetch(`${API_URL}/post-sales/ledger?bookingId=${bookingId}`, { headers: authH() });
      if (!r.ok) throw new Error();
      const res = await r.json();
      setSelectedBooking(res.booking);
      setLedger(res.ledger || []);
    } catch { console.error("Failed to load ledger detail"); }
    finally { setLoadingLedger(false); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return summaryData.filter(b => !q || b.customerName.toLowerCase().includes(q) || b.projectName.toLowerCase().includes(q) || String(b.id).includes(q));
  }, [summaryData, search]);

  const fmt2 = (v) => { const n = Number(v || 0); return `₹${Math.abs(n).toLocaleString("en-IN")}`; };

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Customer Ledger</h4>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Statement of account — debit & credit per booking</p>
          </div>
        </div>

        <div className="row g-4">
          {/* Left: customer list */}
          <div className="col-12 col-lg-4">
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 14, color: "#1e293b" }}>📒 Select Customer</div>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
                <input type="text" placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
                {loading ? <div style={{ textAlign: "center", padding: 40 }}><div className="spinner-border spinner-border-sm text-primary" /></div>
                  : filtered.map(b => {
                    const isSelected = selectedBooking?.id === b.id;
                    const hasOutstanding = b.totalOutstanding > 0;
                    return (
                      <div key={b.id} onClick={() => loadLedger(b.id)}
                        style={{ padding: "12px 16px", borderBottom: "1px solid #f8fafc", cursor: "pointer", background: isSelected ? "#eff6ff" : "transparent", borderLeft: isSelected ? "3px solid #1d4ed8" : "3px solid transparent" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{b.customerName}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{b.projectName} · Unit {b.unitNo}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
                          <span style={{ color: "#15803d" }}>Collected: {fmt(b.totalCollected)}</span>
                          <span style={{ color: hasOutstanding ? "#ef4444" : "#15803d", fontWeight: 700 }}>
                            {hasOutstanding ? `Due: ${fmt(b.totalOutstanding)}` : "✓ Cleared"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Right: ledger detail */}
          <div className="col-12 col-lg-8">
            {!selectedBooking ? (
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", padding: "60px 40px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📒</div>
                <div style={{ fontWeight: 700, color: "#475569", fontSize: 16 }}>Select a Customer</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>Click any customer on the left to view their full statement of account</div>
              </div>
            ) : loadingLedger ? (
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", padding: "60px 40px", textAlign: "center" }}>
                <div className="spinner-border text-primary" />
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", overflow: "hidden" }}>
                {/* Customer header */}
                <div style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", padding: "16px 22px", color: "#fff" }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedBooking.customerName || "Customer"}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>
                    {selectedBooking.unit?.project?.name || "—"} · {selectedBooking.unit?.tower?.name || "—"} · Unit {selectedBooking.unit?.unitNo || selectedBooking.unit?.name || "—"} · BKG-{selectedBooking.id}
                  </div>
                  <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 12 }}>
                    <span>Agreement Value: <strong>{fmt(selectedBooking.basePrice)}</strong></span>
                    <span>Entries: <strong>{ledger.length}</strong></span>
                    <button onClick={() => navigate(`/post-sales/details/${selectedBooking.id}?tab=ledger`)}
                      style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, padding: "3px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      Full Profile →
                    </button>
                  </div>
                </div>

                {ledger.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📒</div>
                    No ledger entries yet. Generate a demand to create the first debit entry.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {["Date","Description","Type","Debit","Credit","Running Balance"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", color: "#64748b", fontWeight: 700, fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.map((entry, i) => (
                          <tr key={entry.id || i} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafbff" }}>
                            <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 12 }}>{entry.date ? new Date(entry.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                            <td style={{ padding: "10px 14px", color: "#1e293b" }}>{entry.description || "—"}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: entry.type === "CREDIT" ? "#d1fae5" : "#fee2e2", color: entry.type === "CREDIT" ? "#065f46" : "#b91c1c" }}>{entry.type}</span>
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#ef4444" }}>{entry.type === "DEBIT" ? fmt2(entry.amount) : "—"}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "#15803d" }}>{entry.type === "CREDIT" ? fmt2(entry.amount) : "—"}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 800, color: entry.runningBalance > 0 ? "#ef4444" : "#15803d" }}>{fmt2(entry.runningBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export const PostSalesReports = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/post-sales/reports`, { headers: authH() });
        if (!r.ok) throw new Error();
        setData(await r.json());
      } catch { console.error("Failed to load reports"); }
      finally { setLoading(false); }
    })();
  }, []);

  const statusColor = (s) => ({ PAID: "#065f46", ISSUED: "#1d4ed8", PARTIALLY_PAID: "#92400e", DRAFT: "#475569", OVERDUE: "#b91c1c" }[s] || "#475569");
  const statusBg   = (s) => ({ PAID: "#d1fae5", ISSUED: "#dbeafe", PARTIALLY_PAID: "#fef3c7", DRAFT: "#f1f5f9", OVERDUE: "#fee2e2" }[s] || "#f1f5f9");

  const aging = data?.agingBuckets || {};
  const agingTotal = Object.values(aging).reduce((s, v) => s + v, 0) || 1;

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Post-Sales Reports</h4>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Collections analytics, demand realisation &amp; aging buckets</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80 }}><div className="spinner-border text-primary" /></div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="row g-3 mb-4">
              {[
                { label: "Total Bookings",     val: data?.totalBookings || 0,              color: "#3b82f6",  icon: "🏠" },
                { label: "Total Demanded",     val: fmt(data?.totalDemanded),              color: "#ef4444",  icon: "🧾" },
                { label: "Total Collected",    val: fmt(data?.totalCollections),           color: "#10b981",  icon: "💰" },
                { label: "Outstanding",        val: fmt(data?.totalOutstanding),           color: "#f59e0b",  icon: "⚠️" },
                { label: "Total Demands",      val: data?.totalDemandsCount || 0,         color: "#8b5cf6",  icon: "📋" },
                { label: "Total Receipts",     val: data?.totalCollectionsCount || 0,     color: "#0ea5e9",  icon: "🧾" },
              ].map(c => (
                <div key={c.label} className="col-6 col-md-4 col-lg-2">
                  <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", borderLeft: `4px solid ${c.color}`, boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>{c.icon} {c.val}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="row g-4 mb-4">
              {/* Demand Realisation (by status) */}
              <div className="col-12 col-md-6">
                <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", padding: "20px 22px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 16 }}>📊 Demand Realisation by Status</div>
                  {data?.demandsByStatus?.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#94a3b8", padding: "30px 0" }}>No demand data yet</div>
                  ) : (data?.demandsByStatus || []).map(s => {
                    const pct = data?.totalDemanded ? Math.round((s._sum.amount / data.totalDemanded) * 100) : 0;
                    return (
                      <div key={s.status} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: statusBg(s.status), color: statusColor(s.status) }}>{s.status}</span>
                          <span style={{ fontSize: 12, color: "#64748b" }}>{s._count.id} demands · {fmt(s._sum.amount)}</span>
                        </div>
                        <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999 }}>
                          <div style={{ height: 8, width: `${pct}%`, background: statusColor(s.status), borderRadius: 999, transition: "width 0.5s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Aging Buckets */}
              <div className="col-12 col-md-6">
                <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", padding: "20px 22px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 16 }}>⏱️ Aging Buckets (Overdue Demands)</div>
                  {[
                    { label: "0 – 30 Days",  key: "0-30",  color: "#10b981" },
                    { label: "31 – 60 Days", key: "31-60", color: "#f59e0b" },
                    { label: "61 – 90 Days", key: "61-90", color: "#ef4444" },
                    { label: "90+ Days",     key: "90+",   color: "#b91c1c" },
                  ].map(b => {
                    const count = aging[b.key] || 0;
                    const pct = Math.round((count / agingTotal) * 100);
                    return (
                      <div key={b.key} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: "#1e293b" }}>{b.label}</span>
                          <span style={{ color: b.color, fontWeight: 700 }}>{count} demands</span>
                        </div>
                        <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999 }}>
                          <div style={{ height: 8, width: `${pct}%`, background: b.color, borderRadius: 999, transition: "width 0.5s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Payment Mode Breakdown */}
            <div className="row g-4">
              <div className="col-12 col-md-6">
                <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", padding: "20px 22px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 16 }}>💳 Payment Mode Breakdown</div>
                  {data?.paymentModeBreakdown?.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#94a3b8", padding: "30px 0" }}>No receipts recorded yet</div>
                  ) : (data?.paymentModeBreakdown || []).map(m => (
                    <div key={m.mode} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f8fafc" }}>
                      <div>
                        <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{m.mode || "Unknown"}</span>
                        <span style={{ marginLeft: 10, fontSize: 12, color: "#64748b" }}>{m._count.id} transactions</span>
                      </div>
                      <span style={{ fontWeight: 800, color: "#15803d", fontSize: 14 }}>{fmt(m._sum.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div className="col-12 col-md-6">
                <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", padding: "20px 22px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 16 }}>🔗 Quick Navigation</div>
                  {[
                    { to: "/post-sales/booking-list", icon: "📋", label: "Booking List",     sub: `${data?.totalBookings || 0} bookings in post-sales` },
                    { to: "/post-sales/demands",      icon: "🧾", label: "All Demands",      sub: `${data?.totalDemandsCount || 0} total demand records` },
                    { to: "/post-sales/collections",  icon: "💰", label: "All Collections",  sub: `${data?.totalCollectionsCount || 0} receipt entries` },
                    { to: "/post-sales/customer-ledger", icon: "📒", label: "Customer Ledger", sub: "View statement of account" },
                  ].map(item => (
                    <div key={item.to} onClick={() => navigate(item.to)}
                      style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f8fafc", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ fontSize: 22 }}>{item.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 13 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.sub}</div>
                      </div>
                      <div style={{ marginLeft: "auto", color: "#3b82f6", fontSize: 14 }}>→</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MasterLayout>
  );
};
