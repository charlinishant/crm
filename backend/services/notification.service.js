const {getIO, connectedUser} = require("../socket")
const prisma = require("../lib/prisma")

async function sendNotification(userId, title, description="", options = {}){
    const numericUserId = Number(userId)
    if (!numericUserId) return null

    if (options.dedupeKey) {
        const existing = await prisma.notification.findFirst({
            where:{
                userId:numericUserId,
                description:{ contains:String(options.dedupeKey) },
            },
            orderBy:{ createdAt:"desc" },
        })
        if (existing) return existing
    }

    const notification = await prisma.notification.create({data:{
        titile:title,
        description:description,
        link:options.link || "",
        userId:numericUserId
    }})

    const socketId = connectedUser.get(String(numericUserId))
    
    if(socketId){
        try {
            getIO().to(socketId).emit(`newNotification-${numericUserId}`, notification)
        } catch (error) {
            console.warn("Realtime notification skipped:", error.message)
        }
    }
    try {
        getIO().to(`user:${numericUserId}`).emit(`newNotification-${numericUserId}`, notification)
    } catch (error) {
        console.warn("Realtime notification room skipped:", error.message)
    }

    return notification

}

module.exports = {
    sendNotification
}
