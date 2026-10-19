const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const buildQuery = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });
  return params.toString();
};

const request = async (path, filters) => {
  const query = buildQuery(filters);
  const response = await fetch(`${API_URL}${path}${query ? `?${query}` : ""}`, {
    headers: getAuthHeaders(),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.message || "Unable to load report data");
  }

  return result?.data ?? result;
};

export const reportApi = {
  getSummary: (filters) => request("/api/admin/reports/summary", filters),
  getLeadStatus: (filters) => request("/api/admin/reports/lead-status", filters),
  getMonthlyLeads: (filters) => request("/api/admin/reports/monthly-leads", filters),
  getSalesPerformance: (filters) => request("/api/admin/reports/sales-performance", filters),
  getFollowups: (filters) => request("/api/admin/reports/followups", filters),
  getLeadSources: (filters) => request("/api/admin/reports/lead-sources", filters),
  getSiteVisits: (filters) => request("/api/admin/reports/site-visits", filters),
  getBookings: (filters) => request("/api/admin/reports/bookings", filters),
  getRecentActivities: (filters) => request("/api/admin/reports/recent-activities", filters),
  getDrilldownLeads: (filters) => request("/api/admin/reports/drilldown-leads", filters),
  getTelephonySummary: (filters) => request("/api/admin/reports/telephony-summary", filters),
  getCallStatus: (filters) => request("/api/admin/reports/call-status", filters),
  getCallHourly: (filters) => request("/api/admin/reports/call-hourly", filters),
  getCallDaily: (filters) => request("/api/admin/reports/call-daily", filters),
  getDidBreakup: (filters) => request("/api/admin/reports/did-breakup", filters),
  getAgentCallPerformance: (filters) => request("/api/admin/reports/agent-call-performance", filters),
  getCallLogs: (filters) => request("/api/admin/reports/call-logs", filters),
  getDrilldownCalls: (filters) => request("/api/admin/reports/drilldown-calls", filters),
  getProjects: () => request("/projects/list"),
  getUsers: () => request("/api/admin/reports/sales-users"),
};

export const fetchAllReports = async (filters) => {
  const [
    summary,
    leadStatus,
    monthlyLeads,
    salesPerformance,
    followups,
    leadSources,
    siteVisits,
    bookings,
    recentActivities,
    telephonySummary,
    callStatus,
    callHourly,
    callDaily,
    didBreakup,
    agentCallPerformance,
    callLogs,
  ] = await Promise.all([
    reportApi.getSummary(filters).catch(() => ({})),
    reportApi.getLeadStatus(filters).catch(() => []),
    reportApi.getMonthlyLeads(filters).catch(() => []),
    reportApi.getSalesPerformance(filters).catch(() => []),
    reportApi.getFollowups(filters).catch(() => []),
    reportApi.getLeadSources(filters).catch(() => []),
    reportApi.getSiteVisits(filters).catch(() => []),
    reportApi.getBookings(filters).catch(() => []),
    reportApi.getRecentActivities(filters).catch(() => []),
    reportApi.getTelephonySummary(filters).catch(() => ({})),
    reportApi.getCallStatus(filters).catch(() => []),
    reportApi.getCallHourly(filters).catch(() => []),
    reportApi.getCallDaily(filters).catch(() => []),
    reportApi.getDidBreakup(filters).catch(() => []),
    reportApi.getAgentCallPerformance(filters).catch(() => []),
    reportApi.getCallLogs(filters).catch(() => []),
  ]);

  return {
    summary,
    leadStatus,
    monthlyLeads,
    salesPerformance,
    followups,
    leadSources,
    siteVisits,
    bookings,
    recentActivities,
    telephonySummary,
    callStatus,
    callHourly,
    callDaily,
    didBreakup,
    agentCallPerformance,
    callLogs,
  };
};



