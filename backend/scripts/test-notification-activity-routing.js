require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const axios = require("axios");
const assert = require("assert");

const BASE_URL = "http://localhost:5000";

async function runTests() {
  console.log("=== Testing Notification Routing, Site Visit Reminders & Shared Activity/Notes Timeline ===");

  // 1. Get users (Admin and Sales User)
  const usersRes = await axios.get(`${BASE_URL}/users?limit=100`);
  const users = usersRes.data.data || usersRes.data.users || usersRes.data;

  const adminUser = users.find(u => u.role === "ADMIN") || users[0];
  const salesUser = users.find(u => ["SALES", "PRE_SALES"].includes(u.role) && u.id !== adminUser.id) || users[1];

  console.log(`Admin User: ID=${adminUser.id}, Name=${adminUser.firstName} ${adminUser.lastName}`);
  console.log(`Sales User: ID=${salesUser.id}, Name=${salesUser.firstName} ${salesUser.lastName}`);

  // 2. Get a sample lead assigned to salesUser (or assign one)
  const leadsRes = await axios.get(`${BASE_URL}/leads/`);
  const leads = leadsRes.data;
  const testLead = leads.find(l => l.teamId === salesUser.id) || leads[0];
  console.log(`Test Lead: ID=${testLead.id}, Name=${testLead.firstName} ${testLead.lastName}, Assigned TeamId=${testLead.teamId}`);

  // Ensure testLead is assigned to salesUser
  await axios.patch(`${BASE_URL}/leads/${testLead.id}`, { teamId: salesUser.id });

  // 3. Test Site Visit Creation & Notification Routing
  console.log("\n--- Testing Site Visit Scheduling Notification ---");
  const futureVisitDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in future
  const visitPayload = {
    leadId: testLead.id,
    project: "Swami Platinum Tower",
    scheduledOn: futureVisitDate.toISOString(),
    status: "Scheduled",
    salesExecutive: `${salesUser.firstName} ${salesUser.lastName}`,
    meetingPoint: "Site Office",
    note: "Customer visiting for 2BHK flat demo",
  };

  const visitRes = await axios.post(`${BASE_URL}/schedule-visits`, visitPayload);
  console.log(`Scheduled site visit #${visitRes.data.id} for lead #${testLead.id}`);

  await new Promise((r) => setTimeout(r, 300));

  // Check notifications for sales user
  const salesNotifRes = await axios.get(`${BASE_URL}/notification/get?userId=${salesUser.id}`);
  const salesNotifs = salesNotifRes.data;
  const salesVisitNotif = salesNotifs.find(n =>
    (n.titile?.includes("Site visit") || n.title?.includes("Site visit")) &&
    n.description?.includes(testLead.firstName)
  );

  console.log(`[Sales User Notification] Site visit scheduled notification found? ${salesVisitNotif ? "✅ YES" : "❌ NO"}`);
  assert(salesVisitNotif, "Assigned sales user must receive site visit notification");

  // Check notifications for admin user
  const adminNotifRes = await axios.get(`${BASE_URL}/notification/get?userId=${adminUser.id}`);
  const adminNotifs = adminNotifRes.data;
  const adminVisitNotif = adminNotifs.find(n =>
    (n.titile?.includes("Site visit") || n.title?.includes("Site visit")) &&
    n.description?.includes(testLead.firstName)
  );

  console.log(`[Admin Notification] Site visit notification found for Admin? ${adminVisitNotif ? "✅ YES" : "❌ NO"}`);
  assert(adminVisitNotif, "Admin must receive site visit notification");

  // 4. Test Note Creation by Sales User & Visibility to Admin
  console.log("\n--- Testing Notes Added by Sales Team Visible to Admin ---");
  const noteText = `Test site visit preparation note by sales user at ${Date.now()}`;
  const createNoteRes = await axios.post(`${BASE_URL}/lead-notes`, {
    leadId: testLead.id,
    note: noteText,
    owner: `${salesUser.firstName} ${salesUser.lastName}`,
  });
  console.log(`Created lead note #${createNoteRes.data.id}`);

  // Query notes for lead
  const notesRes = await axios.get(`${BASE_URL}/lead-notes/${testLead.id}`);
  const foundNote = notesRes.data.find(n => n.note === noteText);
  console.log(`[Shared Notes] Note found in lead notes timeline? ${foundNote ? "✅ YES" : "❌ NO"}`);
  assert(foundNote, "Lead note must be present in lead notes timeline");

  // 5. Test Activity Timeline on Lead (as Sales User & as Admin)
  console.log("\n--- Testing Shared Activity Timeline on Lead ---");
  const jwt = require("jsonwebtoken");
  const secret = process.env.JWT_SECRET || process.env.JWT_TOKEN_SECRET || "swami-crm-change-this-jwt-secret";
  const salesToken = jwt.sign({ id: salesUser.id, role: salesUser.role, email: salesUser.email }, secret);
  const adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role, email: adminUser.email }, secret);

  const salesActivitiesRes = await axios.get(`${BASE_URL}/lead-activities?leadId=${testLead.id}`, {
    headers: { Authorization: `Bearer ${salesToken}` }
  });
  const salesActivities = salesActivitiesRes.data;
  const salesFoundActivityNote = salesActivities.find(a => a.description?.includes(noteText) || a.message?.includes(noteText));
  const salesFoundActivityVisit = salesActivities.find(a => a.type?.includes("Site visit") || a.title?.includes("Site visit"));

  console.log(`[Sales User View] "Note Added" activity found in lead timeline? ${salesFoundActivityNote ? "✅ YES" : "❌ NO"}`);
  console.log(`[Sales User View] "Site visit" activity found in lead timeline? ${salesFoundActivityVisit ? "✅ YES" : "❌ NO"}`);
  assert(salesFoundActivityNote, "Note added must create an activity entry for sales user");
  assert(salesFoundActivityVisit, "Site visit must create an activity entry for sales user");

  const adminActivitiesRes = await axios.get(`${BASE_URL}/lead-activities?leadId=${testLead.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminActivities = adminActivitiesRes.data;
  const adminFoundActivityNote = adminActivities.find(a => a.description?.includes(noteText) || a.message?.includes(noteText));
  const adminFoundActivityVisit = adminActivities.find(a => a.type?.includes("Site visit") || a.title?.includes("Site visit"));

  console.log(`[Admin View] "Note Added" activity visible to Admin? ${adminFoundActivityNote ? "✅ YES" : "❌ NO"}`);
  console.log(`[Admin View] "Site visit" activity visible to Admin? ${adminFoundActivityVisit ? "✅ YES" : "❌ NO"}`);
  assert(adminFoundActivityNote, "Sales user note must be visible to Admin");
  assert(adminFoundActivityVisit, "Site visit must be visible to Admin");

  // 6. Test Site Visit Reminder Service Routing
  console.log("\n--- Testing Site Visit Reminder Routing (1 Hour / 15 Minutes) ---");
  const { getNotificationRecipients } = require("../services/siteVisitNotification.service");
  const recipients = await getNotificationRecipients({
    leadId: testLead.id,
    lead: testLead,
    salesExecutive: `${salesUser.firstName} ${salesUser.lastName}`,
  });

  console.log(`Resolved recipient user IDs for lead #${testLead.id}:`, recipients);
  const salesUserIncluded = recipients.includes(salesUser.id);
  const adminUserIncluded = recipients.includes(adminUser.id);

  console.log(`Assigned Sales User (ID #${salesUser.id}) included? ${salesUserIncluded ? "✅ YES" : "❌ NO"}`);
  console.log(`Admin User (ID #${adminUser.id}) included? ${adminUserIncluded ? "✅ YES" : "❌ NO"}`);
  assert(salesUserIncluded, "Assigned sales user must be included in reminder recipients");
  assert(adminUserIncluded, "Admin must be included in reminder recipients");

  console.log("\n✅ All Notification Routing, Activity & Notes Timeline tests PASSED successfully!");
}

runTests().catch(err => {
  console.error("Test failed:", err.message, err.response?.data || "");
  process.exit(1);
});
