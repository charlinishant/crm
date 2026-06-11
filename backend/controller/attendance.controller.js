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

const getOpenAttendance = (userId) =>
  prisma.userAttendance.findFirst({
    where: {
      userId,
      logoutAt: null,
    },
    orderBy: { loginAt: "desc" },
  })

const getLatestAttendance = (userId) =>
  prisma.userAttendance.findFirst({
    where: { userId },
    orderBy: { loginAt: "desc" },
  })

const startOrResumeAttendance = async (userId) => {
  const now = new Date()
  const attendance = await getLatestAttendance(userId)

  if (!attendance) {
    return prisma.userAttendance.create({
      data: {
        userId,
        status: "Available",
        loginAt: now,
      },
    })
  }

  return prisma.userAttendance.update({
    where: { id: attendance.id },
    data: {
      status: "Available",
      loginAt: now,
      logoutAt: null,
      breakStartedAt: null,
      breakEndedAt: null,
      totalBreakSeconds: 0,
    },
  })
}

exports.startAttendance = async (req, res) => {
  try {
    const userId = Number(req.authUser.id)
    const attendance = await startOrResumeAttendance(userId)

    res.status(200).json({ data: attendance })
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

    res.status(200).json({ data: updated })
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
      attendance = await startOrResumeAttendance(userId)
    }

    if (attendance.status === "On Break" && attendance.breakStartedAt && !attendance.breakEndedAt) {
      return res.status(200).json({ data: attendance })
    }

    const updated = await prisma.userAttendance.update({
      where: { id: attendance.id },
      data: {
        status: "On Break",
        breakStartedAt: new Date(),
        breakEndedAt: null,
      },
    })

    res.status(200).json({ data: updated })
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

    res.status(200).json({ data: updated })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Unable to end break" })
  }
}

exports.getMyAttendance = async (req, res) => {
  try {
    const userId = Number(req.authUser.id)
    const attendance = await getOpenAttendance(userId)
    res.status(200).json({ data: attendance })
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

    const where = status === "All" ? {} : { status }
    const [totalItems, rows] = await Promise.all([
      prisma.userAttendance.count({ where }),
      prisma.userAttendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { loginAt: "desc" },
        include: { user: { select: userSelect } },
      }),
    ])

    res.status(200).json({
      page,
      limit,
      totalItems,
      data: rows.map((row) => ({
        ...row,
        userName: getUserName(row.user),
      })),
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Unable to load attendance logs" })
  }
}
