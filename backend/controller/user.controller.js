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
        const data = req.body
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const user = await prisma.user.findUnique({where:{id:parseInt(id)}})
        if(!user)
            res.status(400).json("User not found")    

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
        const user = await prisma.user.findUnique({
            where:{id:Number(req.authUser.id)},
            include:{team:true}
        })

        if(!user){
            return res.status(404).json({message:"User not found"})
        }

        const leads = await prisma.lead.findMany({
            where:{
                teamId:user.id
            },
            take:25,
            orderBy:{id:"desc"},
            include:{bookings:true}
        })

        const bookings = await prisma.booking.findMany({
            take:10,
            orderBy:{createdAt:"desc"}
        })

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS Task (
              id INT NOT NULL AUTO_INCREMENT,
              title VARCHAR(255) NOT NULL,
              description TEXT NULL,
              remark TEXT NULL,
              type VARCHAR(80) NULL DEFAULT 'Follow up',
              status VARCHAR(40) NOT NULL DEFAULT 'Open',
              priority VARCHAR(40) NOT NULL DEFAULT 'Medium',
              dueDate DATETIME NULL,
              dueTime VARCHAR(40) NULL,
              assigneeId INT NULL,
              assigneeName VARCHAR(255) NULL,
              assignedById INT NULL,
              assignedByName VARCHAR(255) NULL,
              attachments JSON NULL,
              createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              INDEX Task_assigneeId_idx (assigneeId),
              INDEX Task_status_idx (status)
            )
        `)

        const tasks = await prisma.$queryRawUnsafe(
            "SELECT * FROM Task WHERE assigneeId = ? ORDER BY createdAt DESC LIMIT 25",
            user.id
        )

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
            tasks:tasks.map(task => ({
                id:task.id,
                title:task.title,
                description:task.description,
                subtitle:task.remark || task.type || "",
                type:task.type || "Follow up",
                status:task.status || "Open",
                priority:task.priority || "Medium",
                dueDate:task.dueDate,
                dueOn:task.dueDate,
                dueTime:task.dueTime,
                assigneeId:task.assigneeId,
                assignedTo:task.assigneeName,
                assignedBy:task.assignedByName,
                createdAt:task.createdAt,
                createdOn:task.createdAt
            }))
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
