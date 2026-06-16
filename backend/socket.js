const prisma = require("./lib/prisma")
let io

const connectedUser = new Map()

function initSocket(server) {
  io = require("socket.io")(server, {
    cors: {
      origin: "",
    },
  })

  io.on("connection", socket => {
    socket.on("register", async (userId)=>{
      connectedUser.set(userId, socket.id)
      console.log(`intial connected users -`);
      console.log(connectedUser);
      
      
      const notifiactions = await prisma.notification.findMany({where:{userId:Number(userId), isRead:false}})

      socket.emit(`notification-${userId}`, notifiactions)
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
