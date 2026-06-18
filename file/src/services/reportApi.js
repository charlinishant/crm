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
  getProjects: () => request("/projects/list"),
  getUsers: async () => {
    const result = await request("/users", { limit: 1000 });
    return Array.isArray(result) ? result : result?.data || [];
  },
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
  ] = await Promise.all([
    reportApi.getSummary(filters),
    reportApi.getLeadStatus(filters),
    reportApi.getMonthlyLeads(filters),
    reportApi.getSalesPerformance(filters),
    reportApi.getFollowups(filters),
    reportApi.getLeadSources(filters),
    reportApi.getSiteVisits(filters),
    reportApi.getBookings(filters),
    reportApi.getRecentActivities(filters),
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
  };
};
