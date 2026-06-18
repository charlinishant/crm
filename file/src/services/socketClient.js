const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
let socket;
let scriptPromise;

const loadSocketIoScript = () => {
  if (window.io) return Promise.resolve(window.io);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${API_URL}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = () => resolve(window.io);
    script.onerror = () => reject(new Error("Unable to load Socket.IO client"));
    document.body.appendChild(script);
  });

  return scriptPromise;
};

export const getReportsSocket = async () => {
  if (!socket) {
    const io = await loadSocketIoScript();
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }

  return socket;
};
