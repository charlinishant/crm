import { getCRMSocket } from "./socketClient";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds
let heartbeatTimer = null;
let lastInteractionTime = Date.now();
let isInitialized = false;

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  const sessionToken = localStorage.getItem("sessionToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(sessionToken ? { "x-session-token": sessionToken } : {}),
  };
};

const handleSessionEnd = (message = "Your session has ended. Please log in again.") => {
  stopSessionHeartbeat();
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  localStorage.removeItem("sessionToken");
  localStorage.removeItem("sessionId");
  localStorage.removeItem("authUser");
  localStorage.removeItem("user");

  if (window.location.pathname !== "/login" && window.location.pathname !== "/sign-in") {
    alert(message);
    window.location.href = "/sign-in";
  }
};

const sendHeartbeat = async () => {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token");
  const sessionToken = localStorage.getItem("sessionToken");
  const userJson = localStorage.getItem("authUser") || localStorage.getItem("user") || "{}";

  if (!token && !sessionToken) return;

  let userId = null;
  try {
    const user = JSON.parse(userJson);
    userId = user?.id || user?._id || user?.userId || null;
  } catch (e) {}

  try {
    const response = await fetch(`${API_URL}/auth/heartbeat`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sessionToken,
        userId,
        lastInteraction: lastInteractionTime,
      }),
    });

    if (response.status === 401) {
      // Check if user still has valid login credentials in storage before terminating
      if (!localStorage.getItem("authToken") && !localStorage.getItem("token")) {
        handleSessionEnd("Your session has expired. Please log in again.");
      }
      return;
    }

    const data = await response.json().catch(() => ({}));

    // If server issued or restored an active session token, sync it
    if (data?.sessionToken) {
      localStorage.setItem("sessionToken", data.sessionToken);
    }
    if (data?.sessionId) {
      localStorage.setItem("sessionId", String(data.sessionId));
    }

    if (data && data.active === false) {
      if (data.sessionStatus === "forced_logout") {
        handleSessionEnd("Your session was ended by an administrator.");
      } else if (data.sessionStatus === "expired") {
        handleSessionEnd("Your session has expired due to 1 hour of inactivity.");
      }
    }
  } catch (err) {
    // Tolerant of temporary network failure
  }
};

const recordInteraction = () => {
  lastInteractionTime = Date.now();
};

const setupBrowserCloseHandler = () => {
  const handleUnload = () => {
    const sessionToken = localStorage.getItem("sessionToken");
    const userJson = localStorage.getItem("authUser") || localStorage.getItem("user") || "{}";
    let userId = null;
    try {
      const u = JSON.parse(userJson);
      userId = u?.id || u?._id || null;
    } catch (e) {}

    if (!sessionToken && !userId) return;

    const payload = JSON.stringify({ sessionToken, userId });
    const blob = new Blob([payload], { type: "application/json" });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_URL}/auth/session-close`, blob);
    } else {
      fetch(`${API_URL}/auth/session-close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  };

  window.addEventListener("pagehide", handleUnload);
  window.addEventListener("beforeunload", handleUnload);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      recordInteraction();
      sendHeartbeat();
    }
  });
};

export const startSessionHeartbeat = () => {
  lastInteractionTime = Date.now();
  if (heartbeatTimer) return;
  isInitialized = true;

  // Track user activity
  const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
  let throttleTimer = null;
  const throttledInteraction = () => {
    if (!throttleTimer) {
      recordInteraction();
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
      }, 5000);
    }
  };

  events.forEach((ev) => {
    window.addEventListener(ev, throttledInteraction, { passive: true });
  });

  // Setup browser close handler
  setupBrowserCloseHandler();

  // Initial heartbeat & periodic loop
  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  // Setup socket listener for forced logout / expiration
  getCRMSocket().then((socket) => {
    if (socket) {
      socket.off("user:forcedLogout");
      socket.off("user:sessionExpired");

      socket.on("user:forcedLogout", (data) => {
        handleSessionEnd(data?.message || "Your session was ended by an administrator.");
      });

      socket.on("user:sessionExpired", (data) => {
        const currentSessionId = localStorage.getItem("sessionId");
        if (!data?.sessionId || !currentSessionId || String(data.sessionId) === String(currentSessionId)) {
          // If the user had interaction in the last 2 minutes, ignore stale socket expiration
          if (Date.now() - lastInteractionTime > 50 * 60 * 1000) {
            handleSessionEnd(data?.message || "Your session has expired due to 1 hour of inactivity.");
          }
        }
      });
    }
  });
};

export const stopSessionHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  isInitialized = false;
};
