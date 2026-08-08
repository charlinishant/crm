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
  if (!response.ok) throw new Error(result?.message || "Unable to complete request");
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
