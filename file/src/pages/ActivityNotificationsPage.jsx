import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const activityNotificationStorageKey = "crmActivityNotifications";

const getActivityNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem(activityNotificationStorageKey) || "[]");
  } catch {
    return [];
  }
};

const saveActivityNotifications = (notifications) => {
  localStorage.setItem(activityNotificationStorageKey, JSON.stringify(notifications));
};

const fetchActivityNotifications = async () => {
  const token = localStorage.getItem("authToken");
  if (!token) return getActivityNotifications();

  const response = await fetch(`${API_URL}/lead-activities?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Unable to load activity notifications");
  const notifications = await response.json();
  saveActivityNotifications(Array.isArray(notifications) ? notifications : []);
  return Array.isArray(notifications) ? notifications : [];
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const ActivityNotificationsPage = () => {
  const [notifications, setNotifications] = useState(getActivityNotifications);

  useEffect(() => {
    const refreshNotifications = () => {
      fetchActivityNotifications()
        .then(setNotifications)
        .catch(() => setNotifications(getActivityNotifications()));
    };

    refreshNotifications();
    window.addEventListener("storage", refreshNotifications);
    window.addEventListener("focus", refreshNotifications);
    window.addEventListener("crmActivityNotificationsChanged", refreshNotifications);

    return () => {
      window.removeEventListener("storage", refreshNotifications);
      window.removeEventListener("focus", refreshNotifications);
      window.removeEventListener("crmActivityNotificationsChanged", refreshNotifications);
    };
  }, []);

  return (
    <MasterLayout>
      <Breadcrumb title='Activity Notifications' />

      <div className='card h-100 p-0 radius-8'>
        <div className='card-header border-bottom bg-base py-16 px-24 d-flex align-items-center justify-content-between'>
          <h6 className='text-lg fw-semibold mb-0'>Notifications</h6>
          <span className='badge text-sm fw-semibold bg-primary-50 text-primary-600 px-12 py-8 radius-6'>
            {notifications.length} Total
          </span>
        </div>

        <div className='card-body p-0'>
          {notifications.length === 0 ? (
            <div className='py-40 px-24 text-center text-secondary-light'>
              No activity notifications found.
            </div>
          ) : (
            <div className='d-grid'>
              {notifications.map((notification) => (
                <div
                  className='px-24 py-16 border-bottom d-flex align-items-start gap-3'
                  key={notification.id}
                >
                  <span className='w-44-px h-44-px bg-info-subtle text-info-main rounded-circle d-flex justify-content-center align-items-center flex-shrink-0'>
                    <Icon icon='iconoir:activity' className='icon text-xxl' />
                  </span>
                  <div className='min-w-0 flex-grow-1'>
                    <div className='d-flex align-items-start justify-content-between gap-3'>
                      <div>
                        <h6 className='text-md fw-semibold mb-4'>
                          {notification.title}
                        </h6>
                        <p className='mb-0 text-secondary-light'>
                          {notification.leadName}: {notification.description}
                        </p>
                      </div>
                      <span className='text-sm text-secondary-light flex-shrink-0'>
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>
                    <div className='text-sm text-secondary-light mt-8'>
                      {notification.type} | {notification.meta || `Done by ${notification.actorName || "Sales User"}`} | Lead #{notification.leadId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MasterLayout>
  );
};

export default ActivityNotificationsPage;
