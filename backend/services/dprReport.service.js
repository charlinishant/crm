const prisma = require("../lib/prisma")
const XLSX = require("xlsx")
const { formatPhoneNumber } = require("../utils/phone")

/**
 * Format duration in seconds into human-readable string (e.g. "1h 24m 10s")
 */
const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
  if (totalSeconds === 0) return "0s"
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`)
  parts.push(`${remainingSeconds}s`)
  return parts.join(" ")
}

/**
 * Format currency in Indian numbering format (e.g. ₹ 1,50,000)
 */
const formatCurrency = (amount) => {
  const num = Number(amount) || 0
  return `₹ ${num.toLocaleString("en-IN")}`
}

/**
 * Get IST Date Boundaries for start and end of selected date range
 */
const getISTDateBoundaries = (fromDateStr, toDateStr) => {
  const now = new Date()
  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)

  const fromDate = fromDateStr ? String(fromDateStr).trim() : todayIST
  const toDate = toDateStr ? String(toDateStr).trim() : fromDate

  const start = new Date(`${fromDate}T00:00:00+05:30`)
  const end = new Date(`${toDate}T23:59:59.999+05:30`)

  return {
    fromDate,
    toDate,
    start,
    end,
    todayIST,
    isToday: fromDate === todayIST && toDate === todayIST,
  }
}

const isAnsweredCall = (status) =>
  ["connected", "completed", "answered", "in-progress"].includes(String(status || "").toLowerCase())

const isMissedCall = (status) =>
  ["missed", "no-answer", "busy", "rejected", "failed", "canceled", "cancelled"].includes(String(status || "").toLowerCase())

const getUserDisplayName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "Unassigned")

/**
 * Aggregates DPR (Daily Performance Report) metrics across callers for the date range
 */
const getDprData = async (filters = {}) => {
  const { fromDate, toDate, start, end, todayIST, isToday } = getISTDateBoundaries(filters.fromDate, filters.toDate)
  const now = new Date()

  // 1. Fetch eligible sales callers
  const userWhere = {
    ...(filters.salesUserId ? { id: Number(filters.salesUserId) } : {}),
    OR: [
      { role: "SALES" },
      { department: "SALES" },
      { role: "PRE_SALES" },
      { department: "PRE_SALES" },
      { role: "MANAGER" },
      { role: "ADMIN" },
    ],
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    include: {
      mcubeAgent: true,
    },
    orderBy: [{ firstName: "asc" }, { username: "asc" }],
  })

  // Date range filter for timestamps
  const callDateRange = { createdAt: { gte: start, lte: end } }
  const visitDateRange = { scheduledOn: { gte: start, lte: end } }
  const followupDateRange = { followUpDate: { gte: start, lte: end } }
  const bookingDateRange = { createdAt: { gte: start, lte: end } }

  // Compute per-caller DPR rows in parallel
  const callerRows = await Promise.all(
    users.map(async (user) => {
      const userName = getUserDisplayName(user)
      const userLeadWhere = { teamId: user.id, is_delete: false }

      // ─── A. CALL LOGS & TELEPHONY (EFFORT) ───────────────────────────
      const calls = await prisma.callLog.findMany({
        where: {
          ...callDateRange,
          OR: [{ agentId: user.id }, { lead: { teamId: user.id } }],
        },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              channelPartner: true,
              fundingSource: true,
            },
          },
        },
        orderBy: { id: "desc" },
      })

      const totalCalls = calls.length
      let outboundCalls = 0
      let inboundCalls = 0
      let connectedCalls = 0
      let missedCallsCount = 0
      let totalTalkTimeSeconds = 0

      const dispositionCounts = {
        callbackLater: 0,
        notInterested: 0,
        wrongNumber: 0,
        noAnswer: 0,
        busy: 0,
        qualified: 0,
        junk: 0,
        other: 0,
      }

      // Track sources called on
      const sourceMap = new Map()
      const workedLeadIdSet = new Set()

      calls.forEach((call) => {
        const dir = String(call.direction || "outbound").toLowerCase()
        if (dir === "inbound") inboundCalls++
        else outboundCalls++

        if (isAnsweredCall(call.status)) {
          connectedCalls++
          totalTalkTimeSeconds += Number(call.duration) || 0
        } else {
          missedCallsCount++
        }

        if (call.leadId) workedLeadIdSet.add(call.leadId)

        // Lead source tracking
        const src =
          call.lead?.channelPartner ||
          call.lead?.fundingSource ||
          call.campaignName ||
          "Direct / Untagged"
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1)

        // Disposition tracking
        const disp = String(call.disposition || "").trim().toLowerCase()
        if (disp) {
          if (disp.includes("callback") || disp.includes("call back")) dispositionCounts.callbackLater++
          else if (disp.includes("not interested") || disp.includes("not-interested")) dispositionCounts.notInterested++
          else if (disp.includes("wrong") || disp.includes("invalid")) dispositionCounts.wrongNumber++
          else if (disp.includes("no answer") || disp.includes("no-answer") || disp.includes("ringing")) dispositionCounts.noAnswer++
          else if (disp.includes("busy")) dispositionCounts.busy++
          else if (disp.includes("qual")) dispositionCounts.qualified++
          else if (disp.includes("junk") || disp.includes("lost") || disp.includes("spam")) dispositionCounts.junk++
          else dispositionCounts.other++
        }
      })

      const answerRate = totalCalls > 0 ? Number(((connectedCalls / totalCalls) * 100).toFixed(1)) : 0
      const avgDurationSeconds = connectedCalls > 0 ? Math.round(totalTalkTimeSeconds / connectedCalls) : 0
      const totalTalkTimeFormatted = formatDuration(totalTalkTimeSeconds)
      const avgDurationFormatted = formatDuration(avgDurationSeconds)
      const totalDispositions = Object.values(dispositionCounts).reduce((a, b) => a + b, 0)

      // Add other activities to unique leads worked
      const [userActivities, userNotes] = await Promise.all([
        prisma.leadActivity.findMany({
          where: { userId: user.id, createdAt: { gte: start, lte: end } },
          select: { leadId: true },
        }),
        prisma.leadNote.findMany({
          where: {
            createdAt: { gte: start, lte: end },
            OR: [
              ...(userName ? [{ owner: userName }] : []),
              ...(user.username ? [{ owner: user.username }] : []),
              ...(user.email ? [{ owner: user.email }] : []),
            ],
          },
          select: { leadId: true },
        }),
      ])
      userActivities.forEach((a) => a.leadId && workedLeadIdSet.add(a.leadId))
      userNotes.forEach((n) => n.leadId && workedLeadIdSet.add(n.leadId))
      const uniqueLeadsWorked = workedLeadIdSet.size

      // ─── B. ATTENDANCE & HOURS LOGGED ─────────────────────────────────
      const [attendanceRecords, userSessions] = await Promise.all([
        prisma.userAttendance.findMany({
          where: {
            userId: user.id,
            loginAt: { lte: end },
            OR: [{ logoutAt: null }, { logoutAt: { gte: start } }],
          },
          orderBy: { loginAt: "asc" },
        }),
        prisma.userSession.findMany({
          where: {
            userId: user.id,
            loginAt: { lte: end },
            OR: [{ logoutAt: null }, { logoutAt: { gte: start } }],
          },
          orderBy: { loginAt: "asc" },
        }),
      ])

      let totalSessionSeconds = 0
      let totalBreakSeconds = 0
      let firstLoginTime = "-"
      let lastLogoutTime = "-"
      let attendanceStatus = "Offline"

      if (attendanceRecords.length > 0) {
        attendanceStatus = attendanceRecords[attendanceRecords.length - 1].status || "Available"
        attendanceRecords.forEach((att) => {
          totalBreakSeconds += att.totalBreakSeconds || 0
          if (att.loginAt && firstLoginTime === "-") {
            firstLoginTime = new Date(att.loginAt).toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          }
          if (att.logoutAt) {
            lastLogoutTime = new Date(att.logoutAt).toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          }
        })
      }

      userSessions.forEach((sess) => {
        const sessStart = Math.max(sess.loginAt.getTime(), start.getTime())
        const sessEnd = sess.logoutAt
          ? Math.min(sess.logoutAt.getTime(), end.getTime())
          : Math.min(now.getTime(), end.getTime())
        if (sessEnd > sessStart) {
          totalSessionSeconds += Math.floor((sessEnd - sessStart) / 1000)
        }
        if (firstLoginTime === "-" && sess.loginAt) {
          firstLoginTime = new Date(sess.loginAt).toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        }
      })

      const hoursLogged = formatDuration(totalSessionSeconds)
      const breakTime = formatDuration(totalBreakSeconds)

      // ─── C. OUTCOMES (RESULTS) ─────────────────────────────────────────
      const [
        assignedLeadsCount,
        leadsAssignedToday,
        qualifiedLeadsCount,
        siteVisitsScheduled,
        siteVisitsConducted,
        followupsDone,
        bookings,
      ] = await Promise.all([
        prisma.lead.count({ where: userLeadWhere }),
        prisma.leadActivity.count({
          where: {
            type: { in: ["LEAD_ASSIGNED", "LEAD_CREATED"] },
            userId: user.id,
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.lead.count({ where: { ...userLeadWhere, status: "Qualified" } }),
        prisma.scheduleVisit.count({
          where: {
            ...visitDateRange,
            OR: [{ salesExecutive: { contains: userName } }, { lead: { teamId: user.id } }],
          },
        }),
        prisma.scheduleVisit.count({
          where: {
            conductedOn: { gte: start, lte: end },
            status: { in: ["Done", "Visit Done", "conducted", "completed"] },
            OR: [{ salesExecutive: { contains: userName } }, { lead: { teamId: user.id } }],
          },
        }),
        prisma.followUp.count({
          where: {
            salesUserId: user.id,
            status: "Done",
            updatedAt: { gte: start, lte: end },
          },
        }),
        prisma.booking.findMany({
          where: {
            ...bookingDateRange,
            lead: { teamId: user.id },
          },
          select: {
            id: true,
            totalPrice: true,
            soldPrice: true,
            agreementValue: true,
            basePrice: true,
          },
        }),
      ])

      const bookingsCount = bookings.length
      const totalAgreementValue = bookings.reduce(
        (sum, b) => sum + (Number(b.soldPrice || b.agreementValue || b.totalPrice || b.basePrice) || 0),
        0
      )
      const denominator = leadsAssignedToday > 0 ? leadsAssignedToday : assignedLeadsCount
      const conversionPercentage = denominator > 0 ? Number(((bookingsCount / denominator) * 100).toFixed(2)) : 0

      // ─── D. SOURCES CALLED ON ──────────────────────────────────────────
      const sourcesBreakdown = Array.from(sourceMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)

      const sourcesSummary =
        sourcesBreakdown.length > 0
          ? sourcesBreakdown.map((s) => `${s.source} (${s.count})`).join(", ")
          : "None"

      // ─── E. MISSED & PENDING (ACCOUNTABILITY VIEW) ─────────────────────
      const [
        missedTasks,
        missedFollowups,
        missedSiteVisits,
        unreturnedInboundCalls,
        callbacksDueNotDone,
        assignedNotContacted,
      ] = await Promise.all([
        // 1. Missed Tasks: due before end date and not completed
        prisma.task.count({
          where: {
            assigneeId: user.id,
            status: { notIn: ["Completed", "Done"] },
            dueDate: { lt: isToday ? now : end },
          },
        }),
        // 2. Missed Follow-ups: Pending with followUpDate in the past
        prisma.followUp.count({
          where: {
            salesUserId: user.id,
            OR: [
              { status: "Missed", followUpDate: { lte: end } },
              { status: "Pending", followUpDate: { lt: isToday ? now : end } },
            ],
          },
        }),
        // 3. Missed Site Visits: Scheduled in the past but not completed
        prisma.scheduleVisit.count({
          where: {
            OR: [{ salesExecutive: { contains: userName } }, { lead: { teamId: user.id } }],
            OR: [
              { status: "Visit Missed" },
              { status: "Scheduled", scheduledOn: { lt: isToday ? now : end } },
            ],
          },
        }),
        // 4. Inbound calls missed where the caller phone was not called back
        (async () => {
          const missedInbounds = await prisma.callLog.findMany({
            where: {
              ...callDateRange,
              direction: "inbound",
              status: { in: ["missed", "no-answer", "busy", "failed"] },
              OR: [{ agentId: user.id }, { lead: { teamId: user.id } }],
            },
            select: { callerNumber: true, customerNumber: true, phone: true },
          })
          if (!missedInbounds.length) return 0

          // Check if agent made subsequent outbound call to these numbers
          const inboundNumbers = missedInbounds
            .map((c) => c.callerNumber || c.customerNumber || c.phone)
            .filter(Boolean)

          const returnedOutbounds = await prisma.callLog.findMany({
            where: {
              agentId: user.id,
              direction: "outbound",
              createdAt: { gte: start },
              phone: { in: inboundNumbers },
            },
            select: { phone: true },
          })
          const returnedSet = new Set(returnedOutbounds.map((c) => c.phone))
          return missedInbounds.filter((c) => !returnedSet.has(c.callerNumber || c.customerNumber || c.phone)).length
        })(),
        // 5. Callbacks due not done: followups of type Callback overdue
        prisma.followUp.count({
          where: {
            salesUserId: user.id,
            type: "Callback",
            status: "Pending",
            followUpDate: { lt: isToday ? now : end },
          },
        }),
        // 6. Assigned leads that have NEVER been called or worked
        prisma.lead.count({
          where: {
            teamId: user.id,
            is_delete: false,
            callLogs: { none: {} },
            activities: { none: {} },
          },
        }),
      ])

      const totalMissedAndPending =
        missedTasks +
        missedFollowups +
        missedSiteVisits +
        unreturnedInboundCalls +
        callbacksDueNotDone +
        assignedNotContacted

      return {
        userId: user.id,
        userName,
        role: user.role || user.department || "Sales",
        phone: user.phone || "-",
        extension: user.mcubeAgent?.extension || "-",

        // ACTIVITY (Effort)
        activity: {
          totalCalls,
          outboundCalls,
          inboundCalls,
          connectedCalls,
          missedCalls: missedCallsCount,
          answerRate,
          totalTalkTimeSeconds,
          totalTalkTimeFormatted,
          avgDurationSeconds,
          avgDurationFormatted,
          uniqueLeadsWorked,
          hoursLogged: totalSessionSeconds > 0 ? hoursLogged : "0m",
          breakTime: totalBreakSeconds > 0 ? breakTime : "0m",
          firstLoginTime,
          lastLogoutTime,
          attendanceStatus,
        },

        // OUTCOMES (Results)
        outcomes: {
          dispositionsLogged: totalDispositions,
          dispositionBreakdown: dispositionCounts,
          leadsAssigned: assignedLeadsCount,
          leadsAssignedToday,
          leadsQualified: qualifiedLeadsCount,
          siteVisitsScheduled,
          siteVisitsConducted,
          followupsDone,
          bookingsCount,
          agreementValue: totalAgreementValue,
          agreementValueFormatted: formatCurrency(totalAgreementValue),
          conversionPercentage,
        },

        // SOURCES CALLED ON
        sources: {
          sourcesBreakdown,
          sourcesSummary,
          topSource: sourcesBreakdown[0]?.source || "-",
        },

        // MISSED & PENDING (Accountability)
        missed: {
          missedTasks,
          missedFollowups,
          missedSiteVisits,
          unreturnedInboundCalls,
          callbacksDueNotDone,
          assignedNotContacted,
          totalMissedAndPending,
        },
      }
    })
  )

  // Calculate overall summary across all callers
  const summary = {
    totalCallers: callerRows.length,
    totalCalls: callerRows.reduce((sum, r) => sum + r.activity.totalCalls, 0),
    totalConnected: callerRows.reduce((sum, r) => sum + r.activity.connectedCalls, 0),
    totalTalkTimeSeconds: callerRows.reduce((sum, r) => sum + r.activity.totalTalkTimeSeconds, 0),
    totalDispositions: callerRows.reduce((sum, r) => sum + r.outcomes.dispositionsLogged, 0),
    totalBookings: callerRows.reduce((sum, r) => sum + r.outcomes.bookingsCount, 0),
    totalAgreementValue: callerRows.reduce((sum, r) => sum + r.outcomes.agreementValue, 0),
    totalMissedAndPending: callerRows.reduce((sum, r) => sum + r.missed.totalMissedAndPending, 0),
  }
  summary.totalTalkTimeFormatted = formatDuration(summary.totalTalkTimeSeconds)
  summary.totalAgreementValueFormatted = formatCurrency(summary.totalAgreementValue)
  summary.overallAnswerRate =
    summary.totalCalls > 0 ? Number(((summary.totalConnected / summary.totalCalls) * 100).toFixed(1)) : 0

  return {
    dateRange: { fromDate, toDate, isToday },
    generatedAtIST: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    summary,
    callers: callerRows,
  }
}

/**
 * Generate full Excel DPR Workbook
 */
const generateDprExcelBuffer = async (filters = {}) => {
  const dpr = await getDprData(filters)
  const { dateRange, callers, summary } = dpr

  const wb = XLSX.utils.book_new()

  // ─── SHEET 1: DPR Main Table ───────────────────────────────────────
  const mainSheetData = [
    ["SWAMI CRM — DAILY PERFORMANCE REPORT (DPR)"],
    [`Period (IST): ${dateRange.fromDate} to ${dateRange.toDate} | Generated: ${dpr.generatedAtIST}`],
    [],
    // KPI Summary
    [
      "Total Callers", summary.totalCallers,
      "Total Calls", summary.totalCalls,
      "Connected Calls", summary.totalConnected,
      "Answer Rate", `${summary.overallAnswerRate}%`,
      "Total Talk Time", summary.totalTalkTimeFormatted,
      "Bookings", summary.totalBookings,
      "Total Agreement Value", summary.totalAgreementValueFormatted,
      "Total Missed / Pending", summary.totalMissedAndPending,
    ],
    [],
    // Group Header Row
    [
      "CALLER DETAILS", "", "", "",
      "ACTIVITY (EFFORT)", "", "", "", "", "", "", "", "", "",
      "OUTCOMES (RESULTS)", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "SOURCES CALLED ON", "",
      "MISSED & PENDING (ACCOUNTABILITY)", "", "", "", "", "", "",
    ],
    // Column Header Row
    [
      "Salesperson",
      "Role",
      "Phone",
      "Extension",

      // Activity
      "Total Calls",
      "Outbound",
      "Inbound",
      "Connected",
      "Answer %",
      "Talk Time",
      "Avg Duration",
      "Leads Worked",
      "Hours Logged",
      "Break Time",

      // Outcomes
      "Dispositions Logged",
      "Callback Later",
      "Not Interested",
      "Wrong Number",
      "No Answer",
      "Busy",
      "Qualified",
      "Junk",
      "Assigned Leads",
      "Site Visits Sched",
      "Site Visits Done",
      "Follow-ups Done",
      "Bookings",
      "Agreement Value",
      "Conversion %",

      // Sources
      "Top Lead Source",
      "Sources Breakdown Summary",

      // Missed & Pending
      "Missed Tasks",
      "Missed Follow-ups",
      "Missed Site Visits",
      "Unreturned Inbounds",
      "Overdue Callbacks",
      "Assigned Not Contacted",
      "Total Missed / Slipping",
    ],
  ]

  callers.forEach((row) => {
    mainSheetData.push([
      row.userName,
      row.role,
      row.phone,
      row.extension,

      // Activity
      row.activity.totalCalls,
      row.activity.outboundCalls,
      row.activity.inboundCalls,
      row.activity.connectedCalls,
      `${row.activity.answerRate}%`,
      row.activity.totalTalkTimeFormatted,
      row.activity.avgDurationFormatted,
      row.activity.uniqueLeadsWorked,
      row.activity.hoursLogged,
      row.activity.breakTime,

      // Outcomes
      row.outcomes.dispositionsLogged,
      row.outcomes.dispositionBreakdown.callbackLater,
      row.outcomes.dispositionBreakdown.notInterested,
      row.outcomes.dispositionBreakdown.wrongNumber,
      row.outcomes.dispositionBreakdown.noAnswer,
      row.outcomes.dispositionBreakdown.busy,
      row.outcomes.dispositionBreakdown.qualified,
      row.outcomes.dispositionBreakdown.junk,
      row.outcomes.leadsAssigned,
      row.outcomes.siteVisitsScheduled,
      row.outcomes.siteVisitsConducted,
      row.outcomes.followupsDone,
      row.outcomes.bookingsCount,
      row.outcomes.agreementValueFormatted,
      `${row.outcomes.conversionPercentage}%`,

      // Sources
      row.sources.topSource,
      row.sources.sourcesSummary,

      // Missed
      row.missed.missedTasks,
      row.missed.missedFollowups,
      row.missed.missedSiteVisits,
      row.missed.unreturnedInboundCalls,
      row.missed.callbacksDueNotDone,
      row.missed.assignedNotContacted,
      row.missed.totalMissedAndPending,
    ])
  })

  // Summary Row
  mainSheetData.push([
    "TOTAL / AVERAGE",
    "",
    "",
    "",
    summary.totalCalls,
    callers.reduce((s, r) => s + r.activity.outboundCalls, 0),
    callers.reduce((s, r) => s + r.activity.inboundCalls, 0),
    summary.totalConnected,
    `${summary.overallAnswerRate}%`,
    summary.totalTalkTimeFormatted,
    "",
    callers.reduce((s, r) => s + r.activity.uniqueLeadsWorked, 0),
    "",
    "",
    summary.totalDispositions,
    callers.reduce((s, r) => s + r.outcomes.dispositionBreakdown.callbackLater, 0),
    callers.reduce((s, r) => s + r.outcomes.dispositionBreakdown.notInterested, 0),
    callers.reduce((s, r) => s + r.outcomes.dispositionBreakdown.wrongNumber, 0),
    callers.reduce((s, r) => s + r.outcomes.dispositionBreakdown.noAnswer, 0),
    callers.reduce((s, r) => s + r.outcomes.dispositionBreakdown.busy, 0),
    callers.reduce((s, r) => s + r.outcomes.dispositionBreakdown.qualified, 0),
    callers.reduce((s, r) => s + r.outcomes.dispositionBreakdown.junk, 0),
    callers.reduce((s, r) => s + r.outcomes.leadsAssigned, 0),
    callers.reduce((s, r) => s + r.outcomes.siteVisitsScheduled, 0),
    callers.reduce((s, r) => s + r.outcomes.siteVisitsConducted, 0),
    callers.reduce((s, r) => s + r.outcomes.followupsDone, 0),
    summary.totalBookings,
    summary.totalAgreementValueFormatted,
    "",
    "",
    "",
    callers.reduce((s, r) => s + r.missed.missedTasks, 0),
    callers.reduce((s, r) => s + r.missed.missedFollowups, 0),
    callers.reduce((s, r) => s + r.missed.missedSiteVisits, 0),
    callers.reduce((s, r) => s + r.missed.unreturnedInboundCalls, 0),
    callers.reduce((s, r) => s + r.missed.callbacksDueNotDone, 0),
    callers.reduce((s, r) => s + r.missed.assignedNotContacted, 0),
    summary.totalMissedAndPending,
  ])

  const wsMain = XLSX.utils.aoa_to_sheet(mainSheetData)

  // Configure column widths
  wsMain["!cols"] = [
    { wch: 22 }, // Caller Name
    { wch: 14 }, // Role
    { wch: 15 }, // Phone
    { wch: 10 }, // Ext
    { wch: 12 }, // Total Calls
    { wch: 10 }, // Outbound
    { wch: 10 }, // Inbound
    { wch: 12 }, // Connected
    { wch: 10 }, // Answer %
    { wch: 14 }, // Talk Time
    { wch: 12 }, // Avg Dur
    { wch: 14 }, // Leads Worked
    { wch: 14 }, // Hours Logged
    { wch: 12 }, // Break Time
    { wch: 18 }, // Dispositions
    { wch: 14 }, // Callback Later
    { wch: 14 }, // Not Interested
    { wch: 14 }, // Wrong Number
    { wch: 12 }, // No Answer
    { wch: 10 }, // Busy
    { wch: 12 }, // Qualified
    { wch: 10 }, // Junk
    { wch: 14 }, // Assigned Leads
    { wch: 16 }, // Visits Sched
    { wch: 16 }, // Visits Done
    { wch: 16 }, // Followups Done
    { wch: 10 }, // Bookings
    { wch: 20 }, // Agreement Value
    { wch: 14 }, // Conversion %
    { wch: 22 }, // Top Source
    { wch: 40 }, // Sources Breakdown
    { wch: 14 }, // Missed Tasks
    { wch: 18 }, // Missed Followups
    { wch: 18 }, // Missed Visits
    { wch: 20 }, // Unreturned Calls
    { wch: 18 }, // Overdue Callbacks
    { wch: 22 }, // Assigned Not Contacted
    { wch: 20 }, // Total Missed
  ]

  XLSX.utils.book_append_sheet(wb, wsMain, "Daily Performance Report")

  // ─── SHEET 2: Source Breakdown By Caller ───────────────────────────
  const sourceSheetData = [
    ["SOURCES WORKED PER SALESPERSON"],
    [`Period: ${dateRange.fromDate} to ${dateRange.toDate}`],
    [],
    ["Salesperson", "Role", "Lead Source / Campaign", "Calls / Leads Handled"],
  ]

  callers.forEach((row) => {
    if (row.sources.sourcesBreakdown.length === 0) {
      sourceSheetData.push([row.userName, row.role, "No sources logged", 0])
    } else {
      row.sources.sourcesBreakdown.forEach((s) => {
        sourceSheetData.push([row.userName, row.role, s.source, s.count])
      })
    }
  })

  const wsSource = XLSX.utils.aoa_to_sheet(sourceSheetData)
  wsSource["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 30 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, wsSource, "Sources By Caller")

  // ─── SHEET 3: Accountability & Slipping Commitments ────────────────
  const missedSheetData = [
    ["ACCOUNTABILITY VIEW — MISSED & PENDING COMMITMENTS"],
    [`Period: ${dateRange.fromDate} to ${dateRange.toDate}`],
    [],
    [
      "Salesperson",
      "Missed Tasks",
      "Missed Follow-ups",
      "Missed Site Visits",
      "Unreturned Inbounds",
      "Overdue Callbacks",
      "Assigned Not Contacted",
      "Total Slipping Commitments",
    ],
  ]

  callers.forEach((row) => {
    missedSheetData.push([
      row.userName,
      row.missed.missedTasks,
      row.missed.missedFollowups,
      row.missed.missedSiteVisits,
      row.missed.unreturnedInboundCalls,
      row.missed.callbacksDueNotDone,
      row.missed.assignedNotContacted,
      row.missed.totalMissedAndPending,
    ])
  })

  const wsMissed = XLSX.utils.aoa_to_sheet(missedSheetData)
  wsMissed["!cols"] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 24 },
    { wch: 26 },
  ]
  XLSX.utils.book_append_sheet(wb, wsMissed, "Missed & Pending")

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
}

/**
 * Detailed drilldown of specific items for a caller and metric
 */
const getDprDrilldown = async (filters = {}) => {
  const { fromDate, toDate, start, end, todayIST, isToday } = getISTDateBoundaries(filters.fromDate, filters.toDate)
  const now = new Date()
  const userId = Number(filters.userId || filters.salesUserId)
  const metric = String(filters.metric || "").trim()

  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null
  const userName = user ? getUserDisplayName(user) : "Caller"

  let title = `${metric} — ${userName}`
  let items = []
  let type = "list"

  if (metric === "missedTasks") {
    title = `Missed Tasks — ${userName}`
    type = "tasks"
    items = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { notIn: ["Completed", "Done"] },
        dueDate: { lt: isToday ? now : end },
      },
      orderBy: { dueDate: "asc" },
      take: 200,
    })
  } else if (metric === "missedFollowups") {
    title = `Missed & Overdue Follow-ups — ${userName}`
    type = "followups"
    items = await prisma.followUp.findMany({
      where: {
        salesUserId: userId,
        OR: [
          { status: "Missed", followUpDate: { lte: end } },
          { status: "Pending", followUpDate: { lt: isToday ? now : end } },
        ],
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, companyName: true, phones: true } },
      },
      orderBy: { followUpDate: "asc" },
      take: 200,
    })
  } else if (metric === "missedSiteVisits") {
    title = `Missed Site Visits — ${userName}`
    type = "visits"
    items = await prisma.scheduleVisit.findMany({
      where: {
        OR: [{ salesExecutive: { contains: userName } }, { lead: { teamId: userId } }],
        OR: [
          { status: "Visit Missed" },
          { status: "Scheduled", scheduledOn: { lt: isToday ? now : end } },
        ],
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, companyName: true, phones: true } },
      },
      orderBy: { scheduledOn: "asc" },
      take: 200,
    })
  } else if (metric === "assignedNotContacted") {
    title = `Assigned But Not Contacted Leads — ${userName}`
    type = "leads"
    items = await prisma.lead.findMany({
      where: {
        teamId: userId,
        is_delete: false,
        callLogs: { none: {} },
        activities: { none: {} },
      },
      orderBy: { id: "desc" },
      take: 200,
    })
  } else if (metric === "callbacksDueNotDone") {
    title = `Callbacks Due Not Done — ${userName}`
    type = "followups"
    items = await prisma.followUp.findMany({
      where: {
        salesUserId: userId,
        type: "Callback",
        status: "Pending",
        followUpDate: { lt: isToday ? now : end },
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, companyName: true, phones: true } },
      },
      orderBy: { followUpDate: "asc" },
      take: 200,
    })
  }

  return {
    title,
    type,
    count: items.length,
    userName,
    items,
  }
}

module.exports = {
  getDprData,
  generateDprExcelBuffer,
  getDprDrilldown,
  getISTDateBoundaries,
}
