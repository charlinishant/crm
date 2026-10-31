const prisma = require("../lib/prisma");
const XLSX = require("xlsx");
const { getISTDateBoundaries } = require("./dprReport.service");
const {
  CONTROLLED_PLATFORM_SOURCES,
  normalizeSourceName,
  resolveLeadSource,
  findDuplicateSources,
} = require("../utils/leadSourceNormalizer");

/**
 * Format duration in seconds into human-readable string (e.g. "1h 24m 10s")
 */
const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  if (totalSeconds === 0) return "0s";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${remainingSeconds}s`);
  return parts.join(" ");
};

/**
 * Format currency in Indian numbering format (e.g. ₹ 1,50,000)
 */
const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `₹ ${num.toLocaleString("en-IN")}`;
};

const isAnsweredCall = (status) =>
  ["connected", "completed", "answered", "in-progress"].includes(String(status || "").toLowerCase());

const getUserDisplayName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "Unassigned");

/**
 * Fetches all registered Channel Partners and builds lookup map
 */
const getRegisteredCPMap = async () => {
  const cpUsers = await prisma.user.findMany({
    where: {
      role: "CHANNEL_PARTNER",
    },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      reraNumber: true,
    },
  });

  const cpMap = new Map();
  cpUsers.forEach((cp) => {
    const fullName = [cp.firstName, cp.lastName].filter(Boolean).join(" ").trim();
    if (fullName) cpMap.set(fullName.toLowerCase(), cp);
    if (cp.username) cpMap.set(cp.username.toLowerCase(), cp);
    if (cp.email) cpMap.set(cp.email.toLowerCase(), cp);
    const canonical = normalizeSourceName(fullName || cp.username);
    cpMap.set(canonical.toLowerCase(), cp);
  });

  return { cpUsers, cpMap };
};

/**
 * Main Lead Source Performance Aggregation Engine
 * Reuses the shared counting layer (leads, calls, dispositions, visits, bookings)
 * grouped by canonical lead source / Channel Partner.
 */
const getLeadSourceReportData = async (filters = {}, currentUser = null) => {
  const { fromDate, toDate, start, end } = getISTDateBoundaries(filters.fromDate, filters.toDate);

  // 1. Fetch registered Channel Partners
  const { cpUsers, cpMap } = await getRegisteredCPMap();

  // 2. Build lead filter
  const leadWhere = {
    is_delete: false,
    ...(filters.projectId ? { interestedProjects: { contains: String(filters.projectId) } } : {}),
    ...(filters.salesUserId ? { teamId: Number(filters.salesUserId) } : {}),
  };

  // Channel Partner role scoping: if caller is a CP, they can only view their own source
  const isCPUser = String(currentUser?.role || "").toUpperCase() === "CHANNEL_PARTNER";
  if (isCPUser) {
    const cpName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") || currentUser.username;
    leadWhere.OR = [
      { channelPartner: { contains: cpName } },
      { channelPartner: currentUser.username },
      { tags: { contains: `cp:${cpName}` } },
    ];
  } else if (filters.leadSource) {
    const canonicalReq = normalizeSourceName(filters.leadSource);
    leadWhere.OR = [
      { channelPartner: { contains: filters.leadSource } },
      { channelPartner: { contains: canonicalReq } },
      { fundingSource: { contains: filters.leadSource } },
      { fundingSource: { contains: canonicalReq } },
    ];
  }

  // 3. Fetch all leads matching criteria
  const leads = await prisma.lead.findMany({
    where: leadWhere,
    include: {
      team: {
        select: { id: true, firstName: true, lastName: true, username: true, email: true },
      },
      callLogs: {
        where: { createdAt: { gte: start, lte: end } },
        select: {
          id: true,
          status: true,
          direction: true,
          duration: true,
          disposition: true,
          agentId: true,
          createdAt: true,
        },
      },
      scheduleVisits: {
        where: { scheduledOn: { gte: start, lte: end } },
        select: { id: true, status: true, project: true, salesExecutive: true, scheduledOn: true },
      },
      bookings: {
        where: { createdAt: { gte: start, lte: end } },
        include: { costSheet: true, paymentSchedule: true },
      },
    },
    orderBy: { id: "desc" },
  });

  // 4. Group leads by canonical source
  const sourceGroups = new Map();

  leads.forEach((lead) => {
    const resolution = resolveLeadSource(lead, cpMap);
    const sourceKey = resolution.canonicalSource;

    if (!sourceGroups.has(sourceKey)) {
      sourceGroups.set(sourceKey, {
        sourceName: sourceKey,
        sourceType: resolution.sourceType,
        isChannelPartner: resolution.isChannelPartner,
        cpUser: resolution.cpUser,
        leads: [],
      });
    }

    sourceGroups.get(sourceKey).leads.push(lead);
  });

  // Also collect all sales users for salesperson attribution name resolution
  const allSalesUsers = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true, username: true },
  });
  const salesUserMap = new Map();
  allSalesUsers.forEach((u) => {
    salesUserMap.set(u.id, getUserDisplayName(u));
  });

  // 5. Aggregate metrics per source
  const sourceRows = [];

  for (const [sourceName, group] of sourceGroups.entries()) {
    const groupLeads = group.leads;
    const totalLeadsProvided = groupLeads.length;

    let leadsAssigned = 0;
    let contactedLeadsCount = 0;
    let totalCalls = 0;
    let connectedCalls = 0;
    let totalTalkTimeSeconds = 0;

    let qualifiedCount = 0;
    let unqualifiedCount = 0;
    let junkCount = 0;

    let siteVisitsScheduled = 0;
    let siteVisitsConducted = 0;

    let bookingsCount = 0;
    let totalAgreementValue = 0;

    const dispositionCounts = {
      callbackLater: 0,
      notInterested: 0,
      wrongNumber: 0,
      noAnswer: 0,
      busy: 0,
      qualified: 0,
      junk: 0,
      other: 0,
    };

    // Track which salespeople worked leads of this source
    const salespersonWorkMap = new Map();

    groupLeads.forEach((lead) => {
      // Assignment
      if (lead.teamId) {
        leadsAssigned++;
        const sName = lead.team ? getUserDisplayName(lead.team) : salesUserMap.get(lead.teamId) || `Sales #${lead.teamId}`;
        const current = salespersonWorkMap.get(sName) || { userName: sName, userId: lead.teamId, leadsWorked: 0, calls: 0 };
        current.leadsWorked++;
        salespersonWorkMap.set(sName, current);
      }

      // Calls on this lead
      const leadCalls = lead.callLogs || [];
      if (leadCalls.length > 0) {
        contactedLeadsCount++;
        totalCalls += leadCalls.length;

        leadCalls.forEach((call) => {
          if (isAnsweredCall(call.status)) {
            connectedCalls++;
            totalTalkTimeSeconds += Number(call.duration) || 0;
          }

          // Dispositions
          const disp = String(call.disposition || "").trim().toLowerCase();
          if (disp) {
            if (disp.includes("callback") || disp.includes("call back")) dispositionCounts.callbackLater++;
            else if (disp.includes("not interested") || disp.includes("not-interested")) dispositionCounts.notInterested++;
            else if (disp.includes("wrong") || disp.includes("invalid")) dispositionCounts.wrongNumber++;
            else if (disp.includes("no answer") || disp.includes("no-answer") || disp.includes("ringing")) dispositionCounts.noAnswer++;
            else if (disp.includes("busy")) dispositionCounts.busy++;
            else if (disp.includes("qual")) dispositionCounts.qualified++;
            else if (disp.includes("junk") || disp.includes("lost") || disp.includes("spam")) dispositionCounts.junk++;
            else dispositionCounts.other++;
          }

          // Caller work attribution
          if (call.agentId) {
            const agentName = salesUserMap.get(call.agentId) || `Agent #${call.agentId}`;
            const current = salespersonWorkMap.get(agentName) || { userName: agentName, userId: call.agentId, leadsWorked: 0, calls: 0 };
            current.calls++;
            salespersonWorkMap.set(agentName, current);
          }
        });
      }

      // Lead status / Quality classification
      const status = String(lead.status || "").toLowerCase();
      if (status.includes("qual") || status.includes("book") || status.includes("clos")) {
        qualifiedCount++;
      } else if (status.includes("unqual") || status.includes("lost")) {
        unqualifiedCount++;
      } else if (status.includes("junk") || status.includes("wrong") || lead.callAttemptCount >= 5 && connectedCalls === 0) {
        junkCount++;
      }

      // Site visits
      const visits = lead.scheduleVisits || [];
      visits.forEach((v) => {
        siteVisitsScheduled++;
        const vStatus = String(v.status || "").toLowerCase();
        if (vStatus.includes("done") || vStatus.includes("confirm") || vStatus.includes("conducted")) {
          siteVisitsConducted++;
        }
      });

      // Bookings & Revenue
      const bks = lead.bookings || [];
      bks.forEach((b) => {
        bookingsCount++;
        const costSheet = b.costSheet;
        const finalVal = Number(costSheet?.totalUnitCost || costSheet?.agreementValue || b.totalAmount || 0);
        totalAgreementValue += finalVal;
      });
    });

    const leadsUnassigned = totalLeadsProvided - leadsAssigned;
    const assignedPercentage = totalLeadsProvided > 0 ? Number(((leadsAssigned / totalLeadsProvided) * 100).toFixed(1)) : 0;
    const contactRate = totalLeadsProvided > 0 ? Number(((contactedLeadsCount / totalLeadsProvided) * 100).toFixed(1)) : 0;
    const answerRate = totalCalls > 0 ? Number(((connectedCalls / totalCalls) * 100).toFixed(1)) : 0;
    const visitRate = totalLeadsProvided > 0 ? Number(((siteVisitsConducted / totalLeadsProvided) * 100).toFixed(1)) : 0;

    // Two-Way Conversion percentages (Key CP data-quality metrics)
    const qualifiedRate = totalLeadsProvided > 0 ? Number(((qualifiedCount / totalLeadsProvided) * 100).toFixed(1)) : 0;
    const bookingRate = totalLeadsProvided > 0 ? Number(((bookingsCount / totalLeadsProvided) * 100).toFixed(1)) : 0;

    // Salespeople list
    const salespeopleWorked = Array.from(salespersonWorkMap.values()).sort((a, b) => b.leadsWorked - a.leadsWorked);
    const salespeopleSummary = salespeopleWorked.map((s) => `${s.userName} (${s.leadsWorked})`).join(", ") || "-";

    sourceRows.push({
      sourceName,
      sourceType: group.sourceType,
      isChannelPartner: group.isChannelPartner,
      cpUser: group.cpUser,

      // Volume & Assignment
      leadsProvided: totalLeadsProvided,
      leadsAssigned,
      leadsUnassigned,
      assignedPercentage,

      // Effort & Calls
      contactedLeads: contactedLeadsCount,
      contactRate,
      totalCalls,
      connectedCalls,
      answerRate,
      totalTalkTimeSeconds,
      totalTalkTimeFormatted: formatDuration(totalTalkTimeSeconds),

      // Outcomes & Lead Quality
      qualified: qualifiedCount,
      unqualified: unqualifiedCount,
      junk: junkCount,
      inProgress: Math.max(0, totalLeadsProvided - (qualifiedCount + unqualifiedCount + junkCount)),
      dispositionBreakdown: dispositionCounts,

      // Site visits
      siteVisitsScheduled,
      siteVisitsConducted,
      visitRate,

      // Bookings & Revenue
      bookingsCount,
      bookingValue: totalAgreementValue,
      bookingValueFormatted: formatCurrency(totalAgreementValue),

      // Two-Way Conversion %
      qualifiedRate,
      bookingRate,

      // Salespeople Attribution
      salespeopleWorked,
      salespeopleSummary,
    });
  }

  // Sort descending by total leads provided
  sourceRows.sort((a, b) => b.leadsProvided - a.leadsProvided);

  // Overall summary row across all sources
  const summary = {
    totalSources: sourceRows.length,
    totalLeadsProvided: sourceRows.reduce((sum, r) => sum + r.leadsProvided, 0),
    totalAssigned: sourceRows.reduce((sum, r) => sum + r.leadsAssigned, 0),
    totalUnassigned: sourceRows.reduce((sum, r) => sum + r.leadsUnassigned, 0),
    totalContacted: sourceRows.reduce((sum, r) => sum + r.contactedLeads, 0),
    totalCalls: sourceRows.reduce((sum, r) => sum + r.totalCalls, 0),
    totalConnectedCalls: sourceRows.reduce((sum, r) => sum + r.connectedCalls, 0),
    totalQualified: sourceRows.reduce((sum, r) => sum + r.qualified, 0),
    totalUnqualified: sourceRows.reduce((sum, r) => sum + r.unqualified, 0),
    totalJunk: sourceRows.reduce((sum, r) => sum + r.junk, 0),
    totalSiteVisitsScheduled: sourceRows.reduce((sum, r) => sum + r.siteVisitsScheduled, 0),
    totalSiteVisitsConducted: sourceRows.reduce((sum, r) => sum + r.siteVisitsConducted, 0),
    totalBookings: sourceRows.reduce((sum, r) => sum + r.bookingsCount, 0),
    totalBookingValue: sourceRows.reduce((sum, r) => sum + r.bookingValue, 0),
    totalBookingValueFormatted: formatCurrency(sourceRows.reduce((sum, r) => sum + r.bookingValue, 0)),
  };

  summary.overallAssignedRate = summary.totalLeadsProvided > 0
    ? Number(((summary.totalAssigned / summary.totalLeadsProvided) * 100).toFixed(1))
    : 0;
  summary.overallContactRate = summary.totalLeadsProvided > 0
    ? Number(((summary.totalContacted / summary.totalLeadsProvided) * 100).toFixed(1))
    : 0;
  summary.overallQualifiedRate = summary.totalLeadsProvided > 0
    ? Number(((summary.totalQualified / summary.totalLeadsProvided) * 100).toFixed(1))
    : 0;
  summary.overallBookingRate = summary.totalLeadsProvided > 0
    ? Number(((summary.totalBookings / summary.totalLeadsProvided) * 100).toFixed(1))
    : 0;

  // Detect duplicates in raw database
  const rawSources = await prisma.lead.findMany({
    select: { channelPartner: true, fundingSource: true },
  });
  const rawSourceStrings = Array.from(
    new Set(rawSources.map((l) => (l.channelPartner || l.fundingSource || "").trim()).filter(Boolean))
  );
  const detectedDuplicates = findDuplicateSources(rawSourceStrings);

  return {
    dateRange: { fromDate, toDate },
    sources: sourceRows,
    summary,
    detectedDuplicates,
    controlledSources: CONTROLLED_PLATFORM_SOURCES,
    registeredCPCount: cpUsers.length,
  };
};

/**
 * Generate Multi-Sheet Excel Workbook for Lead Source / Channel Partner Performance
 */
const generateSourceExcelBuffer = async (filters = {}, currentUser = null) => {
  const data = await getLeadSourceReportData(filters, currentUser);
  const { dateRange, sources, summary } = data;

  const wb = XLSX.utils.book_new();

  // ── SHEET 1: Main Source Performance Table ──
  const mainSheetData = [
    ["INSITE ARC CRM — LEAD SOURCE & CHANNEL PARTNER PERFORMANCE REPORT"],
    [`Date Range: ${dateRange.fromDate} to ${dateRange.toDate} (Computed in IST)`],
    [],
    [
      "Lead Source / Channel Partner",
      "Type",
      "CP Contact",
      "CP RERA ID",
      "Leads Provided",
      "Assigned",
      "Assigned %",
      "Contacted",
      "Contact %",
      "Total Calls",
      "Connected Calls",
      "Answer Rate %",
      "Talk Time",
      "Qualified Leads",
      "Unqualified Leads",
      "Junk Leads",
      "Visits Scheduled",
      "Visits Conducted",
      "Bookings",
      "Booking Value (₹)",
      "Qualified Rate % (Qual ÷ Prov)",
      "Booking Rate % (Book ÷ Prov)",
      "Salespeople Worked",
    ],
  ];

  sources.forEach((row) => {
    mainSheetData.push([
      row.sourceName,
      row.sourceType,
      row.cpUser?.name ? `${row.cpUser.name} (${row.cpUser.phone})` : "-",
      row.cpUser?.reraNumber || "-",
      row.leadsProvided,
      row.leadsAssigned,
      `${row.assignedPercentage}%`,
      row.contactedLeads,
      `${row.contactRate}%`,
      row.totalCalls,
      row.connectedCalls,
      `${row.answerRate}%`,
      row.totalTalkTimeFormatted,
      row.qualified,
      row.unqualified,
      row.junk,
      row.siteVisitsScheduled,
      row.siteVisitsConducted,
      row.bookingsCount,
      row.bookingValue,
      `${row.qualifiedRate}%`,
      `${row.bookingRate}%`,
      row.salespeopleSummary,
    ]);
  });

  // Total Summary Row
  mainSheetData.push([]);
  mainSheetData.push([
    "TOTAL / OVERALL CRM",
    "-",
    "-",
    "-",
    summary.totalLeadsProvided,
    summary.totalAssigned,
    `${summary.overallAssignedRate}%`,
    summary.totalContacted,
    `${summary.overallContactRate}%`,
    summary.totalCalls,
    summary.totalConnectedCalls,
    summary.totalCalls > 0 ? `${((summary.totalConnectedCalls / summary.totalCalls) * 100).toFixed(1)}%` : "0%",
    "-",
    summary.totalQualified,
    summary.totalUnqualified,
    summary.totalJunk,
    summary.totalSiteVisitsScheduled,
    summary.totalSiteVisitsConducted,
    summary.totalBookings,
    summary.totalBookingValue,
    `${summary.overallQualifiedRate}%`,
    `${summary.overallBookingRate}%`,
    "-",
  ]);

  const wsMain = XLSX.utils.aoa_to_sheet(mainSheetData);
  wsMain["!cols"] = [
    { wch: 24 }, // Source Name
    { wch: 18 }, // Type
    { wch: 24 }, // CP Contact
    { wch: 16 }, // RERA
    { wch: 14 }, // Provided
    { wch: 12 }, // Assigned
    { wch: 12 }, // Assigned %
    { wch: 12 }, // Contacted
    { wch: 12 }, // Contact %
    { wch: 12 }, // Calls
    { wch: 14 }, // Connected
    { wch: 14 }, // Answer Rate
    { wch: 14 }, // Talk Time
    { wch: 14 }, // Qualified
    { wch: 16 }, // Unqualified
    { wch: 12 }, // Junk
    { wch: 16 }, // Visits Sched
    { wch: 16 }, // Visits Cond
    { wch: 12 }, // Bookings
    { wch: 18 }, // Value
    { wch: 22 }, // Qual Rate
    { wch: 22 }, // Book Rate
    { wch: 35 }, // Salespeople
  ];
  XLSX.utils.book_append_sheet(wb, wsMain, "Source Performance");

  // ── SHEET 2: Quality & Dispositions Breakdown ──
  const dispSheetData = [
    ["LEAD SOURCE QUALITY & CALL DISPOSITIONS BREAKDOWN"],
    [`Date Range: ${dateRange.fromDate} to ${dateRange.toDate}`],
    [],
    [
      "Lead Source",
      "Leads Provided",
      "Callback Later",
      "Not Interested",
      "Wrong Number",
      "No Answer",
      "Busy",
      "Qualified Dispositions",
      "Junk / Spam",
      "Other Dispositions",
      "Qualified %",
      "Junk %",
    ],
  ];

  sources.forEach((row) => {
    const disp = row.dispositionBreakdown;
    const totalDisp = Object.values(disp).reduce((a, b) => a + b, 0);
    const qualPct = totalDisp > 0 ? `${((disp.qualified / totalDisp) * 100).toFixed(1)}%` : "0%";
    const junkPct = totalDisp > 0 ? `${(((disp.junk + disp.wrongNumber) / totalDisp) * 100).toFixed(1)}%` : "0%";

    dispSheetData.push([
      row.sourceName,
      row.leadsProvided,
      disp.callbackLater,
      disp.notInterested,
      disp.wrongNumber,
      disp.noAnswer,
      disp.busy,
      disp.qualified,
      disp.junk,
      disp.other,
      qualPct,
      junkPct,
    ]);
  });

  const wsDisp = XLSX.utils.aoa_to_sheet(dispSheetData);
  wsDisp["!cols"] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDisp, "Dispositions & Quality");

  // ── SHEET 3: Salesperson Attribution ──
  const callerSheetData = [
    ["SALESPERSON ATTRIBUTION BY LEAD SOURCE"],
    [`Date Range: ${dateRange.fromDate} to ${dateRange.toDate}`],
    [],
    ["Lead Source", "Salesperson", "Leads Assigned / Worked", "Calls Made"],
  ];

  sources.forEach((row) => {
    if (row.salespeopleWorked.length === 0) {
      callerSheetData.push([row.sourceName, "No caller assigned yet", 0, 0]);
    } else {
      row.salespeopleWorked.forEach((s) => {
        callerSheetData.push([row.sourceName, s.userName, s.leadsWorked, s.calls]);
      });
    }
  });

  const wsCaller = XLSX.utils.aoa_to_sheet(callerSheetData);
  wsCaller["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsCaller, "Salesperson Attribution");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

/**
 * Drilldown into underlying records for a specific source metric
 */
const getLeadSourceDrilldown = async (filters = {}) => {
  const { fromDate, toDate, start, end } = getISTDateBoundaries(filters.fromDate, filters.toDate);
  const sourceName = String(filters.sourceName || filters.leadSource || "").trim();
  const metric = String(filters.metric || "leads").trim();

  const canonical = normalizeSourceName(sourceName);
  const { cpMap } = await getRegisteredCPMap();

  // Find all leads belonging to this source
  let leadWhere = { is_delete: false };
  if (canonical === "Untagged") {
    leadWhere.AND = [
      { OR: [{ channelPartner: null }, { channelPartner: "" }, { channelPartner: "Untagged" }] },
      { OR: [{ fundingSource: null }, { fundingSource: "" }, { fundingSource: "Untagged" }] },
    ];
  } else {
    leadWhere.OR = [
      { channelPartner: { contains: sourceName } },
      { channelPartner: { contains: canonical } },
      { fundingSource: { contains: sourceName } },
      { fundingSource: { contains: canonical } },
    ];
  }

  const sourceLeads = await prisma.lead.findMany({
    where: leadWhere,
    include: {
      team: { select: { id: true, firstName: true, lastName: true, username: true } },
      callLogs: {
        where: { createdAt: { gte: start, lte: end } },
      },
      scheduleVisits: {
        where: { scheduledOn: { gte: start, lte: end } },
      },
      bookings: {
        where: { createdAt: { gte: start, lte: end } },
      },
    },
    orderBy: { id: "desc" },
    take: 300,
  });

  let title = `Leads for ${canonical}`;
  let type = "leads";
  let items = [];

  if (metric === "qualified") {
    title = `Qualified Leads — ${canonical}`;
    type = "leads";
    items = sourceLeads.filter((l) => {
      const st = String(l.status || "").toLowerCase();
      return st.includes("qual") || st.includes("book") || st.includes("clos");
    });
  } else if (metric === "unqualified") {
    title = `Unqualified Leads — ${canonical}`;
    type = "leads";
    items = sourceLeads.filter((l) => String(l.status || "").toLowerCase().includes("unqual"));
  } else if (metric === "junk") {
    title = `Junk / Invalid Leads — ${canonical}`;
    type = "leads";
    items = sourceLeads.filter((l) => String(l.status || "").toLowerCase().includes("junk"));
  } else if (metric === "calls") {
    title = `Call Logs — ${canonical}`;
    type = "calls";
    const calls = [];
    sourceLeads.forEach((l) => {
      (l.callLogs || []).forEach((c) => {
        calls.push({ ...c, lead: l });
      });
    });
    items = calls;
  } else if (metric === "visits") {
    title = `Site Visits — ${canonical}`;
    type = "visits";
    const visits = [];
    sourceLeads.forEach((l) => {
      (l.scheduleVisits || []).forEach((v) => {
        visits.push({ ...v, lead: l });
      });
    });
    items = visits;
  } else if (metric === "bookings") {
    title = `Bookings — ${canonical}`;
    type = "leads";
    items = sourceLeads.filter((l) => (l.bookings || []).length > 0);
  } else {
    // Default: all leads provided
    title = `All Leads Provided — ${canonical}`;
    type = "leads";
    items = sourceLeads;
  }

  return {
    title,
    type,
    count: items.length,
    sourceName: canonical,
    items,
  };
};

/**
 * Merge duplicate or old lead sources into a canonical source
 */
const mergeLeadSources = async ({ fromSource, toSource, adminUserId = null }) => {
  if (!fromSource || !toSource) {
    throw new Error("Both fromSource and toSource are required for merging");
  }

  const cleanFrom = fromSource.trim();
  const cleanTo = normalizeSourceName(toSource.trim());

  if (cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
    throw new Error("Cannot merge a source into itself");
  }

  // Find all leads matching fromSource
  const matchingLeads = await prisma.lead.findMany({
    where: {
      OR: [
        { channelPartner: cleanFrom },
        { channelPartner: { equals: cleanFrom } },
        { fundingSource: cleanFrom },
      ],
    },
    select: { id: true, channelPartner: true, fundingSource: true, tags: true },
  });

  if (matchingLeads.length === 0) {
    return {
      updatedCount: 0,
      message: `No leads found with source "${cleanFrom}"`,
    };
  }

  let updatedCount = 0;
  for (const lead of matchingLeads) {
    const updateData = {};
    if (lead.channelPartner === cleanFrom) {
      updateData.channelPartner = cleanTo;
    }
    if (lead.fundingSource === cleanFrom) {
      updateData.fundingSource = cleanTo;
    }

    // Update tags if present
    if (lead.tags && lead.tags.includes(cleanFrom)) {
      updateData.tags = lead.tags.replace(new RegExp(cleanFrom, "g"), cleanTo);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: updateData,
      });

      // Log activity
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: adminUserId ? Number(adminUserId) : null,
          type: "SOURCE_TAGGED",
          message: `Lead source merged from "${cleanFrom}" to canonical "${cleanTo}"`,
        },
      });

      updatedCount++;
    }
  }

  return {
    fromSource: cleanFrom,
    toSource: cleanTo,
    updatedCount,
    message: `Successfully merged ${updatedCount} leads from "${cleanFrom}" to "${cleanTo}"`,
  };
};

/**
 * Scans all leads in the database and automatically cleans known variations
 * (e.g. "Carpet area" -> "Carpet Area CP", "direct" -> "Direct Entry", trims whitespace)
 */
const autoCleanLeadSources = async (adminUserId = null) => {
  const allLeads = await prisma.lead.findMany({
    where: {
      OR: [
        { channelPartner: { not: null } },
        { fundingSource: { not: null } },
      ],
    },
    select: { id: true, channelPartner: true, fundingSource: true, tags: true },
  });

  let cleanedCount = 0;
  const changes = [];

  for (const lead of allLeads) {
    const cp = lead.channelPartner ? lead.channelPartner.trim() : null;
    const fs = lead.fundingSource ? lead.fundingSource.trim() : null;

    let newCP = cp ? normalizeSourceName(cp) : null;
    let newFS = fs;

    // If funding source was "Carpet area", normalize it
    if (fs && (fs.toLowerCase().includes("carpet area") || fs.toLowerCase() === "carpetarea")) {
      newCP = "Carpet Area CP";
      newFS = null;
    }

    let needsUpdate = false;
    const updatePayload = {};

    if (cp && newCP && cp !== newCP) {
      updatePayload.channelPartner = newCP;
      needsUpdate = true;
    }

    if (fs && newFS !== fs) {
      updatePayload.fundingSource = newFS;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: updatePayload,
      });

      cleanedCount++;
      changes.push({
        leadId: lead.id,
        before: { cp, fs },
        after: updatePayload,
      });
    }
  }

  return {
    totalScanned: allLeads.length,
    cleanedCount,
    message: `Auto-cleaned and normalized ${cleanedCount} lead records to canonical sources`,
  };
};

module.exports = {
  getLeadSourceReportData,
  generateSourceExcelBuffer,
  getLeadSourceDrilldown,
  mergeLeadSources,
  autoCleanLeadSources,
  getRegisteredCPMap,
};
