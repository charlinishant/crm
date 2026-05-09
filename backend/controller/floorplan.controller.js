const prisma = require("../lib/prisma")


exports.createFloor = async (req, res)=>{
    try {
        const data = req.body

        const record = await prisma.floorPlan.create({data:data})

        res.status(201).json({
            "id":record.id,
            "message":"floor plan created successfully"
        })

    } catch (error) {
        console.log(error);
        
        res.status(500).json("Something went wrong")
    }
}

exports.getFloor  = async (req, res)=>{
    try{
        const {id}  = req.params

        if(id){
            const result = await prisma.floorPlan.findUnique({where:{id:Number(id)}})
            if(!result)
                res.status(200).json("Floor plan not found")
            else{
                res.status(200).json(result)
            }
        }
        else{
            let conditions = {}
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 10
            
            const skip = (page-1)*limit

            const totalItems = await prisma.floorPlan.count({where:conditions})

            const result = await prisma.floorPlan.findMany({
                where:conditions,
                skip:skip,
                take:limit,
                select:{
                    id:true,
                    name:true,
                    project:{
                        select:{
                            id:true,
                            name:true
                        }
                    },
                    tower:{
                        select:{
                            id:true,
                            name:true
                        }
                    },
                    type:true,
                    category:true,
                    bedrooms:true,
                    bathrooms:true,
                    carpet:true,
                    saleable:true,
                    measure:true,
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

exports.updateFloor = async (req, res)=>{
    try {
        const data = req.body
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const record = await prisma.floorPlan.findUnique({where:{id:parseInt(id)}})
        if(!record)
            res.status(400).json("Floor plan not found")    

        const result = await  prisma.floorPlan.update({
            where:{id:parseInt(record.id)},
            data:data
        })

        res.status(200).json(result)
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
    }
}

exports.deleteFloor = async (req, res)=>{
    try {
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const record = await prisma.floorPlan.findUnique({where:{id:parseInt(id)}})
        if(!record)
            res.status(400).json("Floor plan not found")    

        const data = await prisma.floorPlan.delete({where:{id:record.id}})

        res.status(200).json("Floor plan deleted successfully")
        
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
    }
}

exports.listFloor = async (req, res)=>{
    const towerId =  req.query.towerId || null
    if(towerId)
    {
        const record = await prisma.floorPlan.findMany({
            where:{towerId:parseInt(towerId)},
        select:{
            id:true,
            name:true
    }})
        res.status(200).json(record)
    }
    else{
        const record = await prisma.floorPlan.findMany({select:{
            id:true,
            name:true
        }})
        res.status(200).json(record)
    }   
}
