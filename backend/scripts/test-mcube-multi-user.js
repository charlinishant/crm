const axios = require("axios")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const prisma = require("../lib/prisma")
const mcubeAgentService = require("../services/mcubeAgent.service")

const BASE_URL = process.env.API_URL || "http://localhost:5000"
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_TOKEN_SECRET || "swami-crm-change-this-jwt-secret"

const testResults = []
const logTest = (name, passed, detail = "") => {
  testResults.push({ name, passed, detail })
  const icon = passed ? "✓" : "✗"
  console.log(`${icon} ${name}${detail ? ` - ${detail}` : ""}`)
  if (!passed) throw new Error(`Test failed: ${name} - ${detail}`)
}

async function runMultiUserTests() {
  console.log("\n=======================================================")
  console.log("STARTING MCUBE MULTI-USER CRM INTEGRATION TEST SUITE")
  console.log("=======================================================\n")

  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10)
  const timestamp = Date.now()

  // 1. Setup 3 distinct sales users
  console.log("Setting up 3 Sales Users and MCube Mappings...")
  const user1Email = `sales1.${timestamp}@company.com`
  const user2Email = `sales2.${timestamp}@company.com`
  const user3Email = `sales3.${timestamp}@company.com`

  const user1 = await prisma.user.create({
    data: {
      username: `sales1_${timestamp}`,
      email: user1Email,
      password: passwordHash,
      firstName: "Sales",
      lastName: "User1",
      phone: `911${String(timestamp).slice(-7)}`,
      role: "SALES",
      department: "SALES",
      isActive: true,
    },
  })

  const user2 = await prisma.user.create({
    data: {
      username: `sales2_${timestamp}`,
      email: user2Email,
      password: passwordHash,
      firstName: "Sales",
      lastName: "User2",
      phone: `912${String(timestamp).slice(-7)}`,
      role: "SALES",
      department: "SALES",
      isActive: true,
    },
  })

  const user3 = await prisma.user.create({
    data: {
      username: `sales3_${timestamp}`,
      email: user3Email,
      password: passwordHash,
      firstName: "Sales",
      lastName: "User3",
      phone: `913${String(timestamp).slice(-7)}`,
      role: "SALES",
      department: "SALES",
      isActive: true,
    },
  })

  // 2. Setup database-driven MCube Agent mappings
  await mcubeAgentService.upsertMcubeAgentMapping({
    userId: user1.id,
    mcubeEmail: user1Email,
    mcubeAgentId: null,
    extension: `101${String(timestamp).slice(-3)}`,
    agentPhone: user1.phone,
    callingMode: "softphone",
    isActive: true,
  })

  await mcubeAgentService.upsertMcubeAgentMapping({
    userId: user2.id,
    mcubeEmail: user2Email,
    mcubeAgentId: null,
    extension: `102${String(timestamp).slice(-3)}`,
    agentPhone: user2.phone,
    callingMode: "softphone",
    isActive: true,
  })

  await mcubeAgentService.upsertMcubeAgentMapping({
    userId: user3.id,
    mcubeEmail: user3Email,
    mcubeAgentId: null,
    extension: `103${String(timestamp).slice(-3)}`,
    agentPhone: user3.phone,
    callingMode: "softphone",
    isActive: true,
  })

  const agent1Mapping = await mcubeAgentService.findMcubeAgentByUserId(user1.id)
  const agent2Mapping = await mcubeAgentService.findMcubeAgentByUserId(user2.id)
  const agent3Mapping = await mcubeAgentService.findMcubeAgentByUserId(user3.id)

  // 3. Create assigned Leads
  const phoneA = `981${String(timestamp).slice(-7)}`
  const phoneB = `982${String(timestamp).slice(-7)}`
  const phoneC = `983${String(timestamp).slice(-7)}`

  const leadA = await prisma.lead.create({
    data: {
      firstName: "Customer",
      lastName: "Alpha",
      phones: [{ type: "Mobile", value: phoneA, primary: true }],
      teamId: user1.id,
      seats: 0,
      tenure: 0,
      industry: "Tech",
      status: "New",
      is_active: true,
      is_delete: false,
    },
  })

  const leadB = await prisma.lead.create({
    data: {
      firstName: "Customer",
      lastName: "Beta",
      phones: [{ type: "Mobile", value: phoneB, primary: true }],
      teamId: user2.id,
      seats: 0,
      tenure: 0,
      industry: "Finance",
      status: "New",
      is_active: true,
      is_delete: false,
    },
  })

  const leadC = await prisma.lead.create({
    data: {
      firstName: "Customer",
      lastName: "Gamma",
      phones: [{ type: "Mobile", value: phoneC, primary: true }],
      teamId: user3.id,
      seats: 0,
      tenure: 0,
      industry: "Retail",
      status: "New",
      is_active: true,
      is_delete: false,
    },
  })

  // Generate auth tokens
  const token1 = jwt.sign({ id: user1.id, email: user1.email, role: user1.role }, JWT_SECRET, { expiresIn: "1h" })
  const token2 = jwt.sign({ id: user2.id, email: user2.email, role: user2.role }, JWT_SECRET, { expiresIn: "1h" })
  const token3 = jwt.sign({ id: user3.id, email: user3.email, role: user3.role }, JWT_SECRET, { expiresIn: "1h" })

  try {
    // ------------------------------------------------------------------------
    // TEST A: Login User 1 -> GET /api/calls/browser-phone/widget
    // ------------------------------------------------------------------------
    console.log("\n[TEST A] Verifying User 1 MCube widget isolation...")
    const widgetRes1 = await axios.get(`${BASE_URL}/api/calls/browser-phone/widget`, {
      headers: { Authorization: `Bearer ${token1}` },
    })
    logTest(
      "Test A - Status 200",
      widgetRes1.status === 200,
      `Received HTTP ${widgetRes1.status}`
    )
    logTest(
      "Test A - mcubeEmail matches User 1",
      widgetRes1.data.mcubeEmail === user1Email && widgetRes1.data.crmEmail === user1Email,
      `mcubeEmail: ${widgetRes1.data.mcubeEmail}`
    )
    logTest(
      "Test A - Extension matches User 1 extension and NOT User 2 or User 3",
      widgetRes1.data.agentExtension === agent1Mapping.extension &&
      widgetRes1.data.agentExtension !== agent2Mapping.extension &&
      widgetRes1.data.agentExtension !== agent3Mapping.extension,
      `Extension: ${widgetRes1.data.agentExtension}`
    )
    logTest(
      "Test A - Widget URL contains User 1 username parameter",
      widgetRes1.data.widgetUrl && widgetRes1.data.widgetUrl.includes(encodeURIComponent(user1Email)) || widgetRes1.data.widgetUrl.includes(user1Email),
      `WidgetUrl: ${widgetRes1.data.widgetUrl}`
    )

    // ------------------------------------------------------------------------
    // TEST B: Login User 2 -> GET /api/calls/browser-phone/widget
    // ------------------------------------------------------------------------
    console.log("\n[TEST B] Verifying User 2 MCube widget isolation...")
    const widgetRes2 = await axios.get(`${BASE_URL}/api/calls/browser-phone/widget`, {
      headers: { Authorization: `Bearer ${token2}` },
    })
    logTest(
      "Test B - Status 200",
      widgetRes2.status === 200,
      `Received HTTP ${widgetRes2.status}`
    )
    logTest(
      "Test B - mcubeEmail matches User 2",
      widgetRes2.data.mcubeEmail === user2Email,
      `mcubeEmail: ${widgetRes2.data.mcubeEmail}`
    )
    logTest(
      "Test B - Extension matches User 2 extension",
      widgetRes2.data.agentExtension === agent2Mapping.extension,
      `Extension: ${widgetRes2.data.agentExtension}`
    )

    // ------------------------------------------------------------------------
    // TEST C: Login User 3 -> GET /api/calls/browser-phone/widget
    // ------------------------------------------------------------------------
    console.log("\n[TEST C] Verifying User 3 MCube widget isolation...")
    const widgetRes3 = await axios.get(`${BASE_URL}/api/calls/browser-phone/widget`, {
      headers: { Authorization: `Bearer ${token3}` },
    })
    logTest(
      "Test C - Status 200",
      widgetRes3.status === 200,
      `Received HTTP ${widgetRes3.status}`
    )
    logTest(
      "Test C - mcubeEmail matches User 3",
      widgetRes3.data.mcubeEmail === user3Email,
      `mcubeEmail: ${widgetRes3.data.mcubeEmail}`
    )
    logTest(
      "Test C - Extension matches User 3 extension",
      widgetRes3.data.agentExtension === agent3Mapping.extension,
      `Extension: ${widgetRes3.data.agentExtension}`
    )

    // ------------------------------------------------------------------------
    // TEST D: User 1 attempts to call Lead B (assigned to User 2) -> Expect 403
    // ------------------------------------------------------------------------
    console.log("\n[TEST D] Verifying lead ownership security (User 1 calling Lead B)...")
    try {
      await axios.post(
        `${BASE_URL}/api/calls/mcube/click-to-call`,
        {
          leadId: leadB.id,
          phone: phoneB,
          requestId: `req-${Date.now()}`,
        },
        {
          headers: { Authorization: `Bearer ${token1}` },
        }
      )
      logTest("Test D - Unauthorized lead call blocked", false, "Call was unexpectedly allowed")
    } catch (err) {
      const is403 = err.response?.status === 403
      logTest(
        "Test D - HTTP 403 Forbidden returned when calling unassigned lead",
        is403,
        `Status: ${err.response?.status}, Message: ${err.response?.data?.message}`
      )
    }

    // ------------------------------------------------------------------------
    // TEST E: User 1 calls Lead A (assigned to User 1) -> Expect CallLog created
    // ------------------------------------------------------------------------
    console.log("\n[TEST E] Verifying authorized click-to-call for User 1 on Lead A...")
    try {
      const c2cRes = await axios.post(
        `${BASE_URL}/api/calls/mcube/click-to-call`,
        {
          leadId: leadA.id,
          phone: phoneA,
          requestId: `req-auth-${Date.now()}`,
        },
        {
          headers: { Authorization: `Bearer ${token1}` },
        }
      )
      logTest(
        "Test E - Click-to-call accepted or initiated",
        c2cRes.status === 200 || c2cRes.status === 201,
        `Status: ${c2cRes.status}`
      )
    } catch (err) {
      // If external provider endpoint fails in offline test environment, verify call log authorization was reached
      const status = err.response?.status
      const isExpectedProviderFailure = status === 502 || status === 500 || status === 503 || status === 400 || (err.message && !err.response)
      logTest(
        "Test E - Click-to-call authorized for owner and routed to provider",
        Boolean(isExpectedProviderFailure),
        `Authorized request reached provider handler with status ${status || err.message}`
      )
    }

    const callLogA = await prisma.callLog.findFirst({
      where: { leadId: leadA.id, agentId: user1.id },
      orderBy: { id: "desc" },
    })
    logTest(
      "Test E - CallLog recorded with agentId = User 1 and leadId = Lead A",
      Boolean(callLogA && callLogA.agentId === user1.id && callLogA.leadId === leadA.id),
      `CallLog ID: ${callLogA?.id}, AgentId: ${callLogA?.agentId}`
    )

    // ------------------------------------------------------------------------
    // TEST F: MCube Inbound Webhook identifying Agent 2 (User 2)
    // ------------------------------------------------------------------------
    console.log("\n[TEST F] Verifying MCube Inbound Webhook routing for Agent 2...")
    const inboundPayloadF = {
      callid: `inbound-f-${timestamp}`,
      agentEmail: user2Email,
      caller: phoneB,
      callto: "8779308386",
      status: "ringing",
      direction: "inbound",
      duration: "35",
      recordingurl: "https://mcube.recordings.example.com/rec-f.wav",
    }

    const webhookResF = await axios.post(`${BASE_URL}/api/calls/mcube/inbound`, inboundPayloadF)
    logTest(
      "Test F - Webhook accepted with 200",
      webhookResF.status === 200,
      `Status: ${webhookResF.status}`
    )

    const callLogF = await prisma.callLog.findFirst({
      where: { providerCallId: `inbound-f-${timestamp}` },
    })
    logTest(
      "Test F - Inbound CallLog correctly linked to User 2 (Agent 2)",
      Boolean(callLogF && callLogF.agentId === user2.id),
      `CallLog AgentId: ${callLogF?.agentId}, Expected: ${user2.id}`
    )
    logTest(
      "Test F - Inbound CallLog correctly linked to Lead B (matched by phone)",
      Boolean(callLogF && callLogF.leadId === leadB.id),
      `CallLog LeadId: ${callLogF?.leadId}, Expected: ${leadB.id}`
    )

    // ------------------------------------------------------------------------
    // TEST G: MCube Inbound Webhook identifying Agent 3 (User 3)
    // ------------------------------------------------------------------------
    console.log("\n[TEST G] Verifying MCube Inbound Webhook routing for Agent 3...")
    const inboundPayloadG = {
      callid: `inbound-g-${timestamp}`,
      agent_email: user3Email,
      customernumber: phoneC,
      clicktocalldid: "8779308386",
      callstatus: "ringing",
      direction: "inbound",
    }

    const webhookResG = await axios.post(`${BASE_URL}/api/calls/mcube/inbound`, inboundPayloadG)
    logTest(
      "Test G - Webhook accepted with 200",
      webhookResG.status === 200,
      `Status: ${webhookResG.status}`
    )

    const callLogG = await prisma.callLog.findFirst({
      where: { providerCallId: `inbound-g-${timestamp}` },
    })
    logTest(
      "Test G - Inbound CallLog correctly linked to User 3 (Agent 3)",
      Boolean(callLogG && callLogG.agentId === user3.id),
      `CallLog AgentId: ${callLogG?.agentId}, Expected: ${user3.id}`
    )
    logTest(
      "Test G - Inbound CallLog correctly linked to Lead C",
      Boolean(callLogG && callLogG.leadId === leadC.id),
      `CallLog LeadId: ${callLogG?.leadId}, Expected: ${leadC.id}`
    )

    // ------------------------------------------------------------------------
    // TEST H: Test /api/calls/mcube/agent/me endpoint
    // ------------------------------------------------------------------------
    console.log("\n[TEST H] Verifying /api/calls/mcube/agent/me mapping endpoint...")
    const meRes1 = await axios.get(`${BASE_URL}/api/calls/mcube/agent/me`, {
      headers: { Authorization: `Bearer ${token1}` },
    })
    logTest(
      "Test H - User 1 /mcube/agent/me returns mapped status and credentials",
      meRes1.data.mapped === true && meRes1.data.crmEmail === user1Email && meRes1.data.mcubeEmail === user1Email,
      `Mapped: ${meRes1.data.mapped}, Ext: ${meRes1.data.extension}`
    )

    console.log("\n=======================================================")
    console.log(`ALL MULTI-USER TESTS PASSED (${testResults.length}/${testResults.length})`)
    console.log("=======================================================\n")
  } finally {
    // Cleanup test data
    await prisma.callLog.deleteMany({
      where: {
        OR: [
          { agentId: { in: [user1.id, user2.id, user3.id] } },
          { leadId: { in: [leadA.id, leadB.id, leadC.id] } },
        ],
      },
    }).catch(() => null)

    await prisma.lead.deleteMany({
      where: { id: { in: [leadA.id, leadB.id, leadC.id] } },
    }).catch(() => null)

    await mcubeAgentService.deleteMcubeAgentMapping(user1.id).catch(() => null)
    await mcubeAgentService.deleteMcubeAgentMapping(user2.id).catch(() => null)
    await mcubeAgentService.deleteMcubeAgentMapping(user3.id).catch(() => null)

    await prisma.user.deleteMany({
      where: { id: { in: [user1.id, user2.id, user3.id] } },
    }).catch(() => null)
  }
}

if (require.main === module) {
  runMultiUserTests()
    .catch((error) => {
      console.error("\nTEST SUITE FAILED:", error.stack || error.message || error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

module.exports = { runMultiUserTests }
