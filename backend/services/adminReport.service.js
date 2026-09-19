const prisma = require("../lib/prisma")
const { isAdminUser, maskLeadData } = require("../utils/phoneMask")

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
  const dateRange = getDateRange(filters, "createdAt")
  if (dateRange.createdAt) {
    const activeLeadIds = await prisma.leadActivity.findMany({
      where: {
        type: { in: ["LEAD_CREATED", "LEAD_ASSIGNED"] },
        ...dateRange,
      },
      select: { leadId: true },
    }).then((list) => list.map((a) => a.leadId).filter(Boolean))
    andFilters.push({ id: { in: activeLeadIds.length ? activeLeadIds : [-1] } })
  }

  if (filters.leadSource) {
    if (filters.leadSource === "Unknown" || filters.leadSource === "Untagged") {
      andFilters.push({
        AND: [
          { OR: [{ channelPartner: null }, { channelPartner: "" }, { channelPartner: "Untagged" }] },
          { OR: [{ fundingSource: null }, { fundingSource: "" }, { fundingSource: "Untagged" }] },
        ],
      })
    } else {
      andFilters.push({
        OR: [
          { channelPartner: filters.leadSource },
          { fundingSource: filters.leadSource },
          { channelPartner: { contains: filters.leadSource } },
          { fundingSource: { contains: filters.leadSource } },
        ],
      })
    }
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
    OR: [
      { role: "SALES" },
      { department: "SALES" },
      { role: "PRE_SALES" },
      { department: "PRE_SALES" },
    ],
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

const getDrilldownLeads = async (filters = {}, req = null) => {
  const segmentType = String(filters.segmentType || "").toLowerCase()
  const metric = String(filters.metric || "").toLowerCase()
  const salesUserId = filters.salesUserId ? Number(filters.salesUserId) : undefined
  const sourceName = filters.source || filters.leadSource || undefined
  const statusName = filters.status || filters.leadStatus || undefined

  let baseWhere = await getLeadWhere({
    ...filters,
    leadSource: segmentType === "source" ? undefined : filters.leadSource,
    leadStatus: segmentType === "status" ? undefined : filters.leadStatus,
  })

  let finalWhere = { ...baseWhere }
  let title = "Leads Drilldown"

  if (segmentType === "source" || sourceName) {
    const src = sourceName || filters.source
    title = `Lead Source: ${src}`
    if (src === "Unknown" || src === "Untagged") {
      finalWhere.AND = [
        ...(finalWhere.AND || []),
        {
          AND: [
            { OR: [{ channelPartner: null }, { channelPartner: "" }, { channelPartner: "Untagged" }] },
            { OR: [{ fundingSource: null }, { fundingSource: "" }, { fundingSource: "Untagged" }] },
          ],
        },
      ]
    } else {
      finalWhere.AND = [
        ...(finalWhere.AND || []),
        {
          OR: [
            { channelPartner: src },
            { fundingSource: src },
            { channelPartner: { contains: src } },
            { fundingSource: { contains: src } },
          ],
        },
      ]
    }
  } else if (segmentType === "salesperformance" || metric) {
    const targetUserId = salesUserId || (filters.userId ? Number(filters.userId) : undefined)
    let agentName = "Sales User"
    if (targetUserId) {
      const u = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { firstName: true, lastName: true, username: true },
      })
      if (u) agentName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username
    }

    if (metric === "assigned" || metric === "assignedleads") {
      title = `Assigned Leads — ${agentName}`
      if (targetUserId) finalWhere.teamId = targetUserId
    } else if (metric === "qualified" || metric === "qualifiedleads") {
      title = `Qualified Leads — ${agentName}`
      if (targetUserId) finalWhere.teamId = targetUserId
      finalWhere.status = "Qualified"
    } else if (metric === "bookings" || metric === "booked") {
      title = `Bookings — ${agentName}`
      if (targetUserId) finalWhere.teamId = targetUserId
      const bookingLeadIds = await prisma.booking.findMany({
        where: {
          ...getDateRange(filters, "createdAt"),
        },
        select: { leadId: true },
      }).then((bList) => bList.map((b) => b.leadId).filter(Boolean))

      finalWhere.OR = [
        { status: "Booked" },
        { id: { in: bookingLeadIds.length ? bookingLeadIds : [-1] } },
      ]
    } else if (metric === "followupsdone") {
      title = `Follow-ups Done — ${agentName}`
      const followUpLeadIds = await prisma.followUp.findMany({
        where: {
          salesUserId: targetUserId,
          status: "Done",
          ...getDateRange(filters, "createdAt"),
        },
        select: { leadId: true },
      }).then((fList) => fList.map((f) => f.leadId).filter(Boolean))
      finalWhere.id = { in: followUpLeadIds.length ? followUpLeadIds : [-1] }
    } else if (metric === "missedfollowups") {
      title = `Missed Follow-ups — ${agentName}`
      const followUpLeadIds = await prisma.followUp.findMany({
        where: {
          salesUserId: targetUserId,
          status: "Missed",
          ...getDateRange(filters, "createdAt"),
        },
        select: { leadId: true },
      }).then((fList) => fList.map((f) => f.leadId).filter(Boolean))
      finalWhere.id = { in: followUpLeadIds.length ? followUpLeadIds : [-1] }
    } else if (metric === "sitevisits") {
      title = `Site Visits — ${agentName}`
      const visitLeadIds = await prisma.scheduleVisit.findMany({
        where: {
          ...(targetUserId ? { OR: [{ salesExecutiveId: targetUserId }, { assignedToId: targetUserId }] } : {}),
          ...getDateRange(filters, "scheduledOn"),
        },
        select: { leadId: true },
      }).then((vList) => vList.map((v) => v.leadId).filter(Boolean))
      finalWhere.id = { in: visitLeadIds.length ? visitLeadIds : [-1] }
    }
  } else if (segmentType === "status" || statusName) {
    const st = statusName || filters.status
    title = `Lead Status: ${st}`
    finalWhere.status = st
  } else if (segmentType === "sitevisits" || segmentType === "site_visits") {
    const visitStatus = filters.visitStatus || filters.status
    title = `Site Visits: ${visitStatus || "All"}`
    const visitWhere = {
      ...(visitStatus ? { status: visitStatus } : {}),
      ...getDateRange(filters, "scheduledOn"),
    }
    const visitLeadIds = await prisma.scheduleVisit.findMany({
      where: visitWhere,
      select: { leadId: true },
    }).then((vList) => vList.map((v) => v.leadId).filter(Boolean))
    finalWhere.id = { in: visitLeadIds.length ? visitLeadIds : [-1] }
  } else if (segmentType === "followups" || segmentType === "followup") {
    const followupStatus = filters.followupStatus || filters.status
    title = `Follow-ups: ${followupStatus || "All"}`
    const followWhere = {
      ...(followupStatus ? { status: followupStatus } : {}),
      ...getDateRange(filters, "createdAt"),
    }
    const followLeadIds = await prisma.followUp.findMany({
      where: followWhere,
      select: { leadId: true },
    }).then((fList) => fList.map((f) => f.leadId).filter(Boolean))
    finalWhere.id = { in: followLeadIds.length ? followLeadIds : [-1] }
  } else if (segmentType === "bookings") {
    title = "Booked Leads"
    const bookingWhere = await getBookingWhere(filters)
    const bookingLeadIds = await prisma.booking.findMany({
      where: bookingWhere,
      select: { leadId: true },
    }).then((bList) => bList.map((b) => b.leadId).filter(Boolean))
    finalWhere.OR = [
      { status: "Booked" },
      { id: { in: bookingLeadIds.length ? bookingLeadIds : [-1] } },
    ]
  }

  const leads = await prisma.lead.findMany({
    where: finalWhere,
    orderBy: { id: "desc" },
    take: 500,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      phones: true,
      status: true,
      tags: true,
      fundingSource: true,
      channelPartner: true,
      interestedProjects: true,
      siteVisitProject: true,
      budget: true,
      teamId: true,
      team: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
        },
      },
      callLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          disposition: true,
          status: true,
          duration: true,
          createdAt: true,
        },
      },
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          stage: true,
          totalPrice: true,
          bookedOn: true,
          createdAt: true,
        },
      },
      scheduleVisits: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          scheduledOn: true,
          createdAt: true,
        },
      },
    },
  })

  const isAdmin = req ? isAdminUser(req) : false
  const safeLeads = leads.map((l) => {
    const masked = maskLeadData(l, isAdmin)
    const latestCall = l.callLogs?.[0] || null
    const latestBooking = l.bookings?.[0] || null
    const latestVisit = l.scheduleVisits?.[0] || null
    const latestActivity = l.activities?.[0] || null

    let primaryPhone = "-"
    if (Array.isArray(masked.phones) && masked.phones.length > 0) {
      primaryPhone = typeof masked.phones[0] === "object" ? (masked.phones[0].value || masked.phones[0].phone || masked.phones[0].number || "-") : masked.phones[0]
    } else if (typeof masked.phones === "string") {
      primaryPhone = masked.phones
    }

    const receivedDate = latestActivity?.createdAt || latestVisit?.createdAt || latestCall?.createdAt || latestBooking?.createdAt || null

    return {
      ...masked,
      phone: primaryPhone,
      createdAt: receivedDate,
      latestCallDisposition: latestCall?.disposition || latestCall?.status || null,
      latestCallDate: latestCall?.createdAt || null,
      bookingStage: latestBooking?.stage || null,
      visitStatus: latestVisit?.status || null,
    }
  })

  return {
    title,
    count: safeLeads.length,
    leads: safeLeads,
    filters: {
      salesUserId: filters.salesUserId || null,
      projectId: filters.projectId || null,
      fromDate: filters.fromDate || null,
      toDate: filters.toDate || null,
      segmentType: filters.segmentType || null,
      metric: filters.metric || null,
      source: sourceName || null,
      status: statusName || null,
    },
  }
}

const getSalesUsers = async () => {
  return prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { role: "SALES" },
        { department: "SALES" },
        { role: "PRE_SALES" },
        { department: "PRE_SALES" },
      ],
    },
    orderBy: [{ firstName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      role: true,
      department: true,
    },
  })
}

module.exports = {
  getBookings,
  getDrilldownLeads,
  getFollowups,
  getLeadSources,
  getLeadStatus,
  getMonthlyLeads,
  getRecentActivities,
  getSalesPerformance,
  getSalesUsers,
  getSiteVisits,
  getSummary,
}
