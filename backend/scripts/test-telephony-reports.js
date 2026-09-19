const jwt = require("jsonwebtoken");
const axios = require("axios");

const JWT_SECRET = process.env.JWT_SECRET || "4fdb4d7355ac678b5744dbeb8027aff538937fb8c5061364a361e292d36133817acb3a389d9e786ac5f92174ac93f6920cae46ba48f64d297ff37e3a1bb2100a";

const adminToken = jwt.sign(
  { id: 1, email: "admin@swami.com", role: "ADMIN" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

const baseURL = "http://localhost:5000/api/admin/reports";
const client = axios.create({
  baseURL,
  headers: { Authorization: `Bearer ${adminToken}` },
});

async function runTests() {
  console.log("=== Testing Mcube Telephony Reports Endpoints ===");
  const endpoints = [
    "summary",
    "telephony-summary",
    "call-status",
    "call-hourly",
    "call-daily",
    "did-breakup",
    "agent-call-performance",
    "call-logs",
  ];

  for (const ep of endpoints) {
    try {
      const res = await client.get(`/${ep}`);
      console.log(`✅ GET /${ep} -> 200 OK | Data received:`, Array.isArray(res.data?.data) ? `${res.data.data.length} items` : typeof res.data?.data === "object" ? Object.keys(res.data?.data) : res.data);
    } catch (err) {
      console.error(`❌ GET /${ep} -> Error:`, err.response?.status, err.response?.data || err.message);
    }
  }

  // Test CDR sync endpoint
  try {
    const syncRes = await client.post("/sync-mcube-cdr", {});
    console.log("✅ POST /sync-mcube-cdr -> 200 OK | Response:", syncRes.data);
  } catch (err) {
    console.error("❌ POST /sync-mcube-cdr -> Error:", err.response?.status, err.response?.data || err.message);
  }
}

runTests();
