const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getToken = () => localStorage.getItem("authToken");

const request = async (path, options = {}) => {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type":"application/json" } : {}),
      ...(token ? { Authorization:`Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.success === false) {
    const error = new Error(result?.message || "Unable to complete request");
    error.status = response.status;
    error.result = result;
    throw error;
  }
  return result;
};

export const getCurrentUserProfile = () => request("/users/me");

export const updateCurrentUserProfile = (payload) =>
  request("/users/me", {
    method:"PATCH",
    body:JSON.stringify(payload),
  });

export const getMyNotifications = ({ page = 1, limit = 10 } = {}) =>
  request(`/notification/me?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`);

export const markNotificationRead = (id) =>
  request(`/notification/${id}/read`, { method:"PATCH" });

export const markAllNotificationsRead = () =>
  request("/notification/read-all", { method:"PATCH" });

export const getMcubeWidget = () =>
  request("/api/calls/browser-phone/widget");

export const getMyMcubeAgent = () =>
  request("/api/calls/mcube/agent/me");

export const initiateMcubeClickToCall = ({ leadId, phone, dialedPhone, phoneLabel, requestId }) =>
  request("/api/calls/mcube/click-to-call", {
    method:"POST",
    body:JSON.stringify({
      leadId,
      phone,
      dialedPhone: dialedPhone || phone,
      phoneLabel,
      requestId,
    }),
  });
