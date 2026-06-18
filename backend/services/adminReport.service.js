const prisma = require("../lib/prisma")

const leadStatuses = ["New", "Qualified", "Nurture", "In_sourcing", "In_closing", "Booked", "Unqualified"]
const visitStatuses = ["Scheduled", "Confirmed", "Visit Done", "Visit Missed", "Cancelled", "Rescheduled"]
const followupStatuses = ["Pending", "Done", "Missed", "Rescheduled", "Cancelled"]

const getName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "Unassigned")

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "Lead")

const normalizeDate = (value, endOfDay = false) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) date.setHours(23, 59, 59, 999)
  return date
}

const getDateRange = (filters, field) => {
  const from = normalizeDate(filters.fromDate)
  const to = normalizeDate(filters.toDate, true)
  if (!from && !to) return {}

  return {
    [field]: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  }
}

const getProjectName = async (projectId) => {
  if (!projectId) return ""
  const project = await prisma.project.findUnique({
    where: { id: Number(projectId) },
    select: { name: true },
  })
  return project?.name || ""
}

const getLeadProjectFilter = async (projectId) => {
  const projectName = await getProjectName(projectId)
  if (!projectName) return null

  return {
    OR: [
      { interestedProjects: { contains: projectName } },
      { conductSiteVisit: { contains: projectName } },
      { siteVisitProject: { contains: projectName } },
      { propertyType: { contains: projectName } },
    ],
  }
}

const getLeadWhere = async (filters = {}) => {
  const projectFilter = await getLeadProjectFilter(filters.projectId)
  const andFilters = []

  if (projectFilter) andFilters.push(projectFilter)
  if (filters.leadSource) {
    andFilters.push({
      OR: [
        { channelPartner: { contains: filters.leadSource } },
        { fundingSource: { contains: filters.leadSource } },
      ],
    })
  }

  return {
    is_delete: false,
    ...(filters.salesUserId ? { teamId: Number(filters.salesUserId) } : {}),
    ...(filters.leadStatus ? { status: filters.leadStatus } : {}),
    ...(andFilters.length ? { AND: andFilters } : {}),
  }
}

const getLeadIdsByFilters = async (filters = {}) => {
  const leads = await prisma.lead.findMany({
    where: await getLeadWhere(filters),
    select: { id: true },
  })
  return leads.map((lead) => lead.id)
}

const withLeadIdFilter = (leadIds) => (
  Array.isArray(leadIds) ? { leadId: { in: leadIds.length ? leadIds : [-1] } } : {}
)

const countBy = (items, keyGetter, defaultKeys = []) => {
  const counts = new Map(defaultKeys.map((key) => [key, 0]))
  items.forEach((item) => {
    const key = keyGetter(item) || "Unknown"
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return Array.from(counts, ([name, value]) => ({ name, value }))
}

const sumRevenue = (bookings) =>
  bookings.reduce((total, booking) => {
    const costSheetValue = Array.isArray(booking.costSheet) ? Number(booking.costSheet[0]?.newValue) || 0 : 0
    const scheduleValue = Array.isArray(booking.paymentSchedule) ? Number(booking.paymentSchedule[0]?.grandTotal) || 0 : 0
    return total + (Number(booking.basePrice) || costSheetValue || scheduleValue || 0)
  }, 0)

const getBookingWhere = async (filters = {}) => {
  const leadIds = await getLeadIdsByFilters(filters)
  return {
    ...withLeadIdFilter(leadIds),
    ...getDateRange(filters, "createdAt"),
    ...(filters.leadSource ? { source: { contains: filters.leadSource } } : {}),
  }
}

const getSummary = async (filters = {}) => {
  const leadWhere = await getLeadWhere(filters)
  const leadIds = await getLeadIdsByFilters(filters)
  const bookingWhere = await getBookingWhere(filters)
  const visitWhere = {
    ...withLeadIdFilter(leadIds),
    ...getDateRange(filters, "scheduledOn"),
  }

  const [
    totalLeads,
    assignedLeads,
    unassignedLeads,
    qualifiedLeads,
    unqualifiedLeads,
    siteVisits,
    bookingCount,
    statusBookedLeads,
    bookings,
  ] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, teamId: { not: null } } }),
    prisma.lead.count({ where: { ...leadWhere, teamId: null } }),
    prisma.lead.count({ where: { ...leadWhere, status: "Qualified" } }),
    prisma.lead.count({ where: { ...leadWhere, status: "Unqualified" } }),
    prisma.scheduleVisit.count({ where: visitWhere }),
    prisma.booking.count({ where: bookingWhere }),
    prisma.lead.count({ where: { ...leadWhere, status: "Booked" } }),
    prisma.booking.findMany({ where: bookingWhere, include: { costSheet: true, paymentSchedule: true } }),
  ])

  return {
    totalLeads,
    assignedLeads,
    unassignedLeads,
    qualifiedLeads,
    siteVisits,
    bookings: bookingCount || statusBookedLeads,
    unqualifiedLeads,
    totalRevenue: sumRevenue(bookings),
  }
}

const getLeadStatus = async (filters = {}) => {
  const leads = await prisma.lead.findMany({
    where: await getLeadWhere(filters),
    select: { status: true },
  })
  return countBy(leads, (lead) => lead.status || "New", leadStatuses)
}

const getMonthlyLeads = async (filters = {}) => {
  const leadIds = await getLeadIdsByFilters(filters)
  const activities = await prisma.leadActivity.findMany({
    where: {
      ...withLeadIdFilter(leadIds),
      type: { in: ["LEAD_CREATED", "LEAD_ASSIGNED"] },
      ...getDateRange(filters, "createdAt"),
    },
    distinct: ["leadId"],
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  })

  return countBy(activities, (activity) => {
    const date = new Date(activity.createdAt)
    return date.toLocaleString("en-IN", { month: "short", year: "numeric" })
  })
}

const getSalesPerformance = async (filters = {}) => {
  const userWhere = {
    ...(filters.salesUserId ? { id: Number(filters.salesUserId) } : {}),
    OR: [{ role: "SALES" }, { department: "SALES" }],
  }
  const users = await prisma.user.findMany({
    where: userWhere,
    orderBy: [{ firstName: "asc" }, { username: "asc" }],
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  })
  const baseFilters = { ...filters, salesUserId: undefined }

  return Promise.all(users.map(async (user) => {
    const userFilters = { ...baseFilters, salesUserId: user.id }
    const leadWhere = await getLeadWhere(userFilters)
    const leadIds = await getLeadIdsByFilters(userFilters)
    const [assignedLeads, qualifiedLeads, followUpsDone, missedFollowUps, siteVisits, bookings] = await Promise.all([
      prisma.lead.count({ where: leadWhere }),
      prisma.lead.count({ where: { ...leadWhere, status: "Qualified" } }),
      prisma.followUp.count({ where: { salesUserId: user.id, status: "Done", ...getDateRange(filters, "createdAt") } }),
      prisma.followUp.count({ where: { salesUserId: user.id, status: "Missed", ...getDateRange(filters, "createdAt") } }),
      prisma.scheduleVisit.count({ where: { ...withLeadIdFilter(leadIds), ...getDateRange(filters, "scheduledOn") } }),
      prisma.booking.count({ where: { ...withLeadIdFilter(leadIds), ...getDateRange(filters, "createdAt") } }),
    ])

    return {
      userId: user.id,
      userName: getName(user),
      assignedLeads,
      qualifiedLeads,
      followUpsDone,
      missedFollowUps,
      siteVisits,
      bookings,
      conversionPercentage: assignedLeads ? Number(((bookings / assignedLeads) * 100).toFixed(2)) : 0,
    }
  }))
}

const getFollowups = async (filters = {}) => {
  const leadIds = await getLeadIdsByFilters(filters)
  const rows = await prisma.followUp.findMany({
    where: {
      ...withLeadIdFilter(leadIds),
      ...(filters.salesUserId ? { salesUserId: Number(filters.salesUserId) } : {}),
      ...getDateRange(filters, "createdAt"),
    },
    select: { status: true },
  })
  return countBy(rows, (row) => row.status || "Pending", followupStatuses)
}

const getLeadSources = async (filters = {}) => {
  const leads = await prisma.lead.findMany({
    where: await getLeadWhere({ ...filters, leadSource: undefined }),
    select: { channelPartner: true, fundingSource: true },
  })
  return countBy(leads, (lead) => lead.channelPartner || lead.fundingSource || "Unknown")
}

const getSiteVisits = async (filters = {}) => {
  const leadIds = await getLeadIdsByFilters(filters)
  const rows = await prisma.scheduleVisit.findMany({
    where: {
      ...withLeadIdFilter(leadIds),
      ...getDateRange(filters, "scheduledOn"),
    },
    select: { status: true },
  })
  return countBy(rows, (row) => row.status || "Scheduled", visitStatuses)
}

const getBookings = async (filters = {}) => {
  const bookingWhere = await getBookingWhere(filters)
  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: { costSheet: true, paymentSchedule: true },
    orderBy: { createdAt: "asc" },
  })
  const grouped = new Map()

  bookings.forEach((booking) => {
    const date = new Date(booking.bookedOn || booking.createdAt)
    const key = date.toLocaleString("en-IN", { month: "short", year: "numeric" })
    const current = grouped.get(key) || { name: key, bookings: 0, revenue: 0 }
    current.bookings += 1
    current.revenue += sumRevenue([booking])
    grouped.set(key, current)
  })

  return Array.from(grouped.values())
}

const getRecentActivities = async (filters = {}) => {
  const leadIds = await getLeadIdsByFilters(filters)
  const activities = await prisma.leadActivity.findMany({
    where: {
      ...withLeadIdFilter(leadIds),
      ...getDateRange(filters, "createdAt"),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      user: { select: { id: true, firstName: true, lastName: true, username: true, email: true } },
    },
  })

  return activities.map((activity) => ({
    id: activity.id,
    leadId: activity.leadId,
    leadName: getLeadName(activity.lead),
    activity: activity.type,
    description: activity.message,
    userName: getName(activity.user),
    createdAt: activity.createdAt,
  }))
}

module.exports = {
  getBookings,
  getFollowups,
  getLeadSources,
  getLeadStatus,
  getMonthlyLeads,
  getRecentActivities,
  getSalesPerformance,
  getSiteVisits,
  getSummary,
}
