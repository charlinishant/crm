const {getIO, connectedUser} = require("../socket")
const prisma = require("../lib/prisma")

async function sendNotification(userId, title, description=""){
    const notification = await prisma.notification.create({data:{
        titile:title,
        description:description,
        userId:Number(userId)
    }})

    const socketId = connectedUser.get(String(userId))
    
    if(socketId){
        try {
            getIO().to(socketId).emit(`newNotification-${userId}`, notification)
        } catch (error) {
            console.warn("Realtime notification skipped:", error.message)
        }
    }

    return notification

}

module.exports = {
    sendNotification
}
