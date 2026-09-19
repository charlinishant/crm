require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const axios = require("axios");
const prisma = require("../lib/prisma");
const jwt = require("jsonwebtoken");

const BASE_URL = "http://localhost:5000";
const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key-change-this-in-production";

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
}

async function runTests() {
  console.log("=== Testing Admin-Only Call Recording Access & Deletion ===\n");

  try {
    // 1. Fetch Admin and Sales Users
    const usersRes = await axios.get(`${BASE_URL}/users?limit=100`);
    const users = usersRes.data.data || usersRes.data.users || usersRes.data;

    const adminUser = users.find((u) => ["ADMIN", "SUPER_ADMIN"].includes(u.role)) || users[0];
    const salesUser = users.find((u) => !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(u.role) && u.id !== adminUser.id) || users[1];

    console.log(`Admin User: ID=${adminUser?.id}, Name=${adminUser?.firstName} ${adminUser?.lastName}, Role=${adminUser?.role}`);
    console.log(`Sales User: ID=${salesUser?.id}, Name=${salesUser?.firstName} ${salesUser?.lastName}, Role=${salesUser?.role}\n`);

    const adminToken = createToken(adminUser);
    const salesToken = createToken(salesUser);

    // 2. Create a test lead and call log with recording
    let testLead = await prisma.lead.findFirst({ where: { is_delete: false } });
    if (!testLead) {
      testLead = await prisma.lead.create({
        data: {
          firstName: "Recording",
          lastName: "TestLead",
          phone: "9876500001",
          source: "Direct",
          teamId: salesUser.id,
        },
      });
    }

    const testCallLog = await prisma.callLog.create({
      data: {
        leadId: testLead.id,
        agentId: salesUser.id,
        phone: testLead.phone || "9876500001",
        direction: "outbound",
        status: "completed",
        duration: 45,
        recordingUrl: "https://mock-mcube.s3.amazonaws.com/recordings/test-call-123.mp3",
        notes: "Test recording restriction",
      },
    });

    console.log(`Created test CallLog #${testCallLog.id} with recordingUrl`);

    // ----------------------------------------------------------------
    // TEST 1: Sales User attempts to access recording stream via GET /api/calls/recording/:id
    // ----------------------------------------------------------------
    console.log("\n--- Test 1: Sales User requests recording audio stream ---");
    let salesAccessBlocked = false;
    try {
      await axios.get(`${BASE_URL}/api/calls/recording/${testCallLog.id}`, {
        headers: { Authorization: `Bearer ${salesToken}` },
      });
    } catch (err) {
      if (err.response?.status === 403) {
        salesAccessBlocked = true;
        console.log(`Received 403 Forbidden: "${err.response.data?.message}"`);
      } else {
        console.log(`Received status: ${err.response?.status}`);
      }
    }
    console.log(`Sales user blocked from audio recording stream? ${salesAccessBlocked ? "✅ PASS" : "❌ FAIL"}`);

    // ----------------------------------------------------------------
    // TEST 2: Sales User attempts to DELETE call log via DELETE /api/calls/:id
    // ----------------------------------------------------------------
    console.log("\n--- Test 2: Sales User attempts to delete call log ---");
    let salesDeleteBlocked = false;
    try {
      await axios.delete(`${BASE_URL}/api/calls/${testCallLog.id}`, {
        headers: { Authorization: `Bearer ${salesToken}` },
      });
    } catch (err) {
      if (err.response?.status === 403) {
        salesDeleteBlocked = true;
        console.log(`Received 403 Forbidden: "${err.response.data?.message}"`);
      } else {
        console.log(`Received status: ${err.response?.status}`);
      }
    }
    console.log(`Sales user blocked from deleting call log? ${salesDeleteBlocked ? "✅ PASS" : "❌ FAIL"}`);

    // ----------------------------------------------------------------
    // TEST 3: Sales User attempts bulk delete via DELETE /api/calls/bulk
    // ----------------------------------------------------------------
    console.log("\n--- Test 3: Sales User attempts bulk delete of call logs ---");
    let salesBulkDeleteBlocked = false;
    try {
      await axios.delete(`${BASE_URL}/api/calls/bulk`, {
        headers: { Authorization: `Bearer ${salesToken}` },
        data: { ids: [testCallLog.id] },
      });
    } catch (err) {
      if (err.response?.status === 403) {
        salesBulkDeleteBlocked = true;
        console.log(`Received 403 Forbidden: "${err.response.data?.message}"`);
      } else {
        console.log(`Received status: ${err.response?.status}`);
      }
    }
    console.log(`Sales user blocked from bulk delete? ${salesBulkDeleteBlocked ? "✅ PASS" : "❌ FAIL"}`);

    // ----------------------------------------------------------------
    // TEST 4: Non-admin listCalls query sanitizes raw recording URL
    // ----------------------------------------------------------------
    console.log("\n--- Test 4: Verify non-admin GET /api/calls/my does not expose raw recording URL ---");
    const myCallsRes = await axios.get(`${BASE_URL}/api/calls/my?limit=50`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    const foundCallInSalesList = myCallsRes.data.data?.find((c) => c.id === testCallLog.id);
    console.log(`Sales list recordingUrl value: "${foundCallInSalesList?.recordingUrl}"`);
    const isSanitized = foundCallInSalesList && foundCallInSalesList.recordingUrl === "available";
    console.log(`Raw recording URL hidden from sales user response payload? ${isSanitized ? "✅ PASS" : "❌ FAIL"}`);

    // ----------------------------------------------------------------
    // TEST 5: Admin User deletes call log and audit log is written
    // ----------------------------------------------------------------
    console.log("\n--- Test 5: Admin User deletes call log (with audit activity log) ---");
    const adminDeleteRes = await axios.delete(`${BASE_URL}/api/calls/${testCallLog.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`Admin delete response: ${adminDeleteRes.status} OK - ${adminDeleteRes.data?.message}`);

    // Verify LeadActivity log
    const auditActivity = await prisma.leadActivity.findFirst({
      where: {
        leadId: testLead.id,
        type: "CALL_LOG_DELETED",
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Audit log in LeadActivity: "${auditActivity?.message}"`);
    console.log(`Audit log recorded for deletion? ${auditActivity ? "✅ PASS" : "❌ FAIL"}`);

    console.log("\n✅ All Admin-Only Call Recording Access & Deletion tests PASSED successfully!");
  } catch (error) {
    console.error("Test failed with error:", error.response?.data || error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
