const fs = require("fs")
const XLSX = require("xlsx")
const prisma = require("../lib/prisma")
const {sendNotification} = require("../services/notification.service")
const { emitReportsUpdate } = require("../socket/socket")
const { isAdminUser, maskLeadData } = require("../utils/phoneMask")

const { create } = require("domain")
const { getVisitPayloadFromLeadUpdate, upsertScheduleVisit } = require("../services/scheduleVisit.service")

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRegex = /^\d{10}$/
const validLeadStatuses = new Set([
  "New",
  "Qualified",
  "In_sourcing",
  "In_closing",
  "Booked",
  "Nurture",
  "Unqualified",
])
const leadTeamSelect = {
  id: true,
  isActive: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  secondaryPhone: true,
  timeZone: true,
  linkedUrl: true,
  description: true,
  role: true,
  department: true,
  defaultRouting: true,
  defaultRoutingRule: true,
  autoRoster: true,
  teamId: true,
  pushNotification: true,
  gpsTracking: true,
}
const importStatusMap = {
  new: "New",
  qualified: "Qualified",
  in_sourcing: "In_sourcing",
  "in sourcing": "In_sourcing",
  in_closing: "In_closing",
  "in closing": "In_closing",
  booked: "Booked",
  nurture: "Nurture",
  unqualified: "Unqualified",
}

const leadStatusScoreMap = {
  New: { score: 15, step: 1 },
  Qualified: { score: 40, step: 2 },
  In_sourcing: { score: 60, step: 3 },
  In_closing: { score: 80, step: 4 },
  Booked: { score: 100, step: 5 },
  Nurture: { score: 25, step: 2 },
  Unqualified: { score: 0, step: 0 },
}

const getLeadStageScore = (status) =>
  leadStatusScoreMap[normalizeLeadStatusValue(status) || "New"] || leadStatusScoreMap.New

const isBookedLeadStatus = (status) => normalizeLeadStatusValue(status) === "Booked"

const withLeadStageScore = (lead) => {
  if (!lead) return lead
  const stageScore = getLeadStageScore(lead.status)
  return {
    ...lead,
    score: stageScore.score,
    stageScore,
  }
}

const createLeadAssignmentActivity = async ({ leadId, assignedToId, assignedById, previousTeamId }) => {
  if (!leadId || !assignedToId) return null

  const assignedUser = await prisma.user.findUnique({
    where: { id: Number(assignedToId) },
    select: { id: true, firstName: true, lastName: true, username: true, email: true },
  })
  const assignedName =
    [assignedUser?.firstName, assignedUser?.lastName].filter(Boolean).join(" ") ||
    assignedUser?.username ||
    assignedUser?.email ||
    `User #${assignedToId}`

  return prisma.leadActivity.create({
    data: {
      leadId: Number(leadId),
      userId: assignedById ? Number(assignedById) : null,
      type: "LEAD_ASSIGNED",
      message: previousTeamId
        ? `Lead reassigned to ${assignedName}`
        : `Lead assigned to ${assignedName}`,
      oldStatus: previousTeamId ? String(previousTeamId) : null,
      newStatus: String(assignedToId),
    },
  })
}

const createLeadAssignmentNotification = async ({ lead, assignedToId, assignedById, previousTeamId }) => {
  if (!lead?.id || !assignedToId) return null
  const assignedBy = assignedById
    ? await prisma.user.findUnique({
        where:{ id:Number(assignedById) },
        select:{ id:true, firstName:true, lastName:true, username:true, email:true },
      })
    : null
  const assignedByName =
    [assignedBy?.firstName, assignedBy?.lastName].filter(Boolean).join(" ") ||
    assignedBy?.username ||
    assignedBy?.email ||
    "Admin"
  const leadName = getLeadNameValue(lead)
  const dedupeKey = `LEAD_ASSIGNED:${lead.id}:${assignedToId}:${previousTeamId || ""}`
  return sendNotification(
    assignedToId,
    previousTeamId ? "Lead reassigned to you" : "New lead assigned to you",
    `${dedupeKey}\n${leadName} was assigned by ${assignedByName}.`,
    { link:`/user/sales/details?leadId=${lead.id}`, dedupeKey }
  )
}

const normalizeImportStatus = (value) => {
  const rawValue = String(value || "").trim()
  if (!rawValue) return "New"
  if (validLeadStatuses.has(rawValue)) return rawValue

  return importStatusMap[rawValue.toLowerCase()] || "New"
}

const normalizeLeadStatusValue = (value) => {
  const rawValue = String(value || "").trim()
  if (!rawValue) return undefined
  if (validLeadStatuses.has(rawValue)) return rawValue

  return importStatusMap[rawValue.toLowerCase()] || "New"
}

const toNullableString = (value) => {
  if (value === undefined || value === null || value === "") return null
  return String(value).trim()
}

const toNullableJsonString = (value) => {
  const normalizedValue = toNullableString(value)
  return normalizedValue ? [normalizedValue] : null
}

const toRequiredString = (value) => String(value || "").trim()
const toNullableInt = (value) => {
  if (value === undefined || value === null || value === "") return null
  const number = parseInt(value)
  return Number.isNaN(number) ? null : number
}
const toNullableIntList = (value) => {
  if (value === undefined || value === null || value === "") return []

  let values = value
  if (typeof value === "string") {
    try {
      values = JSON.parse(value)
    } catch {
      values = value.split(",")
    }
  }

  if (!Array.isArray(values)) values = [values]

  return [...new Set(values
    .map((item) => toNullableInt(item))
    .filter((item) => item !== null))]
}
const toInt = (value, defaultValue = 0) => {
  const number = parseInt(value)
  return Number.isNaN(number) ? defaultValue : number
}
const toFloat = (value, defaultValue = 0) => {
  const number = parseFloat(value)
  return Number.isNaN(number) ? defaultValue : number
}
const toNullableDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
const toImportInt = (value, defaultValue = null) => {
  const number = parseInt(value)
  return Number.isNaN(number) ? defaultValue : number
}
const toImportFloat = (value, defaultValue = null) => {
  const number = parseFloat(value)
  return Number.isNaN(number) ? defaultValue : number
}

const buildLockedSourceTags = ({ source, channelPartner, channelPartnerReraId, userId = null, userName = null }) => {
  const parts = []
  if (source) parts.push(`source:${source}`)
  if (channelPartner) parts.push(`cp:${channelPartner}`)
  if (channelPartnerReraId) parts.push(`rera:${channelPartnerReraId}`)
  parts.push("sourceLocked:true")
  parts.push(`taggedAt:${new Date().toISOString()}`)
  if (userName || userId) parts.push(`taggedBy:${userName || userId}`)
  return parts.join(" | ")
}

const isLeadSourceLocked = (lead) => {
  if (!lead) return false
  const tags = String(lead.tags || "")
  if (tags.includes("sourceLocked:true")) return true
  const source = lead.fundingSource
  const cp = lead.channelPartner
  return Boolean(source && source !== "Untagged") || Boolean(cp && cp !== "Untagged")
}

const isUntaggedLead = (lead) => {
  if (!lead) return true
  const tags = String(lead.tags || "")
  if (tags.includes("sourceLocked:true")) return false
  const cp = String(lead.channelPartner || "").trim()
  const source = String(lead.fundingSource || "").trim()
  if (cp && cp.toLowerCase() !== "untagged") return false
  if (source && source.toLowerCase() !== "untagged") return false
  return true
}

const isAdminRole = (user) => ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(String(user?.role || "").toUpperCase())

const isSalesRole = (user) => ["SALES", "PRE_SALES", "POST_SALES"].includes(String(user?.role || "").toUpperCase())

const normalizeBulkIds = (ids) => {
  if (!Array.isArray(ids)) {
    const error = new Error("ids must be an array")
    error.statusCode = 400
    throw error
  }
  if (!ids.length) {
    const error = new Error("At least one lead id is required")
    error.statusCode = 400
    throw error
  }
  if (ids.length > 100) {
    const error = new Error("You can process up to 100 leads at once")
    error.statusCode = 400
    throw error
  }
  const invalidIds = ids.filter((id) => !Number.isInteger(Number(id)) || Number(id) <= 0)
  if (invalidIds.length) {
    const error = new Error("ids must contain valid numeric lead ids")
    error.statusCode = 400
    error.invalidIds = invalidIds
    throw error
  }
  return [...new Set(ids.map(Number).filter(Number.isInteger))]
}

const canManageLead = (user, lead) => {
  if (isAdminRole(user)) return true
  if (isSalesRole(user)) return Number(lead.teamId) === Number(user?.id)
  return false
}

const getBulkLeadStatus = (failures, processedIds) => {
  if (failures.length && processedIds.length) return 207
  if (failures.length && !processedIds.length) {
    if (failures.every((item) => item.reason.includes("permission"))) return 403
    if (failures.every((item) => item.reason.includes("not found"))) return 404
    return 409
  }
  return 200
}

const buildBulkLeadResult = (ids, processedIds, failures, message) => ({
  message,
  requested:ids.length,
  deleted:processedIds.length,
  restored:processedIds.length,
  failed:failures.length,
  deletedIds:processedIds,
  restoredIds:processedIds,
  failures,
})

const normalizeEmailValue = (value) => String(value || "").trim().toLowerCase()
const normalizePhoneValue = (value) => String(value || "").replace(/\D/g, "")
const toRequiredPhone = (value) => normalizePhoneValue(value)

const getPhoneDigitVariants = (raw) => {
  if (!raw) return []
  const digits = String(raw).replace(/\D/g, "")
  if (!digits) return []
  const variants = new Set([digits])
  if (digits.startsWith("91") && digits.length >= 11) {
    variants.add(digits.slice(2))
  }
  if (digits.startsWith("0") && digits.length >= 11) {
    variants.add(digits.slice(1))
  }
  return Array.from(variants)
}

const extractLeadPhoneStrings = (lead) => {
  if (!lead) return []
  const list = []
  const add = (val) => {
    if (!val) return
    if (typeof val === "string" || typeof val === "number") {
      list.push(String(val))
    } else if (typeof val === "object") {
      if (val.value) list.push(String(val.value))
      if (val.phone) list.push(String(val.phone))
      if (val.number) list.push(String(val.number))
    }
  }

  if (Array.isArray(lead.phones)) {
    lead.phones.forEach(add)
  } else if (lead.phones) {
    add(lead.phones)
  }
  if (Array.isArray(lead.phone)) {
    lead.phone.forEach(add)
  } else if (lead.phone) {
    add(lead.phone)
  }
  if (lead.secondaryPhone) add(lead.secondaryPhone)
  if (lead.mobile) add(lead.mobile)

  return list
}

const matchesPhoneQuery = (lead, rawQuery) => {
  if (!rawQuery) return false
  const rawDigits = String(rawQuery).replace(/\D/g, "")
  if (!rawDigits) return false

  const queryVariants = getPhoneDigitVariants(rawQuery)
  const phones = extractLeadPhoneStrings(lead)

  for (const phone of phones) {
    const leadVariants = getPhoneDigitVariants(phone)
    for (const lVar of leadVariants) {
      for (const qVar of queryVariants) {
        if (lVar.includes(qVar) || qVar.includes(lVar)) {
          return true
        }
      }
    }
  }
  return false
}

const matchesLeadSearch = (lead, rawQuery) => {
  if (!rawQuery) return true
  const query = String(rawQuery).trim().toLowerCase()
  if (!query) return true

  // 1. Phone match (format-agnostic)
  if (matchesPhoneQuery(lead, rawQuery)) return true

  // 2. Lead ID match
  const leadId = String(lead?.id || lead?._id || lead?.lead_id || "").toLowerCase()
  const cleanQueryId = query.replace(/^lead\s*#?|^#/, "").trim()
  if (leadId) {
    if (leadId === query || leadId === cleanQueryId || leadId.includes(query) || leadId.includes(cleanQueryId)) {
      return true
    }
    if (`lead #${leadId}`.includes(query) || `lead ${leadId}`.includes(query)) {
      return true
    }
  }

  // 3. Name match
  const fullName = [lead?.firstName, lead?.lastName].filter(Boolean).join(" ").toLowerCase()
  const directName = String(lead?.name || lead?.customer_name || "").toLowerCase()
  if (fullName.includes(query) || directName.includes(query)) return true

  // 4. Emails match
  const emails = []
  if (Array.isArray(lead?.emails)) {
    lead.emails.forEach(e => emails.push(typeof e === "object" ? e?.value : e))
  } else if (lead?.emails) {
    emails.push(lead.emails)
  }
  if (lead?.email) emails.push(lead.email)
  if (emails.some(e => String(e || "").toLowerCase().includes(query))) return true

  // 5. Additional attributes
  const additionalFields = [
    lead?.owner,
    lead?.sales,
    lead?.telecaller,
    lead?.team?.username,
    lead?.team?.firstName,
    lead?.team?.lastName,
    lead?.source,
    lead?.channelPartner,
    lead?.channelPartnerReraId,
    lead?.fundingSource,
    lead?.tags,
    lead?.stage,
    lead?.status,
    lead?.lead_status,
    lead?.requirementComment,
    lead?.configration,
    lead?.configuration,
    lead?.propertyType,
    lead?.interestedProjects,
    lead?.companyName,
    lead?.budget,
    lead?.city,
    lead?.remarks,
    lead?.note,
  ]

  return additionalFields.some(field => String(field || "").toLowerCase().includes(query))
}

const extractJsonValues = (items) => {
  if (!Array.isArray(items)) return []

  return items
    .map(item => {
      if (item && typeof item === "object") return item.value
      return item
    })
    .filter(value => value !== undefined && value !== null && value !== "")
}

const getLeadDuplicateKeys = (lead) => {
  const emails = extractJsonValues(lead.emails)
    .map(normalizeEmailValue)
    .filter(Boolean)
  const phones = extractJsonValues(lead.phones)
    .map(normalizePhoneValue)
    .filter(Boolean)

  return {
    emails,
    phones,
    keys: [
      ...emails.map(value => `email:${value}`),
      ...phones.map(value => `phone:${value}`),
    ],
  }
}

const addLeadKeysToSet = (keySet, lead) => {
  getLeadDuplicateKeys(lead).keys.forEach(key => keySet.add(key))
}

const hasDuplicateLeadKey = (keySet, lead) =>
  getLeadDuplicateKeys(lead).keys.some(key => keySet.has(key))

const filterDuplicateLeads = (leads) => {
  const seenKeys = new Set()

  return leads.filter(lead => {
    const duplicateKeys = getLeadDuplicateKeys(lead).keys

    if (!duplicateKeys.length) return true
    if (duplicateKeys.some(key => seenKeys.has(key))) return false

    duplicateKeys.forEach(key => seenKeys.add(key))
    return true
  })
}

const getLeadNameValue = (lead) =>
  [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
  lead.name ||
  "-"

const normalizeNameValue = (value) =>
  String(value || "").trim().toLowerCase().replace(/\s+/g, " ")

const getLeadDuplicateMatchKeys = (lead) => {
  const { emails, phones } = getLeadDuplicateKeys(lead)
  const name = normalizeNameValue(getLeadNameValue(lead))

  return [
    ...phones.map(value => ({
      key: `phone:${value}`,
      matchedOn: "Phone number",
      matchValue: value,
      priority: 1,
    })),
    ...emails.map(value => ({
      key: name && name !== "-" ? `email-name:${value}:${name}` : `email:${value}`,
      matchedOn: name && name !== "-" ? "Email + name" : "Email",
      matchValue: value,
      priority: 2,
    })),
  ]
}

const getLeadSortValue = (lead) => {
  const value = lead.createdAt || lead.created_at || lead.received_on || lead.updatedAt
  const date = value ? new Date(value) : null
  if (date && !Number.isNaN(date.getTime())) return date.getTime()
  return Number.isNaN(Number(lead.id)) ? Number.MAX_SAFE_INTEGER : Number(lead.id)
}

const buildDuplicateLeadGroups = (leads) => {
  const groupsByKey = new Map()

  leads.forEach(lead => {
    getLeadDuplicateMatchKeys(lead).forEach(match => {
      if (!groupsByKey.has(match.key)) {
        groupsByKey.set(match.key, {
          id: match.key,
          matchedOn: match.matchedOn,
          matchValue: match.matchValue,
          priority: match.priority,
          records: [],
        })
      }
      groupsByKey.get(match.key).records.push(lead)
    })
  })

  return Array.from(groupsByKey.values())
    .filter(group => group.records.length > 1)
    .sort((a, b) => a.priority - b.priority || a.matchValue.localeCompare(b.matchValue))
    .map(group => {
      const records = group.records
        .slice()
        .sort((a, b) => getLeadSortValue(a) - getLeadSortValue(b))
        .map((lead, index) => ({
          ...withLeadStageScore(lead),
          duplicateRank: index + 1,
          isOriginalLead: index === 0,
        }))

      return { ...group, records, original: records[0] }
    })
}

const normalizeAddressList = (value) => {
  if (!Array.isArray(value)) return []

  return value.map(({ address, street, city, state, country, zip }) => ({
    address: toNullableString(address),
    street: toNullableString(street),
    city: toNullableString(city),
    state: toNullableString(state),
    country: toNullableString(country),
    zip: toNullableString(zip),
  }))
}

const findDuplicateLead = async (leadData) => {
  const existingLeads = await prisma.lead.findMany({
    where: { 
      is_delete: false  // Match the filter used in getLeads
    },
    select: { id: true, emails: true, phones: true },
  })
  const existingKeys = new Set()
  existingLeads.forEach(lead => addLeadKeysToSet(existingKeys, lead))

  return hasDuplicateLeadKey(existingKeys, leadData)
}

exports.createLead = async (req, res) => {
  try {
    let {
      salutation,
      firstName,
      lastName,
      emails,
      phones,
      status,
      timeZone,
      tags,
      interestedProjects,
      teamId,
      channelPartner,
      conductSiteVisit,
      conductSiteDate,
      siteVisitProject,
      siteVisitStatus,
      visitStatus,
      conductSiteStatus,
      siteVisitLocation,
      meetingPoint,
      siteVisitExecutive,
      siteVisitNote,
      siteVisitInitiatedBy,
      siteVisitDate,
      siteVisitConductedOn,
      leadAddress,
      companyName,
      type,
      carpetArea,
      seats,
      tenure,
      gender,
      occupations,
      age,
      birthday,
      maritalStatus,
      anniversary,
      industry,
      personalAddress,
      url,
      education,
      companyTitle,
      income,
      purpose,
      nri,
      budgetMin,
      budgetMax,
      possessionMin,
      possessionMax,
      area,
      source,
      fundingSource,
      propertyType,
      configration,
      budget,
      bathroomPreferences,
      furnishing,
      facing,
      locationPreferences,
      requirementComment,
    } = req.body

    const validEmails = Array.isArray(emails) ? emails.filter(item => item?.value) : []
    const validPhones = Array.isArray(phones) ? phones.filter(item => item?.value) : []

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "First name and last name are required" })
    }

    if (!validEmails.length || validEmails.some(item => !emailRegex.test(String(item.value).trim()))) {
      return res.status(400).json({ message: "A valid email address is required" })
    }

    if (!validPhones.length || validPhones.some(item => !phoneRegex.test(String(item.value).trim()))) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" })
    }

    const duplicateLeadExists = await findDuplicateLead({
      emails: validEmails,
      phones: validPhones,
    })

    if (duplicateLeadExists) {
      return res.status(409).json({ message: "Duplicate lead already exists with the same email or phone number" })
    }

    gender = gender ? gender.toUpperCase() : null
    const authRole = String(req.authUser?.role || req.authUser?.department || "").toUpperCase()
    const isSalesUser = ["SALES", "PRE_SALES", "POST_SALES", "AGENT", "AGENCY_USER", "CHANNEL_PARTNER"].includes(authRole)
    const forceOwnLead = isSalesUser && Boolean(req.authUser?.id)

    // Normalize source & assignment
    const rawSource = fundingSource || source || req.body.source || (forceOwnLead ? "Direct Entry" : "")
    if (rawSource) {
      fundingSource = String(rawSource).trim()
    }

    teamId = forceOwnLead ? toNullableInt(req.authUser?.id) : toNullableInt(teamId || req.body.teamId)
    status = status ? normalizeLeadStatusValue(status) : "New"  // Set default status
    const leadAddressList = normalizeAddressList(leadAddress)
    const personalAddressList = normalizeAddressList(personalAddress)
    const normalizedNri = typeof nri === "boolean" ? nri : String(nri).toLowerCase() === "true"
    const normalizedMaritalStatus = typeof maritalStatus === "boolean"
      ? maritalStatus
      : String(maritalStatus).toLowerCase() === "true"

    const hasSource = Boolean(fundingSource && String(fundingSource).trim() !== "Untagged") || Boolean(channelPartner && String(channelPartner).trim() !== "Untagged")
    let finalTags = tags || ""
    if (hasSource) {
      const authUserName = req.authUser ? [req.authUser.firstName, req.authUser.lastName].filter(Boolean).join(" ") || req.authUser.username || req.authUser.email : "Admin"
      const lockedTagString = buildLockedSourceTags({
        source: fundingSource,
        channelPartner,
        channelPartnerReraId: req.body.channelPartnerReraId,
        userId: req.authUser?.id,
        userName: authUserName,
      })
      finalTags = [tags ? String(tags).replace(/Untagged/gi, "").trim() : "", lockedTagString].filter(Boolean).join(" | ")
    } else {
      if (teamId || req.authUser?.id) {
        fundingSource = fundingSource || "Direct Entry"
        const authUserName = req.authUser ? [req.authUser.firstName, req.authUser.lastName].filter(Boolean).join(" ") || req.authUser.username || req.authUser.email : "Admin"
        const lockedTagString = buildLockedSourceTags({
          source: fundingSource,
          channelPartner,
          channelPartnerReraId: req.body.channelPartnerReraId,
          userId: req.authUser?.id,
          userName: authUserName,
        })
        finalTags = [tags ? String(tags).replace(/Untagged/gi, "").trim() : "", lockedTagString].filter(Boolean).join(" | ")
      } else {
        // Untagged quarantine: block assignment to telecallers until tagged
        teamId = null
        finalTags = [tags ? String(tags).trim() : "", "Untagged | Quarantined"].filter(Boolean).join(" | ")
      }
    }

    const lead = await prisma.lead.create({
      data: {
        salutation,
        firstName,
        lastName,
        emails,
        phones,
        status,
        timeZone,
        tags: finalTags,
        interestedProjects,
        teamId,
        channelPartner,
        conductSiteVisit,
        conductSiteDate: toNullableDate(conductSiteDate),
        siteVisitProject,
        siteVisitStatus: siteVisitStatus || visitStatus || conductSiteStatus || undefined,
        visitStatus: visitStatus || siteVisitStatus || conductSiteStatus || undefined,
        conductSiteStatus: conductSiteStatus || siteVisitStatus || visitStatus || undefined,
        siteVisitLocation,
        meetingPoint,
        siteVisitExecutive,
        siteVisitNote,
        siteVisitInitiatedBy,
        siteVisitDate: toNullableDate(siteVisitDate),
        siteVisitConductedOn: toNullableDate(siteVisitConductedOn),
        leadAddress: {
          create: leadAddressList,
        },
        companyName,
        type,
        carpetArea,
        seats: toInt(seats, 0),
        tenure: toFloat(tenure, 0),
        gender,
        occupations,
        age: toNullableInt(age),
        birthday: toNullableDate(birthday),
        maritalStatus: normalizedMaritalStatus,
        anniversary:
          toNullableDate(anniversary),
        industry: industry || "",
        personalAddress: {
          create: personalAddressList,
        },
        url,
        education,
        companyTitle,
        income,
        purpose,
        nri: normalizedNri,
        budgetMin: toNullableInt(budgetMin),
        budgetMax: toNullableInt(budgetMax),
        possessionMin,
        possessionMax,
        area,
        fundingSource,
        propertyType,
        configration,
        budget,
        bathroomPreferences,
        furnishing,
        facing,
        locationPreferences,
      },
      include: {
        leadAddress: true,
        personalAddress: true,
      },
    })
    if (teamId) {
      await createLeadAssignmentActivity({
        leadId: lead.id,
        assignedToId: teamId,
        assignedById: req.authUser?.id,
      })
      await createLeadAssignmentNotification({
        lead,
        assignedToId: teamId,
        assignedById: req.authUser?.id,
      })
    }
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: req.authUser?.id ? Number(req.authUser.id) : null,
        type: "LEAD_CREATED",
        message: hasSource ? "Lead created with permanent source tag" : "Lead created in Untagged Quarantine",
        newStatus: lead.status || "New",
      },
    })
    if (hasSource) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: req.authUser?.id ? Number(req.authUser.id) : null,
          type: "SOURCE_TAGGED_LOCKED",
          message: `Lead source permanently locked to "${fundingSource || "Channel Partner"}"${channelPartner ? ` (CP: ${channelPartner}${req.body.channelPartnerReraId ? `, RERA: ${req.body.channelPartnerReraId}` : ""})` : ""}`,
        },
      })
    }
    emitReportsUpdate("lead:created")
    const isAdmin = isAdminUser(req)
    res.status(201).json(isAdmin ? lead : maskLeadData(lead, false))

  } catch (err) {
    console.log(err)
    res.status(500).json({message: err.message || "Something went wrong"})
  }
}

exports.getLeads = async (req, res) => {
  try {
    const userId = req.query.userId || null
    const search = req.query.search?.trim() || ''
    const isUntaggedQuery = req.query.untagged === 'true' || req.query.status === 'Untagged'
    const authRole = String(req.authUser?.role || "").toUpperCase()
    const isCaller = ["SALES", "PRE_SALES", "POST_SALES"].includes(authRole)

    let where = {
      is_delete: false,
      ...(userId ? { teamId: parseInt(userId) } : {}),
    }

    if (isUntaggedQuery) {
      where = {
        ...where,
        OR: [
          { tags: { contains: "Untagged" } },
          { AND: [{ fundingSource: null }, { channelPartner: null }] },
          { AND: [{ fundingSource: "" }, { channelPartner: "" }] },
          { AND: [{ fundingSource: "Untagged" }, { channelPartner: null }] },
        ],
        NOT: {
          tags: { contains: "sourceLocked:true" },
        },
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      include:{
        team:{
          select:{
            id:true,
            isActive:true,
            username:true,
            email:true,
            firstName:true,
            lastName:true,
            phone:true,
            secondaryPhone:true,
            timeZone:true,
            linkedUrl:true,
            description:true,
            role:true,
            department:true,
            defaultRouting:true,
            defaultRoutingRule:true,
            autoRoster:true,
            teamId:true,
            pushNotification:true,
            gpsTracking:true
            }
          }
        }
      })

    // Filter leads by search term if provided
    const filteredLeads = search ? leads.filter(lead => matchesLeadSearch(lead, search)) : leads
    const isAdmin = isAdminUser(req)
    const results = filterDuplicateLeads(filteredLeads).map(withLeadStageScore)

    res.status(200).json(isAdmin ? results : results.map((l) => maskLeadData(l, false)))
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.getUntaggedLeads = async (req, res) => {
  try {
    const search = req.query.search?.trim() || ''
    const leads = await prisma.lead.findMany({
      where: {
        is_delete: false,
        OR: [
          { tags: { contains: "Untagged" } },
          { AND: [{ fundingSource: null }, { channelPartner: null }] },
          { AND: [{ fundingSource: "" }, { channelPartner: "" }] },
          { AND: [{ fundingSource: "Untagged" }, { channelPartner: null }] },
        ],
        NOT: {
          tags: { contains: "sourceLocked:true" },
        },
      },
      include: {
        team: {
          select: leadTeamSelect,
        },
        leadAddress: true,
        personalAddress: true,
      },
      orderBy: { id: "desc" },
    })

    const filteredLeads = search ? leads.filter(lead => matchesLeadSearch(lead, search)) : leads
    const isAdmin = isAdminUser(req)
    const results = filteredLeads.map(withLeadStageScore)

    res.status(200).json(isAdmin ? results : results.map((l) => maskLeadData(l, false)))
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: err.message || "Failed to fetch untagged leads" })
  }
}

exports.tagLeadSource = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } })
    if (!lead) return res.status(404).json({ message: "Lead not found" })

    if (isLeadSourceLocked(lead)) {
      return res.status(409).json({
        message: "Lead source and Channel Partner attribution is permanently locked and cannot be modified.",
        code: "SOURCE_TAG_LOCKED",
      })
    }

    const { fundingSource, channelPartner, channelPartnerReraId, teamId } = req.body
    if (!fundingSource && !channelPartner) {
      return res.status(400).json({ message: "Source or Channel Partner is required to tag and release lead" })
    }

    const authUserName = req.authUser
      ? [req.authUser.firstName, req.authUser.lastName].filter(Boolean).join(" ") || req.authUser.username || req.authUser.email
      : "Admin"

    const lockedTagString = buildLockedSourceTags({
      source: fundingSource,
      channelPartner,
      channelPartnerReraId,
      userId: req.authUser?.id,
      userName: authUserName,
    })

    const cleanExistingTags = (lead.tags || "")
      .replace(/Untagged/gi, "")
      .replace(/Quarantined/gi, "")
      .replace(/\|\s*\|/g, "|")
      .trim()
    const finalTags = [cleanExistingTags, lockedTagString].filter(Boolean).join(" | ")

    const assignedTeamId = toNullableInt(teamId)

    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        fundingSource: fundingSource || (channelPartner ? "Channel Partner" : null),
        channelPartner: channelPartner || null,
        tags: finalTags,
        ...(assignedTeamId ? { teamId: assignedTeamId } : {}),
      },
      include: {
        leadAddress: true,
        personalAddress: true,
        team: { select: leadTeamSelect },
      },
    })

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: req.authUser?.id ? Number(req.authUser.id) : null,
        type: "SOURCE_TAGGED_LOCKED",
        message: `Lead source permanently locked to "${updatedLead.fundingSource || "Channel Partner"}"${channelPartner ? ` (CP: ${channelPartner}${channelPartnerReraId ? `, RERA: ${channelPartnerReraId}` : ""})` : ""} and released from quarantine`,
      },
    })

    if (assignedTeamId) {
      await createLeadAssignmentActivity({
        leadId: lead.id,
        assignedToId: assignedTeamId,
        assignedById: req.authUser?.id,
        previousTeamId: lead.teamId,
      })
      await createLeadAssignmentNotification({
        lead: updatedLead,
        assignedToId: assignedTeamId,
        assignedById: req.authUser?.id,
        previousTeamId: lead.teamId,
      })
    }

    emitReportsUpdate("lead:updated")
    res.status(200).json(withLeadStageScore(updatedLead))
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: err.message || "Unable to tag and release lead" })
  }
}

exports.bulkTagLeadSources = async (req, res) => {
  try {
    const ids = normalizeBulkIds(req.body?.ids)
    const { fundingSource, channelPartner, channelPartnerReraId, teamId } = req.body

    if (!fundingSource && !channelPartner) {
      return res.status(400).json({ message: "Source or Channel Partner is required" })
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: ids }, is_delete: false },
    })

    const leadById = new Map(leads.map((l) => [l.id, l]))
    const failures = []
    const processedIds = []
    const assignedTeamId = toNullableInt(teamId)
    const authUserName = req.authUser
      ? [req.authUser.firstName, req.authUser.lastName].filter(Boolean).join(" ") || req.authUser.username || req.authUser.email
      : "Admin"

    for (const id of ids) {
      const lead = leadById.get(id)
      if (!lead) {
        failures.push({ id, reason: "Lead not found" })
        continue
      }
      if (isLeadSourceLocked(lead)) {
        failures.push({ id, reason: "Lead source is already permanently locked" })
        continue
      }

      const lockedTagString = buildLockedSourceTags({
        source: fundingSource,
        channelPartner,
        channelPartnerReraId,
        userId: req.authUser?.id,
        userName: authUserName,
      })
      const cleanExistingTags = (lead.tags || "").replace(/Untagged/gi, "").replace(/Quarantined/gi, "").trim()
      const finalTags = [cleanExistingTags, lockedTagString].filter(Boolean).join(" | ")

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          fundingSource: fundingSource || (channelPartner ? "Channel Partner" : null),
          channelPartner: channelPartner || null,
          tags: finalTags,
          ...(assignedTeamId ? { teamId: assignedTeamId } : {}),
        },
      })

      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: req.authUser?.id ? Number(req.authUser.id) : null,
          type: "SOURCE_TAGGED_LOCKED",
          message: `Bulk tagged: source permanently locked to "${fundingSource || (channelPartner ? "Channel Partner" : "")}"${channelPartner ? ` (CP: ${channelPartner}${channelPartnerReraId ? `, RERA: ${channelPartnerReraId}` : ""})` : ""} and released from quarantine`,
        },
      })

      if (assignedTeamId) {
        await createLeadAssignmentActivity({
          leadId: lead.id,
          assignedToId: assignedTeamId,
          assignedById: req.authUser?.id,
          previousTeamId: lead.teamId,
        })
      }

      processedIds.push(id)
    }

    emitReportsUpdate("lead:updated")
    res.status(getBulkLeadStatus(failures, processedIds)).json({
      message: `${processedIds.length} leads successfully tagged, locked, and released`,
      processedCount: processedIds.length,
      processedIds,
      failures,
    })
  } catch (err) {
    console.log(err)
    res.status(err.statusCode || 500).json({ message: err.message || "Failed to bulk tag leads" })
  }
}

exports.getDuplicateLeads = async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        is_delete: false
      },
      include:{
        team:{
          select:{
          id:true,
          isActive:true,
          username:true,
          email:true,
          firstName:true,
          lastName:true,
          phone:true,
          secondaryPhone:true,
          timeZone:true,
          linkedUrl:true,
          description:true,
          role:true,
          department:true,
          defaultRouting:true,
          defaultRoutingRule:true,
          autoRoster:true,
          teamId:true,
          pushNotification:true,
          gpsTracking:true
          }
        }
      },
      orderBy: {
        id: "asc"
      }
    })

    const groups = buildDuplicateLeadGroups(leads)
    const isAdmin = isAdminUser(req)
    if (!isAdmin) {
      groups.forEach((group) => {
        group.records = group.records.map((l) => maskLeadData(l, false))
        if (group.original) group.original = maskLeadData(group.original, false)
      })
    }
    res.status(200).json({
      count: groups.length,
      duplicateCopyCount: groups.reduce((sum, group) => sum + Math.max(0, group.records.length - 1), 0),
      groups,
    })
  } catch (err) {
    console.log(err)
    res.status(500).json({message: err.message || "Unable to load duplicate leads"})
  }
}

exports.getTrashLeads = async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: {
       is_delete:true
      },
      include:{
        team:{
          select:{
          id:true,
          isActive:true,
          username:true,
          email:true,
          firstName:true,
          lastName:true,
          phone:true,
          secondaryPhone:true,
          timeZone:true,
          linkedUrl:true,
          description:true,
          role:true,
          department:true,
          defaultRouting:true,
          defaultRoutingRule:true,
          autoRoster:true,
          teamId:true,
          pushNotification:true,
          gpsTracking:true
          }
        }
      },
      orderBy: {
        deletedAt: "desc",
      },
    })

    const isAdmin = isAdminUser(req)
    res.status(200).json(isAdmin ? leads : leads.map((l) => maskLeadData(l, false)))
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.getLeadById = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({
      where: { id: Number(id) },
      include: {
        leadAddress: true,
        personalAddress: true,
        team: {
          select: leadTeamSelect,
        },
      },
    })
    if (!lead) return res.status(404).json("Lead not found")

    const isAdmin = isAdminUser(req)
    const scoredLead = withLeadStageScore(lead)
    res.status(200).json(isAdmin ? scoredLead : maskLeadData(scoredLead, false))
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.updateLead = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } })
    if (!lead) return res.status(404).json("Lead not found")

    const source = { ...req.body }

    // HARD LOCK ENFORCEMENT:
    // Once locked, lead source and CP cannot be altered by anyone (including Admin)
    const locked = isLeadSourceLocked(lead)
    if (locked) {
      const isFundingSourceChanged =
        source.fundingSource !== undefined && source.fundingSource !== lead.fundingSource
      const isChannelPartnerChanged =
        source.channelPartner !== undefined && source.channelPartner !== lead.channelPartner
      if (isFundingSourceChanged || isChannelPartnerChanged) {
        return res.status(409).json({
          message: "Lead source and Channel Partner attribution is permanently locked and cannot be modified.",
          code: "SOURCE_TAG_LOCKED",
        })
      }
    }

    const data = {}

    const stringFields = [
      "salutation",
      "firstName",
      "lastName",
      "timeZone",
      "tags",
      "interestedProjects",
      "channelPartner",
      "conductSiteVisit",
      "siteVisitProject",
      "siteVisitStatus",
      "visitStatus",
      "conductSiteStatus",
      "siteVisitLocation",
      "meetingPoint",
      "siteVisitExecutive",
      "siteVisitNote",
      "siteVisitInitiatedBy",
      "companyName",
      "type",
      "carpetArea",
      "occupations",
      "industry",
      "url",
      "education",
      "companyTitle",
      "income",
      "purpose",
      "possessionMin",
      "possessionMax",
      "area",
      "fundingSource",
      "propertyType",
      "configration",
      "budget",
      "bathroomPreferences",
      "furnishing",
      "facing",
      "locationPreferences",
    ]

    stringFields.forEach((field) => {
      if (source[field] !== undefined) {
        data[field] = source[field] === null ? null : source[field]
      }
    })

    // If not previously locked, check if source is now being set/locked
    let newlyLocked = false
    if (!locked) {
      const newFundingSource = source.fundingSource !== undefined ? source.fundingSource : lead.fundingSource
      const newCP = source.channelPartner !== undefined ? source.channelPartner : lead.channelPartner
      const hasValidSource = Boolean(newFundingSource && String(newFundingSource).trim() !== "Untagged") || Boolean(newCP && String(newCP).trim() !== "Untagged")
      if (hasValidSource) {
        const authUserName = req.authUser
          ? [req.authUser.firstName, req.authUser.lastName].filter(Boolean).join(" ") || req.authUser.username || req.authUser.email
          : "Admin"
        const lockedTagString = buildLockedSourceTags({
          source: newFundingSource,
          channelPartner: newCP,
          channelPartnerReraId: req.body.channelPartnerReraId,
          userId: req.authUser?.id,
          userName: authUserName,
        })
        const cleanExistingTags = (source.tags !== undefined ? source.tags : lead.tags || "")
          .replace(/Untagged/gi, "")
          .replace(/Quarantined/gi, "")
          .replace(/\|\s*\|/g, "|")
          .trim()
        data.tags = [cleanExistingTags, lockedTagString].filter(Boolean).join(" | ")
        newlyLocked = true
      }
    }

    if (source.emails !== undefined) data.emails = Array.isArray(source.emails) ? source.emails : []
    if (source.phones !== undefined) data.phones = Array.isArray(source.phones) ? source.phones : []
    if (source.status !== undefined) {
      data.status = normalizeLeadStatusValue(source.status)
      if (data.status === "Booked" && !isBookedLeadStatus(lead.status)) {
        const existingBooking = await prisma.booking.findFirst({
          where: { leadId: lead.id, stage: { in: ["Booked", "booked", "Confirmed", "confirmed"] } },
          select: { id: true },
        })
        if (!existingBooking) {
          return res.status(400).json({ message: "A lead can only be marked Booked after booking confirmation" })
        }
      }
      if (isBookedLeadStatus(lead.status) && data.status !== "Booked") {
        return res.status(409).json({ message: "Booked lead status cannot be changed." })
      }
    }
    if (source.teamId !== undefined) data.teamId = toNullableInt(source.teamId)
    if (source.seats !== undefined) data.seats = toInt(source.seats, 0)
    if (source.tenure !== undefined) data.tenure = toFloat(source.tenure, 0)
    if (source.age !== undefined) data.age = toNullableInt(source.age)
    if (source.budgetMin !== undefined) data.budgetMin = toNullableInt(source.budgetMin)
    if (source.budgetMax !== undefined) data.budgetMax = toNullableInt(source.budgetMax)
    if (source.leadReassigned !== undefined) data.leadReassigned = source.leadReassigned === true || String(source.leadReassigned).toLowerCase() === "true"
    if (source.maritalStatus !== undefined) data.maritalStatus = source.maritalStatus === true || String(source.maritalStatus).toLowerCase() === "true"
    if (source.nri !== undefined) data.nri = source.nri === true || String(source.nri).toLowerCase() === "true"
    if (source.gender !== undefined) data.gender = source.gender ? String(source.gender).toUpperCase() : null
    if (source.birthday !== undefined) data.birthday = toNullableDate(source.birthday)
    if (source.anniversary !== undefined) data.anniversary = toNullableDate(source.anniversary)
    if (source.conductSiteDate !== undefined) data.conductSiteDate = toNullableDate(source.conductSiteDate)
    if (source.siteVisitDate !== undefined) data.siteVisitDate = toNullableDate(source.siteVisitDate)
    if (source.siteVisitConductedOn !== undefined) data.siteVisitConductedOn = toNullableDate(source.siteVisitConductedOn)

    if (source.leadAddress !== undefined) {
      const leadAddress = Array.isArray(source.leadAddress)
        ? source.leadAddress
        : Array.isArray(source.leadAddress?.create)
          ? source.leadAddress.create
          : []
      data.leadAddress = {
        deleteMany: {},
        create: normalizeAddressList(leadAddress),
      }
    }

    if (source.personalAddress !== undefined) {
      const personalAddress = Array.isArray(source.personalAddress)
        ? source.personalAddress
        : Array.isArray(source.personalAddress?.create)
          ? source.personalAddress.create
          : []
      data.personalAddress = {
        deleteMany: {},
        create: normalizeAddressList(personalAddress),
      }
    }

    const result = await prisma.lead.update({
      where: { id: lead.id },
      data: data,
      include: {
        leadAddress: true,
        personalAddress: true,
        team: {
          select: leadTeamSelect,
        },
      },
    })

    if (newlyLocked) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: req.authUser?.id ? Number(req.authUser.id) : null,
          type: "SOURCE_TAGGED_LOCKED",
          message: `Lead source permanently locked to "${result.fundingSource || "Channel Partner"}"${result.channelPartner ? ` (CP: ${result.channelPartner}${req.body.channelPartnerReraId ? `, RERA: ${req.body.channelPartnerReraId}` : ""})` : ""}`,
        },
      })
    }

    if (
      source.teamId !== undefined &&
      data.teamId &&
      String(data.teamId) !== String(lead.teamId || "")
    ) {
      await createLeadAssignmentActivity({
        leadId: lead.id,
        assignedToId: data.teamId,
        assignedById: req.authUser?.id,
        previousTeamId: lead.teamId,
      })
      await createLeadAssignmentNotification({
        lead:result,
        assignedToId:data.teamId,
        assignedById:req.authUser?.id,
        previousTeamId:lead.teamId,
      })
    }

    const visitPayload = getVisitPayloadFromLeadUpdate(lead.id, source)
    if (visitPayload) {
      await upsertScheduleVisit(visitPayload)
    }

    if (
      source.teamId !== undefined ||
      source.status !== undefined ||
      source.siteVisitStatus !== undefined ||
      source.visitStatus !== undefined ||
      source.conductSiteStatus !== undefined ||
      visitPayload
    ) {
      emitReportsUpdate("lead:updated")
    }

    const isAdmin = isAdminUser(req)
    const scoredResult = withLeadStageScore(result)
    res.status(200).json(isAdmin ? scoredResult : maskLeadData(scoredResult, false))
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: err.message || "Unable to update lead" })
  }
}

exports.deleteLead = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } })
    if (!lead) return res.status(404).json("Lead not found")

    const result = await prisma.$transaction(async (tx) => {
      const followUps = await tx.followUp.findMany({
        where: { leadId: lead.id },
        select: { id: true },
      })
      const followUpIds = followUps.map((followUp) => followUp.id)

      if (followUpIds.length) {
        await tx.followUp.updateMany({
          where: { rescheduledFromId: { in: followUpIds } },
          data: { rescheduledFromId: null },
        })
      }

      await tx.callLog.deleteMany({ where: { leadId: lead.id } })
      await tx.booking.updateMany({
        where: { leadId: lead.id },
        data: { leadId: null },
      })
      await tx.scheduleVisit.deleteMany({ where: { leadId: lead.id } })
      await tx.whatsAppMessage.deleteMany({ where: { leadId: lead.id } })
      await tx.followUp.deleteMany({ where: { leadId: lead.id } })
      await tx.leadActivity.deleteMany({ where: { leadId: lead.id } })
      await tx.leadNote.deleteMany({ where: { leadId: lead.id } })
      await tx.leadAddress.deleteMany({ where: { leadId: lead.id } })
      await tx.personalAddress.deleteMany({ where: { leadId: lead.id } })

      return tx.lead.delete({ where: { id: lead.id } })
    })
    emitReportsUpdate("lead:permanently-deleted")
    res.status(200).json(result)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: err.message || "Unable to delete lead from database" })
  }
}

exports.bulkTrashLeads = async (req, res) => {
  try {
    const ids = normalizeBulkIds(req.body?.ids)
    const leads = await prisma.lead.findMany({
      where:{ id:{ in:ids } },
      select:{ id:true, teamId:true, is_delete:true },
    })
    const leadById = new Map(leads.map((lead) => [lead.id, lead]))
    const failures = []
    const trashIds = []

    ids.forEach((id) => {
      const lead = leadById.get(id)
      if (!lead) {
        failures.push({ id, reason:"Lead not found" })
        return
      }
      if (!canManageLead(req.authUser, lead)) {
        failures.push({ id, reason:"You do not have permission to delete this lead" })
        return
      }
      if (lead.is_delete) {
        failures.push({ id, reason:"Lead is already in Trash" })
        return
      }
      trashIds.push(id)
    })

    if (trashIds.length) {
      await prisma.lead.updateMany({
        where:{ id:{ in:trashIds } },
        data:{ deletedAt:new Date(), is_delete:true },
      })
      emitReportsUpdate("lead:deleted")
    }

    const payload = buildBulkLeadResult(ids, trashIds, failures, "Selected leads moved to Trash")
    res.status(getBulkLeadStatus(failures, trashIds)).json(payload)
  } catch (error) {
    res.status(error.statusCode || 500).json({ message:error.message || "Unable to move selected leads to Trash", invalidIds:error.invalidIds })
  }
}

exports.bulkRestoreLeads = async (req, res) => {
  try {
    const ids = normalizeBulkIds(req.body?.ids)
    if (!isAdminRole(req.authUser)) return res.status(403).json({ message:"Admin access required" })
    const leads = await prisma.lead.findMany({
      where:{ id:{ in:ids } },
      select:{ id:true, is_delete:true },
    })
    const leadById = new Map(leads.map((lead) => [lead.id, lead]))
    const failures = []
    const restoreIds = []

    ids.forEach((id) => {
      const lead = leadById.get(id)
      if (!lead) {
        failures.push({ id, reason:"Lead not found" })
        return
      }
      if (!lead.is_delete) {
        failures.push({ id, reason:"Lead is not in Trash" })
        return
      }
      restoreIds.push(id)
    })

    if (restoreIds.length) {
      await prisma.lead.updateMany({
        where:{ id:{ in:restoreIds } },
        data:{ deletedAt:null, is_delete:false },
      })
      emitReportsUpdate("lead:restored")
    }

    const payload = buildBulkLeadResult(ids, restoreIds, failures, "Selected leads restored")
    res.status(getBulkLeadStatus(failures, restoreIds)).json(payload)
  } catch (error) {
    res.status(error.statusCode || 500).json({ message:error.message || "Unable to restore selected leads", invalidIds:error.invalidIds })
  }
}

exports.bulkPermanentlyDeleteLeads = async (req, res) => {
  try {
    const ids = normalizeBulkIds(req.body?.ids)
    if (!isAdminRole(req.authUser)) return res.status(403).json({ message:"Admin access required" })
    const leads = await prisma.lead.findMany({
      where:{ id:{ in:ids } },
      include:{
        bookings:{
          select:{
            id:true,
            stage:true,
            demands:{ select:{ id:true } },
            receipts:{ select:{ id:true } },
            ledgerEntries:{ select:{ id:true } },
            generatedDocuments:{ select:{ id:true } },
          },
        },
      },
    })
    const leadById = new Map(leads.map((lead) => [lead.id, lead]))
    const failures = []
    const deleteIds = []

    const force = Boolean(req.body?.force || req.query?.force)
    ids.forEach((id) => {
      const lead = leadById.get(id)
      if (!lead) {
        failures.push({ id, reason:"Lead not found" })
        return
      }
      const protectedBooking = (lead.bookings || []).find((booking) => {
        const stage = String(booking.stage || "").toLowerCase()
        return stage === "booked" ||
          stage === "confirmed" ||
          booking.demands.length ||
          booking.receipts.length ||
          booking.ledgerEntries.length ||
          booking.generatedDocuments.length
      })
      if (protectedBooking && !force && !lead.is_delete) {
        failures.push({ id, reason:"Lead has a confirmed booking or protected financial/post-sales records" })
        return
      }
      deleteIds.push(id)
    })

    if (deleteIds.length) {
      await prisma.$transaction(async (tx) => {
        const followUps = await tx.followUp.findMany({
          where:{ leadId:{ in:deleteIds } },
          select:{ id:true },
        })
        const followUpIds = followUps.map((followUp) => followUp.id)
        if (followUpIds.length) {
          await tx.followUp.updateMany({
            where:{ rescheduledFromId:{ in:followUpIds } },
            data:{ rescheduledFromId:null },
          })
        }
        await tx.callLog.deleteMany({ where:{ leadId:{ in:deleteIds } } })
        await tx.booking.updateMany({ where:{ leadId:{ in:deleteIds } }, data:{ leadId:null } })
        await tx.scheduleVisit.deleteMany({ where:{ leadId:{ in:deleteIds } } })
        await tx.whatsAppMessage.deleteMany({ where:{ leadId:{ in:deleteIds } } })
        await tx.followUp.deleteMany({ where:{ leadId:{ in:deleteIds } } })
        await tx.leadActivity.deleteMany({ where:{ leadId:{ in:deleteIds } } })
        await tx.leadNote.deleteMany({ where:{ leadId:{ in:deleteIds } } })
        await tx.leadAddress.deleteMany({ where:{ leadId:{ in:deleteIds } } })
        await tx.personalAddress.deleteMany({ where:{ leadId:{ in:deleteIds } } })
        await tx.lead.deleteMany({ where:{ id:{ in:deleteIds } } })
      })
      emitReportsUpdate("lead:permanently-deleted")
    }

    const payload = buildBulkLeadResult(ids, deleteIds, failures, "Selected leads permanently deleted")
    res.status(getBulkLeadStatus(failures, deleteIds)).json(payload)
  } catch (error) {
    res.status(error.statusCode || 500).json({ message:error.message || "Unable to permanently delete selected leads", invalidIds:error.invalidIds })
  }
}

exports.restoreLead = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } })
    if (!lead) return res.status(404).json("Lead not found")

    const result = await prisma.lead.update({
      where: { id: lead.id },
      data: { deletedAt: null, is_delete:false },
    })
    res.status(200).json(result)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.permanentlyDeleteLead = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } })
    if (!lead) return res.status(404).json("Lead not found")

    const result = await prisma.$transaction(async (tx) => {
      const followUps = await tx.followUp.findMany({
        where: { leadId: lead.id },
        select: { id: true },
      })
      const followUpIds = followUps.map((followUp) => followUp.id)

      if (followUpIds.length) {
        await tx.followUp.updateMany({
          where: { rescheduledFromId: { in: followUpIds } },
          data: { rescheduledFromId: null },
        })
      }
      await tx.callLog.deleteMany({ where: { leadId: lead.id } })
      await tx.booking.updateMany({
        where: { leadId: lead.id },
        data: { leadId: null },
      })
      await tx.scheduleVisit.deleteMany({ where: { leadId: lead.id } })
      await tx.whatsAppMessage.deleteMany({ where: { leadId: lead.id } })
      await tx.followUp.deleteMany({ where: { leadId: lead.id } })
      await tx.leadActivity.deleteMany({ where: { leadId: lead.id } })
      await tx.leadNote.deleteMany({ where: { leadId: lead.id } })
      await tx.leadAddress.deleteMany({ where: { leadId: lead.id } })
      await tx.personalAddress.deleteMany({ where: { leadId: lead.id } })

      return tx.lead.delete({ where: { id: lead.id } })
    })
    res.status(200).json(result)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: err.message || "Unable to permanently delete lead" })
  }
}

exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Excel file" })
    }

    const selectedTeamId = toNullableInt(req.body.teamId)
    const selectedTeamIds = toNullableIntList(req.body.teamIds)
    const bulkFundingSource = toNullableString(req.body.fundingSource || req.body.source)
    const bulkChannelPartner = toNullableString(req.body.channelPartner)
    const bulkReraId = toNullableString(req.body.channelPartnerReraId || req.body.reraId)
    const authUserName = req.authUser
      ? [req.authUser.firstName, req.authUser.lastName].filter(Boolean).join(" ") || req.authUser.username || req.authUser.email
      : "Admin"

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(sheet)

    const projectNames = [
      ...new Set(data.map(row => row["Interested projects"]).filter(Boolean)),
    ]

    const projectsFromDb = await prisma.project.findMany({
      where: { name: { in: projectNames } },
      select: { id: true, name: true },
    })
    const usersFromDb = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true },
    })

    const projectMap = {}
    projectsFromDb.forEach(p => {
      projectMap[p.name] = p.name
    })
    const userMap = {}
    usersFromDb.forEach(user => {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
      ;[fullName, user.username, user.email, String(user.id)].filter(Boolean).forEach(key => {
        userMap[key.toLowerCase()] = user.id
      })
    })

    const selectedUsers = selectedTeamIds.length
      ? usersFromDb.filter(user => selectedTeamIds.includes(user.id))
      : []
    const roundRobinUsers = usersFromDb.filter(user => user.role !== "ADMIN")
    const assignableUsers = selectedUsers.length
      ? selectedUsers
      : selectedTeamId
        ? usersFromDb.filter(user => user.id === selectedTeamId)
        : roundRobinUsers.length ? roundRobinUsers : usersFromDb
    const assignmentCounts = {}
    const userNameMap = {}

    usersFromDb.forEach(user => {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
      userNameMap[user.id] = fullName || user.username || user.email || `User #${user.id}`
    })

    const mapData = data.map((row, index) => {
      const firstName = toRequiredString(row["First name"])
      const lastName = toRequiredString(row["Last name"])
      const phone = toRequiredPhone(row["Phone"])

      if (!firstName || !lastName || !phone) {
        throw new Error(`Excel row ${index + 2}: First name, last name, and phone are required`)
      }

      if (!phoneRegex.test(phone)) {
        throw new Error(`Excel row ${index + 2}: Phone number must be exactly 10 digits`)
      }

      const projectName = row["Interested projects"]
      const projectId = projectMap[projectName] || null
      const teamValue = row["Team"] ? String(row["Team"]).trim().toLowerCase() : ""

      const rowFundingSource = toNullableString(row["Funding source"] || row["Source"]) || bulkFundingSource
      const rowChannelPartner = toNullableString(row["Channel partner"] || row["Channel Partner"]) || bulkChannelPartner
      const rowRera = toNullableString(row["Channel partner RERA"] || row["RERA ID"] || row["Rera"]) || bulkReraId
      const hasSource = Boolean(rowFundingSource && rowFundingSource !== "Untagged") || Boolean(rowChannelPartner && rowChannelPartner !== "Untagged")

      let assignedTeamId = null
      let rowTags = row["Tags"] ? String(row["Tags"]).trim() : ""

      if (hasSource) {
        assignedTeamId = selectedUsers.length
          ? selectedUsers[index % selectedUsers.length].id
          : selectedTeamId ||
            userMap[teamValue] ||
            (assignableUsers.length ? assignableUsers[index % assignableUsers.length].id : null)

        const lockedTagString = buildLockedSourceTags({
          source: rowFundingSource,
          channelPartner: rowChannelPartner,
          channelPartnerReraId: rowRera,
          userId: req.authUser?.id,
          userName: authUserName,
        })
        rowTags = [rowTags, lockedTagString].filter(Boolean).join(" | ")
      } else {
        // Quarantined from callers
        assignedTeamId = null
        rowTags = [rowTags, "Untagged | Quarantined"].filter(Boolean).join(" | ")
      }

      return {
        hasSource,
        rowFundingSource,
        rowChannelPartner,
        rowRera,
        salutation: row["Salutation"] || null,
        firstName,
        lastName,
        emails: [
          { type: row["Email Type"] || null, value: row["Email"] || null },
        ],
        phones: [
          { type: row["Phone Type"] || null, value: phone },
        ],
        status: normalizeImportStatus(row["Status"]),
        timeZone: row["Timezone"] || null,
        tags: rowTags,
        interestedProjects: projectId,
        teamId: assignedTeamId,
        channelPartner: hasSource ? (rowChannelPartner || null) : null,
        conductSiteVisit: row["Conduct site visit"] || null,
        conductSiteDate:
          row["Conduct site date"] && row["Conduct site date"] !== ""
            ? new Date(row["Conduct site date"])
            : null,
        leadAddress: {
          address: row["Aaddress"] || null,
          street: row["Street"] || null,
          city: row["City"] || null,
          state: row["State"] || null,
          country: row["Country"] || null,
          zip: row["Zip"] || null,
        },
        companyName: row["Company name"] || null,
        type: row["Type"] || null,
        carpetArea: row["Carpet area"] || null,
        seats: toImportInt(row["Seats"], 0),
        tenure: toImportFloat(row["Tenure"], 0),
        gender: row["Gender"] || null,
        occupations: row["Occupations"] || null,
        age: toImportInt(row["Age"]),
        birthday:
          row["Birthday"] && row["Birthday"] !== ""
            ? new Date(row["Birthday"])
            : null,
        maritalStatus:
          row["Marital status"] && row["Marital status"] == "Married"
            ? true
            : false,
        anniversary:
          row["Anniversary"] && row["Anniversary"] !== ""
            ? new Date(row["Anniversary"])
            : null,
        industry: row["Industry"] || "",
        personalAddress: {
          address: row["Personal address"] || null,
          street: row["Personal street"] || null,
          city: row["Personal city"] || null,
          state: row["Personal state"] || null,
          country: row["Personal country"] || null,
          zip: row["Personal zip"] || null,
        },
        url: toNullableJsonString(row["Url"]),
        education: toNullableJsonString(row["Education"]),
        companyTitle: toNullableJsonString(row["Company title"]),
        income: toNullableJsonString(row["Income"]),
        purpose: toNullableJsonString(row["Purpose"]),
        nri: ["yes", "y", "true"].includes(String(row["NRI"] || "").toLowerCase()),
        budgetMin: toImportInt(row["Budget min"]),
        budgetMax: toImportInt(row["Budget max"]),
        possessionMin: row["Possession min"] || null,
        possessionMax: row["Possession Max"] || null,
        area: row["Area"] || null,
        fundingSource: hasSource ? (rowFundingSource || (rowChannelPartner ? "Channel Partner" : null)) : null,
        propertyType: row["Property type"] || null,
        configration: row["Configration"] || null,
        budget: toNullableString(row["Budget"]),
        bathroomPreferences: row["Bathroom preferences"] || null,
        furnishing: row["Furnishing"] || null,
        facing: row["Facing"] || null,
        locationPreferences: row["Location preferences"] || null,
      }
    })

    const existingLeads = await prisma.lead.findMany({
      where: { is_delete: false },
      select: { id: true, emails: true, phones: true },
    })
    const existingKeys = new Set()
    existingLeads.forEach(lead => addLeadKeysToSet(existingKeys, lead))

    const result = []
    const skippedDuplicates = []
    for (let index = 0; index < mapData.length; index += 1) {
      const row = mapData[index]

      if (hasDuplicateLeadKey(existingKeys, row)) {
        skippedDuplicates.push(index + 2)
        continue
      }

      try {
        const { hasSource, rowFundingSource, rowChannelPartner, rowRera, ...createData } = row
        const lead = await prisma.lead.create({
          data: {
            ...createData,
            gender: createData.gender ? String(createData.gender).toUpperCase() : null,
            is_delete: false,
            is_active: true,
            leadAddress: {
              create: [createData.leadAddress],
            },
            personalAddress: {
              create: [createData.personalAddress],
            },
          },
        })
        result.push(lead)
        addLeadKeysToSet(existingKeys, row)

        if (hasSource) {
          await prisma.leadActivity.create({
            data: {
              leadId: lead.id,
              userId: req.authUser?.id ? Number(req.authUser.id) : null,
              type: "SOURCE_TAGGED_LOCKED",
              message: `Lead imported with permanent source tag "${lead.fundingSource || "Channel Partner"}"${rowChannelPartner ? ` (CP: ${rowChannelPartner}${rowRera ? `, RERA: ${rowRera}` : ""})` : ""}`,
            },
          })
        } else {
          await prisma.leadActivity.create({
            data: {
              leadId: lead.id,
              userId: req.authUser?.id ? Number(req.authUser.id) : null,
              type: "LEAD_CREATED",
              message: "Lead imported into Untagged Quarantine (caller assignment blocked until source is tagged)",
              newStatus: lead.status || "New",
            },
          })
        }

        if (lead.teamId) {
          const userName = userNameMap[lead.teamId] || `User #${lead.teamId}`
          assignmentCounts[userName] = (assignmentCounts[userName] || 0) + 1
          await createLeadAssignmentActivity({
            leadId: lead.id,
            assignedToId: lead.teamId,
            assignedById: req.authUser?.id,
          })
        }
      } catch (error) {
        console.log(`Lead import failed at Excel row ${index + 2}`, error)
        return res.status(400).json({
          message: `Import failed at Excel row ${index + 2}: ${error.message || "Invalid lead data"}`,
        })
      }
    }

    emitReportsUpdate("lead:imported")

    res.status(201).json({
      message: skippedDuplicates.length
        ? `Lead import completed. ${result.length} imported, ${skippedDuplicates.length} duplicate rows skipped.`
        : "Leads imported successfully",
      importedCount: result.length,
      skippedDuplicateCount: skippedDuplicates.length,
      skippedDuplicateRows: skippedDuplicates,
      assignedUserCount: assignableUsers.length,
      assignmentCounts,
    })
  } catch (error) {
    console.log(error)

    if (String(error.message || "").startsWith("Excel row ")) {
      return res.status(400).json({ message: error.message })
    }

    return res.status(500).json("Something went wrong")
  }
}

exports.sampleExcel = (req, res) => {
  const data = [
    {
      Salutation: "Mr",
      "First name": "John",
      "Last name": "Doe",
      "Email Type": "Office",
      Email: "john@gmail.com",
      "Phone Type": "Mobile",
      Phone: "9876543210",
      Status: "New",
      Timezone: "UTC",
      Tags: "Hot Lead",
      "Interested projects": "Project A",
      Team: "Sales",
      "Channel partner": "ABC Realty",
      "Conduct site visit": "Yes",
      "Conduct site date": "2024-01-01",

      Aaddress: "Office Address",
      Street: "Main Road",
      City: "Pune",
      State: "Maharashtra",
      Country: "India",
      Zip: "411001",

      "Company name": "ABC Pvt Ltd",
      Type: "MEETINGROOMS",
      "Carpet area": "1200",
      Seats: "10",
      Tenure: "2",
      Gender: "Male",
      Occupations: "Engineer",
      Age: "30",
      Birthday: "1994-01-01",
      "Marital status": "Single",
      Anniversary: "",

      Industry: "IT",

      "Personal address": "Home Address",
      "Personal street": "MG Road",
      "Personal city": "Pune",
      "Personal state": "Maharashtra",
      "Personal country": "India",
      "Personal zip": "411002",

      Url: "https://example.com",
      Education: "B.Tech",
      "Company title": "Manager",
      Income: "1000000",
      "Basi comment": "Interested",
      Purpose: "Investment",
      NRI: "Yes/No",

      "Budget min": "5000000",
      "Budget max": "10000000",
      "Possession min": "2025",
      "Possession Max": "2026",
      Area: "Pune",
      "Funding source": "Loan",
      "Property type": "Flat",
      Configration: "2BHK",
      Budget: "8000000",
      "Bathroom preferences": "2",
      Furnishing: "Semi",
      Facing: "East",
      "Location preferences": "Baner",
      "Requirement comment": "Near IT park",
    },
  ]

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, "Sample")

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  })

  res.setHeader("Content-Disposition", "attachment; filename=lead_sample.xlsx")
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  )

  res.send(buffer)
}
