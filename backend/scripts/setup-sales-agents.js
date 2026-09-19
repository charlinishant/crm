require("dotenv").config()
const bcrypt = require("bcryptjs")
const prisma = require("../lib/prisma")
const mcubeAgentService = require("../services/mcubeAgent.service")

const value = (name) => String(process.env[name] || "").trim()

const salesUsers = [
  {
    email: "trushant.swamigroup@gmail.com",
    passwordEnv: "TRUSHANT_SALES_PASSWORD",
    firstName: "Trushant",
    lastName: "Swami",
    username: "trushant_sales",
    phoneEnv: "TRUSHANT_AGENT_PHONE",
    mcubeAgentIdEnv: "TRUSHANT_MCUBE_AGENT_ID",
    extensionEnv: "TRUSHANT_MCUBE_EXTENSION",
    mcubePhoneEnv: "TRUSHANT_MCUBE_AGENT_PHONE",
    modeEnv: "TRUSHANT_MCUBE_CALLING_MODE",
  },
  {
    email: "shivaniswamideveloper@gmail.com",
    passwordEnv: "SHIVANI_SALES_PASSWORD",
    firstName: "Shivani",
    lastName: "Swami",
    username: "shivani_sales",
    phoneEnv: "SHIVANI_AGENT_PHONE",
    mcubeAgentIdEnv: "SHIVANI_MCUBE_AGENT_ID",
    extensionEnv: "SHIVANI_MCUBE_EXTENSION",
    mcubePhoneEnv: "SHIVANI_MCUBE_AGENT_PHONE",
    modeEnv: "SHIVANI_MCUBE_CALLING_MODE",
  },
  {
    email: "prasadpatilswamipmc@gmail.com",
    passwordEnv: "PRASAD_SALES_PASSWORD",
    firstName: "Prasad",
    lastName: "Patil",
    username: "prasad_sales",
    phoneEnv: "PRASAD_AGENT_PHONE",
    mcubeAgentIdEnv: "PRASAD_MCUBE_AGENT_ID",
    extensionEnv: "PRASAD_MCUBE_EXTENSION",
    mcubePhoneEnv: "PRASAD_MCUBE_AGENT_PHONE",
    modeEnv: "PRASAD_MCUBE_CALLING_MODE",
  },
]

const cleanPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "").slice(-10)
  return digits.length === 10 ? digits : null
}

async function upsertSalesUser(item) {
  const existing = await prisma.user.findFirst({ where: { email: item.email } })
  const password = value(item.passwordEnv)
  const phone = cleanPhone(value(item.phoneEnv))

  if (!existing && !password) {
    throw new Error(`Missing ${item.passwordEnv}. Provide it to create ${item.email}.`)
  }

  const passwordData = password ? { password: await bcrypt.hash(password, 10) } : {}
  const commonData = {
    email: item.email,
    firstName: item.firstName,
    lastName: item.lastName,
    role: "SALES",
    department: "SALES",
    isActive: true,
    ...passwordData,
  }

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        ...commonData,
        ...(phone && !existing.phone ? { phone } : {}),
      },
    })
  }

  return prisma.user.create({
    data: {
      ...commonData,
      username: item.username,
      phone,
    },
  })
}

async function setupSalesAgents() {
  console.log("Setting up requested sales users and MCube agent mappings...")

  for (const item of salesUsers) {
    const user = await upsertSalesUser(item)
    const existingMapping = await mcubeAgentService.findMcubeAgentByUserId(user.id)
    const mcubeAgentId = value(item.mcubeAgentIdEnv) || existingMapping?.mcubeAgentId || null
    const extension = value(item.extensionEnv) || existingMapping?.extension || null
    const agentPhone = cleanPhone(value(item.mcubePhoneEnv)) || existingMapping?.agentPhone || user.phone || null

    const mapping = await mcubeAgentService.upsertMcubeAgentMapping({
      userId: user.id,
      mcubeEmail: item.email,
      mcubeAgentId,
      extension,
      agentPhone,
      callingMode: value(item.modeEnv) || existingMapping?.callingMode || "softphone",
      isActive: true,
    })

    console.log(`Mapped MCube Agent: ${item.email} -> Extension: ${mapping.extension || "not configured"}, Phone: ${mapping.agentPhone || "not configured"}`)
  }

  console.log("Sales users and MCube mappings have been configured.")
}

if (require.main === module) {
  setupSalesAgents()
    .catch((err) => {
      console.error("Error setting up sales agents:", err.message)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

module.exports = { setupSalesAgents }
