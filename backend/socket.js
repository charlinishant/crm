let io

const connectedUser = new Map()

function initSocket(server) {
  io = require("socket.io")(server, {
    cors: {
      origin: "",
    },
  })

  io.on("connection", socket => {
    socket.on("notification", userId => {
      
      socket.emit(`registered-${userId}`, {
        success: true,
        userId,
      })
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
