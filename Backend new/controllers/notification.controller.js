const prisma = require("../lib/prisma")
const { sendNotification } = require("../services/notification.service")


exports.getNotifications = async (req, res)=>{
  try {
    const userId = req.query.userId || null
    const user = await prisma.user.findUnique({where:{id:Number(userId)}})

    if(!user) return res.status(404).json({message:"User not found!"})
    
    const notifiactions = await prisma.notification.findMany({where:{userId:user.id}})

    if(!notifiactions) res.status(404).json({message:"Notifications not found!"})
    
    res.status(200).json(notifiactions)
    
  } catch (error) {
    console.log(error);
    
    res.status(500).json({error:"Something went wrong"})
  }
}

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = Number(req.authUser?.id)
    if (!userId) return res.status(401).json({ message:"Authentication is required" })

    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10))
    const skip = (page - 1) * limit
    const [totalItems, data, unreadCount] = await Promise.all([
      prisma.notification.count({ where:{ userId } }),
      prisma.notification.findMany({
        where:{ userId },
        orderBy:{ createdAt:"desc" },
        skip,
        take:limit,
      }),
      prisma.notification.count({ where:{ userId, isRead:false } }),
    ])

    res.status(200).json({
      data,
      page,
      limit,
      totalItems,
      totalPages:Math.ceil(totalItems / limit),
      unreadCount,
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message:"Unable to load notifications" })
  }
}

exports.readMyNotification = async (req, res) => {
  try {
    const userId = Number(req.authUser?.id)
    const notificationId = Number(req.params.id)
    if (!userId) return res.status(401).json({ message:"Authentication is required" })
    if (!notificationId) return res.status(400).json({ message:"Notification id is required" })

    const notification = await prisma.notification.findFirst({
      where:{ id:notificationId, userId },
    })
    if (!notification) return res.status(404).json({ message:"Notification not found" })

    const updated = await prisma.notification.update({
      where:{ id:notification.id },
      data:{ isRead:true },
    })
    const unreadCount = await prisma.notification.count({ where:{ userId, isRead:false } })

    res.status(200).json({ message:"Notification marked as read", notification:updated, unreadCount })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message:"Unable to mark notification as read" })
  }
}

exports.readAllMyNotifications = async (req, res) => {
  try {
    const userId = Number(req.authUser?.id)
    if (!userId) return res.status(401).json({ message:"Authentication is required" })

    await prisma.notification.updateMany({
      where:{ userId, isRead:false },
      data:{ isRead:true },
    })
    res.status(200).json({ message:"All notifications marked as read", unreadCount:0 })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message:"Unable to mark notifications as read" })
  }
}


exports.readNotification = async (req, res) =>{
  try {
    const notificationId = Number(req.params.id) || null
    const userId = Number(req.query.userId) || null

    if(notificationId){
      const notification = await prisma.notification.findUnique({where:{id:notificationId}})
      if(!notification) return res.status(404).json({message:"Notification not found"})
      
      const updateNotification = await prisma.notification.update({where:{id:notification.id},
         data:{
          isRead:true
         }})
      
      res.status(200).json({message:"Notification read successfully", notification:updateNotification})
    }
    else{

      const updateBulk = await prisma.notification.updateMany({where:{userId:userId}, data:{
        isRead:true
      }})

      res.status(200).json({message:"All notification read successfully"})
    }

  } catch (error) {
    console.log(error);
    res.status(500).json({error:"Something went wrong"})
  }
}

exports.sendActivityNotification = async (req, res) => {
  try {

    const data = req.body
    const requiredFields = ["title", "userId"]
    const missingKeys = requiredFields.filter(key => !(key in data));

    if (missingKeys.length > 0) {
        return res.status(400).json({
            error: `Missing required fields: ${missingKeys.join(', ')}`
        });
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(data.userId) },
    })

    if (!user) return res.status(404).json({error:"User not found"})
    
    const notification = await sendNotification(user.id, data.title, data.description)

    res.status(201).json(notification)
    
  } catch (error) {
    res.status(500).json({error:"Something went wrong"})
  }
}


exports.sendLeadAssignNotification = async (req, res) =>{
  try {
    const data = req.body
    const lead = await prisma.lead.findUnique({where:{id:data.leadId}})
    
    if(!lead) return res.status(404).json({error:"Lead not found"})
    
    const notification = await sendNotification(lead.teamId, data.title, data.description)
    res.status(201).json(notification)

  } catch (error) {
    res.status(500).json({error:"Something went wrong"})
  }
}
