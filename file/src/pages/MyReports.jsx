import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReportFilters from "../components/reports/ReportFilters";
import ReportSummaryCards from "../components/reports/ReportSummaryCards";
import LeadStatusChart from "../components/reports/LeadStatusChart";
import MonthlyLeadsChart from "../components/reports/MonthlyLeadsChart";
import SalesPerformanceChart from "../components/reports/SalesPerformanceChart";
import FollowupStatusChart from "../components/reports/FollowupStatusChart";
import LeadSourceChart from "../components/reports/LeadSourceChart";
import SiteVisitChart from "../components/reports/SiteVisitChart";
import BookingReportChart from "../components/reports/BookingReportChart";
import SalesPerformanceTable from "../components/reports/SalesPerformanceTable";
import { fetchAllReports, reportApi } from "../services/reportApi";
import { getReportsSocket } from "../services/socketClient";

const initialFilters = {
  fromDate: "",
  toDate: "",
  projectId: "",
  salesUserId: "",
  leadSource: "",
  leadStatus: "",
};

const emptyReports = {
  summary: {},
  leadStatus: [],
  monthlyLeads: [],
  salesPerformance: [],
  followups: [],
  leadSources: [],
  siteVisits: [],
  bookings: [],
  recentActivities: [],
};

const MyReports = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [reports, setReports] = useState(emptyReports);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  const salesUsers = useMemo(
    () =>
      users.filter((user) => {
        const role = String(user.role || "").toUpperCase();
        const department = String(user.department || "").toUpperCase();
        return role === "SALES" || department === "SALES";
      }),
    [users]
  );

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAllReports(filters);
      setReports(data);
      setLastUpdatedAt(
        new Date().toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
        })
      );
    } catch (err) {
      setError(err.message || "Unable to load reports");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [projectOptions, userOptions] = await Promise.all([
          reportApi.getProjects(),
          reportApi.getUsers(),
        ]);
        setProjects(Array.isArray(projectOptions) ? projectOptions : []);
        setUsers(Array.isArray(userOptions) ? userOptions : []);
      } catch (err) {
        setError(err.message || "Unable to load report filters");
      }
    };

    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    let socket;
    let isMounted = true;

    getReportsSocket()
      .then((nextSocket) => {
        if (!isMounted) return;
        socket = nextSocket;
        socket.on("reports:update", loadReports);
      })
      .catch((err) => {
        console.error("Unable to connect reports socket:", err);
      });

    return () => {
      isMounted = false;
      if (socket) socket.off("reports:update", loadReports);
    };
  }, [loadReports]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className="admin-report-page">
      <div className="admin-report-header">
        <div>
          <h4>Reports</h4>
          <p>{lastUpdatedAt ? `Last updated ${lastUpdatedAt}` : "Live admin reporting"}</p>
        </div>
      </div>

      <ReportFilters
        filters={filters}
        projects={projects}
        users={salesUsers}
        leadSources={reports.leadSources}
        loading={loading}
        onChange={handleFilterChange}
        onRefresh={loadReports}
      />

      {error && <div className="admin-report-alert">{error}</div>}
      {loading && <div className="admin-report-loading">Loading reports...</div>}

      <ReportSummaryCards summary={reports.summary} />

      <div className="admin-report-chart-grid">
        <LeadStatusChart data={reports.leadStatus} />
        <MonthlyLeadsChart data={reports.monthlyLeads} />
        <SalesPerformanceChart data={reports.salesPerformance} />
        <FollowupStatusChart data={reports.followups} />
        <LeadSourceChart data={reports.leadSources} />
        <SiteVisitChart data={reports.siteVisits} />
        <BookingReportChart data={reports.bookings} />
      </div>

      <div className="admin-report-tables">
        <SalesPerformanceTable data={reports.salesPerformance} />
      </div>
    </div>
  );
};

export default MyReports;
