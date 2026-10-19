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
import ReportDrilldownModal from "../components/reports/ReportDrilldownModal";

// Mcube IVR & Telephony Reports
import CallSummaryCards from "../components/reports/CallSummaryCards";
import CallStatusChart from "../components/reports/CallStatusChart";
import CallHourlyChart from "../components/reports/CallHourlyChart";
import DidBreakupChart from "../components/reports/DidBreakupChart";

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
  telephonySummary: {},
  callStatus: [],
  callHourly: [],
  callDaily: [],
  didBreakup: [],
  agentCallPerformance: [],
  callLogs: [],
};

const MyReports = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [reports, setReports] = useState(emptyReports);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "telephony" | "funnel"

  // Drilldown modal state
  const [drilldown, setDrilldown] = useState({
    isOpen: false,
    loading: false,
    title: "",
    leads: [],
    calls: [],
    mode: "leads",
    filters: {},
    error: "",
  });

  const salesUsers = useMemo(
    () =>
      users.filter((user) => {
        const role = String(user.role || "").toUpperCase();
        const department = String(user.department || "").toUpperCase();
        return role === "SALES" || department === "SALES" || role === "PRE_SALES" || department === "PRE_SALES";
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
      if (socket) {
        socket.off("reports:update", loadReports);
      }
    };
  }, [loadReports]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleSegmentClick = async (segment) => {
    if (!segment) return;
    const initialTitle = segment.title || "Leads Drilldown";
    setDrilldown({
      isOpen: true,
      loading: true,
      title: initialTitle,
      leads: [],
      calls: [],
      mode: "leads",
      filters: segment,
      error: "",
    });

    try {
      const queryParams = {
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        projectId: filters.projectId || undefined,
        salesUserId: filters.salesUserId || undefined,
        ...segment,
      };

      const result = await reportApi.getDrilldownLeads(queryParams);
      setDrilldown({
        isOpen: true,
        loading: false,
        title: result?.title || initialTitle,
        leads: result?.leads || [],
        calls: [],
        mode: "leads",
        filters: result?.filters || queryParams,
        error: "",
      });
    } catch (err) {
      console.error("Error fetching drilldown leads:", err);
      setDrilldown((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load drilldown records",
      }));
    }
  };

  const handleCallDrilldown = async (segment) => {
    if (!segment) return;
    const initialTitle = segment.title || "Call Records Drilldown";
    setDrilldown({
      isOpen: true,
      loading: true,
      title: initialTitle,
      leads: [],
      calls: [],
      mode: "calls",
      filters: segment,
      error: "",
    });

    try {
      // Respect all active filters: From/To, Project, Sales User, Lead Source, Lead Status
      const queryParams = {
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        projectId: filters.projectId || undefined,
        salesUserId: filters.salesUserId || undefined,
        leadSource: filters.leadSource || undefined,
        leadStatus: filters.leadStatus || undefined,
        ...segment,
      };

      const result = await reportApi.getDrilldownCalls(queryParams);
      setDrilldown({
        isOpen: true,
        loading: false,
        title: result?.title || initialTitle,
        leads: [],
        calls: result?.calls || [],
        mode: "calls",
        filters: result?.filters || queryParams,
        error: "",
      });
    } catch (err) {
      console.error("Error fetching drilldown calls:", err);
      setDrilldown((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load drilldown calls",
      }));
    }
  };

  const closeDrilldown = () => {
    setDrilldown((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="admin-report-page">

      {/* ── TOP CARD: Title + Tabs + Filters ── */}
      <div className="admin-report-top-card">
        {/* <div className="admin-report-header d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h4>My Reports</h4>
            <p>{lastUpdatedAt ? `Last updated ${lastUpdatedAt}` : "Live lead funnel & Mcube telephony IVR analytics"}</p>
          </div>

          <div className="report-tab-switch btn-group" role="group" aria-label="Report View Toggle">
            <button
              type="button"
              className={`btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              📊 Complete Overview
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "telephony" ? "active" : ""}`}
              onClick={() => setActiveTab("telephony")}
            >
              📞 Mcube Telephony &amp; IVR
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "funnel" ? "active" : ""}`}
              onClick={() => setActiveTab("funnel")}
            >
              🎯 Lead &amp; Sales Funnel
            </button>
          </div>
        </div> */}

        <div className="admin-report-filters-wrapper">
          <ReportFilters
            filters={filters}
            projects={projects}
            users={salesUsers}
            leadSources={reports.leadSources}
            loading={loading}
            onChange={handleFilterChange}
            onRefresh={loadReports}
          />
        </div>
      </div>

      {error && <div className="admin-report-alert mt-3">{error}</div>}
      {loading && <div className="admin-report-loading mt-3">Loading reports data...</div>}

      {/* 1. MCUBE TELEPHONY & IVR SECTION */}
      {(activeTab === "all" || activeTab === "telephony") && (
        <div className="telephony-report-section mt-4">
          <div className="section-title-bar d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-bold">📞 Mcube Telephony &amp; IVR Activity</h5>
          </div>

          <CallSummaryCards summary={reports.telephonySummary} onCardClick={handleCallDrilldown} />

          <div className="admin-report-chart-grid mt-4">
            <CallStatusChart data={reports.callStatus} onSegmentClick={handleCallDrilldown} />
            <CallHourlyChart
              hourlyData={reports.callHourly}
              dailyData={reports.callDaily}
              onBarClick={handleCallDrilldown}
            />
            <DidBreakupChart data={reports.didBreakup} />
          </div>
        </div>
      )}

      {/* 2. LEAD & SALES FUNNEL SECTION */}
      {(activeTab === "all" || activeTab === "funnel") && (
        <div className="lead-funnel-report-section mt-4">
          <div className="section-title-bar d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-bold">🎯 Lead Funnel &amp; Sales Conversions</h5>
            {/* <span className="badge bg-success text-white px-3 py-1">CRM Pipeline</span> */}
          </div>

          <ReportSummaryCards summary={reports.summary} />

          <div className="admin-report-chart-grid mt-4">
            <LeadStatusChart data={reports.leadStatus} onSegmentClick={handleSegmentClick} />
            <MonthlyLeadsChart data={reports.monthlyLeads} />
            <SalesPerformanceChart data={reports.salesPerformance} onSegmentClick={handleSegmentClick} />
            <FollowupStatusChart data={reports.followups} onSegmentClick={handleSegmentClick} />
            <LeadSourceChart data={reports.leadSources} onSegmentClick={handleSegmentClick} />
            <SiteVisitChart data={reports.siteVisits} onSegmentClick={handleSegmentClick} />
            <BookingReportChart data={reports.bookings} onSegmentClick={handleSegmentClick} />
          </div>

          <div className="admin-report-tables mt-4">
            <SalesPerformanceTable data={reports.salesPerformance} onSegmentClick={handleSegmentClick} />
          </div>
        </div>
      )}

      {/* Drilldown Modal */}
      <ReportDrilldownModal
        isOpen={drilldown.isOpen}
        onClose={closeDrilldown}
        title={drilldown.title}
        leads={drilldown.leads}
        calls={drilldown.calls}
        mode={drilldown.mode}
        loading={drilldown.loading}
        filterContext={drilldown.filters}
      />
    </div>
  );
};

export default MyReports;

