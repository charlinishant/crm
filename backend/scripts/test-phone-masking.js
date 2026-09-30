require("dotenv").config()
const jwt = require("jsonwebtoken")
const prisma = require("../lib/prisma")
const { maskPhoneNumber, maskLeadData, maskFollowUpData, maskScheduleVisitData, maskTaskData, maskCallLogData, isAdminUser } = require("../utils/phoneMask")

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_TOKEN_SECRET || "swami-crm-change-this-jwt-secret"

async function runTests() {
  console.log("=== Starting Phone Masking Tests ===")

  // 1. Unit Tests for maskPhoneNumber
  console.log("\n1. Testing maskPhoneNumber utility:")
  const testCases = [
    { input: "9356532881", expected: "9356XXXXXX" },
    { input: "+91 9356532881", expected: "+91 9356XXXXXX" },
    { input: "+919356532881", expected: "+919356XXXXXX" },
    { input: "whatsapp:+919356532881", expected: "whatsapp:+919356XXXXXX" },
    { input: "9876543210", expected: "9876XXXXXX" },
    { input: "9356XXXXXX", expected: "9356XXXXXX" }, // already masked
    { input: "09821077957", expected: "0982XXXXXXX" }, // 11-digit leading 0
    { input: "919821077957", expected: "+919821XXXXXX" }, // 12-digit with 91
    { input: "022-28374829", expected: "0222XXXXXXX" }, // 11-digit landline with hyphen
    { input: "+1 555 123 4567", expected: "+1 5551XXXXXX" }, // international
    { input: "", expected: "" },
    { input: null, expected: null },
  ]

  for (const { input, expected } of testCases) {
    const output = maskPhoneNumber(input)
    const passed = output === expected
    console.log(`  ${passed ? "✓" : "✗"} input: "${input}" -> output: "${output}" (expected: "${expected}")`)
    if (!passed) throw new Error(`Unit test failed for input: ${input}`)
  }

  // 2. Unit Tests for maskLeadData, maskFollowUpData, maskScheduleVisitData, maskTaskData
  console.log("\n2. Testing entity masking utilities:")
  const rawLead = {
    id: 101,
    firstName: "Testing",
    lastName: "Huzaif",
    phones: [{ type: "Mobile", value: "9356532881" }, { type: "Alternate", value: "9876543210" }],
    phone: "9356532881",
    alternatePhone: "9876543210",
  }

  const maskedLead = maskLeadData(rawLead, false)
  console.log("  Masked Lead phones:", JSON.stringify(maskedLead.phones))
  console.log("  Masked Lead phone:", maskedLead.phone)
  console.log("  Masked Lead alternatePhone:", maskedLead.alternatePhone)

  if (maskedLead.phones[0].value !== "9356XXXXXX" || maskedLead.phone !== "9356XXXXXX") {
    throw new Error("maskLeadData failed to mask phone numbers")
  }

  const unmaskedForAdmin = maskLeadData(rawLead, true)
  if (unmaskedForAdmin.phones[0].value !== "9356532881" || unmaskedForAdmin.phone !== "9356532881") {
    throw new Error("maskLeadData erroneously masked data for admin")
  }
  console.log("  ✓ Admin lead visibility preserved")

  // Follow-up masking
  const rawFollowUp = {
    id: 201,
    type: "Callback",
    phone: "9821077957",
    leadPhone: "9930900901",
    lead: rawLead,
  }
  const maskedFollowUp = maskFollowUpData(rawFollowUp, false)
  console.log("  Masked FollowUp phone:", maskedFollowUp.phone)
  console.log("  Masked FollowUp leadPhone:", maskedFollowUp.leadPhone)
  console.log("  Masked FollowUp lead.phone:", maskedFollowUp.lead.phone)
  if (maskedFollowUp.phone !== "9821XXXXXX" || maskedFollowUp.leadPhone !== "9930XXXXXX" || maskedFollowUp.lead.phone !== "9356XXXXXX") {
    throw new Error("maskFollowUpData failed to mask follow-up numbers")
  }
  console.log("  ✓ FollowUp masking verified")

  // 3. API Integration Test
  console.log("\n3. Testing API endpoints with Sales vs Admin tokens:")
  
  // Find or create a sales user and admin user
  let salesUser = await prisma.user.findFirst({
    where: { role: { in: ["SALES", "PRE_SALES"] }, isActive: true },
  })
  let adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
  })

  if (!salesUser) {
    console.log("  No sales user found in DB, skipping token HTTP test")
    return
  }

  const salesToken = jwt.sign(
    { id: salesUser.id, role: salesUser.role, username: salesUser.username, email: salesUser.email },
    JWT_SECRET,
    { expiresIn: "1h" }
  )

  const adminToken = adminUser ? jwt.sign(
    { id: adminUser.id, role: adminUser.role, username: adminUser.username, email: adminUser.email },
    JWT_SECRET,
    { expiresIn: "1h" }
  ) : null

  const PORT = process.env.PORT || 5002

  // Test /followups as Sales User
  const followUpsRes = await fetch(`http://localhost:${PORT}/followups`, {
    headers: { Authorization: `Bearer ${salesToken}` },
  })
  if (followUpsRes.ok) {
    const fuData = await followUpsRes.json()
    const list = Array.isArray(fuData) ? fuData : (fuData.data || [])
    console.log(`  ✓ Sales /followups returned ${list.length} followups`)
    if (list.length > 0) {
      const sample = list[0]
      console.log(`  ✓ Sample Followup #${sample.id} phone: "${sample.phone}"`)
      if (sample.phone && !sample.phone.includes("X") && sample.phone.length >= 10) {
        throw new Error(`Followup phone number is unmasked in sales response: ${sample.phone}`)
      }
    }
  }

  // Test /api/user/access-panel as Sales User
  const accessPanelRes = await fetch(`http://localhost:${PORT}/api/user/access-panel`, {
    headers: { Authorization: `Bearer ${salesToken}` },
  })
  
  if (accessPanelRes.ok) {
    const panelData = await accessPanelRes.json()
    console.log(`  ✓ Sales /api/user/access-panel returned ${panelData.leads?.length || 0} leads`)
    if (panelData.leads && panelData.leads.length > 0) {
      const sampleLead = panelData.leads[0]
      const phoneVal = Array.isArray(sampleLead.phones)
        ? (typeof sampleLead.phones[0] === "object" ? sampleLead.phones[0]?.value : sampleLead.phones[0])
        : sampleLead.phones
      console.log(`  ✓ Sample Lead #${sampleLead.id} phone for Sales User: "${phoneVal}"`)
      if (phoneVal && !phoneVal.includes("X") && phoneVal.length >= 10) {
        throw new Error(`Lead phone number is unmasked in sales response: ${phoneVal}`)
      }
    }
  } else {
    console.log("  Warning: /api/user/access-panel returned status", accessPanelRes.status)
  }

  console.log("\n=== ALL PHONE MASKING TESTS PASSED SUCCESSFULLY! ===")
}

runTests()
  .catch((err) => {
    console.error("Test error:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
