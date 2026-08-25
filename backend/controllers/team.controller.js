const prisma = require("../lib/prisma")


exports.createTeam = async (req, res)=>{
    try {
        const data = req.body

        const team = await prisma.team.create({data:data})

        res.status(201).json({
            "id":team.id,
            "message":"team created successfully"
        })

    } catch (error) {
        console.log(error);
        
        res.status(500).json("Something went wrong")
    }
}


exports.getTeam  = async (req, res)=>{
    try{
        const {id}  = req.params

        if(id){
            const result = await prisma.team.findUnique({where:{id:Number(id)}})
            if(!result)
                res.status(200).json("Team not found")
            else{
                res.status(200).json(result)
            }
        }
        else{
            let conditions = {}
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 10
            
            const skip = (page-1)*limit

            const totalItems = await prisma.team.count({where:conditions})

            const result = await prisma.team.findMany({
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

exports.updateTeam = async (req, res)=>{
    try {
        const data = req.body
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const team = await prisma.team.findUnique({where:{id:parseInt(id)}})
        if(!team)
            res.status(400).json("Team not found")    

        const teamUpdate = await  prisma.team.update({
            where:{id:parseInt(team.id)},
            data:data
        })

        res.status(200).json(teamUpdate)
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
    }
}

exports.deleteTeam = async (req, res)=>{
    try {
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const team = await prisma.team.findUnique({where:{id:parseInt(id)}})
        if(!team)
            res.status(400).json("Team not found")    

        const deletedTeam = await prisma.team.delete({where:{id:team.id}})

        res.status(200).json("Team deleted successfully")
        
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
    }
}