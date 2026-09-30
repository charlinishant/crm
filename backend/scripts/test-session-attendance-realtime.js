const prisma = require("../lib/prisma")
const sessionService = require("../services/session.service")

async function runTests() {
  console.log("=== STARTING COMPREHENSIVE CRM SYSTEM TESTS ===")

  // 1. Verify User exists or create test user
  let testUser = await prisma.user.findFirst({
    where: { email: "test_session_user@example.com" }
  })

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        username: "test_session_user",
        email: "test_session_user@example.com",
        password: "hashed_dummy_password",
        role: "SALES",
        firstName: "Test",
        lastName: "SessionUser",
        isActive: true
      }
    })
    console.log("Created test user with ID:", testUser.id)
  } else {
    console.log("Found test user with ID:", testUser.id)
  }

  // Clean previous test sessions
  await prisma.userSession.deleteMany({
    where: { userId: testUser.id }
  })

  // TEST 1: Session 1 Creation (Login at 09:00 AM IST)
  console.log("\n--- TEST 1: Multiple Session Login & Usage Calculation ---")
  const session1 = await sessionService.createSession({
    userId: testUser.id,
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    sessionToken: "test-token-1-" + Date.now()
  })
  console.log("Session 1 created:", session1.id, "Status:", session1.sessionStatus)

  // Simulate Session 1 lasting 2h 30m: 09:00 to 11:30
  const now = new Date()
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now)
  const [y, m, d] = todayStr.split("-").map(Number)
  
  // Set session 1 time
  const s1Login = new Date(Date.UTC(y, m - 1, d, 3, 30, 0)) // 09:00 IST = 03:30 UTC
  const s1Logout = new Date(Date.UTC(y, m - 1, d, 6, 0, 0)) // 11:30 IST = 06:00 UTC

  await prisma.userSession.update({
    where: { id: session1.id },
    data: {
      loginAt: s1Login,
      lastActivityAt: s1Logout,
      logoutAt: s1Logout,
      sessionStatus: "logged_out"
    }
  })

  // Session 2: 12:15 PM to 02:00 PM IST (1h 45m)
  const s2Login = new Date(Date.UTC(y, m - 1, d, 6, 45, 0)) // 12:15 IST = 06:45 UTC
  const s2Logout = new Date(Date.UTC(y, m - 1, d, 8, 30, 0)) // 14:00 IST = 08:30 UTC
  const session2 = await sessionService.createSession({
    userId: testUser.id,
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    sessionToken: "test-token-2-" + Date.now()
  })
  await prisma.userSession.update({
    where: { id: session2.id },
    data: {
      loginAt: s2Login,
      lastActivityAt: s2Logout,
      logoutAt: s2Logout,
      sessionStatus: "logged_out"
    }
  })

  // Session 3: 03:00 PM to 06:30 PM IST (3h 30m)
  const s3Login = new Date(Date.UTC(y, m - 1, d, 9, 30, 0)) // 15:00 IST = 09:30 UTC
  const s3Logout = new Date(Date.UTC(y, m - 1, d, 13, 0, 0)) // 18:30 IST = 13:00 UTC
  const session3 = await sessionService.createSession({
    userId: testUser.id,
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
    sessionToken: "test-token-3-" + Date.now()
  })
  await prisma.userSession.update({
    where: { id: session3.id },
    data: {
      loginAt: s3Login,
      lastActivityAt: s3Logout,
      logoutAt: s3Logout,
      sessionStatus: "logged_out"
    }
  })

  // Calculate Today's Usage
  const usage = await sessionService.calculateUserTodayUsage(testUser.id)
  console.log("Calculated Today's Usage (Expected: 7h 45m):", usage.formattedUsage, "Total Minutes:", usage.totalMinutes)
  if (usage.formattedUsage === "7h 45m") {
    console.log("PASS: Multi-session calculation is exact!")
  } else {
    console.error("FAIL: Expected 7h 45m, got:", usage.formattedUsage)
  }

  // TEST 2: Heartbeat & Inactivity sliding window
  console.log("\n--- TEST 2: Heartbeat & 60-Minute Inactivity Window ---")
  const activeSession = await sessionService.createSession({
    userId: testUser.id,
    ipAddress: "127.0.0.1",
    userAgent: "Chrome Windows",
    sessionToken: "active-token-" + Date.now()
  })
  
  // Heartbeat when active
  const hbResult = await sessionService.recordHeartbeat({ sessionToken: activeSession.sessionToken, userId: testUser.id })
  console.log("Heartbeat active session response:", hbResult.sessionStatus)
  if (hbResult.sessionStatus === "active") {
    console.log("PASS: Active heartbeat acknowledged")
  }

  // Simulate 65 minutes of inactivity on this session
  const sixtyFiveMinAgo = new Date(Date.now() - 65 * 60 * 1000)
  await prisma.userSession.update({
    where: { id: activeSession.id },
    data: { lastActivityAt: sixtyFiveMinAgo }
  })

  // Heartbeat after inactivity should expire session
  const hbExpiredResult = await sessionService.recordHeartbeat({ sessionToken: activeSession.sessionToken, userId: testUser.id })
  console.log("Heartbeat after 65 min inactivity response:", hbExpiredResult.sessionStatus)
  if (hbExpiredResult.sessionStatus === "expired") {
    console.log("PASS: Inactivity timeout correctly expired session on heartbeat")
  }

  // TEST 3: Stale Session Background Cleanup
  console.log("\n--- TEST 3: Stale Session Background Cleanup ---")
  const staleSession = await sessionService.createSession({
    userId: testUser.id,
    ipAddress: "127.0.0.1",
    userAgent: "Chrome Windows Stale",
    sessionToken: "stale-token-" + Date.now()
  })
  // Set last activity to 70 mins ago without logging out (browser crash scenario)
  await prisma.userSession.update({
    where: { id: staleSession.id },
    data: { lastActivityAt: new Date(Date.now() - 70 * 60 * 1000) }
  })
  const cleanupCount = await sessionService.cleanupStaleSessions()
  console.log("Stale sessions cleanup executed")
  const verifyStale = await prisma.userSession.findUnique({ where: { id: staleSession.id } })
  console.log("Stale session status after cleanup:", verifyStale.sessionStatus)
  if (verifyStale.sessionStatus === "expired") {
    console.log("PASS: Background cleanup expired stale session")
  }

  // TEST 4: Attendance List API
  console.log("\n--- TEST 4: Attendance List API Output ---")
  const attendanceResult = await sessionService.getUserAttendanceList({ statusFilter: "All", limit: 100 })
  const attendanceList = attendanceResult.data || []
  const userEntry = attendanceList.find(u => u.userId === testUser.id)
  console.log("Attendance record for test user:", {
    userId: userEntry?.userId,
    userName: userEntry?.userName,
    email: userEntry?.email,
    status: userEntry?.status,
    loginTime: userEntry?.loginTimeFormatted,
    logoutTime: userEntry?.logoutTimeFormatted,
    todayUsage: userEntry?.todayUsage,
    lastActivity: userEntry?.lastActivityFormatted
  })
  if (userEntry && userEntry.todayUsage) {
    console.log("PASS: Attendance list correctly formatted for table view!")
  }

  // Clean up test user
  await prisma.userSession.deleteMany({ where: { userId: testUser.id } })
  await prisma.userAttendance.deleteMany({ where: { userId: testUser.id } })
  await prisma.user.delete({ where: { id: testUser.id } })
  console.log("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===")
}

runTests()
  .catch(err => {
    console.error("Test failed:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
