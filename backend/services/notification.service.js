const { getIO, connectedUser, emitToUser } = require("../socket")
const prisma = require("../lib/prisma")

async function sendNotification(userId, title, description = "", options = {}) {
    const numericUserId = Number(userId)
    if (!numericUserId) return null

    if (options.dedupeKey) {
        const existing = await prisma.notification.findFirst({
            where: {
                userId: numericUserId,
                description: { contains: String(options.dedupeKey) },
            },
            orderBy: { createdAt: "desc" },
        })
        if (existing) return existing
    }

    const finalDescription = options.dedupeKey && !description.includes(options.dedupeKey)
        ? `${description}\n${options.dedupeKey}`
        : description

    const notification = await prisma.notification.create({
        data: {
            titile: title,
            description: finalDescription,
            link: options.link || "",
            userId: numericUserId,
        },
    })

    const unreadCount = await prisma.notification.count({
        where: { userId: numericUserId, isRead: false },
    })

    try {
        emitToUser(numericUserId, "notification:new", notification)
        emitToUser(numericUserId, "notification:count", unreadCount)
        emitToUser(numericUserId, `newNotification-${numericUserId}`, notification)
    } catch (error) {
        console.warn("Realtime notification skipped:", error.message)
    }

    return notification
}

module.exports = {
    sendNotification,
}
