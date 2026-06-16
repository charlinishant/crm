const {getIO, connectedUser} = require("../socket")
const prisma = require("../lib/prisma")

const io = getIO()

async function sendNotification(userId, title, description=""){
    const notification = await prisma.notifiaction.create({data:{
        titile:title,
        description:description,
        userId:Number(userId)
    }})

    const socketId = connectedUser.get(userId)

    if(socketId){
        io.to(socketId).emit("newNotification", notification)
    }

    return notification

}

module.exports = {
    sendNotification
}