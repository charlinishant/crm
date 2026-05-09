const prisma = require("../lib/prisma")


exports.createTower = async (req, res)=>{
    try {
        const data = req.body

        const tower = await prisma.tower.create({data:data})

        res.status(201).json({
            "id":tower.id,
            "message":"tower created successfully"
        })

    } catch (error) {
        console.log(error);
        
        res.status(500).json("Something went wrong")
    }
}

exports.getTower  = async (req, res)=>{
    try{
        const {id}  = req.params

        if(id){
            const result = await prisma.tower.findUnique({where:{id:Number(id)}})
            if(!result)
                res.status(200).json("Tower not found")
            else{
                res.status(200).json(result)
            }
        }
        else{
            let conditions = {}
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 10
            
            const skip = (page-1)*limit

            const totalItems = await prisma.tower.count({where:conditions})

            const result = await prisma.tower.findMany({
                where:conditions,
                skip:skip,
                take:limit,
                select:{
                id:true,
                 name: true,
                 totalFloor: true,
                 reraTowerId: true,
                 project:{
                    select:{
                    id:true,
                    name:true
                    }
                 }
                }
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
        res.status(500).json("something went wrong")
    }
}

exports.updateTower = async (req, res)=>{
    try {
        const data = req.body
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const record = await prisma.tower.findUnique({where:{id:parseInt(id)}})
        if(!record)
            res.status(400).json("Tower not found")    

        const result = await  prisma.tower.update({
            where:{id:parseInt(record.id)},
            data:data
        })

        res.status(200).json(result)
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
    }
}

exports.deleteTower = async (req, res)=>{
    try {
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const record = await prisma.tower.findUnique({where:{id:parseInt(id)}})
        if(!record)
            res.status(400).json("Tower not found")    

        const data = await prisma.tower.delete({where:{id:record.id}})

        res.status(200).json("Team deleted successfully")
        
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
    }
}

exports.listTower = async (req, res)=>{
    const projectId =  req.query.projectId || null
    if(projectId)
    {
        const record = await prisma.tower.findMany({
            where:{projectId:parseInt(projectId)},
        select:{
            id:true,
            name:true
    }})
        res.status(200).json(record)
    }
    else{
        const record = await prisma.tower.findMany({select:{
            id:true,
            name:true
        }})
        res.status(200).json(record)
    }   
}