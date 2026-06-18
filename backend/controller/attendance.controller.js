const prisma = require("../lib/prisma")

const userSelect = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  department: true,
}

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  "Sales User"

const secondsBetween = (start, end) => {
  if (!start || !end) return 0
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000))
}

const getTodayBounds = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

const getEffectiveBreakSeconds = (attendance, now = new Date()) => {
  const savedBreakSeconds = Number(attendance?.totalBreakSeconds) || 0
  const activeBreakSeconds = attendance?.breakStartedAt && !attendance?.breakEndedAt
    ? secondsBetween(attendance.breakStartedAt, now)
    : 0

  return savedBreakSeconds + activeBreakSeconds
}

const getEffectiveSessionSeconds = (attendance, now = new Date()) => {
  if (!attendance?.loginAt) return 0
  return secondsBetween(attendance.loginAt, attendance.logoutAt || now)
}

const getTodaySummary = async (userId) => {
  const { start, end } = getTodayBounds()
  const now = new Date()
  const rows = await prisma.userAttendance.findMany({
    where: {
      userId,
      loginAt: {
        gte: start,
        lt: end,
      },
    },
  })

  return rows.reduce(
    (summary, row) => ({
      todayLoginSeconds: summary.todayLoginSeconds + getEffectiveSessionSeconds(row, now),
      todayBreakSeconds: summary.todayBreakSeconds + getEffectiveBreakSeconds(row, now),
      todaySessionCount: summary.todaySessionCount + 1,
    }),
    { todayLoginSeconds: 0, todayBreakSeconds: 0, todaySessionCount: 0 }
  )
}

const getTodayLatestAttendance = (userId) => {
  const { start, end } = getTodayBounds()

  return prisma.userAttendance.findFirst({
    where: {
      userId,
      loginAt: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { loginAt: "desc" },
  })
}

const withTodaySummary = async (attendance) => {
  if (!attendance?.userId) return attendance
  const summary = await getTodaySummary(attendance.userId)

  return {
    ...attendance,
    currentSessionSeconds: getEffectiveSessionSeconds(attendance),
    currentBreakSeconds: getEffectiveBreakSeconds(attendance),
    ...summary,
  }
}

const getOpenAttendance = (userId) =>
  prisma.userAttendance.findFirst({
    where: {
      userId,
      logoutAt: null,
    },
    orderBy: { loginAt: "desc" },
  })

const startOrResumeAttendance = async (userId) => {
  const now = new Date()
  const openAttendance = await getOpenAttendance(userId)

  if (openAttendance) {
    return prisma.userAttendance.update({
      where: { id: openAttendance.id },
      data: { status: openAttendance.status || "Available" },
    })
  }

  return prisma.userAttendance.create({
    data: {
      userId,
      status: "Available",
      loginAt: now,
    },
  })
}

const ensureTodayOpenAttendance = async (userId) => {
  const now = new Date()
  const { start, end } = getTodayBounds()
  const openAttendance = await getOpenAttendance(userId)

  if (openAttendance) return openAttendance

  const todaysLatest = await prisma.userAttendance.findFirst({
    where: {
      userId,
      loginAt: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { loginAt: "desc" },
  })

  if (!todaysLatest || todaysLatest.logoutAt) {
    return prisma.userAttendance.create({
      data: {
        userId,
        status: "Available",
        loginAt: now,
      },
    })
  }

  return todaysLatest
}

exports.startAttendance = async (req, res) => {
  try {
    const userId = Number(req.authUser.id)
    const attendance = await startOrResumeAttendance(userId)
    const data = await withTodaySummary(attendance)

    res.status(200).json({ data })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Unable to start attendance" })
  }
}

exports.endAttendance = async (req, res) => {
  try {
    const userId = Number(req.authUser.id)
    const attendance = await getOpenAttendance(userId)

    if (!attendance) {
      return res.status(404).json({ message: "No active attendance session found" })
    }

    const now = new Date()
    const extraBreakSeconds = attendance.breakStartedAt && !attendance.breakEndedAt
      ? secondsBetween(attendance.breakStartedAt, now)
      : 0

    const updated = await prisma.userAttendance.update({
      where: { id: attendance.id },
      data: {
        status: "Logged Out",
        logoutAt: now,
        breakEndedAt: attendance.breakStartedAt && !attendance.breakEndedAt ? now : attendance.breakEndedAt,
        totalBreakSeconds: attendance.totalBreakSeconds + extraBreakSeconds,
      },
    })

    const data = await withTodaySummary(updated)
    res.status(200).json({ data })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Unable to end attendance" })
  }
}

exports.startBreak = async (req, res) => {
  try {
    const userId = Number(req.authUser.id)
    let attendance = await getOpenAttendance(userId)

    if (!attendance) {
      attendance = await ensureTodayOpenAttendance(userId)
    }

    if (attendance.status === "On Break" && attendance.breakStartedAt && !attendance.breakEndedAt) {
      const data = await withTodaySummary(attendance)
      return res.status(200).json({ data })
    }

    const updated = await prisma.userAttendance.update({
      where: { id: attendance.id },
      data: {
        status: "On Break",
        breakStartedAt: new Date(),
        breakEndedAt: null,
      },
    })

    const data = await withTodaySummary(updated)
    res.status(200).json({ data })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Unable to start break" })
  }
}

exports.endBreak = async (req, res) => {
  try {
    const userId = Number(req.authUser.id)
    const attendance = await getOpenAttendance(userId)

    if (!attendance) {
      return res.status(404).json({ message: "No active attendance session found" })
    }

    const now = new Date()
    const breakSeconds = attendance.breakStartedAt && !attendance.breakEndedAt
      ? secondsBetween(attendance.breakStartedAt, now)
      : 0

    const updated = await prisma.userAttendance.update({
      where: { id: attendance.id },
      data: {
        status: "Available",
        breakEndedAt: now,
        totalBreakSeconds: attendance.totalBreakSeconds + breakSeconds,
      },
    })

    const data = await withTodaySummary(updated)
    res.status(200).json({ data })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Unable to end break" })
  }
}

exports.getMyAttendance = async (req, res) => {
  try {
    const userId = Number(req.authUser.id)
    const attendance = await getOpenAttendance(userId)
    const data = attendance
      ? await withTodaySummary(attendance)
      : { status: "Logged Out", ...(await getTodaySummary(userId)) }
    res.status(200).json({ data })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Unable to load attendance" })
  }
}

exports.getAttendanceLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10))
    const skip = (page - 1) * limit
    const status = String(req.query.status || "All")

    const userWhere = {
      OR: [
        { role: "ADMIN" },
        { role: "SALES" },
        { department: "SALES" },
      ],
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      orderBy: [{ role: "asc" }, { firstName: "asc" }, { username: "asc" }],
      select: userSelect,
    })

    const attendanceRows = await Promise.all(users.map(async (user) => {
      const [latestAttendance, summary] = await Promise.all([
        getTodayLatestAttendance(user.id),
        getTodaySummary(user.id),
      ])
      const resolvedStatus = latestAttendance?.status || "Logged Out"

      return {
        id: latestAttendance?.id || `user-${user.id}`,
        userId: user.id,
        user,
        userName: getUserName(user),
        status: resolvedStatus,
        loginAt: latestAttendance?.loginAt || null,
        logoutAt: latestAttendance?.logoutAt || null,
        breakStartedAt: latestAttendance?.breakStartedAt || null,
        breakEndedAt: latestAttendance?.breakEndedAt || null,
        totalBreakSeconds: latestAttendance?.totalBreakSeconds || 0,
        currentSessionSeconds: latestAttendance ? getEffectiveSessionSeconds(latestAttendance) : 0,
        currentBreakSeconds: latestAttendance ? getEffectiveBreakSeconds(latestAttendance) : 0,
        ...summary,
      }
    }))

    const filteredRows = status === "All"
      ? attendanceRows
      : attendanceRows.filter((row) => row.status === status)

    const data = filteredRows.slice(skip, skip + limit)

    res.status(200).json({
      page,
      limit,
      totalItems: filteredRows.length,
      data,
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Unable to load attendance logs" })
  }
}
