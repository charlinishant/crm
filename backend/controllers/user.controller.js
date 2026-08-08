const bcrypt = require("bcryptjs")
const prisma = require("../lib/prisma")
const { emitReportsUpdate } = require("../socket/socket")

const normalizeLeadStageText = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/[_-]/g, " ")
        .trim()

const isNewAssignedLead = (lead) => {
    const status = normalizeLeadStageText(lead?.status || lead?.stage || lead?.leadStage || lead?.tags)
    return !status || status === "new" || status === "fresh lead" || status.includes("fresh")
}

const validUserRoles = new Set([
    "PRE_SALES",
    "SALES",
    "POST_SALES",
    "MANAGER",
    "ADMIN",
    "AGENCY_USER",
    "AGENT",
    "CHANNEL_PARTNER",
])
const roleDepartmentMap = {
    PRE_SALES: "PRE_SALES",
    SALES: "SALES",
    POST_SALES: "POST_SALES",
}
const profileUserSelect = {
    id:true,
    isActive:true,
    username:true,
    email:true,
    firstName:true,
    lastName:true,
    phone:true,
    secondaryPhone:true,
    timeZone:true,
    linkedUrl:true,
    description:true,
    profilePhoto:true,
    role:true,
    department:true,
    teamId:true,
    team:{
        select:{ id:true, name:true, location:true }
    },
    defaultRouting:true,
    defaultRoutingRule:true,
    autoRoster:true,
    pushNotification:true,
    gpsTracking:true,
}

const normalizeProfilePhotoPayload = (value) => {
    if (value === undefined) return undefined
    if (value === null || value === "") return null
    const photo = String(value).trim()
    const isDataImage = /^data:image\/(png|jpe?g|webp);base64,/i.test(photo)
    const isUrlOrPath = /^(https?:|\/assets\/|\/uploads\/|assets\/|uploads\/)/i.test(photo)
    if (!isDataImage && !isUrlOrPath) {
        const error = new Error("Profile photo must be a PNG, JPG, or WEBP image")
        error.statusCode = 400
        throw error
    }
    if (photo.length > 2.75 * 1024 * 1024) {
        const error = new Error("Profile photo must be 2 MB or smaller")
        error.statusCode = 400
        throw error
    }
    return photo
}

const getPublicUser = async (id) => prisma.user.findUnique({
    where:{ id:Number(id) },
    select:profileUserSelect,
})

const normalizeUserPayload = (data, { partial = false } = {}) => {
    const hasRole = Object.prototype.hasOwnProperty.call(data, "role")
    const hasDepartment = Object.prototype.hasOwnProperty.call(data, "department")

    if(partial && !hasRole && !hasDepartment){
        return data
    }

    if(typeof data.role === "string"){
        data.role = data.role.trim().toUpperCase()
        if(!validUserRoles.has(data.role)){
            delete data.role
        }
    }

    if(data.role && roleDepartmentMap[data.role]){
        data.department = roleDepartmentMap[data.role]
    } else {
        data.department = null
    }

    return data
}


exports.createUser = async (req, res)=>{
    try {
        const data = normalizeUserPayload({...req.body})
        const nullableFields = ["username", "phone", "secondaryPhone", "linkedUrl", "description", "timeZone", "profilePhoto"]

        nullableFields.forEach((field) => {
            if(typeof data[field] === "string"){
                data[field] = data[field].trim()
            }
            if(data[field] === ""){
                data[field] = null
            }
        })

        if(typeof data.email === "string"){
            data.email = data.email.trim().toLowerCase()
        }

        if(!data.email){
            return res.status(400).json({message:"Email is required"})
        }

        if(!data.password || String(data.password).length < 8){
            return res.status(400).json({message:"Password must be at least 8 characters"})
        }

        const duplicateChecks = []
        if(data.email){
            duplicateChecks.push({email:data.email})
        }
        if(data.username){
            duplicateChecks.push({username:data.username})
        }
        if(data.phone){
            duplicateChecks.push({phone:data.phone})
        }

        if(duplicateChecks.length){
            const existingUser = await prisma.user.findFirst({
                where:{OR:duplicateChecks},
                select:{email:true, username:true, phone:true}
            })

            if(existingUser){
                const duplicateFields = []
                if(existingUser.email === data.email) duplicateFields.push("email")
                if(data.username && existingUser.username === data.username) duplicateFields.push("username")
                if(data.phone && existingUser.phone === data.phone) duplicateFields.push("phone")

                return res.status(409).json({
                    message:`User already exists with this ${duplicateFields.join(", ")}`
                })
            }
        }

        if(data.password){
            data.password = await bcrypt.hash(data.password, 10)
        }

        const user = await prisma.user.create({data:data})

        res.status(201).json({
            "id":user.id,
            "message":"User created successfully"
        })
        emitReportsUpdate("user:created")

    } catch (error) {
        console.log(error);

        if(error.code === "P2002"){
            const fields = Array.isArray(error.meta?.target)
                ? error.meta.target.join(", ")
                : "email, username, or phone"

            return res.status(409).json({
                message:`User already exists with this ${fields}`
            })
        }
        
        res.status(500).json({message:"Something went wrong"})
    }
}

exports.getUser  = async (req, res)=>{
    try{
        const {id}  = req.params

        if(id){
            const result = await prisma.user.findUnique({where:{id:Number(id)}})
            if(!result)
                res.status(200).json("User not found")
            else{
                res.status(200).json(result)
            }
        }
        else{
            let conditions = {}
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 10
            
            const skip = (page-1)*limit

            const totalItems = await prisma.user.count({where:conditions})

            const result = await prisma.user.findMany({
                where:conditions,
                skip:skip,
                take:limit
            })

            let context = {
                page:page,
                limit:limit,
                totalItems:totalItems,
                data:result
            }
            res.status(200).json(context)
        }
    }
    catch(error){
        console.log(error);
        res.status(500).json("")
    }
}

exports.getMe = async (req, res) => {
    try {
        const userId = Number(req.authUser?.id)
        if(!userId) return res.status(401).json({message:"Authentication is required"})

        const user = await getPublicUser(userId)
        if(!user) return res.status(404).json({message:"User not found"})

        res.status(200).json({user})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Unable to load profile"})
    }
}

exports.updateMe = async (req, res) => {
    try {
        const userId = Number(req.authUser?.id)
        if(!userId) return res.status(401).json({message:"Authentication is required"})

        const currentUser = await prisma.user.findUnique({where:{id:userId}, select:{id:true, username:true}})
        if(!currentUser) return res.status(404).json({message:"User not found"})

        const source = {...req.body}
        const data = {}
        const editableStringFields = ["firstName", "lastName", "username", "secondaryPhone", "timeZone", "description", "linkedUrl"]
        editableStringFields.forEach((field) => {
            if(source[field] !== undefined){
                const value = source[field] === null ? null : String(source[field]).trim()
                data[field] = value === "" ? null : value
            }
        })

        if(data.secondaryPhone && !/^\d{10}$/.test(String(data.secondaryPhone).replace(/\D/g, ""))){
            return res.status(400).json({message:"Secondary phone must be exactly 10 digits"})
        }
        if(data.secondaryPhone) data.secondaryPhone = String(data.secondaryPhone).replace(/\D/g, "")
        if(source.profilePhoto !== undefined) data.profilePhoto = normalizeProfilePhotoPayload(source.profilePhoto)

        if(data.username){
            const duplicate = await prisma.user.findFirst({
                where:{ username:data.username, id:{ not:userId } },
                select:{ id:true },
            })
            if(duplicate) return res.status(409).json({message:"Username is already in use"})
        }

        if(!Object.keys(data).length){
            return res.status(400).json({message:"No editable profile fields provided"})
        }

        await prisma.user.update({ where:{id:userId}, data })
        const user = await getPublicUser(userId)
        res.status(200).json({message:"Profile updated", user})
        emitReportsUpdate("user:profile-updated")
    } catch (error) {
        console.log(error)
        res.status(error.statusCode || 500).json({message:error.message || "Unable to update profile"})
    }
}

exports.updateUser = async (req, res)=>{
    try {
        const data = normalizeUserPayload({...req.body}, { partial: true })
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const user = await prisma.user.findUnique({where:{id:parseInt(id)}})
        if(!user)
            res.status(400).json("User not found")    

        const nullableFields = ["username", "phone", "secondaryPhone", "linkedUrl", "description", "timeZone", "profilePhoto"]

        nullableFields.forEach((field) => {
            if(typeof data[field] === "string"){
                data[field] = data[field].trim()
            }
            if(data[field] === ""){
                data[field] = null
            }
        })

        if(typeof data.email === "string"){
            data.email = data.email.trim().toLowerCase()
        }

        if(data.password){
            data.password = await bcrypt.hash(data.password, 10)
        } else {
            delete data.password
        }

        const userUpdate = await  prisma.user.update({
            where:{id:parseInt(user.id)},
            data:data
        })

        res.status(200).json(userUpdate)
        emitReportsUpdate("user:updated")
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
    }
}

exports.deleteUser = async (req, res)=>{
    try {
        const id = req.params.id
        if(!id) {
            return res.status(400).json("ID is required")
        }

        const user = await prisma.user.findUnique({where:{id:parseInt(id)}})
        if(!user) {
            return res.status(400).json("User not found")
        }

        try {
            await prisma.user.delete({where:{id:user.id}})
            emitReportsUpdate("user:deleted")
            return res.status(200).json("User deleted successfully")
        } catch (deleteError) {
            if(deleteError?.code !== "P2003") {
                throw deleteError
            }

            const deactivatedUser = await prisma.user.update({
                where:{id:user.id},
                data:{isActive:false}
            })
            emitReportsUpdate("user:updated")
            return res.status(200).json({
                message:"User has linked CRM records, so it was deactivated instead of deleted.",
                user:deactivatedUser
            })
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json(error.message || "Something went wrong")
    }
}

exports.getAccessPanel = async (req, res)=>{
    try {
        const authUserId = Number(req.authUser.id)
        const user = await prisma.user.findUnique({
            where:{id:authUserId},
            include:{team:true}
        })

        if(!user){
            return res.status(404).json({message:"User not found"})
        }

        const getAssignedLeads = async () => {
            const baseQuery = {
                where:{teamId:user.id, is_delete:false},
                take:100,
                orderBy:{id:"desc"},
                select:{
                    id:true,
                    salutation:true,
                    firstName:true,
                    lastName:true,
                    emails:true,
                    phones:true,
                    status:true,
                    timeZone:true,
                    tags:true,
                    interestedProjects:true,
                    teamId:true,
                    channelPartner:true,
                    conductSiteVisit:true,
                    conductSiteDate:true,
                    siteVisitProject:true,
                    siteVisitStatus:true,
                    visitStatus:true,
                    conductSiteStatus:true,
                    siteVisitLocation:true,
                    meetingPoint:true,
                    siteVisitExecutive:true,
                    siteVisitNote:true,
                    siteVisitInitiatedBy:true,
                    siteVisitDate:true,
                    siteVisitConductedOn:true,
                    companyName:true,
                    type:true,
                    carpetArea:true,
                    seats:true,
                    tenure:true,
                    gender:true,
                    occupations:true,
                    age:true,
                    birthday:true,
                    maritalStatus:true,
                    anniversary:true,
                    industry:true,
                    propertyType:true,
                    configration:true,
                    budget:true,
                    locationPreferences:true,
                    bookings:true,
                    callLogs:{
                        orderBy:{createdAt:"desc"},
                        take:1,
                        select:{
                            id:true,
                            status:true,
                            disposition:true,
                            notes:true,
                            nextFollowUpAt:true,
                            visitDateTime:true,
                            interestedProject:true,
                            budget:true,
                            createdAt:true,
                            updatedAt:true,
                        }
                    }
                }
            }

            try {
                return await prisma.lead.findMany({
                    ...baseQuery,
                    where:{
                        ...baseQuery.where,
                        deletedAt:null
                    },
                })
            } catch (error) {
                if(error.code !== "P2022"){
                    throw error
                }

                return prisma.lead.findMany(baseQuery)
            }
        }

        const leads = await getAssignedLeads()

        let newLeadsToday = 0
        try {
            const now = new Date()
            const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const endToday = new Date(startToday)
            endToday.setDate(endToday.getDate() + 1)

            const assignedToday = await prisma.leadActivity.findMany({
                where:{
                    type:"LEAD_ASSIGNED",
                    newStatus:String(authUserId),
                    createdAt:{gte:startToday, lt:endToday},
                    lead:{
                        teamId:authUserId,
                        is_delete:false,
                    },
                },
                distinct:["leadId"],
                select:{leadId:true},
            })
            newLeadsToday = assignedToday.length

            if (newLeadsToday === 0) {
                newLeadsToday = leads.filter(isNewAssignedLead).length
            }
        } catch (error) {
            console.log("Unable to load new assigned lead stats", error)
            newLeadsToday = leads.filter(isNewAssignedLead).length
        }

        let bookings = []
        try {
            bookings = await prisma.booking.findMany({
                where:{
                    stage:{in:["Booked", "booked", "Confirmed", "confirmed"]},
                    leadId:{
                        in:leads.map(lead => lead.id)
                    }
                },
                take:10,
                include:{
                    lead:{
                        select:{
                            id:true,
                            salutation:true,
                            firstName:true,
                            lastName:true,
                            emails:true,
                            phones:true,
                            status:true,
                            tags:true,
                            interestedProjects:true,
                            teamId:true,
                            channelPartner:true,
                            companyName:true,
                            propertyType:true,
                            configration:true,
                            budget:true,
                        }
                    }
                },
                orderBy:{createdAt:"desc"}
            })
        } catch (error) {
            console.log("Unable to load user bookings", error)
        }

        let tasks = []
        try {
            tasks = await prisma.task.findMany({
                where:{assigneeId:authUserId},
                select:{
                    id:true,
                    title:true,
                    description:true,
                    remark:true,
                    type:true,
                    status:true,
                    priority:true,
                    dueDate:true,
                    dueTime:true,
                    assign:{
                        select:{
                            id:true,
                            username:true,
                            firstName:true,
                            lastName:true
                        }
                    },
                    assignedBy:{
                        select:{
                            id:true,
                            username:true,
                            firstName:true,
                            lastName:true
                        }
                    },
                    attachments:true,
                    createdAt:true,
                    updatedAt:true,
                }
            })
        } catch (error) {
            console.log("Unable to load user tasks", error)
        }

        let followupStats = {
            today: 0,
            missed: 0,
            upcoming: 0,
            highPriority: 0,
            due: 0,
        }
        try {
            const now = new Date()
            const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const endToday = new Date(startToday)
            endToday.setDate(endToday.getDate() + 1)

            const [today, missed, upcoming, highPriority, callbacksDue] = await Promise.all([
                prisma.followUp.count({
                    where:{
                        salesUserId:authUserId,
                        status:{notIn:["Done", "Cancelled"]},
                        followUpDate:{gte:startToday, lt:endToday}
                    }
                }),
                prisma.followUp.count({
                    where:{
                        salesUserId:authUserId,
                        status:"Pending",
                        followUpDate:{lt:now}
                    }
                }),
                prisma.followUp.count({
                    where:{
                        salesUserId:authUserId,
                        status:{notIn:["Done", "Cancelled"]},
                        followUpDate:{gte:endToday}
                    }
                }),
                prisma.followUp.count({
                    where:{
                        salesUserId:authUserId,
                        status:{notIn:["Done", "Cancelled"]},
                        priority:"High"
                    }
                }),
                prisma.followUp.count({
                    where:{
                        salesUserId:authUserId,
                        type:"Callback",
                        status:"Pending",
                        followUpDate:{lte:endToday}
                    }
                }),
            ])

            followupStats = {
                today,
                missed,
                upcoming,
                highPriority,
                callbacksDue,
                due:today + missed,
            }
        } catch (error) {
            console.log("Unable to load follow-up stats", error)
        }

        const displayUser = {
            id:user.id,
            username:user.username,
            email:user.email,
            firstName:user.firstName,
            lastName:user.lastName,
            phone:user.phone,
            role:user.role,
            department:user.department,
            team:user.team
        }

        res.status(200).json({
            user:displayUser,
            stats:{
                assignedLeads:leads.length,
                newLeadsToday,
                followupsDue:followupStats.due,
                followupsToday:followupStats.today,
                missedFollowups:followupStats.missed,
                upcomingFollowups:followupStats.upcoming,
                highPriorityFollowups:followupStats.highPriority,
                callbacksDue:followupStats.callbacksDue || 0,
                siteVisits:leads.filter(lead =>
                    lead.conductSiteVisit ||
                    lead.conductSiteDate ||
                    lead.siteVisitProject ||
                    lead.siteVisitDate ||
                    lead.siteVisitStatus ||
                    lead.visitStatus ||
                    lead.conductSiteStatus
                ).length,
                bookings:bookings.length,
                tasks:tasks.length
            },
            leads:leads,
            bookings:bookings,
            tasks:tasks
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Something went wrong"})
    }
}
exports.getAllUser = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
          
            include: {
                team: true
            },
          
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                department: true,
                isActive: true,
                team: true,
                createdAt: true 
            }
        });

        if (users.length === 0) {
            return res.status(200).json({ message: "No users found", data: [] });
        }

        res.status(200).json({
            count: users.length,
            data: users
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error fetching all users" });
    }
};
