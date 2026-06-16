const {getIO, connectedUser} = require("../socket")
const prisma = require("../lib/prisma")

const io = getIO()

async function sendNotification(userId, title, description=""){
    const notification = await prisma.notification.create({data:{
        titile:title,
        description:description,
        userId:Number(userId)
    }})

    const socketId = connectedUser.get(String(userId))
    console.log(`connected users -`);
    console.log(connectedUser);
    
    if(socketId){
        io.to(socketId).emit(`newNotification-${userId}`, notification)
    }

    return notification

}

module.exports = {
    sendNotification
}