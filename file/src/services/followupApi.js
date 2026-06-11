const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getToken = () => localStorage.getItem("authToken");

const request = async (path, options = {}) => {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || "Unable to complete follow-up request");
  }

  return result?.data ?? result;
};

export const getFollowups = (filter = "all") =>
  request(`/api/sales/followups?filter=${encodeURIComponent(filter)}`);

export const createFollowup = (payload) =>
  request("/api/sales/followups", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const markFollowupDone = (id, payload = {}) =>
  request(`/api/sales/followups/${id}/done`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const rescheduleFollowup = (id, payload) =>
  request(`/api/sales/followups/${id}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const cancelFollowup = (id, payload = {}) =>
  request(`/api/sales/followups/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const updateLeadStatus = (leadId, payload) =>
  request(`/api/sales/leads/${leadId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const getLeadFollowupContext = (leadId) =>
  request(`/api/sales/leads/${leadId}/followups`);
