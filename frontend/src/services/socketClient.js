const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
let socket = null;
let scriptPromise = null;
const listeners = new Map();

const loadSocketIoScript = () => {
  if (window.io) return Promise.resolve(window.io);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${API_URL}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = () => resolve(window.io);
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Unable to load Socket.IO client"));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
};

export const getCRMSocket = async () => {
  const token = localStorage.getItem("authToken") || "";
  const userJson = localStorage.getItem("user") || localStorage.getItem("authUser") || "{}";
  let userId = null;
  try {
    const parsed = JSON.parse(userJson);
    userId = parsed?.id || null;
  } catch (e) {}

  if (socket && socket.connected) {
    return socket;
  }

  try {
    const io = await loadSocketIoScript();
    if (!socket) {
      socket = io(API_URL, {
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        auth: token ? { token } : undefined,
      });

      socket.on("connect", () => {
        if (userId) {
          socket.emit("register", userId);
        }
      });
    } else if (!socket.connected) {
      socket.auth = token ? { token } : undefined;
      socket.connect();
    }

    return socket;
  } catch (err) {
    console.warn("Socket.io initialization warning:", err.message);
    return null;
  }
};

export const getReportsSocket = getCRMSocket;

export const subscribeToCRMEvent = async (event, callback) => {
  if (!event || typeof callback !== "function") return () => {};

  const s = await getCRMSocket();
  if (!s) return () => {};

  s.on(event, callback);

  return () => {
    try {
      s.off(event, callback);
    } catch (e) {}
  };
};

export const disconnectCRMSocket = () => {
  if (socket) {
    try {
      socket.disconnect();
    } catch (e) {}
    socket = null;
  }
};
