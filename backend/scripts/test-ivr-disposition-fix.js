const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const http = require("http");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_TOKEN_SECRET || "swami-crm-change-this-jwt-secret";
const API_BASE = `http://127.0.0.1:${process.env.PORT || 5002}`;

// Helper to send HTTP requests
const request = (path, options = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const reqOptions = {
      method: options.method || "GET",
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: options.headers || {},
    };

    if (body) {
      reqOptions.headers["Content-Type"] = "application/json";
    }

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = { raw: data };
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on("error", (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const run = async () => {
  console.log("=== Testing IVR Disposition Fixes ===");

  // 1. Create a sales user JWT token
  const salesToken = jwt.sign(
    { id: 2, role: "SALES", email: "sales@example.com", name: "Sales User" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  const salesHeaders = { Authorization: `Bearer ${salesToken}` };

  // Test 1: Validation - invalid disposition
  console.log("\n[Test 1] Disposing with invalid disposition string...");
  const res1 = await request("/api/calls/dispose", { method: "POST", headers: salesHeaders }, {
    disposition: "InvalidRandomStatus",
    phone: "9876543210"
  });
  console.log("Status:", res1.status);
  console.log("Response:", res1.body);
  if (res1.status === 400 && res1.body.success === false) {
    console.log("-> PASS: Invalid disposition rejected with 400 & clear message.");
  } else {
    console.error("-> FAIL: Expected 400 validation error.");
  }

  // Test 2: Validation - Callback Later without follow-up datetime
  console.log("\n[Test 2] Disposing Callback Later without follow-up time...");
  const res2 = await request("/api/calls/dispose", { method: "POST", headers: salesHeaders }, {
    disposition: "Callback Later",
    phone: "9876543210"
  });
  console.log("Status:", res2.status);
  console.log("Response:", res2.body);
  if (res2.status === 400 && res2.body.message.includes("Next follow-up date")) {
    console.log("-> PASS: Missing follow-up datetime rejected with clear message.");
  } else {
    console.error("-> FAIL: Expected 400 for missing follow-up datetime.");
  }

  // Test 3: Inbound call from unknown caller (auto lead creation & disposition save)
  console.log("\n[Test 3] Disposing Inbound IVR call from unknown number (Qualified)...");
  const testPhone = "9898" + Math.floor(100000 + Math.random() * 900000);
  const res3 = await request("/api/calls/dispose", { method: "POST", headers: salesHeaders }, {
    direction: "inbound",
    phone: testPhone,
    callerNumber: testPhone,
    customerName: "Test IVR Caller",
    disposition: "Qualified",
    notes: "Customer inquired via IVR, qualified for 2BHK",
    budget: "45-55 Lakhs",
  });
  console.log("Status:", res3.status);
  console.log("Response:", res3.body);
  if (res3.status === 200 && res3.body.success === true && res3.body.callLog) {
    console.log("-> PASS: Inbound IVR call disposed, lead auto-created with leadId:", res3.body.callLog.leadId);
  } else {
    console.error("-> FAIL: Inbound IVR disposition failed.");
  }

  // Test 4: Follow-up scheduling with future timestamp
  console.log("\n[Test 4] Disposing with Callback Later and future datetime...");
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const res4 = await request("/api/calls/dispose", { method: "POST", headers: salesHeaders }, {
    direction: "inbound",
    phone: testPhone,
    disposition: "Callback Later",
    nextFollowUpAt: futureDate,
    notes: "Asked to callback tomorrow afternoon",
  });
  console.log("Status:", res4.status);
  console.log("Response:", res4.body);
  if (res4.status === 200 && res4.body.success === true) {
    console.log("-> PASS: Callback Later successfully scheduled follow-up.");
  } else {
    console.error("-> FAIL: Callback Later disposition failed.");
  }

  // Test 5: Existing call log with agentId = null (MCube unmapped inbound call log)
  console.log("\n[Test 5] Disposing existing call log with agentId = null (unassigned IVR call)...");
  const prisma = require("../lib/prisma");
  const unassignedCall = await prisma.callLog.create({
    data: {
      phone: "919999888877",
      leadPhone: "919999888877",
      callerNumber: "919999888877",
      direction: "inbound",
      provider: "mcube",
      status: "completed",
      agentId: null,
      leadId: null,
    }
  });

  const res5 = await request("/api/calls/dispose", { method: "POST", headers: salesHeaders }, {
    callLogId: unassignedCall.id,
    disposition: "Interested Project",
    notes: "Interested in 3BHK high floor",
    interestedProject: "Swami Pride",
  });
  console.log("Status:", res5.status);
  console.log("Response message:", res5.body.message);
  console.log("Assigned agentId:", res5.body.callLog?.agentId);
  console.log("Linked leadId:", res5.body.callLog?.leadId);
  if (res5.status === 200 && res5.body.callLog?.agentId === 2 && res5.body.callLog?.leadId) {
    console.log("-> PASS: Unassigned IVR call claimed by agent and disposed successfully.");
  } else {
    console.error("-> FAIL: Unassigned IVR call claiming failed.");
  }

  // Test 6: Site Visit Scheduled disposition
  console.log("\n[Test 6] Disposing with Site Visit Scheduled and visit datetime...");
  const visitDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const res6 = await request("/api/calls/dispose", { method: "POST", headers: salesHeaders }, {
    callLogId: res5.body.callLog.id,
    disposition: "Site Visit Scheduled",
    visitDateTime: visitDate,
    notes: "Site visit confirmed for Saturday morning",
  });
  console.log("Status:", res6.status);
  console.log("Response message:", res6.body.message);
  console.log("CallLog disposition:", res6.body.callLog?.disposition);
  if (res6.status === 200 && res6.body.callLog?.disposition === "Site Visit Scheduled") {
    console.log("-> PASS: Site Visit Scheduled successfully disposed.");
  } else {
    console.error("-> FAIL: Site Visit Scheduled disposition failed.");
  }

  // Clean up test call logs
  await prisma.callLog.deleteMany({
    where: {
      id: { in: [unassignedCall.id, res3.body.callLog?.id, res4.body.callLog?.id].filter(Boolean) }
    }
  }).catch(() => {});

  console.log("\n=== All Disposition Tests Completed ===");
};

run().catch(console.error);
