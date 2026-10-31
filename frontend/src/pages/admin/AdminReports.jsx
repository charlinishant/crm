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
import DprPerformanceTable from "../../components/reports/DprPerformanceTable";
import LeadSourcePerformanceTable from "../../components/reports/LeadSourcePerformanceTable";
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
  dpr: { callers: [], summary: {}, dateRange: {} },
  leadSourceReport: { sources: [], summary: {}, detectedDuplicates: [] },
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
    calls: [],
    items: [],
    mode: "leads",
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

  const [dprDownloading, setDprDownloading] = useState(false);
  const [sourceDownloading, setSourceDownloading] = useState(false);

  const handleDownloadDpr = async () => {
    try {
      setDprDownloading(true);
      await reportApi.downloadDprExcel(filters);
    } catch (err) {
      console.error("DPR download error:", err);
      alert(err.message || "Failed to download DPR Excel report");
    } finally {
      setDprDownloading(false);
    }
  };

  const handleDownloadLeadSource = async () => {
    try {
      setSourceDownloading(true);
      await reportApi.downloadLeadSourceExcel(filters);
    } catch (err) {
      console.error("Lead Source report download error:", err);
      alert(err.message || "Failed to download Lead Source Excel report");
    } finally {
      setSourceDownloading(false);
    }
  };

  const handleDprDrilldown = async (segment) => {
    if (!segment) return;
    const initialTitle = segment.title || "Daily Performance Drilldown";
    setDrilldown({
      isOpen: true,
      loading: true,
      title: initialTitle,
      leads: [],
      calls: [],
      items: [],
      mode: "leads",
      filters: segment,
      error: "",
    });

    try {
      const queryParams = {
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        userId: segment.userId || segment.salesUserId,
        salesUserId: segment.userId || segment.salesUserId,
        metric: segment.metric,
      };

      if (
        segment.metric === "totalCalls" ||
        segment.metric === "connectedCalls" ||
        segment.metric === "outboundCalls" ||
        segment.metric === "inboundCalls" ||
        segment.metric === "missedCalls"
      ) {
        const callQueryParams = {
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          salesUserId: segment.userId || segment.salesUserId,
          status: segment.metric === "connectedCalls" ? "Answered" : segment.metric === "missedCalls" ? "Missed" : undefined,
          direction: segment.metric === "inboundCalls" ? "Inbound" : segment.metric === "outboundCalls" ? "Outbound" : undefined,
          title: initialTitle,
        };
        const callRes = await reportApi.getDrilldownCalls(callQueryParams);
        setDrilldown({
          isOpen: true,
          loading: false,
          title: callRes?.title || initialTitle,
          leads: [],
          calls: callRes?.calls || [],
          items: [],
          mode: "calls",
          filters: callQueryParams,
          error: "",
        });
        return;
      }

      if (
        segment.metric === "leadsAssigned" ||
        segment.metric === "leadsAssignedToday" ||
        segment.metric === "leadsQualified"
      ) {
        const leadQueryParams = {
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          salesUserId: segment.userId || segment.salesUserId,
          status: segment.metric === "leadsQualified" ? "Qualified" : undefined,
          title: initialTitle,
        };
        const leadRes = await reportApi.getDrilldownLeads(leadQueryParams);
        setDrilldown({
          isOpen: true,
          loading: false,
          title: leadRes?.title || initialTitle,
          leads: leadRes?.leads || [],
          calls: [],
          items: [],
          mode: "leads",
          filters: leadQueryParams,
          error: "",
        });
        return;
      }

      const result = await reportApi.getDprDrilldown(queryParams);
      const drillType = result?.type || "leads";
      const drillItems = result?.items || [];
      setDrilldown({
        isOpen: true,
        loading: false,
        title: result?.title || initialTitle,
        leads: drillType === "leads" ? drillItems : [],
        calls: drillType === "calls" ? drillItems : [],
        items: drillItems,
        mode: drillType,
        filters: queryParams,
        error: "",
      });
    } catch (err) {
      console.error("Error fetching DPR drilldown:", err);
      setDrilldown((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load drilldown details",
      }));
    }
  };

  const handleLeadSourceDrilldown = async (segment) => {
    if (!segment) return;
    const initialTitle = segment.title || "Lead Source Drilldown";
    setDrilldown({
      isOpen: true,
      loading: true,
      title: initialTitle,
      leads: [],
      calls: [],
      items: [],
      mode: "leads",
      filters: segment,
      error: "",
    });

    try {
      const queryParams = {
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        sourceName: segment.sourceName || segment.leadSource,
        leadSource: segment.sourceName || segment.leadSource,
        metric: segment.metric,
      };

      const result = await reportApi.getLeadSourceDrilldown(queryParams);
      const drillType = result?.type || "leads";
      const drillItems = result?.items || [];

      setDrilldown({
        isOpen: true,
        loading: false,
        title: result?.title || initialTitle,
        leads: drillType === "leads" ? drillItems : [],
        calls: drillType === "calls" ? drillItems : [],
        items: drillItems,
        mode: drillType,
        filters: queryParams,
        error: "",
      });
    } catch (err) {
      console.error("Error fetching lead source drilldown:", err);
      setDrilldown((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load lead source details",
      }));
    }
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

            <div className="d-flex align-items-center gap-2 flex-wrap">
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
                  className={`btn ${activeTab === "dpr" ? "active" : ""}`}
                  onClick={() => setActiveTab("dpr")}
                >
                  📋 Daily Performance (DPR)
                </button>
                <button
                  type="button"
                  className={`btn ${activeTab === "source" ? "active" : ""}`}
                  onClick={() => setActiveTab("source")}
                >
                  🤝 CP &amp; Lead Source
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

              <button
                type="button"
                className="btn btn-success d-flex align-items-center gap-2 fw-semibold px-3 py-2 shadow-sm"
                onClick={handleDownloadDpr}
                disabled={dprDownloading}
                title="Download comprehensive Daily Performance Report (DPR) Excel"
              >
                {dprDownloading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Exporting DPR...</span>
                  </>
                ) : (
                  <>
                    <span>📥 Download DPR</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-outline-success d-flex align-items-center gap-2 fw-semibold px-3 py-2 shadow-sm bg-white"
                onClick={handleDownloadLeadSource}
                disabled={sourceDownloading}
                title="Download Channel Partner &amp; Lead Source Performance Report Excel"
              >
                {sourceDownloading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Exporting Source Report...</span>
                  </>
                ) : (
                  <>
                    <span>📊 Export CP Report</span>
                  </>
                )}
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


        {/* DPR (DAILY PERFORMANCE REPORT) SECTION */}
        {(activeTab === "all" || activeTab === "dpr") && (
          <div className="dpr-report-section">
            <DprPerformanceTable
              dprData={reports.dpr}
              filters={filters}
              onMetricClick={handleDprDrilldown}
              loading={loading}
            />
          </div>
        )}

        {/* LEAD SOURCE & CHANNEL PARTNER PERFORMANCE REPORT SECTION */}
        {(activeTab === "all" || activeTab === "source") && (
          <div className="lead-source-report-section mt-4">
            <LeadSourcePerformanceTable
              sourceData={reports.leadSourceReport}
              filters={filters}
              onMetricClick={handleLeadSourceDrilldown}
              onRefresh={loadReports}
              loading={loading}
            />
          </div>
        )}

        {/* 1. MCUBE TELEPHONY & IVR SECTION */}
        {(activeTab === "all" || activeTab === "telephony") && (
          <div className="telephony-report-section mt-4">
            <div className="section-title-bar d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 fw-bold">📞 Mcube Telephony & IVR Activity</h5>
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
              <h5 className="mb-0 fw-bold">🎯 Lead Funnel &amp; Sales Conversions</h5>
              {/* <span className="badge bg-success text-white px-3 py-1">CRM Pipeline</span> */}
            </div>

            <ReportSummaryCards summary={reports.summary} />

            <div className="admin-report-chart-grid mt-4">
              <LeadStatusChart data={reports.leadStatus} onSegmentClick={handleSegmentClick} />
              <MonthlyLeadsChart data={reports.monthlyLeads} />
              <SalesPerformanceChart data={reports.salesPerformance} onSegmentClick={handleSegmentClick} />
              <FollowupStatusChart data={reports.followups} onSegmentClick={handleSegmentClick} />
              <LeadSourceChart data={reports.leadSources} filters={filters} onSegmentClick={handleSegmentClick} />
              <SiteVisitChart data={reports.siteVisits} onSegmentClick={handleSegmentClick} />
              <BookingReportChart data={reports.bookings} onSegmentClick={handleSegmentClick} />
            </div>

            <div className="admin-report-tables mt-4">
              <SalesPerformanceTable data={reports.salesPerformance} filters={filters} onSegmentClick={handleSegmentClick} />
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
          items={drilldown.items}
          mode={drilldown.mode}
          loading={drilldown.loading}
          filterContext={drilldown.filters}
        />
      </div>
    </MasterLayout>
  );
};

export default AdminReports;
