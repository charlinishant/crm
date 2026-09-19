const prisma = require("../lib/prisma")
const { normalizePhoneNumber } = require("../utils/phone")

const normalizeEmail = (value) => String(value || "").trim().toLowerCase()
const cleanPhone = (value) => normalizePhoneNumber(value)
const last10 = (value) => cleanPhone(value).slice(-10)

const parseMappedConfig = (raw) => {
  const text = String(raw || "").trim()
  if (!text) return {}
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed
  } catch (error) {
    return text.split(",").reduce((items, pair) => {
      const [key, value] = pair.split(":").map((item) => String(item || "").trim())
      if (key && value) items[key.toLowerCase()] = value
      return items
    }, {})
  }
  return {}
}

const getMappedConfigValue = (raw, keys) => {
  const text = String(raw || "").trim()
  if (!text) return ""
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return keys.map((key) => parsed[key]).find(Boolean) || ""
    }
  } catch (error) {
    const map = text.split(",").reduce((items, pair) => {
      const [key, value] = pair.split(":").map((item) => String(item || "").trim())
      if (key && value) items[key.toLowerCase()] = value
      return items
    }, {})
    return keys.map((key) => map[String(key || "").toLowerCase()]).find(Boolean) || ""
  }
  return ""
}

// Database helper functions for McubeAgent
const findMcubeAgentByUserId = async (userId) => {
  if (!userId) return null
  const numericId = Number(userId)
  if (!numericId || Number.isNaN(numericId)) return null

  if (prisma.mcubeAgent?.findUnique) {
    try {
      return await prisma.mcubeAgent.findUnique({ where: { userId: numericId } })
    } catch (e) {
      // Fallback to raw query if delegate not in client
    }
  }

  const rows = await prisma.$queryRawUnsafe(
    "SELECT * FROM `McubeAgent` WHERE `userId` = ? LIMIT 1",
    numericId
  )
  return rows[0] || null
}

const findMcubeAgentByEmail = async (email) => {
  const normalized = normalizeEmail(email)
  if (!normalized) return null

  if (prisma.mcubeAgent?.findUnique) {
    try {
      return await prisma.mcubeAgent.findUnique({ where: { mcubeEmail: normalized } })
    } catch (e) {}
  }

  const rows = await prisma.$queryRawUnsafe(
    "SELECT * FROM `McubeAgent` WHERE LOWER(`mcubeEmail`) = ? LIMIT 1",
    normalized
  )
  return rows[0] || null
}

const findMcubeAgentByAgentId = async (mcubeAgentId) => {
  const agentIdStr = String(mcubeAgentId || "").trim()
  if (!agentIdStr) return null

  if (prisma.mcubeAgent?.findFirst) {
    try {
      return await prisma.mcubeAgent.findFirst({ where: { mcubeAgentId: agentIdStr } })
    } catch (e) {}
  }

  const rows = await prisma.$queryRawUnsafe(
    "SELECT * FROM `McubeAgent` WHERE `mcubeAgentId` = ? LIMIT 1",
    agentIdStr
  )
  return rows[0] || null
}

const findMcubeAgentByExtension = async (extension) => {
  const extStr = String(extension || "").replace(/\D/g, "")
  if (!extStr) return null

  if (prisma.mcubeAgent?.findFirst) {
    try {
      return await prisma.mcubeAgent.findFirst({ where: { extension: extStr } })
    } catch (e) {}
  }

  const rows = await prisma.$queryRawUnsafe(
    "SELECT * FROM `McubeAgent` WHERE `extension` = ? LIMIT 1",
    extStr
  )
  return rows[0] || null
}

const findMcubeAgentByPhone = async (phone) => {
  const target = last10(phone)
  if (!target) return null

  const rows = await prisma.$queryRawUnsafe(
    "SELECT * FROM `McubeAgent` WHERE `agentPhone` LIKE ? LIMIT 1",
    `%${target}%`
  )
  return rows[0] || null
}

const upsertMcubeAgentMapping = async ({
  userId,
  mcubeEmail,
  mcubeAgentId = null,
  extension = null,
  agentPhone = null,
  callingMode = "softphone",
  isActive = true,
}) => {
  const numericUserId = Number(userId)
  const normalizedEmail = normalizeEmail(mcubeEmail)
  const normalizedExt = extension ? String(extension).trim() : null
  const normalizedAgentId = mcubeAgentId ? String(mcubeAgentId).trim() : null
  const normalizedPhone = agentPhone ? cleanPhone(agentPhone) : null
  const normalizedMode = String(callingMode || "softphone").trim().toLowerCase() === "hardphone" ? "hardphone" : "softphone"
  const activeBool = Boolean(isActive)

  const existing = await findMcubeAgentByUserId(numericUserId)

  if (existing) {
    await prisma.$executeRawUnsafe(
      `UPDATE \`McubeAgent\` SET
        \`mcubeEmail\` = ?,
        \`mcubeAgentId\` = ?,
        \`extension\` = ?,
        \`agentPhone\` = ?,
        \`callingMode\` = ?,
        \`isActive\` = ?,
        \`updatedAt\` = NOW(3)
      WHERE \`userId\` = ?`,
      normalizedEmail,
      normalizedAgentId,
      normalizedExt,
      normalizedPhone,
      normalizedMode,
      activeBool,
      numericUserId
    )
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`McubeAgent\`
        (\`userId\`, \`mcubeEmail\`, \`mcubeAgentId\`, \`extension\`, \`agentPhone\`, \`callingMode\`, \`isActive\`, \`createdAt\`, \`updatedAt\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      numericUserId,
      normalizedEmail,
      normalizedAgentId,
      normalizedExt,
      normalizedPhone,
      normalizedMode,
      activeBool
    )
  }

  return findMcubeAgentByUserId(numericUserId)
}

const deleteMcubeAgentMapping = async (userId) => {
  const numericUserId = Number(userId)
  if (!numericUserId) return false
  await prisma.$executeRawUnsafe(
    "DELETE FROM `McubeAgent` WHERE `userId` = ?",
    numericUserId
  )
  return true
}

const listMcubeAgentMappings = async () => {
  return prisma.$queryRawUnsafe(`
    SELECT m.*, u.email as userEmail, u.firstName, u.lastName, u.phone as userPhone
    FROM \`McubeAgent\` m
    JOIN \`User\` u ON m.userId = u.id
    ORDER BY m.id DESC
  `)
}

/**
 * Resolve MCube agent configuration for an authenticated CRM user
 * Priority:
 * 1. Database McubeAgent record by userId
 * 2. Database McubeAgent record by user.email
 * 3. User.email as MCube agent email, user.phone as fallback, env extensions
 */
const resolveMcubeAgentForCrmUser = async (crmUser) => {
  if (!crmUser) return null
  const userId = Number(crmUser.id)
  const crmEmail = normalizeEmail(crmUser.email)
  const crmPhone = cleanPhone(crmUser.phone || crmUser.secondaryPhone)

  // 1. Check DB McubeAgent by userId
  let dbAgent = await findMcubeAgentByUserId(userId)

  // 2. Check DB McubeAgent by crmEmail
  if (!dbAgent && crmEmail) {
    dbAgent = await findMcubeAgentByEmail(crmEmail)
  }

  if (dbAgent && dbAgent.isActive) {
    const agentEmail = normalizeEmail(dbAgent.mcubeEmail || crmEmail)
    const agentExtension = String(dbAgent.extension || "").trim()
    const agentPhone = cleanPhone(dbAgent.agentPhone || crmPhone || process.env.MCUBE_DEFAULT_AGENT_NUMBER)
    const callingMode = String(dbAgent.callingMode || "softphone").toLowerCase()

    console.info("MCube CRM agent resolved from database mapping", {
      crmUserId: userId,
      crmEmail,
      mcubeAgentId: dbAgent.mcubeAgentId || null,
      mcubeEmail: agentEmail,
      extension: agentExtension || null,
      callingMode,
    })

    return {
      mapped: true,
      id: dbAgent.id,
      crmUserId: userId,
      crmEmail,
      mcubeEmail: agentEmail,
      mcubeAgentId: dbAgent.mcubeAgentId || "",
      agentExtension,
      agentPhone,
      agentCallingMode: callingMode,
      mcubeStatus: "CONFIGURED"
    }
  }

  // 3. Fallback: CRM User's authenticated email & phone are the primary identity
  const phones = [crmUser.phone, crmUser.secondaryPhone].map(cleanPhone).filter(Boolean)
  const emails = [crmEmail].filter(Boolean)

  const envExtension = String(
    getMappedConfigValue(process.env.MCUBE_AGENT_EXT_MAP, [...phones, ...emails]) || ""
  ).trim()

  const targetPhone = cleanPhone(
    getMappedConfigValue(process.env.MCUBE_AGENT_NUMBER_MAP || process.env.MCUBE_AGENT_PHONE_MAP, [...phones, ...emails]) ||
    crmPhone ||
    process.env.MCUBE_DEFAULT_AGENT_NUMBER
  )

  const envMode = String(
    getMappedConfigValue(process.env.MCUBE_AGENT_MODE_MAP, [...phones, ...emails]) || "softphone"
  ).trim().toLowerCase()

  if (crmEmail && targetPhone) {
    const autoMapped = await upsertMcubeAgentMapping({
      userId,
      mcubeEmail: crmEmail,
      agentPhone: targetPhone,
      extension: envExtension || null,
      callingMode: envMode === "hardphone" ? "hardphone" : "softphone",
      isActive: true,
    }).catch(() => null)

    console.info("MCube CRM agent auto-mapped from CRM user email & phone", {
      crmUserId: userId,
      crmEmail,
      mcubeEmail: crmEmail,
      agentPhone: targetPhone,
      extension: envExtension || null,
    })

    return {
      mapped: true,
      id: autoMapped?.id || null,
      crmUserId: userId,
      crmEmail,
      mcubeEmail: crmEmail,
      mcubeAgentId: autoMapped?.mcubeAgentId || "",
      agentExtension: envExtension || autoMapped?.extension || "",
      agentPhone: targetPhone,
      agentCallingMode: envMode === "hardphone" ? "hardphone" : "softphone",
      mcubeStatus: "CONFIGURED"
    }
  }

  // Check if we have partial information that could lead to configuration
  const hasPartialInfo = crmEmail || targetPhone
  return {
    mapped: false,
    id: null,
    crmUserId: userId,
    crmEmail,
    mcubeEmail: crmEmail,
    mcubeAgentId: "",
    agentExtension: envExtension,
    agentPhone: targetPhone,
    agentCallingMode: envMode === "hardphone" ? "hardphone" : "softphone",
    mcubeStatus: hasPartialInfo ? "PARTIAL" : "NONE"
  }
}

const buildNotMappedError = () => {
  const error = new Error("Your CRM account is not mapped to an MCube agent.")
  error.statusCode = 400
  error.code = "MCUBE_AGENT_NOT_MAPPED"
  return error
}

const requireMcubeAgentForCrmUser = async (crmUser) => {
  const resolved = await resolveMcubeAgentForCrmUser(crmUser)
  if (!resolved?.mapped) throw buildNotMappedError()
  return resolved
}

/**
 * Resolve CRM User from MCube Inbound Webhook data
 * Priority:
 * 1. MCube agent email -> McubeAgent.mcubeEmail -> User
 * 2. MCube agent email -> User.email
 * 3. MCube agent ID -> McubeAgent.mcubeAgentId -> User
 * 4. MCube extension -> McubeAgent.extension -> User
 * 5. MCube agent phone -> McubeAgent.agentPhone -> User
 * 6. User.phone match
 * 7. Legacy env fallback
 * 8. Fallback availability ONLY if no agent identity was provided
 */
const resolveCrmUserFromMcubeWebhook = async (data, findAvailableInboundAgentFn) => {
  const agentEmail = normalizeEmail(
    data.agentLogin ||
    data.agent_login ||
    data.agentEmail ||
    data.agent_email ||
    data.username ||
    data.email
  )
  const agentProviderId = String(
    data.agentProviderId ||
    data.agentId ||
    data.agent_id ||
    data.mcubeAgentId ||
    data.executiveId ||
    data.exeid ||
    data.empid ||
    ""
  ).trim()
  const agentExtension = String(
    data.agentExtension ||
    data.extension ||
    data.ext ||
    data.agent_extension ||
    ""
  ).replace(/\D/g, "")
  const agentPhone = cleanPhone(
    data.agentPhone ||
    data.agent_phone ||
    data.emp_phone ||
    data.empphone ||
    data.exenumber ||
    data.executive ||
    ""
  )

  const userSelect = {
    id: true,
    email: true,
    phone: true,
    secondaryPhone: true,
    firstName: true,
    lastName: true,
    username: true,
    isActive: true,
    role: true,
  }

  // 1. Primary match: MCube agent email
  if (agentEmail) {
    // 1a. Check McubeAgent mapping table
    const mappedAgent = await findMcubeAgentByEmail(agentEmail)
    if (mappedAgent && mappedAgent.isActive) {
      const user = await prisma.user.findUnique({
        where: { id: mappedAgent.userId },
        select: userSelect,
      })
      if (user && user.isActive) {
        console.info("MCube inbound routed via McubeAgent email", {
          mcubeEmail: agentEmail,
          crmUserId: user.id,
          crmEmail: user.email,
        })
        return { user, resolvedBy: "mcube_agent_email", mcubeEmail: agentEmail }
      }
    }

    // 1b. Check User.email directly
    const directUser = await prisma.user.findFirst({
      where: { email: agentEmail, isActive: true },
      select: userSelect,
    })
    if (directUser) {
      console.info("MCube inbound routed via User.email", {
        mcubeEmail: agentEmail,
        crmUserId: directUser.id,
        crmEmail: directUser.email,
      })
      return { user: directUser, resolvedBy: "user_email", mcubeEmail: agentEmail }
    }
  }

  // 2. Secondary match: MCube agent ID
  if (agentProviderId) {
    const mappedAgent = await findMcubeAgentByAgentId(agentProviderId)
    if (mappedAgent && mappedAgent.isActive) {
      const user = await prisma.user.findUnique({
        where: { id: mappedAgent.userId },
        select: userSelect,
      })
      if (user && user.isActive) {
        console.info("MCube inbound routed via McubeAgent ID", {
          mcubeAgentId: agentProviderId,
          crmUserId: user.id,
        })
        return { user, resolvedBy: "mcube_agent_id", mcubeAgentId: agentProviderId }
      }
    }

    // Legacy env map
    const mappedUserId = Number(getMappedConfigValue(process.env.MCUBE_AGENT_ID_MAP, [agentProviderId]))
    if (mappedUserId) {
      const user = await prisma.user.findUnique({
        where: { id: mappedUserId },
        select: userSelect,
      })
      if (user && user.isActive) {
        return { user, resolvedBy: "env_agent_id", mcubeAgentId: agentProviderId }
      }
    }
  }

  // 3. Secondary match: Extension
  if (agentExtension) {
    const mappedAgent = await findMcubeAgentByExtension(agentExtension)
    if (mappedAgent && mappedAgent.isActive) {
      const user = await prisma.user.findUnique({
        where: { id: mappedAgent.userId },
        select: userSelect,
      })
      if (user && user.isActive) {
        console.info("MCube inbound routed via McubeAgent extension", {
          extension: agentExtension,
          crmUserId: user.id,
        })
        return { user, resolvedBy: "mcube_extension", extension: agentExtension }
      }
    }

    // Check users with configured extension in env
    const extensionMap = parseMappedConfig(process.env.MCUBE_AGENT_EXT_MAP)
    const users = await prisma.user.findMany({ where: { isActive: true }, select: userSelect })
    const matchedUser = users.find((u) => {
      const phones = [u.phone, u.secondaryPhone].map(cleanPhone).filter(Boolean)
      const emails = [normalizeEmail(u.email)].filter(Boolean)
      const configuredExt = [...phones, ...emails]
        .map((k) => String(extensionMap[k] || extensionMap[k.toLowerCase?.()] || "").replace(/\D/g, ""))
        .find(Boolean)
      return configuredExt && configuredExt === agentExtension
    })
    if (matchedUser) {
      return { user: matchedUser, resolvedBy: "env_extension", extension: agentExtension }
    }
  }

  // 4. Secondary match: Agent Phone
  if (agentPhone) {
    const mappedAgent = await findMcubeAgentByPhone(agentPhone)
    if (mappedAgent && mappedAgent.isActive) {
      const user = await prisma.user.findUnique({
        where: { id: mappedAgent.userId },
        select: userSelect,
      })
      if (user && user.isActive) {
        return { user, resolvedBy: "mcube_agent_phone", agentPhone }
      }
    }

    const target = last10(agentPhone)
    if (target) {
      const users = await prisma.user.findMany({ where: { isActive: true }, select: userSelect })
      const phoneMatchedUser = users.find((u) => {
        const p1 = last10(u.phone)
        const p2 = last10(u.secondaryPhone)
        return (p1 && p1 === target) || (p2 && p2 === target)
      })
      if (phoneMatchedUser) {
        return { user: phoneMatchedUser, resolvedBy: "user_phone", agentPhone }
      }
    }
  }

  // If no agent identity was found and callback is inbound and no agent fields were provided
  const hasAnyAgentIdentity = Boolean(agentEmail || agentProviderId || agentExtension || agentPhone)
  if (!hasAnyAgentIdentity && data.direction === "inbound" && typeof findAvailableInboundAgentFn === "function") {
    console.info("No MCube agent identity in inbound webhook, checking fallback availability...")
    const fallbackUser = await findAvailableInboundAgentFn()
    if (fallbackUser) {
      return { user: fallbackUser, resolvedBy: "fallback_availability" }
    }
  }

  return { user: null, resolvedBy: "unresolved" }
}

module.exports = {
  normalizeEmail,
  cleanPhone,
  findMcubeAgentByUserId,
  findMcubeAgentByEmail,
  findMcubeAgentByAgentId,
  findMcubeAgentByExtension,
  findMcubeAgentByPhone,
  upsertMcubeAgentMapping,
  deleteMcubeAgentMapping,
  listMcubeAgentMappings,
  resolveMcubeAgentForCrmUser,
  requireMcubeAgentForCrmUser,
  resolveCrmUserFromMcubeWebhook,
}
