const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const prisma = require("../lib/prisma");

const normalizeRole = (role) => {
    const value = String(role || "").trim().toUpperCase()
    if(value === "SALESPERSON") return "SALES"

    const allowedRoles = new Set([
        "PRE_SALES",
        "SALES",
        "POST_SALES",
        "MANAGER",
        "ADMIN",
        "AGENCY_USER",
        "AGENT",
        "CHANNEL_PARTNER",
    ])

    return allowedRoles.has(value) ? value : "SALES"
}

const normalizeDepartment = (department, role) => {
    const value = String(department || role || "").trim().toUpperCase()
    const allowedDepartments = new Set(["PRE_SALES", "SALES", "POST_SALES"])

    return allowedDepartments.has(value) ? value : null
}

const startOrResumeAttendance = async (userId) => {
    const now = new Date()
    const attendance = await prisma.userAttendance.findFirst({
        where:{userId, logoutAt: null},
        orderBy:{loginAt:"desc"}
    })

    if(attendance){
        return prisma.userAttendance.update({
            where:{id:attendance.id},
            data:{
                status: attendance.status || "Available"
            }
        })
    }

    return prisma.userAttendance.create({
        data:{
            userId,
            status:"Available",
            loginAt:now
        }
    })
}

exports.register = async (req, res)=>{
    try{
        const {email, username, password, role, firstName, lastName, phone, department} = req.body;
        const normalizedEmail = String(email || "").trim().toLowerCase()
        
        if(!normalizedEmail){
            return res.status(400).json({"message":"Email is required"})
        }

        const existUser = await prisma.user.findUnique({where:{email: normalizedEmail}})

        if(existUser){
            return res.status(400).json({"message":"User already exist"})
        }

        if(!password || String(password).length < 8){
            return res.status(400).json({"message":"password should be minimum eight letter long"})
        }

        const hashPassword = await bcrypt.hash(password, 10)
        const normalizedRole = normalizeRole(role)

        const user = await prisma.user.create({data:{
            email:normalizedEmail,
            username:username || null,
            password:hashPassword,
            role:normalizedRole,
            firstName:firstName || null,
            lastName:lastName || null,
            phone:phone || null,
            department:normalizeDepartment(department, normalizedRole),
        }})

        res.status(201).json({"message":"User register successfully", "id":user.id})

    }
    catch(err){
        console.log(err);
        
        res.status(500).json("Something went wrong");
    }
}

exports.login = async (req, res)=>{
    try{
        const {email, password} = req.body
        const normalizedEmail = String(email || "").trim().toLowerCase()

        const user = await prisma.user.findUnique({where:{email: normalizedEmail}})
        if(!user){
            return res.status(404).json({"message":"User not found"})
        }

        if(user.isActive === false){
            return res.status(403).json({"message":"This user account is inactive"})
        }

        if(!user.password){
            return res.status(400).json({"message":"Password is not set for this user"})
        }

        const isBcryptPassword = String(user.password).startsWith("$2")
        const isMatch = isBcryptPassword
            ? await bcrypt.compare(password,  user.password)
            : password === user.password
        
        if(!isMatch){
            return res.status(404).json({"message":"Invalid password"})
        }

        if(!isBcryptPassword){
            await prisma.user.update({
                where:{id:user.id},
                data:{password:await bcrypt.hash(password, 10)}
            })
        }
        const token = jwt.sign({id:user.id, email:user.email, role:user.role}, 
                                process.env.JWT_SECRET,
                            {expiresIn:"1h"})
        await startOrResumeAttendance(user.id)

        const data = {
            "id":user.id,
            "username":user.username,
            "firstName":user.firstName,
            "lastName":user.lastName,
            "email":user.email,
            "phone":user.phone,
            "role":user.role,
            "department":user.department,
            "teamId":user.teamId
        }
        res.status(200).json({"message":"Success", "token":token, "data":data})
    }
    catch(err){
        console.log(err);
        res.status(500).json("Something went wrong");
    }
}
