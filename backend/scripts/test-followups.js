require("dotenv").config({ path: "./backend/.env" })
const jwt = require("jsonwebtoken")
const prisma = require("../lib/prisma")
const { getFollowUps } = require("../services/followup.service")

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_TOKEN_SECRET || "swami-crm-change-this-jwt-secret"

async function testFollowUps() {
  console.log("=== Starting Follow-up Tab Filtering and Counts Test ===")

  // Find a sales user
  const salesUser = await prisma.user.findFirst({
    where: { role: { in: ["SALES", "PRE_SALES"] }, isActive: true },
  })

  if (!salesUser) {
    console.log("No sales user found in DB, skipping")
    return
  }

  console.log(`Testing with sales user #${salesUser.id} (${salesUser.username})`)

  // Test 1: getFollowUps for all tabs
  const tabs = ["all", "today", "upcoming", "due", "overdue", "completed", "cancelled"]
  const results = {}

  for (const tab of tabs) {
    const res = await getFollowUps(salesUser, tab)
    results[tab] = res
    console.log(`\nTab [${tab}]:`)
    console.log(`  - Records returned: ${res.data.length}`)
    console.log(`  - Total items: ${res.totalItems}`)
    console.log(`  - Badge counts:`, JSON.stringify(res.counts))
  }

  // Verification 1: Badge counts must be identical regardless of active tab
  const allCounts = results["all"].counts
  for (const tab of tabs) {
    const tabCounts = results[tab].counts
    const isIdentical = JSON.stringify(allCounts) === JSON.stringify(tabCounts)
    if (!isIdentical) {
      throw new Error(`Defect A reproduced! Tab ${tab} counts (${JSON.stringify(tabCounts)}) differ from all counts (${JSON.stringify(allCounts)})`)
    }
  }
  console.log("\n✓ PASS: All badge counts are fixed and consistent across every tab switch!")

  // Verification 2: Check that each tab's data length equals its badge count
  for (const tab of tabs) {
    const countKey = tab === "due" ? "due" : tab
    const expectedCount = allCounts[countKey]
    const actualLength = results[tab].data.length
    console.log(`  - Tab '${tab}' returned ${actualLength} rows (badge says: ${expectedCount})`)
    if (actualLength !== expectedCount) {
      throw new Error(`Defect B reproduced! Tab ${tab} returned ${actualLength} items but badge count is ${expectedCount}`)
    }
  }
  console.log("✓ PASS: Each tab filter returns the exact number of matching records indicated by its badge!")

  console.log("\n=== ALL FOLLOW-UP TESTS PASSED SUCCESSFULLY! ===")
}

testFollowUps()
  .catch((err) => {
    console.error("Test failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
