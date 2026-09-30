const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { parseUserAgent } = require("../utils/deviceDetector");
const { emitToAdmin, emitToUser, broadcastCRMEvent } = require("../socket");

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
const HEARTBEAT_THROTTLE_MS = 20 * 1000; // 20 seconds throttle on DB writes
const lastDbUpdateMap = new Map();

/**
 * Get IST (Asia/Kolkata) day bounds for today
 */
const getISTDayBounds = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const istDateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

  const start = new Date(`${istDateString}T00:00:00+05:30`);
  const end = new Date(`${istDateString}T23:59:59.999+05:30`);
  return { istDateString, start, end };
};

/**
 * Format duration in seconds to "7h 45m" or "45m" or "0m"
 */
const formatDuration = (totalSeconds = 0) => {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h 0m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "0m";
};

/**
 * Format time in IST, e.g. "09:15 AM"
 */
const formatTimeIST = (date) => {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
};

/**
 * Merge overlapping intervals to calculate true cumulative usage without double counting
 */
const mergeIntervals = (intervals) => {
  if (!intervals.length) return [];

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  return merged;
};

/**
 * Calculate user's Today's Usage by summing all sessions overlapping IST today
 */
const calculateUserTodayUsage = async (userId, targetDate = new Date()) => {
  const { start: todayStart, end: todayEnd } = getISTDayBounds(targetDate);
  const now = new Date();
  const nowTime = now.getTime();

  const sessions = await prisma.userSession.findMany({
    where: {
      userId: Number(userId),
      loginAt: { lte: todayEnd },
      OR: [
        { logoutAt: null },
        { logoutAt: { gte: todayStart } },
        { lastActivityAt: { gte: todayStart } },
      ],
    },
    orderBy: { loginAt: "asc" },
  });

  const intervals = [];

  for (const session of sessions) {
    const sessionLoginTime = new Date(session.loginAt).getTime();
    let sessionEndTime;

    if (session.sessionStatus === "active") {
      const lastActivityTime = new Date(session.lastActivityAt || session.loginAt).getTime();
      const isCurrentlyActive = nowTime - lastActivityTime < INACTIVITY_TIMEOUT_MS;

      if (isCurrentlyActive) {
        sessionEndTime = Math.min(nowTime, todayEnd.getTime());
      } else {
        // Capped at last reliable activity
        sessionEndTime = Math.min(lastActivityTime, todayEnd.getTime());
      }
    } else {
      const logoutTime = session.logoutAt ? new Date(session.logoutAt).getTime() : new Date(session.lastActivityAt || session.loginAt).getTime();
      sessionEndTime = Math.min(logoutTime, todayEnd.getTime());
    }

    const intervalStart = Math.max(sessionLoginTime, todayStart.getTime());
    const intervalEnd = sessionEndTime;

    if (intervalEnd > intervalStart) {
      intervals.push({ start: intervalStart, end: intervalEnd });
    }
  }

  const merged = mergeIntervals(intervals);
  const totalSeconds = merged.reduce((acc, interval) => acc + Math.round((interval.end - interval.start) / 1000), 0);

  // Calculate today's total break seconds
  const attendancesToday = await prisma.userAttendance.findMany({
    where: {
      userId: Number(userId),
      createdAt: { lte: todayEnd },
      OR: [
        { loginAt: { gte: todayStart } },
        { createdAt: { gte: todayStart } },
      ],
    },
    orderBy: { id: "desc" },
  });

  let totalBreakSeconds = 0;
  for (const att of attendancesToday) {
    totalBreakSeconds += Number(att.totalBreakSeconds || 0);
    if (att.status === "On Break" && att.breakStartedAt) {
      const breakStart = Math.max(new Date(att.breakStartedAt).getTime(), todayStart.getTime());
      const ongoingBreak = Math.max(0, Math.floor((nowTime - breakStart) / 1000));
      totalBreakSeconds += ongoingBreak;
    }
  }

  return {
    totalSeconds,
    formattedUsage: formatDuration(totalSeconds),
    totalBreakSeconds,
    formattedBreak: formatDuration(totalBreakSeconds),
    sessionsCount: sessions.length,
  };
};

/**
 * Start user break
 */
const startUserBreak = async (userId) => {
  const now = new Date();
  let attendance = await prisma.userAttendance.findFirst({
    where: { userId: Number(userId), logoutAt: null },
    orderBy: { id: "desc" },
  });

  if (!attendance) {
    attendance = await prisma.userAttendance.create({
      data: {
        userId: Number(userId),
        status: "On Break",
        loginAt: now,
        breakStartedAt: now,
      },
    });
  } else {
    attendance = await prisma.userAttendance.update({
      where: { id: attendance.id },
      data: {
        status: "On Break",
        breakStartedAt: now,
        breakEndedAt: null,
      },
    });
  }

  const usage = await calculateUserTodayUsage(userId);

  emitToAdmin("attendance:updated", {
    userId,
    status: "On Break",
    breakStartedAt: now,
  });

  return {
    userId,
    status: "On Break",
    breakStartedAt: now,
    todayUsage: usage.formattedUsage,
    todayLoginSeconds: usage.totalSeconds,
    todayBreakSeconds: usage.totalBreakSeconds,
    formattedBreak: usage.formattedBreak,
  };
};

/**
 * End user break
 */
const endUserBreak = async (userId) => {
  const now = new Date();
  const attendance = await prisma.userAttendance.findFirst({
    where: { userId: Number(userId), status: "On Break", logoutAt: null },
    orderBy: { id: "desc" },
  });

  if (attendance && attendance.breakStartedAt) {
    const breakDuration = Math.max(0, Math.floor((now.getTime() - new Date(attendance.breakStartedAt).getTime()) / 1000));
    await prisma.userAttendance.update({
      where: { id: attendance.id },
      data: {
        status: "Available",
        breakEndedAt: now,
        totalBreakSeconds: {
          increment: breakDuration,
        },
      },
    });
  } else if (attendance) {
    await prisma.userAttendance.update({
      where: { id: attendance.id },
      data: {
        status: "Available",
        breakEndedAt: now,
      },
    });
  }

  const usage = await calculateUserTodayUsage(userId);

  emitToAdmin("attendance:updated", {
    userId,
    status: "Available",
  });

  return {
    userId,
    status: "Available",
    todayUsage: usage.formattedUsage,
    todayLoginSeconds: usage.totalSeconds,
    todayBreakSeconds: usage.totalBreakSeconds,
    formattedBreak: usage.formattedBreak,
  };
};

/**
 * Create a new session record on successful login
 */
const createSession = async ({ userId, ipAddress = null, userAgent = null, sessionToken = null }) => {
  const now = new Date();
  const token = sessionToken || crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MS);
  const { browser, operatingSystem, deviceType } = parseUserAgent(userAgent);

  // Close any existing active sessions for this user cleanly so they don't trigger stale cleanup
  try {
    await prisma.userSession.updateMany({
      where: {
        userId: Number(userId),
        sessionStatus: "active",
      },
      data: {
        sessionStatus: "logged_out",
        logoutAt: now,
      },
    });
  } catch (err) {
    console.error("Error archiving previous sessions:", err.message);
  }

  const session = await prisma.userSession.create({
    data: {
      userId: Number(userId),
      sessionToken: token,
      sessionStatus: "active",
      loginAt: now,
      lastActivityAt: now,
      expiresAt,
      ipAddress,
      userAgent: userAgent ? String(userAgent).slice(0, 1000) : null,
      deviceType,
      browser,
      operatingSystem,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // Also maintain UserAttendance for backwards compatibility
  try {
    const existingAttendance = await prisma.userAttendance.findFirst({
      where: { userId: Number(userId), logoutAt: null },
      orderBy: { loginAt: "desc" },
    });

    if (!existingAttendance) {
      await prisma.userAttendance.create({
        data: {
          userId: Number(userId),
          status: "Available",
          loginAt: now,
        },
      });
    }
  } catch (err) {
    console.error("Error creating UserAttendance fallback:", err.message);
  }

  // Broadcast real-time events
  emitToAdmin("attendance:updated", {
    userId,
    sessionStatus: "active",
    status: "Online",
    loginAt: now,
    sessionId: session.id,
  });

  emitToAdmin("user:statusChanged", {
    userId,
    status: "Online",
    sessionStatus: "active",
  });

  return session;
};

/**
 * Record frontend heartbeat
 */
const recordHeartbeat = async ({ sessionToken = null, userId = null, ipAddress = null, userAgent = null }) => {
  const now = new Date();
  const nowTime = now.getTime();

  let session = null;

  if (sessionToken) {
    session = await prisma.userSession.findUnique({
      where: { sessionToken },
    });
  }

  // If session is expired, logged out, or missing, check if user has an active session or restore
  if ((!session || session.sessionStatus !== "active") && userId) {
    const activeSession = await prisma.userSession.findFirst({
      where: { userId: Number(userId), sessionStatus: "active" },
      orderBy: { loginAt: "desc" },
    });

    if (activeSession) {
      session = activeSession;
    } else {
      // Authenticated user heartbeat - start a fresh active session
      session = await createSession({
        userId: Number(userId),
        ipAddress,
        userAgent,
      });
    }
  }

  if (!session) {
    return { active: false, sessionStatus: "logged_out", message: "No active session found" };
  }

  // If session was specifically forced out by admin
  if (session.sessionStatus === "forced_logout") {
    return { active: false, sessionStatus: "forced_logout", message: "Session was terminated by administrator" };
  }

  const lastActivityTime = new Date(session.lastActivityAt || session.loginAt).getTime();
  const isInactiveOverdue = nowTime - lastActivityTime >= INACTIVITY_TIMEOUT_MS;

  if (isInactiveOverdue) {
    // Mark old session expired
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        sessionStatus: "expired",
        logoutAt: new Date(lastActivityTime),
      },
    });

    emitToAdmin("attendance:updated", {
      userId: session.userId,
      sessionStatus: "expired",
      status: "Session Expired",
      sessionId: session.id,
    });

    emitToUser(session.userId, "user:sessionExpired", {
      message: "Your session has expired due to 1 hour of inactivity.",
    });

    return { active: false, sessionStatus: "expired", message: "Session expired due to inactivity" };
  }

  // Throttled database update
  const lastDbUpdate = lastDbUpdateMap.get(session.id) || 0;
  if (nowTime - lastDbUpdate >= HEARTBEAT_THROTTLE_MS) {
    lastDbUpdateMap.set(session.id, nowTime);
    const expiresAt = new Date(nowTime + INACTIVITY_TIMEOUT_MS);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        lastActivityAt: now,
        expiresAt,
        sessionStatus: "active",
        ...(ipAddress ? { ipAddress } : {}),
      },
    });

    // Also touch UserAttendance if active
    try {
      await prisma.userAttendance.updateMany({
        where: { userId: session.userId, logoutAt: null },
        data: { updatedAt: now },
      });
    } catch (err) {}
  }

  return {
    active: true,
    sessionStatus: "active",
    sessionId: session.id,
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt || new Date(nowTime + INACTIVITY_TIMEOUT_MS),
  };
};

/**
 * Close session on explicit logout or browser close beacon
 */
const closeSession = async ({ sessionToken = null, userId = null, reason = "logged_out" }) => {
  const now = new Date();

  let session = null;
  if (sessionToken) {
    session = await prisma.userSession.findUnique({
      where: { sessionToken },
    });
  }

  if (!session && userId) {
    session = await prisma.userSession.findFirst({
      where: { userId: Number(userId), sessionStatus: "active" },
      orderBy: { loginAt: "desc" },
    });
  }

  if (!session) {
    // If no active session, ensure user attendance is closed
    if (userId) {
      await prisma.userAttendance.updateMany({
        where: { userId: Number(userId), logoutAt: null },
        data: { status: "Logged Out", logoutAt: now },
      });
    }
    return null;
  }

  // Idempotent close
  if (session.sessionStatus !== "active") {
    return session;
  }

  const updatedSession = await prisma.userSession.update({
    where: { id: session.id },
    data: {
      sessionStatus: reason,
      logoutAt: now,
      lastActivityAt: now,
    },
  });

  lastDbUpdateMap.delete(session.id);

  // Close UserAttendance
  try {
    await prisma.userAttendance.updateMany({
      where: { userId: session.userId, logoutAt: null },
      data: {
        status: "Logged Out",
        logoutAt: now,
      },
    });
  } catch (err) {
    console.error("Error closing UserAttendance on logout:", err.message);
  }

  // Broadcast real-time events
  emitToAdmin("attendance:updated", {
    userId: session.userId,
    sessionStatus: reason,
    status: reason === "forced_logout" ? "Forced Logout" : "Logged Out",
    logoutAt: now,
    sessionId: session.id,
  });

  emitToAdmin("user:statusChanged", {
    userId: session.userId,
    status: "Logged Out",
    sessionStatus: reason,
  });

  return updatedSession;
};

/**
 * Admin force logout of a user
 */
const forceLogoutUser = async (userId, adminId = null) => {
  const activeSessions = await prisma.userSession.findMany({
    where: { userId: Number(userId), sessionStatus: "active" },
  });

  const now = new Date();

  for (const s of activeSessions) {
    await prisma.userSession.update({
      where: { id: s.id },
      data: {
        sessionStatus: "forced_logout",
        logoutAt: now,
        lastActivityAt: now,
      },
    });
    lastDbUpdateMap.delete(s.id);
  }

  await prisma.userAttendance.updateMany({
    where: { userId: Number(userId), logoutAt: null },
    data: { status: "Logged Out", logoutAt: now },
  });

  emitToUser(userId, "user:forcedLogout", {
    message: "Your session was ended by an administrator.",
  });

  emitToAdmin("attendance:updated", {
    userId: Number(userId),
    sessionStatus: "forced_logout",
    status: "Forced Logout",
    logoutAt: now,
  });

  return { success: true, count: activeSessions.length };
};

/**
 * Stale session cleanup background worker
 */
const cleanupStaleSessions = async () => {
  try {
    const cutoff = new Date(Date.now() - INACTIVITY_TIMEOUT_MS);

    const staleSessions = await prisma.userSession.findMany({
      where: {
        sessionStatus: "active",
        lastActivityAt: { lt: cutoff },
      },
    });

    if (!staleSessions.length) return;

    for (const session of staleSessions) {
      const logoutAt = session.lastActivityAt || cutoff;
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          sessionStatus: "expired",
          logoutAt,
        },
      });

      lastDbUpdateMap.delete(session.id);

      emitToAdmin("attendance:updated", {
        userId: session.userId,
        sessionStatus: "expired",
        status: "Session Expired",
        logoutAt,
        sessionId: session.id,
      });

      // Only send expiration notification to the user if they do not have another active session
      const activeSessionExists = await prisma.userSession.findFirst({
        where: {
          userId: session.userId,
          sessionStatus: "active",
          lastActivityAt: { gte: cutoff },
        },
      });

      if (!activeSessionExists) {
        emitToUser(session.userId, "user:sessionExpired", {
          message: "Your session has expired due to 1 hour of inactivity.",
          sessionId: session.id,
        });
      }
    }

    // Also close stale UserAttendance
    await prisma.userAttendance.updateMany({
      where: {
        logoutAt: null,
        updatedAt: { lt: cutoff },
      },
      data: {
        status: "Logged Out",
        logoutAt: cutoff,
      },
    });
  } catch (err) {
    console.error("Stale session cleanup error:", err.message);
  }
};

/**
 * Get comprehensive User Attendance list for Admin page
 */
const getUserAttendanceList = async ({ statusFilter = "All", page = 1, limit = 10, searchQuery = "" } = {}) => {
  const { start: todayStart, end: todayEnd } = getISTDayBounds();
  const now = new Date();
  const nowTime = now.getTime();

  const userWhere = {
    OR: [
      { role: { in: ["ADMIN", "MANAGER", "PRE_SALES", "SALES", "POST_SALES", "AGENT", "AGENCY_USER"] } },
      { department: { in: ["PRE_SALES", "SALES", "POST_SALES"] } },
    ],
  };

  if (searchQuery) {
    const q = String(searchQuery).trim();
    userWhere.AND = [
      {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { username: { contains: q } },
          { email: { contains: q } },
        ],
      },
    ];
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    orderBy: [{ role: "asc" }, { firstName: "asc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      department: true,
      phone: true,
    },
  });

  const attendanceRows = await Promise.all(
    users.map(async (user) => {
      // Find latest session for this user
      const latestSession = await prisma.userSession.findFirst({
        where: { userId: user.id },
        orderBy: { loginAt: "desc" },
      });

      // Find if there is an active session
      const activeSession = await prisma.userSession.findFirst({
        where: { userId: user.id, sessionStatus: "active" },
        orderBy: { loginAt: "desc" },
      });

      // Calculate Today's usage
      const usage = await calculateUserTodayUsage(user.id);

      // Determine display status
      let displayStatus = "Logged Out";
      let sessionStatus = "logged_out";
      let isOnline = false;

      if (activeSession) {
        const lastAct = new Date(activeSession.lastActivityAt || activeSession.loginAt).getTime();
        if (nowTime - lastAct < INACTIVITY_TIMEOUT_MS) {
          displayStatus = "Online";
          sessionStatus = "active";
          isOnline = true;
        } else {
          displayStatus = "Session Expired";
          sessionStatus = "expired";
        }
      } else if (latestSession) {
        if (latestSession.sessionStatus === "forced_logout") {
          displayStatus = "Forced Logout";
          sessionStatus = "forced_logout";
        } else if (latestSession.sessionStatus === "expired") {
          displayStatus = "Session Expired";
          sessionStatus = "expired";
        } else {
          displayStatus = "Logged Out";
          sessionStatus = "logged_out";
        }
      }

      const relevantSession = isOnline ? activeSession : latestSession;

      const userName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.username ||
        user.email ||
        `User #${user.id}`;

      return {
        id: relevantSession?.id || `user-${user.id}`,
        userId: user.id,
        userName,
        user,
        email: user.email || "-",
        role: user.role || "-",
        status: displayStatus,
        sessionStatus,
        isOnline,
        loginAt: relevantSession?.loginAt || null,
        logoutAt: isOnline ? null : (relevantSession?.logoutAt || null),
        lastActivityAt: relevantSession?.lastActivityAt || null,
        loginTimeFormatted: formatTimeIST(relevantSession?.loginAt),
        logoutTimeFormatted: isOnline ? "—" : formatTimeIST(relevantSession?.logoutAt),
        lastActivityFormatted: formatTimeIST(relevantSession?.lastActivityAt),
        todayUsage: usage.formattedUsage,
        todayUsageSeconds: usage.totalSeconds,
        deviceType: relevantSession?.deviceType || "-",
        browser: relevantSession?.browser || "-",
        operatingSystem: relevantSession?.operatingSystem || "-",
      };
    })
  );

  // Apply status filter
  let filteredRows = attendanceRows;
  if (statusFilter && statusFilter !== "All") {
    const targetStatus = statusFilter.trim().toLowerCase();
    filteredRows = attendanceRows.filter((r) => {
      const s = r.status.toLowerCase();
      if (targetStatus === "online") return r.isOnline || s === "online";
      if (targetStatus === "logged out" || targetStatus === "logged_out") return s === "logged out";
      if (targetStatus === "session expired" || targetStatus === "expired") return s === "session expired";
      if (targetStatus === "forced logout" || targetStatus === "forced_logout") return s === "forced logout";
      return s === targetStatus;
    });
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;
  const paginatedData = filteredRows.slice(skip, skip + limitNum);

  return {
    page: pageNum,
    limit: limitNum,
    totalItems: filteredRows.length,
    totalPages: Math.ceil(filteredRows.length / limitNum) || 1,
    data: paginatedData,
  };
};

module.exports = {
  createSession,
  recordHeartbeat,
  closeSession,
  forceLogoutUser,
  cleanupStaleSessions,
  getISTDayBounds,
  calculateUserTodayUsage,
  getUserAttendanceList,
  startUserBreak,
  endUserBreak,
  formatDuration,
  formatTimeIST,
};
