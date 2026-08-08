export const DASHBOARD_RESULT_CARDS = [
  { key:"active-tasks", title:"Active Tasks", subtitle:"Open Tasks", recordType:"task" },
  { key:"mfa", title:"MFA", subtitle:"Missed Future Activity", recordType:"mixed" },
  { key:"visit-expiry", title:"Visit Expiry", subtitle:"Soon", recordType:"lead" },
  { key:"lead-merge", title:"Lead Merge", subtitle:"Duplicates", recordType:"duplicate" },
  { key:"hot-leads", title:"Hot Leads", subtitle:"Priority", recordType:"lead" },
  { key:"new-leads", title:"New Leads", subtitle:"Fresh", recordType:"lead" },
  { key:"booked-leads", title:"Booked Leads", subtitle:"Confirmed", recordType:"lead" },
  { key:"drop-off-leads", title:"Drop Off Leads", subtitle:"Closed", recordType:"lead" },
];

export const getDashboardCard = (key) =>
  DASHBOARD_RESULT_CARDS.find((card) => card.key === key) || DASHBOARD_RESULT_CARDS[0];

export const normalizeList = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.tasks)) return result.tasks;
  if (Array.isArray(result?.bookings)) return result.bookings;
  if (Array.isArray(result?.leads)) return result.leads;
  if (Array.isArray(result?.projects)) return result.projects;
  if (Array.isArray(result?.groups)) return result.groups;
  return [];
};

export const isIncompleteStatus = (status) =>
  !["completed", "complete", "done", "archived", "closed", "cancelled", "canceled"].includes(
    String(status || "").toLowerCase()
  );

const getActivityDate = (item) =>
  item?.dueDate ||
  item?.dueOn ||
  item?.nextFollowUpAt ||
  item?.followUpAt ||
  item?.followUpDate ||
  item?.followupDate ||
  item?.callbackDate ||
  item?.activityDate ||
  item?.scheduledAt;

export const isMissedFutureActivity = (item, now = new Date()) => {
  const status = String(item?.status || item?.followUpStatus || item?.activityStatus || "").toLowerCase();
  if (status.includes("missed")) return true;
  if (!isIncompleteStatus(status)) return false;

  const activityDate = new Date(getActivityDate(item));
  return !Number.isNaN(activityDate.getTime()) && activityDate < now;
};

export const hasVisitExpiringSoon = (lead, now = new Date(), windowDays = 7) => {
  if (!lead?.conductSiteDate && !lead?.siteVisitDate) return false;
  const visitDate = new Date(lead.conductSiteDate || lead.siteVisitDate);
  if (Number.isNaN(visitDate.getTime())) return false;
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + windowDays);
  return visitDate >= now && visitDate <= endDate;
};

export const isHotLead = (lead) => {
  const value = `${lead?.tags || ""} ${lead?.priority || ""} ${lead?.status || ""}`.toLowerCase();
  return value.includes("hot") || value.includes("priority");
};

export const isBookedLead = (lead) =>
  String(lead?.status || "").toLowerCase() === "booked" ||
  (Array.isArray(lead?.bookings) && lead.bookings.length > 0);

export const isDropOffLead = (lead) => {
  const value = String(lead?.status || lead?.stage || "").toLowerCase();
  return value.includes("lost") || value.includes("drop") || value.includes("closed") || value.includes("unqualified");
};

export const filterDashboardRecords = (key, { leads = [], tasks = [], duplicateGroups = [] } = {}) => {
  const now = new Date();
  if (key === "active-tasks") {
    return tasks.filter((task) => isIncompleteStatus(task?.status));
  }
  if (key === "mfa") {
    return [
      ...tasks.filter((task) => isMissedFutureActivity(task, now)).map((item) => ({ ...item, resultType:"Task" })),
      ...leads.filter((lead) => isMissedFutureActivity(lead, now)).map((item) => ({ ...item, resultType:"Lead" })),
    ];
  }
  if (key === "visit-expiry") return leads.filter((lead) => hasVisitExpiringSoon(lead, now));
  if (key === "lead-merge") return duplicateGroups;
  if (key === "hot-leads") return leads.filter(isHotLead);
  if (key === "new-leads") return leads.filter((lead) => String(lead?.status || "").toLowerCase() === "new");
  if (key === "booked-leads") return leads.filter(isBookedLead);
  if (key === "drop-off-leads") return leads.filter(isDropOffLead);
  return [];
};
