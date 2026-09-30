import React, { useCallback, useEffect, useMemo, useState } from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import ReportFilters from "../../components/reports/ReportFilters";
import ReportSummaryCards from "../../components/reports/ReportSummaryCards";
import LeadStatusChart from "../../components/reports/LeadStatusChart";
import MonthlyLeadsChart from "../../components/reports/MonthlyLeadsChart";
import SalesPerformanceChart from "../../components/reports/SalesPerformanceChart";
import FollowupStatusChart from "../../components/reports/FollowupStatusChart";
import LeadSourceChart from "../../components/reports/LeadSourceChart";
import SiteVisitChart from "../../components/reports/SiteVisitChart";
import BookingReportChart from "../../components/reports/BookingReportChart";
import SalesPerformanceTable from "../../components/reports/SalesPerformanceTable";
import ReportDrilldownModal from "../../components/reports/ReportDrilldownModal";

// Mcube IVR & Telephony Reports
import CallSummaryCards from "../../components/reports/CallSummaryCards";
import CallStatusChart from "../../components/reports/CallStatusChart";
import CallHourlyChart from "../../components/reports/CallHourlyChart";
import DidBreakupChart from "../../components/reports/DidBreakupChart";
import AgentCallPerformanceTable from "../../components/reports/AgentCallPerformanceTable";
import CallDetailRecordsTable from "../../components/reports/CallDetailRecordsTable";

import { fetchAllReports, reportApi } from "../../services/reportApi";
import { getReportsSocket } from "../../services/socketClient";

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

const AdminReports = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [reports, setReports] = useState(emptyReports);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Drilldown modal state
  const [drilldown, setDrilldown] = useState({
    isOpen: false,
    loading: false,
    title: "",
    leads: [],
    filters: {},
    error: "",
  });

  const salesUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          String(user.role || "").toUpperCase() === "SALES" ||
          String(user.department || "").toUpperCase() === "SALES" ||
          String(user.role || "").toUpperCase() === "PRE_SALES" ||
          String(user.department || "").toUpperCase() === "PRE_SALES"
      ),
    [users]
  );

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchAllReports(filters);
      setReports(data);
      setLastUpdatedAt(new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }));
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
      filters: segment,
      error: "",
    });

    try {
      // Merge current page filters (date range, project, sales user) with segment specific query
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

  const closeDrilldown = () => {
    setDrilldown((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <MasterLayout>
      <div className="admin-report-page">
        <Breadcrumb title="Reports" />

        {/* ── TOP CARD: Title + Tabs + Filters all in one box ── */}
        <div className="admin-report-top-card">
          <div className="admin-report-header d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h4>Reports &amp; Analytics</h4>
              <p>{lastUpdatedAt ? `Last updated ${lastUpdatedAt}` : "Live lead conversion, sales pipeline & Mcube IVR analytics"}</p>
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
          </div>

          {/* Filters row — same box, directly below header */}
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
              <h5 className="mb-0 fw-bold">📞 Mcube Telephony & IVR Activity</h5>
            </div>

            <CallSummaryCards summary={reports.telephonySummary} />

            <div className="admin-report-chart-grid mt-4">
              <CallStatusChart data={reports.callStatus} />
              <CallHourlyChart hourlyData={reports.callHourly} dailyData={reports.callDaily} />
              <DidBreakupChart data={reports.didBreakup} />
            </div>

            <div className="admin-report-tables mt-4">
              <AgentCallPerformanceTable data={reports.agentCallPerformance} />
              <CallDetailRecordsTable data={reports.callLogs} />
            </div>
          </div>
        )}

        {/* 2. LEAD & SALES FUNNEL SECTION */}
        {(activeTab === "all" || activeTab === "funnel") && (
          <div className="lead-funnel-report-section mt-4">
            <div className="section-title-bar d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 fw-bold">🎯 Lead Funnel & Sales Conversions</h5>
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
          loading={drilldown.loading}
          filterContext={drilldown.filters}
        />
      </div>
    </MasterLayout>
  );
};

export default AdminReports;
