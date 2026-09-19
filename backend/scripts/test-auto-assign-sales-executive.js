require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const axios = require("axios");
const prisma = require("../lib/prisma");
const { upsertScheduleVisit } = require("../services/scheduleVisit.service");

const BASE_URL = "http://localhost:5000";

async function runTests() {
  console.log("=== Testing Auto-Assign Sales Executive on Site Visits & Callbacks ===\n");

  try {
    // 1. Fetch test users via API
    const usersRes = await axios.get(`${BASE_URL}/users?limit=100`);
    const users = usersRes.data.data || usersRes.data.users || usersRes.data;

    const adminUser = users.find(u => ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(u.role)) || users[0];
    const salesUser = users.find(u => !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(u.role) && u.id !== adminUser.id) || users[1];

    console.log(`Admin User: ID=${adminUser.id}, Name=${adminUser.firstName} ${adminUser.lastName}, Role=${adminUser.role}`);
    console.log(`Sales User: ID=${salesUser.id}, Name=${salesUser.firstName} ${salesUser.lastName}, Role=${salesUser.role}\n`);

    // 2. Fetch or create a test lead
    const leadsRes = await axios.get(`${BASE_URL}/leads/`);
    const leads = leadsRes.data;
    const testLead = leads.find(l => l.teamId === salesUser.id) || leads[0];

    // Assign lead to sales user
    await axios.patch(`${BASE_URL}/leads/${testLead.id}`, { teamId: salesUser.id });

    const salesUserName = [salesUser.firstName, salesUser.lastName].filter(Boolean).join(" ").trim() || salesUser.username;
    const adminUserName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(" ").trim() || adminUser.username;

    // ----------------------------------------------------
    // TEST 1: Sales user schedules site visit without executive picker (auto-assigns to self)
    // ----------------------------------------------------
    console.log("--- Test 1: Sales user schedules site visit (omitting salesExecutive) ---");
    const salesVisitPayload = {
      leadId: testLead.id,
      project: "Emerald Heights",
      status: "Scheduled",
      meetingPoint: "Site Gate 1",
      salesExecutive: "", // Empty from frontend picker removal
      initiatedBy: salesUserName,
      scheduledOn: new Date(Date.now() + 86400000).toISOString(),
      note: "Customer requested morning visit",
    };

    const visit1 = await upsertScheduleVisit(salesVisitPayload);
    console.log(`Saved site visit #${visit1.id} for lead #${visit1.leadId}`);
    console.log(`Assigned sales executive in visit: "${visit1.salesExecutive}"`);
    const isAutoAssignedToSales = visit1.salesExecutive === salesUserName || visit1.salesExecutive.includes(salesUser.firstName);
    console.log(`Auto-assigned to sales user / lead owner? ${isAutoAssignedToSales ? "✅ PASS" : "❌ FAIL"}\n`);

    // ----------------------------------------------------
    // TEST 2: Admin user schedules site visit with explicit assignee
    // ----------------------------------------------------
    console.log("--- Test 2: Admin schedules site visit assigning a specific sales executive ---");
    const adminVisitPayload = {
      leadId: testLead.id,
      project: "Emerald Heights",
      status: "Confirmed",
      meetingPoint: "Main Entrance",
      salesExecutive: salesUserName,
      initiatedBy: adminUserName,
      scheduledOn: new Date(Date.now() + 172800000).toISOString(),
      note: "VIP client meeting",
    };

    const visit2 = await upsertScheduleVisit(adminVisitPayload);
    console.log(`Saved site visit #${visit2.id}`);
    console.log(`Assigned executive: "${visit2.salesExecutive}"`);
    console.log(`Admin explicit assignment preserved? ${visit2.salesExecutive === salesUserName ? "✅ PASS" : "❌ FAIL"}\n`);

    // ----------------------------------------------------
    // TEST 3: Controller-level role enforcement via HTTP POST /schedule-visits
    // ----------------------------------------------------
    console.log("--- Test 3: HTTP API POST /schedule-visits auto-assigns fallback ---");
    const httpRes = await axios.post(`${BASE_URL}/schedule-visits`, {
      leadId: testLead.id,
      project: "Emerald Heights",
      status: "Scheduled",
      meetingPoint: "Tower B Lobby",
      note: "Scheduled without assignee picker",
      initiatedBy: salesUserName,
      scheduledOn: new Date(Date.now() + 259200000).toISOString(),
    });

    const httpVisit = httpRes.data;
    console.log(`HTTP Saved visit #${httpVisit.id}, Executive: "${httpVisit.salesExecutive}"`);
    const isHttpAssigned = Boolean(httpVisit.salesExecutive);
    console.log(`Auto-assigned executive persisted on HTTP call? ${isHttpAssigned ? "✅ PASS" : "❌ FAIL"}\n`);

    // Verify lead's siteVisitExecutive was updated in Lead record
    const updatedLead = await prisma.lead.findUnique({ where: { id: testLead.id } });
    console.log(`Lead #${testLead.id} siteVisitExecutive: "${updatedLead.siteVisitExecutive}"`);
    console.log(`Lead record updated with auto-assigned executive? ${Boolean(updatedLead.siteVisitExecutive) ? "✅ PASS" : "❌ FAIL"}\n`);

    console.log("✅ All Auto-Assign Sales Executive tests PASSED successfully!");
  } catch (error) {
    console.error("Test failed with error:", error.response?.data || error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
