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
      origin: "",
    },
  })

  io.on("connection", socket => {
    const token = String(socket.handshake?.auth?.token || socket.handshake?.query?.token || "").trim()
    if (token && process.env.JWT_SECRET) {
      try {
        const authUser = jwt.verify(token, process.env.JWT_SECRET)
        if (authUser?.id) {
          socket.data.authUserId = String(authUser.id)
          connectedUser.set(String(authUser.id), socket.id)
          socket.join(`user:${authUser.id}`)
        }
      } catch (error) {
        // Keep the socket connected for legacy notification flows, but do not join a private room.
      }
    }

    socket.on("register", async (userId)=>{
      const registeredUserId = socket.data.authUserId
      if (!registeredUserId || String(userId) !== registeredUserId) return
      connectedUser.set(registeredUserId, socket.id)
      socket.join(`user:${registeredUserId}`)
      
      const notifiactions = await prisma.notification.findMany({where:{userId:Number(registeredUserId), isRead:false}})

      socket.emit(`notification-${registeredUserId}`, notifiactions)
    })
  })

  return io
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }
  return io
}

module.exports = {
  initSocket,
  connectedUser,
  getIO,
}
