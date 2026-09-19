const prisma = require("../lib/prisma")
const mcubeAgentService = require("../services/mcubeAgent.service")

const normalizeEnv = (value) => String(value || "").trim()

const initialMappings = [
  {
    email: "trushant.swamigroup@gmail.com",
    mcubeAgentId: normalizeEnv(process.env.TRUSHANT_MCUBE_AGENT_ID),
    extension: normalizeEnv(process.env.TRUSHANT_MCUBE_EXTENSION),
    agentPhone: normalizeEnv(process.env.TRUSHANT_MCUBE_AGENT_PHONE),
    callingMode: normalizeEnv(process.env.TRUSHANT_MCUBE_CALLING_MODE) || "softphone",
  },
  {
    email: "shivaniswamideveloper@gmail.com",
    mcubeAgentId: normalizeEnv(process.env.SHIVANI_MCUBE_AGENT_ID),
    extension: normalizeEnv(process.env.SHIVANI_MCUBE_EXTENSION),
    agentPhone: normalizeEnv(process.env.SHIVANI_MCUBE_AGENT_PHONE),
    callingMode: normalizeEnv(process.env.SHIVANI_MCUBE_CALLING_MODE) || "softphone",
  },
  {
    email: "prasadpatilswamipmc@gmail.com",
    mcubeAgentId: normalizeEnv(process.env.PRASAD_MCUBE_AGENT_ID),
    extension: normalizeEnv(process.env.PRASAD_MCUBE_EXTENSION),
    agentPhone: normalizeEnv(process.env.PRASAD_MCUBE_AGENT_PHONE),
    callingMode: normalizeEnv(process.env.PRASAD_MCUBE_CALLING_MODE) || "softphone",
  },
]

async function seedMcubeAgents() {
  console.log("Seeding MCube agent database mappings...")

  for (const item of initialMappings) {
    const user = await prisma.user.findFirst({
      where: { email: item.email },
    })

    if (!user) {
      console.log(`User ${item.email} not found in database, skipped.`)
      continue
    }

    const existing = await mcubeAgentService.findMcubeAgentByUserId(user.id)
    const mapping = await mcubeAgentService.upsertMcubeAgentMapping({
      userId: user.id,
      mcubeEmail: item.email,
      mcubeAgentId: item.mcubeAgentId || existing?.mcubeAgentId || null,
      extension: item.extension || existing?.extension || null,
      agentPhone: item.agentPhone || existing?.agentPhone || user.phone || null,
      callingMode: item.callingMode || existing?.callingMode || "softphone",
      isActive: true,
    })

    console.log(`Mapped user ${user.email} (ID: ${user.id}) -> Extension: ${mapping.extension || "not configured"}, Mode: ${mapping.callingMode}`)
  }

  console.log("MCube agent mappings seed complete.")
}

if (require.main === module) {
  seedMcubeAgents()
    .catch((err) => {
      console.error("Failed to seed MCube agents:", err)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

module.exports = { seedMcubeAgents }
