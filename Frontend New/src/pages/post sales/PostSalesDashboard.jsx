import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MasterLayout from "../../masterLayout/MasterLayout";

const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? window.location.origin
    : "http://localhost:5000");

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  "Content-Type": "application/json",
});

const emptyStats = {
  totalBookings: 0,
  documentsGenerated: 0,
  pendingDocuments: 0,
  totalDemands: 0,
  outstandingAmount: 0,
  collectionsReceived: 0,
  recentActivities: [],
  upcomingDemands: [],
  latestDocuments: [],
};

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const StatCard = ({ label, value, sub }) => (
  <div className="post-sales-dashboard-stat">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{sub}</small>
  </div>
);

const quickLinks = [
  { to: "/post-sales/booking-list", label: "Booking List", sub: "Confirmed and booked customers" },
  { to: "/post-sales/documents", label: "Documents", sub: "Generate and preview documents" },
  { to: "/post-sales/payment-plans", label: "Payment Plans", sub: "Milestones and schedules" },
  { to: "/post-sales/demands", label: "Demands", sub: "Issued and pending demands" },
  { to: "/post-sales/collections", label: "Collections", sub: "Receipts and payment modes" },
  { to: "/post-sales/customer-ledger", label: "Customer Ledger", sub: "Statement of account" },
  { to: "/post-sales/reports", label: "Reports", sub: "Collections and aging analytics" },
];

const PostSalesDashboard = () => {
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/post-sales/dashboard-stats`, {
          headers: authHeaders(),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result?.message || "Unable to load post sales dashboard");
        }

        if (isMounted) {
          setStats({ ...emptyStats, ...result });
        }
      } catch (loadError) {
        if (isMounted) {
          setStats(emptyStats);
          setError(loadError.message || "Unable to load post sales dashboard");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = useMemo(
    () => [
      { label: "Bookings", value: stats.totalBookings || 0, sub: "In post sales" },
      { label: "Documents", value: stats.documentsGenerated || 0, sub: "Generated" },
      { label: "Pending Docs", value: stats.pendingDocuments || 0, sub: "Not issued" },
      { label: "Demands", value: stats.totalDemands || 0, sub: "Milestones billed" },
      { label: "Outstanding", value: formatMoney(stats.outstandingAmount), sub: "Open amount" },
      { label: "Collections", value: formatMoney(stats.collectionsReceived), sub: "Receipts posted" },
    ],
    [stats]
  );

  return (
    <MasterLayout>
      <style>{`
        .post-sales-dashboard {
          background: #f5f7fb;
          min-height: calc(100vh - 72px);
          padding: 32px;
        }

        .post-sales-dashboard-head {
          align-items: center;
          display: flex;
          gap: 16px;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .post-sales-dashboard-head h1 {
          color: #0f172a;
          font-size: 34px;
          font-weight: 800;
          line-height: 1.15;
          margin: 0;
        }

        .post-sales-dashboard-head p {
          color: #64748b;
          font-size: 15px;
          margin: 8px 0 0;
        }

        .post-sales-dashboard-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .post-sales-dashboard-btn {
          align-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #2563eb;
          display: inline-flex;
          font-size: 14px;
          font-weight: 700;
          height: 42px;
          justify-content: center;
          padding: 0 16px;
        }

        .post-sales-dashboard-btn.primary {
          background: #487fff;
          border-color: #487fff;
          color: #ffffff;
        }

        .post-sales-dashboard-alert {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 8px;
          color: #9a3412;
          margin-bottom: 18px;
          padding: 12px 14px;
        }

        .post-sales-dashboard-loading {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #64748b;
          padding: 32px;
          text-align: center;
        }

        .post-sales-dashboard-stats {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          margin-bottom: 22px;
        }

        .post-sales-dashboard-stat,
        .post-sales-dashboard-panel,
        .post-sales-dashboard-link {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }

        .post-sales-dashboard-stat {
          border-left: 4px solid #487fff;
          padding: 18px;
        }

        .post-sales-dashboard-stat span {
          color: #64748b;
          display: block;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .post-sales-dashboard-stat strong {
          color: #0f172a;
          display: block;
          font-size: 24px;
          font-weight: 800;
          line-height: 1.15;
          margin-top: 10px;
          overflow-wrap: anywhere;
        }

        .post-sales-dashboard-stat small {
          color: #2563eb;
          display: block;
          font-size: 12px;
          font-weight: 700;
          margin-top: 8px;
        }

        .post-sales-dashboard-grid {
          display: grid;
          gap: 18px;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
        }

        .post-sales-dashboard-panel {
          overflow: hidden;
        }

        .post-sales-dashboard-panel-head {
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          padding: 18px 20px;
        }

        .post-sales-dashboard-panel-head h2 {
          color: #0f172a;
          font-size: 17px;
          font-weight: 800;
          margin: 0;
        }

        .post-sales-dashboard-panel-head a {
          color: #2563eb;
          font-size: 13px;
          font-weight: 700;
        }

        .post-sales-dashboard-links {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          padding: 18px;
        }

        .post-sales-dashboard-link {
          color: inherit;
          display: block;
          padding: 16px;
          transition: background 0.2s, border-color 0.2s;
        }

        .post-sales-dashboard-link:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .post-sales-dashboard-link strong {
          color: #0f172a;
          display: block;
          font-size: 15px;
          margin-bottom: 6px;
        }

        .post-sales-dashboard-link span {
          color: #64748b;
          display: block;
          font-size: 13px;
        }

        .post-sales-dashboard-list {
          display: grid;
        }

        .post-sales-dashboard-row {
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          display: grid;
          gap: 12px;
          grid-template-columns: minmax(0, 1fr) auto;
          padding: 14px 20px;
        }

        .post-sales-dashboard-row:last-child {
          border-bottom: 0;
        }

        .post-sales-dashboard-row strong {
          color: #0f172a;
          display: block;
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .post-sales-dashboard-row span {
          color: #64748b;
          display: block;
          font-size: 12px;
          margin-top: 4px;
        }

        .post-sales-dashboard-row a {
          color: #2563eb;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        }

        .post-sales-dashboard-empty {
          color: #94a3b8;
          padding: 34px 20px;
          text-align: center;
        }

        .post-sales-dashboard-stack {
          display: grid;
          gap: 18px;
        }

        @media (max-width: 1200px) {
          .post-sales-dashboard-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .post-sales-dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .post-sales-dashboard {
            padding: 18px;
          }

          .post-sales-dashboard-head {
            align-items: stretch;
            flex-direction: column;
          }

          .post-sales-dashboard-stats,
          .post-sales-dashboard-links {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="post-sales-dashboard">
        <div className="post-sales-dashboard-head">
          <div>
            <h1>Post Sales Dashboard</h1>
            <p>Integrated view for bookings, documents, payment plans, demands, collections, ledger and reports.</p>
          </div>
          <div className="post-sales-dashboard-actions">
            <Link to="/post-sales/booking-list" className="post-sales-dashboard-btn primary">
              Booking List
            </Link>
            <Link to="/post-sales/reports" className="post-sales-dashboard-btn">
              Reports
            </Link>
          </div>
        </div>

        {error && <div className="post-sales-dashboard-alert">{error}</div>}

        {loading ? (
          <div className="post-sales-dashboard-loading">Loading post sales dashboard...</div>
        ) : (
          <>
            <div className="post-sales-dashboard-stats">
              {statCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </div>

            <div className="post-sales-dashboard-grid">
              <section className="post-sales-dashboard-panel">
                <div className="post-sales-dashboard-panel-head">
                  <h2>Post Sales Modules</h2>
                </div>
                <div className="post-sales-dashboard-links">
                  {quickLinks.map((link) => (
                    <Link className="post-sales-dashboard-link" to={link.to} key={link.to}>
                      <strong>{link.label}</strong>
                      <span>{link.sub}</span>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="post-sales-dashboard-panel">
                <div className="post-sales-dashboard-panel-head">
                  <h2>Recent Activities</h2>
                  <Link to="/post-sales/booking-list">View all</Link>
                </div>
                <div className="post-sales-dashboard-list">
                  {stats.recentActivities?.length ? (
                    stats.recentActivities.map((activity) => (
                      <div className="post-sales-dashboard-row" key={activity.id}>
                        <div>
                          <strong>{String(activity.action || "Activity").replace(/_/g, " ")}</strong>
                          <span>
                            {activity.booking?.customerName || "Customer"} | {activity.performedBy || "Admin"} | {formatDate(activity.createdAt)}
                          </span>
                        </div>
                        <Link to={`/post-sales/details/${activity.bookingId}`}>View</Link>
                      </div>
                    ))
                  ) : (
                    <div className="post-sales-dashboard-empty">No recent activity yet.</div>
                  )}
                </div>
              </section>
            </div>

            <div className="post-sales-dashboard-grid" style={{ marginTop: 18 }}>
              <section className="post-sales-dashboard-panel">
                <div className="post-sales-dashboard-panel-head">
                  <h2>Upcoming Demands</h2>
                  <Link to="/post-sales/demands">Manage</Link>
                </div>
                <div className="post-sales-dashboard-list">
                  {stats.upcomingDemands?.length ? (
                    stats.upcomingDemands.map((demand) => (
                      <div className="post-sales-dashboard-row" key={demand.id}>
                        <div>
                          <strong>{demand.booking?.customerName || "Customer"} - {formatMoney(demand.outstandingAmount)}</strong>
                          <span>{demand.demandNo || `Demand #${demand.id}`} | Due {formatDate(demand.dueDate)} | {demand.status}</span>
                        </div>
                        <Link to={`/post-sales/details/${demand.bookingId}?tab=demands`}>View</Link>
                      </div>
                    ))
                  ) : (
                    <div className="post-sales-dashboard-empty">No upcoming demands.</div>
                  )}
                </div>
              </section>

              <section className="post-sales-dashboard-panel">
                <div className="post-sales-dashboard-panel-head">
                  <h2>Latest Documents</h2>
                  <Link to="/post-sales/documents">All docs</Link>
                </div>
                <div className="post-sales-dashboard-list">
                  {stats.latestDocuments?.length ? (
                    stats.latestDocuments.map((document) => (
                      <div className="post-sales-dashboard-row" key={document.id}>
                        <div>
                          <strong>{document.title || String(document.type || "Document").replace(/_/g, " ")}</strong>
                          <span>{document.booking?.customerName || "Customer"} | {formatDate(document.createdAt)}</span>
                        </div>
                        <Link to={`/post-sales/details/${document.bookingId}?tab=documents`}>Preview</Link>
                      </div>
                    ))
                  ) : (
                    <div className="post-sales-dashboard-empty">No documents generated yet.</div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </MasterLayout>
  );
};

export default PostSalesDashboard;
