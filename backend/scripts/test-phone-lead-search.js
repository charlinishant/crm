const assert = require("assert");
const axios = require("axios");

const BASE_URL = "http://localhost:5000";

// Import the logic from lead.controller or test the API endpoint directly
async function runTests() {
  console.log("=== Starting Phone & Lead Search Tests ===");

  // 1. Fetch all leads first
  const allLeadsRes = await axios.get(`${BASE_URL}/leads/`);
  const leads = allLeadsRes.data;
  console.log(`Fetched ${leads.length} leads from API.`);

  if (leads.length === 0) {
    console.log("No leads found to test with.");
    return;
  }

  // Find a lead with a phone number
  const sampleLead = leads.find(l => {
    const p = l.phones?.[0]?.value || l.phone;
    return p && p.replace(/\D/g, '').length >= 10;
  }) || leads[0];

  console.log(`Sample lead selected: ID=${sampleLead.id}, Name=${sampleLead.firstName} ${sampleLead.lastName}, Phones=${JSON.stringify(sampleLead.phones || sampleLead.phone)}`);

  const rawPhone = String(sampleLead.phones?.[0]?.value || sampleLead.phone || "9876543210");
  const pureDigits = rawPhone.replace(/\D/g, '');
  const tenDigits = pureDigits.length >= 10 ? pureDigits.slice(-10) : pureDigits;
  const lastFiveDigits = tenDigits.slice(-5);
  const formattedPhoneWithPlus91 = `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
  const formattedWithDashes = `${tenDigits.slice(0, 5)}-${tenDigits.slice(5)}`;
  const formattedWithZero = `0${tenDigits}`;

  console.log("\n--- Test Cases ---");
  console.log(`1. Exact 10-digit: "${tenDigits}"`);
  console.log(`2. Formatted with +91 and spaces: "${formattedPhoneWithPlus91}"`);
  console.log(`3. Formatted with dashes: "${formattedWithDashes}"`);
  console.log(`4. Formatted with leading 0: "${formattedWithZero}"`);
  console.log(`5. Last 5 digits: "${lastFiveDigits}"`);
  console.log(`6. Lead ID: "${sampleLead.id}"`);
  if (sampleLead.firstName) console.log(`7. First Name: "${sampleLead.firstName}"`);

  // Test API search endpoint with each variant
  const queriesToTest = [
    { label: "10 Digits", query: tenDigits },
    { label: "+91 and spaces", query: formattedPhoneWithPlus91 },
    { label: "Dashes", query: formattedWithDashes },
    { label: "Leading Zero", query: formattedWithZero },
    { label: "Partial 5 Digits", query: lastFiveDigits },
    { label: "Lead ID", query: String(sampleLead.id) },
  ];

  if (sampleLead.firstName) {
    queriesToTest.push({ label: "First Name", query: sampleLead.firstName });
  }

  for (const { label, query } of queriesToTest) {
    const res = await axios.get(`${BASE_URL}/leads/`, { params: { search: query } });
    const matched = res.data;
    const foundSample = matched.some(l => l.id === sampleLead.id);
    console.log(`[Backend API] Query "${query}" (${label}) -> Found ${matched.length} leads. Sample Lead #${sampleLead.id} matched? ${foundSample ? "✅ YES" : "❌ NO"}`);
    assert(foundSample, `Failed to find lead #${sampleLead.id} with query "${query}" (${label})`);
  }

  console.log("\n✅ All Backend API search query variants PASSED successfully!");
}

runTests().catch(err => {
  console.error("Test failed:", err.message, err.response?.data || "");
  process.exit(1);
});
