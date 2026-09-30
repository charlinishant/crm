const bcrypt = require("bcryptjs")
const prisma = require("../lib/prisma")
const mcubeAgentService = require("../services/mcubeAgent.service")
const { emitReportsUpdate } = require("../socket/socket")
const { isAdminUser, maskLeadData, maskBookingData, maskTaskData } = require("../utils/phoneMask")

const normalizeLeadStageText = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/[_-]/g, " ")
        .trim()

const isNewAssignedLead = (lead) => {
    const status = normalizeLeadStageText(lead?.status || lead?.stage || lead?.leadStage || lead?.tags)
    return !status || status === "new" || status === "fresh lead" || status.includes("fresh")
}

const getISTDateString = (date = new Date()) => {
    if (!date) return ""
    const d = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime())) return ""
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d)
}

const getISTDayBoundaries = (date = new Date()) => {
    const istDateStr = getISTDateString(date)
    const start = new Date(`${istDateStr}T00:00:00+05:30`)
    const nextDayStart = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    return { istDateStr, start, nextDayStart }
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
    reraNumber:true,
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
        const nullableFields = ["username", "phone", "secondaryPhone", "linkedUrl", "description", "timeZone", "profilePhoto", "reraNumber"]

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

        if(data.phone){
            const cleanedPhone = String(data.phone).replace(/\D/g, '').slice(-10)
            data.phone = cleanedPhone.length === 10 ? cleanedPhone : null
        }
        if(data.secondaryPhone){
            const cleanedSecondary = String(data.secondaryPhone).replace(/\D/g, '').slice(-10)
            data.secondaryPhone = cleanedSecondary.length === 10 ? cleanedSecondary : null
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

        // Initialize MCube agent mapping if MCube is enabled
        let mcubeInitResult = null
        let mcubeInitError = null
        if (user.email && (user.phone || user.secondaryPhone)) {
            try {
                // Check if MCube is enabled and configured
                const mcubeConfig = require("../services/mcubeConfig.service")
                if (mcubeConfig.isMcubeEnabled() && mcubeConfig.isConfigured()) {
                    mcubeInitResult = await mcubeAgentService.upsertMcubeAgentMapping({
                        userId: user.id,
                        mcubeEmail: user.email,
                        agentPhone: user.phone || user.secondaryPhone,
                        callingMode: "softphone",
                        isActive: true,
                    })
                } else {
                    // MCube is not fully configured - create a pending mapping
                    mcubeInitResult = await mcubeAgentService.upsertMcubeAgentMapping({
                        userId: user.id,
                        mcubeEmail: user.email,
                        agentPhone: user.phone || user.secondaryPhone,
                        callingMode: "softphone",
                        isActive: false, // Start as inactive until properly configured
                    })
                    mcubeInitError = "MCube agent mapping created but requires configuration"
                }
            } catch (error) {
                mcubeInitError = error.message
                console.error("Failed to create MCube agent mapping for user:", user.id, error.message)
                // Don't fail user creation if MCube mapping fails
            }
        }

        res.status(201).json({
            "id":user.id,
            "message":"User created successfully",
            ...(mcubeInitError && {mcubeSetupWarning: mcubeInitError})
        })
        emitReportsUpdate("user:created")

    } catch (error) {
        console.error("Error in createUser:", error);

        if(error.code === "P2002"){
            const fields = Array.isArray(error.meta?.target)
                ? error.meta.target.join(", ")
                : "email, username, or phone"

            return res.status(409).json({
                message:`User already exists with this ${fields}`
            })
        }
        
        res.status(500).json({
            message: error.message || "Failed to create user. Please check server database schema and logs."
        })
    }
}

exports.getUser  = async (req, res)=>{
    try{
        const {id}  = req.params

        if(id){
            const result = await prisma.user.findUnique({where:{id:Number(id)}, include:{team:true}})
            if(!result)
                res.status(200).json("User not found")
            else{
                res.status(200).json(result)
            }
        }
        else{
            let conditions = {}

            const roleParam = req.query.role || req.query.roles
            if (roleParam) {
                const roles = String(roleParam).split(",").map(r => r.trim().toUpperCase()).filter(Boolean)
                if (roles.length === 1) {
                    conditions.role = roles[0]
                } else if (roles.length > 1) {
                    conditions.role = { in: roles }
                }
            }

            const excludeRoleParam = req.query.excludeRole || req.query.excludeRoles
            if (excludeRoleParam) {
                const excluded = String(excludeRoleParam).split(",").map(r => r.trim().toUpperCase()).filter(Boolean)
                if (excluded.length > 0) {
                    if (conditions.role && typeof conditions.role === "object" && conditions.role.in) {
                        conditions.role.in = conditions.role.in.filter(r => !excluded.includes(r))
                    } else {
                        conditions.role = { notIn: excluded }
                    }
                }
            }

            if (req.query.type === "sales" || req.query.scope === "sales") {
                conditions.role = { in: ["SALES", "PRE_SALES", "POST_SALES", "MANAGER", "ADMIN", "AGENT"] }
            } else if (req.query.type === "channel_partner" || req.query.scope === "channel_partner" || req.query.type === "cp") {
                conditions.role = "CHANNEL_PARTNER"
            }

            if (req.query.department) {
                conditions.department = String(req.query.department).trim().toUpperCase()
            }

            if (req.query.isActive !== undefined) {
                conditions.isActive = req.query.isActive === "true" || req.query.isActive === true
            }

            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 1000
            
            const skip = (page-1)*limit

            const totalItems = await prisma.user.count({where:conditions})

            const result = await prisma.user.findMany({
                where:conditions,
                skip:skip,
                take:limit,
                include:{team:true},
                orderBy:{firstName:"asc"}
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
        res.status(500).json({message:"Error fetching users"})
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

        const nullableFields = ["username", "phone", "secondaryPhone", "linkedUrl", "description", "timeZone", "profilePhoto", "reraNumber"]

        nullableFields.forEach((field) => {
            if(typeof data[field] === "string"){
                data[field] = data[field].trim()
            }
            if(data[field] === ""){
                data[field] = null
            }
        })

        if(data.phone){
            const cleanedPhone = String(data.phone).replace(/\D/g, '').slice(-10)
            data.phone = cleanedPhone.length === 10 ? cleanedPhone : null
        }
        if(data.secondaryPhone){
            const cleanedSecondary = String(data.secondaryPhone).replace(/\D/g, '').slice(-10)
            data.secondaryPhone = cleanedSecondary.length === 10 ? cleanedSecondary : null
        }

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

        if (data.phone || data.email || user.phone || user.email) {
          const existingAgent = await mcubeAgentService.findMcubeAgentByUserId(user.id)
          await mcubeAgentService.upsertMcubeAgentMapping({
            userId: user.id,
            mcubeEmail: data.email || existingAgent?.mcubeEmail || user.email,
            agentPhone: data.phone || existingAgent?.agentPhone || user.phone,
            extension: existingAgent?.extension || null,
            callingMode: existingAgent?.callingMode || "softphone",
            isActive: true,
          }).catch(() => null)
        }

        res.status(200).json(userUpdate)
        emitReportsUpdate("user:updated")
    } catch (error) {
        console.error("Error in updateUser:", error);
        if(error.code === "P2002"){
            const fields = Array.isArray(error.meta?.target)
                ? error.meta.target.join(", ")
                : "email, username, or phone"

            return res.status(409).json({
                message:`User already exists with this ${fields}`
            })
        }
        res.status(500).json({ message: error.message || "Failed to update user" })
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

        const authRole = String(user.role || "").toUpperCase()
        const isAdminOrManager = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(authRole)

        const getAssignedLeads = async () => {
            let leadWhere = { teamId: user.id, is_delete: false }
            if (isAdminOrManager) {
                const assignedCount = await prisma.lead.count({ where: leadWhere })
                if (assignedCount === 0) {
                    leadWhere = { is_delete: false }
                }
            }

            const baseQuery = {
                where: leadWhere,
                orderBy:{id:"desc"},
                select:{
                    id:true,
                    callAttemptCount:true,
                    _count:{
                        select:{
                            callLogs:true
                        }
                    },
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
                    bookings:{
                        select:{
                            id:true,
                            leadId:true,
                            customerName:true,
                            stage:true,
                            projectDetails:true,
                            bookedOn:true,
                            createdAt:true,
                            basePrice:true,
                            agreementValue:true,
                            totalPrice:true,
                        }
                    },
                    scheduleVisits:{
                        select:{
                            id:true,
                            status:true,
                            scheduledOn:true,
                            conductedOn:true,
                            project:true
                        }
                    },
                    activities:{
                        where:{type:{in:["LEAD_CREATED", "LEAD_ASSIGNED"]}},
                        orderBy:{createdAt:"desc"},
                        take:1,
                        select:{
                            createdAt:true
                        }
                    },
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

        const search = req.query.search?.trim() || ''

        // Get unfiltered leads for stats and other computations
        const unfilteredLeads = await getAssignedLeads()

        // Filter leads by search term if provided
        const leads = search ? unfilteredLeads.filter(lead => {
            const idMatch = String(lead.id).includes(search)
            const firstNameMatch = lead.firstName?.toLowerCase().includes(search.toLowerCase()) ?? false
            const lastNameMatch = lead.lastName?.toLowerCase().includes(search.toLowerCase()) ?? false
            const normalizedSearch = search.replace(/\D/g, '')
            const phoneMatch = lead.phones?.some(p =>
                String(p.value).replace(/\D/g, '').includes(normalizedSearch)
            ) ?? false
            return idMatch || firstNameMatch || lastNameMatch || phoneMatch
        }) : unfilteredLeads

        let newLeadsToday = 0
        try {
            const todayIST = getISTDateString(new Date())

            // Leads assigned/created today in IST
            const createdTodayLeads = unfilteredLeads.filter(lead => {
                const leadDateIST = getISTDateString(lead.createdAt || lead.received_on)
                return leadDateIST === todayIST
            })

            const assignedToday = await prisma.leadActivity.findMany({
                where:{
                    type:"LEAD_ASSIGNED",
                    newStatus:String(authUserId),
                    lead:{
                        teamId:authUserId,
                        is_delete:false,
                    },
                },
                distinct:["leadId"],
                select:{leadId:true, createdAt:true},
            })
            const assignedTodayCount = assignedToday.filter(a => getISTDateString(a.createdAt) === todayIST).length

            newLeadsToday = Math.max(createdTodayLeads.length, assignedTodayCount)
        } catch (error) {
            console.log("Unable to load new assigned lead stats", error)
            newLeadsToday = 0
        }

        let bookings = []
        try {
            bookings = await prisma.booking.findMany({
                where:{
                    stage:{in:["Booked", "booked", "Confirmed", "confirmed"]},
                    leadId:{
                        in:unfilteredLeads.map(lead => lead.id)
                    }
                },
                take:10,
                select:{
                    id:true,
                    leadId:true,
                    customerName:true,
                    stage:true,
                    projectDetails:true,
                    bookedOn:true,
                    createdAt:true,
                    basePrice:true,
                    agreementValue:true,
                    totalPrice:true,
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
            all: 0,
            today: 0,
            missed: 0,
            upcoming: 0,
            highPriority: 0,
            due: 0,
        }
        try {
            const { start: startToday, nextDayStart: endToday } = getISTDayBoundaries(new Date())
            const now = new Date()

            const [today, missed, upcoming, highPriority, callbacksDue, allCount] = await Promise.all([
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
                prisma.followUp.count({
                    where:{
                        salesUserId:authUserId,
                    }
                }),
            ])

            followupStats = {
                all: allCount,
                today,
                missed,
                upcoming,
                highPriority,
                callbacksDue,
                due: allCount,
            }
        } catch (error) {
            console.log("Unable to load follow-up stats", error)
        }

        let siteVisitStats = {
            today: 0,
            done: 0,
            upcoming: 0,
        }
        try {
            const todayIST = getISTDateString(new Date())
            const authUserName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
            const leadIds = unfilteredLeads.map(l => l.id)

            const visitConditions = []
            if (leadIds.length > 0) {
                visitConditions.push({ leadId: { in: leadIds } })
            }
            if (authUserName) {
                visitConditions.push({ salesExecutive: { contains: authUserName } })
            }
            if (user.username) {
                visitConditions.push({ salesExecutive: { contains: user.username } })
            }
            if (user.email) {
                visitConditions.push({ salesExecutive: { contains: user.email } })
            }

            if (visitConditions.length > 0) {
                const scheduleVisits = await prisma.scheduleVisit.findMany({
                    where: {
                        OR: visitConditions,
                    },
                    select: {
                        id: true,
                        status: true,
                        scheduledOn: true,
                        conductedOn: true,
                    }
                })

                let doneCount = 0
                let upcomingCount = 0
                let scheduledTotal = 0

                for (const visit of scheduleVisits) {
                    const scheduledIST = getISTDateString(visit.scheduledOn)
                    const conductedIST = getISTDateString(visit.conductedOn)
                    const isToday = scheduledIST === todayIST || conductedIST === todayIST

                    const normStatus = String(visit.status || "").trim().toLowerCase()
                    const isDone = ["done", "completed", "visit done", "conducted"].includes(normStatus) || (conductedIST === todayIST && visit.conductedOn)
                    const isCancelled = ["cancelled", "canceled", "visit missed", "missed"].includes(normStatus)

                    if (!isCancelled && !isDone) {
                        scheduledTotal++
                    }

                    if (isToday) {
                        if (isDone) {
                            doneCount++
                        } else if (!isCancelled) {
                            upcomingCount++
                        }
                    }
                }

                siteVisitStats = {
                    today: doneCount + upcomingCount,
                    done: doneCount,
                    upcoming: upcomingCount,
                    scheduledTotal,
                }
            }
        } catch (error) {
            console.log("Unable to load site visit stats", error)
        }

        let whatsappConversations = 0
        try {
            const leadIds = unfilteredLeads.map(l => l.id)
            if (leadIds.length > 0) {
                const distinctWALeads = await prisma.whatsAppMessage.findMany({
                    where: {
                        OR: [
                            { userId: authUserId },
                            { leadId: { in: leadIds } }
                        ]
                    },
                    distinct: ["leadId"],
                    select: { leadId: true }
                })
                whatsappConversations = distinctWALeads.length
            }
        } catch (error) {
            console.log("Unable to load whatsapp conversation count", error)
        }

        let callLogsCount = 0
        try {
            const leadIds = unfilteredLeads.map(l => l.id)
            callLogsCount = await prisma.callLog.count({
                where: {
                    OR: [
                        { agentId: authUserId },
                        ...(leadIds.length > 0 ? [{ leadId: { in: leadIds } }] : [])
                    ]
                }
            })
        } catch (error) {
            console.log("Unable to load call log count", error)
        }

        let unreadNotificationsCount = 0
        try {
            unreadNotificationsCount = await prisma.notification.count({
                where: {
                    userId: authUserId,
                    isRead: false
                }
            })
        } catch (error) {
            console.log("Unable to load unread notifications count", error)
        }

        const activeConversations = unfilteredLeads.filter(lead => {
            return (lead._count?.callLogs > 0) || (lead.emails && Array.isArray(lead.emails) && lead.emails.length > 0)
        }).length

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

        const isAdmin = isAdminUser(req)
        const maskedLeads = isAdmin ? leads : leads.map((l) => maskLeadData(l, false))
        const maskedBookings = isAdmin ? bookings : bookings.map((b) => maskBookingData(b, false))
        const maskedTasks = isAdmin ? tasks : tasks.map((t) => maskTaskData(t, false))

        res.status(200).json({
            user:displayUser,
            stats:{
                assignedLeads:unfilteredLeads.length,
                newLeadsToday,
                followupsAll:followupStats.all,
                followupsDue:followupStats.all,
                followupsToday:followupStats.today,
                missedFollowups:followupStats.missed,
                upcomingFollowups:followupStats.upcoming,
                highPriorityFollowups:followupStats.highPriority,
                callbacksDue:followupStats.callbacksDue || 0,
                siteVisits:siteVisitStats.today,
                siteVisitsToday:siteVisitStats.today,
                siteVisitsDone:siteVisitStats.done,
                siteVisitsUpcoming:siteVisitStats.upcoming,
                scheduledVisits:siteVisitStats.scheduledTotal || 0,
                whatsappConversations,
                conversations:activeConversations,
                callLogs:callLogsCount,
                unreadNotifications:unreadNotificationsCount,
                bookings:maskedBookings.length,
                tasks:maskedTasks.length
            },
            leads:maskedLeads,
            bookings:maskedBookings,
            tasks:maskedTasks
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Something went wrong"})
    }
}
exports.getAllUser = async (req, res) => {
    try {
        let conditions = {}

        const roleParam = req.query.role || req.query.roles
        if (roleParam) {
            const roles = String(roleParam).split(",").map(r => r.trim().toUpperCase()).filter(Boolean)
            if (roles.length === 1) {
                conditions.role = roles[0]
            } else if (roles.length > 1) {
                conditions.role = { in: roles }
            }
        }

        const excludeRoleParam = req.query.excludeRole || req.query.excludeRoles
        if (excludeRoleParam) {
            const excluded = String(excludeRoleParam).split(",").map(r => r.trim().toUpperCase()).filter(Boolean)
            if (excluded.length > 0) {
                if (conditions.role && typeof conditions.role === "object" && conditions.role.in) {
                    conditions.role.in = conditions.role.in.filter(r => !excluded.includes(r))
                } else {
                    conditions.role = { notIn: excluded }
                }
            }
        }

        if (req.query.type === "sales" || req.query.scope === "sales") {
            conditions.role = { in: ["SALES", "PRE_SALES", "POST_SALES", "MANAGER", "ADMIN", "AGENT"] }
        } else if (req.query.type === "channel_partner" || req.query.scope === "channel_partner" || req.query.type === "cp") {
            conditions.role = "CHANNEL_PARTNER"
        }

        if (req.query.department) {
            conditions.department = String(req.query.department).trim().toUpperCase()
        }

        if (req.query.isActive !== undefined) {
            conditions.isActive = req.query.isActive === "true" || req.query.isActive === true
        }

        const users = await prisma.user.findMany({
            where: conditions,
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
            },
            orderBy: { firstName: "asc" }
        });

        res.status(200).json({
            count: users.length,
            data: users
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error fetching all users" });
    }
};
