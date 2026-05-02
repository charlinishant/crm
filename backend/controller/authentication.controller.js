const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const prisma = require("../lib/prisma");

exports.register = async (req, res)=>{
    try{
        const {email, username, password, role} = req.body;
        
        const existUser = await prisma.user.findUnique({where:{email}})

        if(existUser){
            res.status(400).json({"message":"User already exist"})
        }

        if(!password.length>=8){
            res.status(400).json({"message":"password should be minimum eight letter long"})
        }

        const hashPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({data:{
            email:email,
            username:username,
            password:hashPassword,
            role:role
        }})

        res.status(201).json({"message":"User register successfully"})

    }
    catch(err){
        console.log(err);
        
        res.status(500).json("Something went wrong");
    }
}

exports.login = async (req, res)=>{
    try{
        const {email, password} = req.body

        const user = await prisma.user.findUnique({where:{email}})
        if(!user){
            return res.status(404).json({"message":"User not found"})
        }

        const isMatch = await bcrypt.compare(password,  user.password)
        
        if(!isMatch){
            return res.status(404).json({"message":"Invalid password"})
        }
        const token = jwt.sign({email:user.email}, 
                                process.env.JWT_SECRET,
                            {expiresIn:"1h"})
        const data = {
            "id":user.id,
            "username":user.username,
            "firstName":user.firstName,
            "lastName":user.lastName,
            "role":user.role
        }
        res.status(200).json({"message":"Success", "token":token, "data":data})
    }
    catch(err){
        console.log(err);
        res.status(500).json("Something went wrong");
    }
}