import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MasterLayout from '../../masterLayout/MasterLayout';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const theme = {
  brand: "#487fff",
  brandDark: "#2563eb",
  brandSoft: "#eef4ff",
  text: "#0f172a",
  muted: "#64748b",
  subtle: "#94a3b8",
  line: "#e2e8f0",
  panelShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

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
      border: `1px solid ${theme.line}`,
      borderLeft: `4px solid ${theme.brand}`,
      boxShadow: theme.panelShadow,
      height: "100%"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.subtle, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: theme.text, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 11, color: theme.brandDark, marginTop: 6, fontWeight: 600 }}>{sub}</div>
        </div>
        <div style={{ background: theme.brandSoft, borderRadius: 10, padding: "10px", fontSize: 20, color: theme.brand }}>
          {icon}
        </div>
      </div>
    </div>
  </div>
);

const actionIconMap = {
  GENERATE: { icon: "📄", color: theme.brand },
  PREVIEW:  { icon: "👁️", color: theme.brand },
  DOWNLOAD: { icon: "⬇️", color: theme.brand },
  PRINT:    { icon: "🖨️", color: theme.brand },
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
          <div style={{ color: theme.muted, fontSize: 13 }}>Loading Booking Details…</div>
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
      <div className="floor-dashboard p-4" style={{ background: "#f8fbff", minHeight: "calc(100vh - 72px)" }}>

        {/* ── Page Header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 style={{ fontWeight: 800, color: theme.text, marginBottom: 4 }}>
              Booking Details
            </h4>
            <p style={{ color: theme.muted, fontSize: 13, margin: 0 }}>
              Overview of confirmed bookings, document generation, demands &amp; collections
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/post-sales/booking-list" className="btn btn-primary btn-sm" style={{ background: theme.brand, borderColor: theme.brand, borderRadius: 8, fontWeight: 700 }}>
              📋 Booking List
            </Link>
            <Link to="/post-sales/documents" className="btn btn-outline-primary btn-sm" style={{ borderColor: theme.brand, color: theme.brandDark, borderRadius: 8, fontWeight: 700 }}>
              📄 Documents
            </Link>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="row g-3 mb-4">
          <StatCard label="Confirmed Bookings"  value={stats?.totalBookings || 0}          sub="In post-sales"    accent={theme.brand} icon="🏠" />
          <StatCard label="Docs Generated"      value={stats?.documentsGenerated || 0}     sub="All time"         accent={theme.brand} icon="📄" />
          <StatCard label="Pending Docs"        value={stats?.pendingDocuments || 0}       sub="Not yet issued"   accent={theme.brand} icon="⏳" />
          <StatCard label="Total Demands"       value={stats?.totalDemands || 0}           sub="Milestones billed" accent={theme.brand} icon="🧾" />
          <StatCard label="Outstanding"         value={fmt(stats?.outstandingAmount)}      sub="Overdue amount"   accent={theme.brand} icon="⚠️" />
          <StatCard label="Collections"         value={fmt(stats?.collectionsReceived)}    sub="Receipts posted"  accent={theme.brand} icon="💰" />
        </div>

        {/* ── Panels Row ── */}
        <div className="row g-4">

          {/* Recent Activities */}
          <div className="col-12 col-lg-5">
            <div style={{ background: "#fff", border: `1px solid ${theme.line}`, borderRadius: 12, boxShadow: theme.panelShadow, height: "100%" }}>
              <div style={{ padding: "18px 20px", borderBottom: `1px solid ${theme.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: theme.text, fontSize: 14 }}>🕐 Recent Activities</span>
                <Link to="/post-sales/booking-list" style={{ fontSize: 12, color: theme.brandDark, fontWeight: 600 }}>View all →</Link>
              </div>
              <div style={{ padding: "8px 4px" }}>
                {stats?.recentActivities?.length > 0 ? stats.recentActivities.map((act) => {
                  const meta = actionIconMap[act.action] || { icon: "📌", color: theme.muted };
                  return (
                    <div key={act.id} style={{ display: "flex", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${theme.line}` }}>
                      <div style={{ fontSize: 20, minWidth: 32, textAlign: "center" }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: theme.text }}>
                          {act.action} — {String(act.type).replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 11, color: theme.subtle, marginTop: 2 }}>
                          {act.booking?.customerName || "Customer"} · {act.performedBy || "Admin"} · {fmtDate(act.createdAt)}
                        </div>
                      </div>
                      <Link to={`/post-sales/details/${act.bookingId}`} style={{ fontSize: 11, color: theme.brandDark, fontWeight: 600, whiteSpace: "nowrap", alignSelf: "center" }}>
                        View →
                      </Link>
                    </div>
                  );
                }) : (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: theme.subtle, fontSize: 13 }}>
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
            <div style={{ background: "#fff", border: `1px solid ${theme.line}`, borderRadius: 12, boxShadow: theme.panelShadow }}>
              <div style={{ padding: "18px 20px", borderBottom: `1px solid ${theme.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: theme.text, fontSize: 14 }}>🧾 Upcoming Demands</span>
                <Link to="/post-sales/demands" style={{ fontSize: 12, color: theme.brandDark, fontWeight: 600 }}>Manage →</Link>
              </div>
              {stats?.upcomingDemands?.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: theme.brandSoft }}>
                        <th style={{ padding: "10px 16px", textAlign: "left", color: theme.brandDark, fontWeight: 700 }}>Customer</th>
                        <th style={{ padding: "10px 16px", textAlign: "left", color: theme.brandDark, fontWeight: 700 }}>Amount</th>
                        <th style={{ padding: "10px 16px", textAlign: "left", color: theme.brandDark, fontWeight: 700 }}>Due Date</th>
                        <th style={{ padding: "10px 16px", textAlign: "left", color: theme.brandDark, fontWeight: 700 }}>Status</th>
                        <th style={{ padding: "10px 16px", textAlign: "center", color: theme.brandDark, fontWeight: 700 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.upcomingDemands.map((dem) => (
                        <tr key={dem.id} style={{ borderBottom: `1px solid ${theme.line}` }}>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ fontWeight: 700, color: theme.text }}>{dem.booking?.customerName || "—"}</div>
                            <div style={{ fontSize: 11, color: theme.subtle }}>#{dem.demandNo}</div>
                          </td>
                          <td style={{ padding: "10px 16px", fontWeight: 800, color: theme.text }}>{fmt(dem.outstandingAmount)}</td>
                          <td style={{ padding: "10px 16px", color: theme.muted }}>{fmtDate(dem.dueDate)}</td>
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{
                              padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                              background: theme.brandSoft,
                              color: theme.brandDark
                            }}>{dem.status}</span>
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "center" }}>
                            <Link to={`/post-sales/details/${dem.bookingId}?tab=demands`} style={{ fontSize: 11, color: theme.brandDark, fontWeight: 600 }}>View</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "30px 20px", textAlign: "center", color: theme.subtle, fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
                  No pending demands. All milestones are on track!
                </div>
              )}
            </div>

            {/* Latest Generated Documents */}
            <div style={{ background: "#fff", border: `1px solid ${theme.line}`, borderRadius: 12, boxShadow: theme.panelShadow }}>
              <div style={{ padding: "18px 20px", borderBottom: `1px solid ${theme.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: theme.text, fontSize: 14 }}>📂 Latest Generated Documents</span>
                <Link to="/post-sales/documents" style={{ fontSize: 12, color: theme.brandDark, fontWeight: 600 }}>All docs →</Link>
              </div>
              {stats?.latestDocuments?.length > 0 ? (
                <div>
                  {stats.latestDocuments.map((doc) => (
                    <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${theme.line}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: 11, color: theme.subtle, marginTop: 2 }}>
                          {doc.booking?.customerName || "—"} · {fmtDate(doc.createdAt)}
                        </div>
                      </div>
                      <Link to={`/post-sales/details/${doc.bookingId}?tab=documents`}
                        style={{ fontSize: 11, fontWeight: 700, color: theme.brandDark, marginLeft: 12, whiteSpace: "nowrap" }}>
                        Preview →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "30px 20px", textAlign: "center", color: theme.subtle, fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                  No documents generated yet. Go to Booking List to generate your first document.
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </MasterLayout>
  );
};

export default PostSalesDashboard;
