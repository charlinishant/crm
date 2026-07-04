import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MasterLayout from '../../masterLayout/MasterLayout';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const authHeaders = () => ({
  "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
  "Content-Type": "application/json"
});

const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const fmtDate = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const StatCard = ({ label, value, sub, accent, icon }) => (
  <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: "20px 18px",
      borderLeft: `4px solid ${accent}`,
      boxShadow: "0 1px 6px rgba(0,0,0,.07)",
      height: "100%"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 11, color: accent, marginTop: 6, fontWeight: 500 }}>{sub}</div>
        </div>
        <div style={{ background: `${accent}18`, borderRadius: 10, padding: "10px", fontSize: 20, color: accent }}>
          {icon}
        </div>
      </div>
    </div>
  </div>
);

const actionIconMap = {
  GENERATE: { icon: "📄", color: "#3b82f6" },
  PREVIEW:  { icon: "👁️", color: "#8b5cf6" },
  DOWNLOAD: { icon: "⬇️", color: "#10b981" },
  PRINT:    { icon: "🖨️", color: "#f59e0b" },
};

const PostSalesDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_URL}/post-sales/dashboard-stats`, { headers: authHeaders() });
        if (!r.ok) throw new Error("API error");
        setStats(await r.json());
      } catch {
        setError("Could not load dashboard. Please refresh or check the server.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <MasterLayout>
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner-border text-primary mb-3" />
          <div style={{ color: "#64748b", fontSize: 13 }}>Loading Post-Sales Dashboard…</div>
        </div>
      </div>
    </MasterLayout>
  );

  if (error) return (
    <MasterLayout>
      <div className="p-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    </MasterLayout>
  );

  return (
    <MasterLayout>
      <div className="floor-dashboard p-4">

        {/* ── Page Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
              Post-Sales Dashboard
            </h4>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
              Overview of confirmed bookings, document generation, demands &amp; collections
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/post-sales/booking-list" className="btn btn-primary btn-sm" style={{ borderRadius: 8, fontWeight: 600 }}>
              📋 Booking List
            </Link>
            <Link to="/post-sales/documents" className="btn btn-outline-primary btn-sm" style={{ borderRadius: 8, fontWeight: 600 }}>
              📄 Documents
            </Link>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="row g-3 mb-4">
          <StatCard label="Confirmed Bookings"  value={stats?.totalBookings || 0}          sub="In post-sales"    accent="#3b82f6" icon="🏠" />
          <StatCard label="Docs Generated"      value={stats?.documentsGenerated || 0}     sub="All time"         accent="#10b981" icon="📄" />
          <StatCard label="Pending Docs"        value={stats?.pendingDocuments || 0}       sub="Not yet issued"   accent="#f59e0b" icon="⏳" />
          <StatCard label="Total Demands"       value={stats?.totalDemands || 0}           sub="Milestones billed" accent="#ec4899" icon="🧾" />
          <StatCard label="Outstanding"         value={fmt(stats?.outstandingAmount)}      sub="Overdue amount"   accent="#ef4444" icon="⚠️" />
          <StatCard label="Collections"         value={fmt(stats?.collectionsReceived)}    sub="Receipts posted"  accent="#8b5cf6" icon="💰" />
        </div>

        {/* ── Panels Row ── */}
        <div className="row g-4">

          {/* Recent Activities */}
          <div className="col-12 col-lg-5">
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)", height: "100%" }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>🕐 Recent Activities</span>
                <Link to="/post-sales/booking-list" style={{ fontSize: 12, color: "#3b82f6" }}>View all →</Link>
              </div>
              <div style={{ padding: "8px 4px" }}>
                {stats?.recentActivities?.length > 0 ? stats.recentActivities.map((act) => {
                  const meta = actionIconMap[act.action] || { icon: "📌", color: "#64748b" };
                  return (
                    <div key={act.id} style={{ display: "flex", gap: 12, padding: "10px 16px", borderBottom: "1px solid #f8fafc" }}>
                      <div style={{ fontSize: 20, minWidth: 32, textAlign: "center" }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#1e293b" }}>
                          {act.action} — {String(act.type).replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                          {act.booking?.customerName || "Customer"} · {act.performedBy || "Admin"} · {fmtDate(act.createdAt)}
                        </div>
                      </div>
                      <Link to={`/post-sales/details/${act.bookingId}`} style={{ fontSize: 11, color: "#3b82f6", whiteSpace: "nowrap", alignSelf: "center" }}>
                        View →
                      </Link>
                    </div>
                  );
                }) : (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                    No recent activities yet. Generate a document to see activity here.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Upcoming Demands + Latest Documents */}
          <div className="col-12 col-lg-7 d-flex flex-column gap-4">

            {/* Upcoming Demands */}
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>🧾 Upcoming Demands</span>
                <Link to="/post-sales/demands" style={{ fontSize: 12, color: "#3b82f6" }}>Manage →</Link>
              </div>
              {stats?.upcomingDemands?.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ padding: "10px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Customer</th>
                        <th style={{ padding: "10px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Amount</th>
                        <th style={{ padding: "10px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Due Date</th>
                        <th style={{ padding: "10px 16px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Status</th>
                        <th style={{ padding: "10px 16px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.upcomingDemands.map((dem) => (
                        <tr key={dem.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ fontWeight: 600, color: "#1e293b" }}>{dem.booking?.customerName || "—"}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>#{dem.demandNo}</div>
                          </td>
                          <td style={{ padding: "10px 16px", fontWeight: 700, color: "#ef4444" }}>{fmt(dem.outstandingAmount)}</td>
                          <td style={{ padding: "10px 16px", color: "#64748b" }}>{fmtDate(dem.dueDate)}</td>
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{
                              padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                              background: dem.status === "PAID" ? "#d1fae5" : dem.status === "ISSUED" ? "#dbeafe" : "#fef3c7",
                              color: dem.status === "PAID" ? "#065f46" : dem.status === "ISSUED" ? "#1d4ed8" : "#92400e"
                            }}>{dem.status}</span>
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "center" }}>
                            <Link to={`/post-sales/details/${dem.bookingId}?tab=demands`} style={{ fontSize: 11, color: "#3b82f6" }}>View</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "30px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                  No pending demands. All milestones are on track!
                </div>
              )}
            </div>

            {/* Latest Generated Documents */}
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,.07)" }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>📂 Latest Generated Documents</span>
                <Link to="/post-sales/documents" style={{ fontSize: 12, color: "#3b82f6" }}>All docs →</Link>
              </div>
              {stats?.latestDocuments?.length > 0 ? (
                <div>
                  {stats.latestDocuments.map((doc) => (
                    <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #f8fafc" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                          {doc.booking?.customerName || "—"} · {fmtDate(doc.createdAt)}
                        </div>
                      </div>
                      <Link to={`/post-sales/details/${doc.bookingId}?tab=documents`}
                        style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", marginLeft: 12, whiteSpace: "nowrap" }}>
                        Preview →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "30px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                  No documents generated yet. Go to Booking List to generate your first document.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Quick Nav Cards ── */}
        <div className="row g-3 mt-2">
          {[
            { to: "/post-sales/booking-list", icon: "📋", label: "Booking List", sub: "View all confirmed bookings", color: "#3b82f6" },
            { to: "/post-sales/documents", icon: "📄", label: "Documents", sub: "Generate & manage letters", color: "#10b981" },
            { to: "/post-sales/demands", icon: "🧾", label: "Demands", sub: "Milestone billing notices", color: "#ef4444" },
            { to: "/post-sales/collections", icon: "💰", label: "Collections", sub: "Payment receipts", color: "#8b5cf6" },
            { to: "/post-sales/customer-ledger", icon: "📒", label: "Customer Ledger", sub: "Account statements", color: "#f59e0b" },
            { to: "/post-sales/reports", icon: "📊", label: "Reports", sub: "Ageing & analytics", color: "#0ea5e9" },
          ].map(card => (
            <div key={card.to} className="col-6 col-md-4 col-lg-2">
              <Link to={card.to} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "#fff", borderRadius: 12, padding: "18px 16px", textAlign: "center",
                  boxShadow: "0 1px 6px rgba(0,0,0,.07)", transition: "transform 0.15s, box-shadow 0.15s",
                  cursor: "pointer"
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,.07)"; }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{card.label}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{card.sub}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>

      </div>
    </MasterLayout>
  );
};

export default PostSalesDashboard;
