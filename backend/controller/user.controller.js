const bcrypt = require("bcryptjs")
const prisma = require("../lib/prisma")


exports.createUser = async (req, res)=>{
    try {
        const data = {...req.body}
        const nullableFields = ["username", "phone", "secondaryPhone", "linkedUrl", "description", "timeZone"]

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

exports.updateUser = async (req, res)=>{
    try {
        const data = {...req.body}
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const user = await prisma.user.findUnique({where:{id:parseInt(id)}})
        if(!user)
            res.status(400).json("User not found")    

        const nullableFields = ["username", "phone", "secondaryPhone", "linkedUrl", "description", "timeZone"]

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
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
    }
}

exports.deleteUser = async (req, res)=>{
    try {
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const user = await prisma.user.findUnique({where:{id:parseInt(id)}})
        if(!user)
            res.status(400).json("User not found")    

        const deletedUser = await prisma.user.delete({where:{id:user.id}})

        res.status(200).json("User deleted successfully")
        
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
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
                where:{teamId:user.id},
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
                    bookings:true
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

        let bookings = []
        try {
            bookings = await prisma.booking.findMany({
                where:{
                    leadId:{
                        in:leads.map(lead => lead.id)
                    }
                },
                take:10,
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
                followupsDue:leads.filter(lead => lead.status === "Fresh_Lead" || lead.status === "Prospect").length,
                siteVisits:leads.filter(lead => lead.conductSiteVisit).length,
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
