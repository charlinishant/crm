const prisma = require("../lib/prisma")
const { sendNotification } = require("../services/notification.service")


exports.getNotifications = async (req, res)=>{
  try {
    const userId = req.query.userId || null
    const user = await prisma.user.findUnique({where:{id:Number(userId)}})

    if(!user) res.status(404).json({message:"User not found!"})
    
    const notifiactions = await prisma.notification.findMany({where:{userId:user.id}})

    if(!notifiactions) res.status(404).json({message:"Notifications not found!"})
    
    res.status(200).json(notifiactions)
    
  } catch (error) {
    console.log(error);
    
    res.status(500).json({error:"Something went wrong"})
  }
}


exports.readNotification = async (req, res) =>{
  try {
    const notificationId = Number(req.params.id)

    const notification = await prisma.notification.findUnique({where:{id:notificationId}})
    if(!notification) res.status(404).json({message:"Notification not found"})
    
    const updateNotification = await prisma.notification.update({where:{id:notification.id},
       data:{
        isRead:true
       }})
    
    res.status(200).json({message:"Notification read successfully", notification:updateNotification})

  } catch (error) {
    console.log(error);
    res.json(500).json({error:"Something went wrong"})    
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
      where: { id: Number(data.id) },
    })

    if (!user) res.status(404).json({error:"User not found"})
    
    const notification = sendNotification(user.id, data.title, data.description)

    res.status(201).json(notification)
    
  } catch (error) {
    res.status(500).json({error:"Something went wrong"})
  }
}


exports.sendLeadAssignNotification = async (req, res) =>{
  try {
    const data = req.body
    const lead = prisma.lead.findUnique({where:{id:data.leadId}})
    
    if(!lead) res.status(404).json({error:"Lead not found"})
    
    const notification = sendNotification(lead.teamId, data.title, data.description)
    res.status(201).json(notification)

  } catch (error) {
    res.status(500).json({error:"Something went wrong"})
  }
}