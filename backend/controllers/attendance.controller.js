const prisma = require("../lib/prisma");
const sessionService = require("../services/session.service");

const userSelect = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  department: true,
};

exports.getAttendanceLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const statusFilter = String(req.query.status || "All");
    const searchQuery = String(req.query.search || "").trim();

    const result = await sessionService.getUserAttendanceList({
      statusFilter,
      page,
      limit,
      searchQuery,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Unable to load attendance logs:", error);
    res.status(500).json({ message: "Unable to load attendance logs" });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const userId = Number(req.authUser.id);
    const usage = await sessionService.calculateUserTodayUsage(userId);
    const activeSession = await prisma.userSession.findFirst({
      where: { userId, sessionStatus: "active" },
      orderBy: { loginAt: "desc" },
    });

    const currentAttendance = await prisma.userAttendance.findFirst({
      where: { userId, logoutAt: null },
      orderBy: { id: "desc" },
    });

    const isOnline = Boolean(activeSession);
    const isOnBreak = currentAttendance?.status === "On Break";
    const status = isOnBreak ? "On Break" : isOnline ? "Online" : "Logged Out";

    const data = {
      userId,
      status,
      isOnline,
      isOnBreak,
      loginAt: activeSession?.loginAt || currentAttendance?.loginAt || null,
      logoutAt: activeSession?.logoutAt || currentAttendance?.logoutAt || null,
      breakStartedAt: currentAttendance?.breakStartedAt || null,
      todayUsage: usage.formattedUsage,
      todayLoginSeconds: usage.totalSeconds,
      todayBreakSeconds: usage.totalBreakSeconds,
      formattedBreak: usage.formattedBreak,
    };

    res.status(200).json({ data });
  } catch (error) {
    console.error("Unable to load my attendance:", error);
    res.status(500).json({ message: "Unable to load attendance" });
  }
};

exports.startAttendance = async (req, res) => {
  try {
    const userId = Number(req.authUser.id);
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
    const userAgent = req.headers["user-agent"] || null;

    const session = await sessionService.createSession({
      userId,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
    });

    const usage = await sessionService.calculateUserTodayUsage(userId);

    res.status(200).json({
      data: {
        userId,
        status: "Online",
        loginAt: session.loginAt,
        todayUsage: usage.formattedUsage,
        todayLoginSeconds: usage.totalSeconds,
        todayBreakSeconds: usage.totalBreakSeconds,
        formattedBreak: usage.formattedBreak,
      },
    });
  } catch (error) {
    console.error("Unable to start attendance:", error);
    res.status(500).json({ message: "Unable to start attendance" });
  }
};

exports.endAttendance = async (req, res) => {
  try {
    const userId = Number(req.authUser.id);
    const sessionToken = req.authUser?.sessionToken || req.headers["x-session-token"];

    await sessionService.closeSession({
      userId,
      sessionToken,
      reason: "logged_out",
    });

    const usage = await sessionService.calculateUserTodayUsage(userId);

    res.status(200).json({
      data: {
        userId,
        status: "Logged Out",
        todayUsage: usage.formattedUsage,
        todayLoginSeconds: usage.totalSeconds,
        todayBreakSeconds: usage.totalBreakSeconds,
        formattedBreak: usage.formattedBreak,
      },
    });
  } catch (error) {
    console.error("Unable to end attendance:", error);
    res.status(500).json({ message: "Unable to end attendance" });
  }
};

exports.startBreak = async (req, res) => {
  try {
    const userId = Number(req.authUser.id);
    const result = await sessionService.startUserBreak(userId);
    res.status(200).json({
      data: result,
    });
  } catch (error) {
    console.error("Unable to start break:", error);
    res.status(500).json({ message: "Unable to start break" });
  }
};

exports.endBreak = async (req, res) => {
  try {
    const userId = Number(req.authUser.id);
    const result = await sessionService.endUserBreak(userId);
    res.status(200).json({
      data: result,
    });
  } catch (error) {
    console.error("Unable to end break:", error);
    res.status(500).json({ message: "Unable to end break" });
  }
};
