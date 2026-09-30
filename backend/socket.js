const prisma = require("./lib/prisma")
const jwt = require("jsonwebtoken")

let io
const connectedUser = new Map()

function initSocket(server) {
  let SocketIO
  try {
    SocketIO = require("socket.io")
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") {
      throw error
    }

    console.warn("socket.io is not installed. Realtime notifications are disabled until backend dependencies are installed.")
    io = {
      on: () => {},
      to: () => ({ emit: () => {} }),
      emit: () => {},
    }
    return io
  }

  io = SocketIO(server, {
    cors: {
      origin: [
        "https://crm.swamideveloper.com",
        "http://crm.swamideveloper.com",
        "http://localhost:3000",
        "http://localhost:3001",
        process.env.FRONTEND_URL,
      ].filter(Boolean),
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  })

  io.on("connection", async (socket) => {
    const token = String(socket.handshake?.auth?.token || socket.handshake?.query?.token || "").trim()
    let verifiedUser = null

    if (token && process.env.JWT_SECRET) {
      try {
        const authUser = jwt.verify(token, process.env.JWT_SECRET)
        if (authUser?.id) {
          verifiedUser = authUser
          socket.data.authUserId = String(authUser.id)
          socket.data.authUserRole = String(authUser.role || "").toUpperCase()
          connectedUser.set(String(authUser.id), socket.id)
          socket.join(`user:${authUser.id}`)
          socket.join(String(authUser.id))

          const role = String(authUser.role || "").toUpperCase()
          if (["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(role)) {
            socket.join("admin")
            socket.join("admins")
          }
        }
      } catch (error) {
        // Continue connection but without authenticated room privileges
      }
    }

    socket.on("register", async (userId) => {
      const registeredUserId = socket.data.authUserId || (userId ? String(userId) : null)
      if (!registeredUserId) return
      socket.data.authUserId = String(registeredUserId)
      connectedUser.set(String(registeredUserId), socket.id)
      socket.join(`user:${registeredUserId}`)
      socket.join(String(registeredUserId))

      try {
        const user = await prisma.user.findUnique({
          where: { id: Number(registeredUserId) },
          select: { role: true },
        })
        if (user && ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(String(user.role).toUpperCase())) {
          socket.join("admin")
          socket.join("admins")
        }

        const notifications = await prisma.notification.findMany({
          where: { userId: Number(registeredUserId), isRead: false },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
        socket.emit(`notification-${registeredUserId}`, notifications)
        socket.emit("notification:list", notifications)
        socket.emit("notification:count", notifications.length)
      } catch (err) {
        // ignore lookup failure
      }
    })

    socket.on("disconnect", () => {
      if (socket.data.authUserId && connectedUser.get(socket.data.authUserId) === socket.id) {
        connectedUser.delete(socket.data.authUserId)
      }
    })
  })

  return io
}

function getIO() {
  if (!io) {
    return {
      to: () => ({ emit: () => {} }),
      emit: () => {},
    }
  }
  return io
}

const emitToUser = (userId, event, data) => {
  if (!userId || !event) return
  const s = getIO()
  const uid = String(userId)
  s.to(`user:${uid}`).emit(event, data)
  s.to(uid).emit(event, data)
  const socketId = connectedUser.get(uid)
  if (socketId) {
    s.to(socketId).emit(event, data)
  }
}

const emitToAdmin = (event, data) => {
  if (!event) return
  const s = getIO()
  s.to("admin").emit(event, data)
  s.to("admins").emit(event, data)
}

const broadcastCRMEvent = (event, data, { userIds = [], includeAdmin = true } = {}) => {
  const s = getIO()
  if (!s || !event) return

  if (includeAdmin) {
    emitToAdmin(event, data)
  }

  const targets = Array.isArray(userIds) ? userIds : [userIds].filter(Boolean)
  targets.forEach((uid) => {
    emitToUser(uid, event, data)
  })
}

module.exports = {
  initSocket,
  connectedUser,
  getIO,
  emitToUser,
  emitToAdmin,
  broadcastCRMEvent,
}
