import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from "../services/userSalesApi";
import { getReportsSocket } from "../services/socketClient";

const getTitle = (notification) => notification?.titile || notification?.title || "Notification";

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day:"2-digit",
    month:"short",
    year:"numeric",
    hour:"2-digit",
    minute:"2-digit",
  });
};

const cleanDescription = (value) =>
  String(value || "")
    .split("\n")
    .filter((line) => !/^(LEAD_ASSIGNED|TASK_ASSIGNED):/.test(line))
    .join("\n")
    .trim();

const UserSalesNotifications = ({ onUnreadCountChange, onOpenLink }) => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalItems:0, totalPages:1, unreadCount:0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const limit = 10;

  const loadNotifications = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError("");
    try {
      const result = await getMyNotifications({ page:nextPage, limit });
      setNotifications(Array.isArray(result.data) ? result.data : []);
      setMeta({
        totalItems:Number(result.totalItems) || 0,
        totalPages:Math.max(1, Number(result.totalPages) || 1),
        unreadCount:Number(result.unreadCount) || 0,
      });
      onUnreadCountChange?.(Number(result.unreadCount) || 0);
    } catch (loadError) {
      setError(loadError.message || "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }, [limit, onUnreadCountChange, page]);

  useEffect(() => {
    loadNotifications(page);
  }, [loadNotifications, page]);

  useEffect(() => {
    let authUser = null;
    try {
      authUser = JSON.parse(localStorage.getItem("authUser") || "null");
    } catch {
      authUser = null;
    }
    const userId = authUser?.id;
    if (!userId) return undefined;

    let isMounted = true;
    const mergeNotification = (notification) => {
      if (!isMounted || !notification?.id) return;
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, limit));
      if (!notification.isRead) {
        setMeta((current) => {
          const unreadCount = current.unreadCount + 1;
          onUnreadCountChange?.(unreadCount);
          return { ...current, unreadCount, totalItems:current.totalItems + 1 };
        });
      }
    };

    getReportsSocket()
      .then((socket) => {
        if (!isMounted) return;
        socket.emit("register", String(userId));
        socket.on(`newNotification-${userId}`, mergeNotification);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      getReportsSocket()
        .then((socket) => socket.off(`newNotification-${userId}`, mergeNotification))
        .catch(() => {});
    };
  }, [limit, onUnreadCountChange]);

  const range = useMemo(() => {
    if (!meta.totalItems) return "0 of 0";
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, meta.totalItems);
    return `${start}-${end} of ${meta.totalItems}`;
  }, [meta.totalItems, page]);

  const openNotification = async (notification) => {
    if (!notification?.id) return;
    setBusyId(notification.id);
    try {
      if (!notification.isRead) {
        const result = await markNotificationRead(notification.id);
        setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isRead:true } : item));
        onUnreadCountChange?.(Number(result.unreadCount) || 0);
      }
      if (notification.link) onOpenLink?.(notification.link);
    } catch (readError) {
      setError(readError.message || "Unable to open notification");
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    setBusyId("all");
    try {
      const result = await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead:true })));
      onUnreadCountChange?.(Number(result.unreadCount) || 0);
    } catch (readError) {
      setError(readError.message || "Unable to mark notifications as read");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="sales-card sales-notifications-page">
      <div className="sales-card-head">
        <div>
          <h2>Notifications</h2>
          <p>{meta.unreadCount} unread updates</p>
        </div>
        <button type="button" className="sales-card-primary-btn" onClick={markAll} disabled={!meta.unreadCount || busyId === "all"}>
          <CheckCheck size={15} /> Mark all read
        </button>
      </div>

      {error && <div className="sales-visit-message error">{error}</div>}
      {loading ? (
        <div className="sales-empty">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="sales-empty">No notifications found.</div>
      ) : (
        <div className="sales-notification-list">
          {notifications.map((notification) => (
            <button
              type="button"
              className={`sales-notification-item ${notification.isRead ? "read" : "unread"}`}
              key={notification.id}
              onClick={() => openNotification(notification)}
              disabled={busyId === notification.id}
            >
              <span className="sales-notification-icon"><Bell size={18} /></span>
              <span>
                <strong>{getTitle(notification)}</strong>
                <small>{cleanDescription(notification.description) || "Open this update"}</small>
              </span>
              <time>{formatTime(notification.createdAt)}</time>
            </button>
          ))}
        </div>
      )}

      {meta.totalItems > 0 && (
        <div className="sales-table-pagination">
          <span>Showing {range}</span>
          <div>
            <button type="button" disabled={page === 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>
            <span>{page} / {meta.totalPages}</span>
            <button type="button" disabled={page >= meta.totalPages || loading} onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}>
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default UserSalesNotifications;
