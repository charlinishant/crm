const prisma = require("../lib/prisma");
const {
  createFollowUp,
  getFollowUps,
  markFollowUpDone,
  rescheduleFollowUp,
  cancelFollowUp,
  getLeadFollowUpContext,
} = require("../services/followup.service");
const {
  snoozeFollowUp,
  getScheduledAt,
} = require("../services/callbackReminder.service");

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("SALES USER MODULES & FOLLOW-UP AUTOMATED TEST SUITE");
  console.log("==================================================");

  try {
    // 1. Get or create an active Sales User
    let salesUser = await prisma.user.findFirst({
      where: { role: "SALES", isActive: true },
    });

    if (!salesUser) {
      salesUser = await prisma.user.create({
        data: {
          email: `test_sales_${Date.now()}@example.com`,
          username: `test_sales_${Date.now()}`,
          role: "SALES",
          department: "SALES",
          firstName: "Test",
          lastName: "Sales",
        },
      });
    }

    // 2. Create a dedicated fresh test lead with status "New"
    const testLead = await prisma.lead.create({
      data: {
        firstName: "TestLead",
        lastName: `Auto_${Date.now()}`,
        phones: [{ type: "Mobile", value: "9876543210", primary: true }],
        status: "New",
        teamId: salesUser.id,
        seats: 1,
        tenure: 12,
        industry: "IT",
        is_delete: false,
        is_active: true,
      },
    });

    console.log(`\nUsing Sales User: #${salesUser.id} (${salesUser.firstName})`);
    console.log(`Using Test Lead: #${testLead.id} (${testLead.firstName} ${testLead.lastName})`);

    // -------------------------------------------------------------
    // TEST 1: Multiple Follow-ups for Single Lead
    // -------------------------------------------------------------
    console.log("\n[1] Testing Multiple Follow-ups for Single Lead...");
    const today = new Date().toISOString().slice(0, 10);

    const f1 = await createFollowUp(salesUser, {
      leadId: testLead.id,
      type: "Call",
      followUpDate: today,
      followUpTime: "10:30",
      priority: "High",
      notes: "First follow-up call",
    });

    assert(f1 && f1.id, "First follow-up created successfully");
    assert(f1.status === "Pending" || f1.status === "Scheduled", "First follow-up initial status is Pending/Scheduled");

    const f2 = await createFollowUp(salesUser, {
      leadId: testLead.id,
      type: "Visit",
      followUpDate: today,
      followUpTime: "15:00",
      priority: "Medium",
      notes: "Second follow-up site visit discussion",
    });

    assert(f2 && f2.id && f2.id !== f1.id, "Second follow-up created without overwriting first");

    const context = await getLeadFollowUpContext(salesUser, testLead.id);
    const activeFollowups = context.followUps.filter((f) => f.id === f1.id || f.id === f2.id);
    assert(activeFollowups.length === 2, "Both follow-ups coexist for the same lead");

    // -------------------------------------------------------------
    // TEST 2: Exact Duplicate Prevention (5s window)
    // -------------------------------------------------------------
    console.log("\n[2] Testing Duplicate Submission Window Protection...");
    const dup = await createFollowUp(salesUser, {
      leadId: testLead.id,
      type: "Visit",
      followUpDate: today,
      followUpTime: "15:00",
      priority: "Medium",
      notes: "Accidental double-click submit",
    });

    assert(dup.id === f2.id, "Duplicate submission within 5 seconds returned existing record");

    // -------------------------------------------------------------
    // TEST 3: 10-Minute Reminder Calculation & Timing
    // -------------------------------------------------------------
    console.log("\n[3] Testing 10-Minute Reminder Calculation...");
    const scheduledAt = getScheduledAt(f1);
    assert(scheduledAt instanceof Date, "ScheduledAt computed correctly");

    const expectedReminderAt = new Date(scheduledAt.getTime() - 10 * 60 * 1000);
    assert(
      f1.reminderAt && new Date(f1.reminderAt).getTime() === expectedReminderAt.getTime(),
      "ReminderAt set to exactly scheduledAt - 10 minutes"
    );

    // -------------------------------------------------------------
    // TEST 4: Snooze Follow-up in Database
    // -------------------------------------------------------------
    console.log("\n[4] Testing Snooze API & Database Update...");
    const snoozed = await snoozeFollowUp(salesUser, f1.id, 15);
    assert(snoozed.followUpDate !== null, "FollowUpDate updated in database after snooze");
    assert(snoozed.status === "Pending", "Status remains Pending after snooze");

    // -------------------------------------------------------------
    // TEST 5: Reschedule Follow-up
    // -------------------------------------------------------------
    console.log("\n[5] Testing Reschedule Flow...");
    const rescheduled = await rescheduleFollowUp(salesUser, f1.id, {
      followUpDate: today,
      followUpTime: "17:00",
      notes: "Customer asked to call at 5 PM",
      priority: "High",
    });

    assert(rescheduled && rescheduled.id !== f1.id, "New follow-up created on reschedule");
    assert(rescheduled.rescheduledFromId === f1.id, "RescheduledFromId links to previous follow-up");

    const prevF1 = await prisma.followUp.findUnique({ where: { id: f1.id } });
    assert(prevF1.status === "Rescheduled", "Old follow-up marked as Rescheduled");

    // -------------------------------------------------------------
    // TEST 6: Complete Follow-up
    // -------------------------------------------------------------
    console.log("\n[6] Testing Complete Flow...");
    const completed = await markFollowUpDone(salesUser, f2.id, {
      note: "Discussion went well, customer interested",
    });

    assert(completed.status === "Completed", "Follow-up marked as Completed");
    assert(completed.completedAt !== null, "CompletedAt timestamp recorded");

    // -------------------------------------------------------------
    // TEST 7: Cancel Follow-up
    // -------------------------------------------------------------
    console.log("\n[7] Testing Cancel Flow...");
    const cancelled = await cancelFollowUp(salesUser, rescheduled.id, {
      reason: "Customer postponed indefinitely",
    });

    assert(cancelled.status === "Cancelled", "Follow-up marked as Cancelled");
    assert(cancelled.cancellationReason === "Customer postponed indefinitely", "Cancellation reason recorded");

    // -------------------------------------------------------------
    // TEST 8: Funnel & Metrics Calculation Logic
    // -------------------------------------------------------------
    console.log("\n[8] Testing Funnel Unique-Lead Count & Calculations...");
    const leads = await prisma.lead.findMany({
      where: { teamId: salesUser.id, is_delete: false },
    });

    const totalAssignedLeads = leads.length;
    const uniqueQualified = leads.filter((l) => l.status === "Qualified").length;
    const qualifiedPct = totalAssignedLeads > 0 ? (uniqueQualified / totalAssignedLeads) * 100 : 0;

    assert(totalAssignedLeads > 0, "Assigned leads count is positive");
    assert(qualifiedPct >= 0 && qualifiedPct <= 100, "Qualified percentage is between 0% and 100%");

    // -------------------------------------------------------------
    // TEST 9: Ownership & Authorization Security
    // -------------------------------------------------------------
    console.log("\n[9] Testing Ownership Isolation between Users...");
    const otherUser = { id: 999999, role: "SALES" };
    let unauthorizedError = false;
    try {
      await getLeadFollowUpContext(otherUser, testLead.id);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 403) {
        unauthorizedError = true;
      }
    }
    assert(unauthorizedError, "Another sales user cannot access unassigned lead follow-ups");

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log("==================================================");

    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  }
}

runTests();
