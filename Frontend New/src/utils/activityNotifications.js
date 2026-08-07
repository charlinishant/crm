export const activityNotificationStorageKey = "crmActivityNotifications";

const normalizeNotificationText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const getNotificationMinute = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  date.setSeconds(0, 0);
  return date.toISOString();
};

export const getActivityNotificationDedupeKey = (notification = {}) => {
  const title = normalizeNotificationText(notification.title || notification.type);
  const leadId = normalizeNotificationText(notification.leadId || notification.lead_id || notification.leadName);
  const description = normalizeNotificationText(notification.description || notification.message);
  const createdMinute = getNotificationMinute(notification.createdAt || notification.created_at);

  return [title, leadId, description, createdMinute].join("|");
};

export const dedupeActivityNotifications = (notifications = []) => {
  const seen = new Set();

  return notifications.filter((notification) => {
    const key = getActivityNotificationDedupeKey(notification);
    const fallbackKey = notification?.id ? `id:${notification.id}` : key;
    const dedupeKey = key.replace(/\|/g, "") ? key : fallbackKey;

    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });
};
