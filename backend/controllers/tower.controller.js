const prisma = require("../lib/prisma")

const buildTowerPayload = (body = {}, { requireRequiredFields = false } = {}) => {
    const data = {}

    if("name" in body){
        data.name = String(body.name || "").trim()
    }

    if("projectId" in body){
        data.projectId = Number(body.projectId)
    }

    if("totalFloor" in body){
        data.totalFloor = Number(body.totalFloor)
        if(!Number.isInteger(data.totalFloor) || data.totalFloor < 1){
            const error = new Error("Total Floors must be at least 1.")
            error.statusCode = 400
            throw error
        }
    }

    if("reraTowerId" in body){
        data.reraTowerId = String(body.reraTowerId || "").trim() || null
    }

    if(requireRequiredFields){
        if(!data.name){
            const error = new Error("Tower Name is required.")
            error.statusCode = 400
            throw error
        }

        if(!data.projectId){
            const error = new Error("Project is required before creating a tower.")
            error.statusCode = 400
            throw error
        }

        if(!Number.isInteger(data.totalFloor) || data.totalFloor < 1){
            const error = new Error("Total Floors must be at least 1.")
            error.statusCode = 400
            throw error
        }
    }

    return data
}

const validateTowerTotalFloorAgainstFloorPlans = async (towerId, totalFloor) => {
    if (!Number.isInteger(totalFloor)) return null

    const floorPlanBounds = await prisma.floorPlan.aggregate({
        where: { towerId },
        _max: { applicableFloorTo: true },
    })

    const maxApplicableFloorTo = floorPlanBounds._max.applicableFloorTo
    if (maxApplicableFloorTo !== null && totalFloor < maxApplicableFloorTo) {
        return `Total Floors cannot be less than existing floor plans' Applicable Floor To (${maxApplicableFloorTo}).`
    }

    return null
}

const projectExists = async (projectId) => {
    if(!projectId) return false

    const project = await prisma.project.findUnique({
        where:{id:Number(projectId)},
        select:{id:true},
    })

    return Boolean(project)
}

exports.createTower = async (req, res)=>{
    try {
        const data = buildTowerPayload(req.body, { requireRequiredFields: true })
        if (!data.projectId) {
            return res.status(400).json({ message: "Project is required before creating a tower." })
        }

        if (!(await projectExists(data.projectId))) {
            return res.status(400).json({ message: "Selected project was not found." })
        }

        const tower = await prisma.tower.create({data:data})

        res.status(201).json({
            "id":tower.id,
            "message":"tower created successfully"
        })

    } catch (error) {
        console.log(error);
        if(error.statusCode){
            return res.status(error.statusCode).json({ message: error.message })
        }
        
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
            if (req.query.projectId) {
                conditions.projectId = parseInt(req.query.projectId)
            }
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 10
            
            const skip = (page-1)*limit

            const totalItems = await prisma.tower.count({where:conditions})

            const result = await prisma.tower.findMany({
                where:conditions,
                skip:skip,
                take:limit,
                orderBy:{id:"desc"},
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
                 },
                 _count:{
                    select:{
                    floors:true,
                    units:true
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
        const data = buildTowerPayload(req.body)
        const id = req.params.id
        if(!id)
            return res.status(400).json("ID is required")

        if(data.projectId === null || data.projectId === ""){
            return res.status(400).json({ message: "Tower must remain linked to a project." })
        }

        const record = await prisma.tower.findUnique({
            where:{id:parseInt(id)},
            include:{
                floors:{ select:{ id:true } },
                units:{
                    select:{
                        id:true,
                        unitList:{
                            select:{
                                id:true,
                                name:true,
                                status:true,
                            },
                        },
                    },
                },
                _count:{ select:{ floors:true, units:true } },
            },
        })
        if(!record)
            return res.status(400).json("Tower not found")

        if(data.projectId !== undefined && Number(data.projectId) !== Number(record.projectId)){
            if (!(await projectExists(data.projectId))) {
                return res.status(400).json({ message: "Selected project was not found." })
            }

            if(record._count.floors || record._count.units){
                return res.status(409).json({
                    message:"Cannot move tower to another project because floor plans or units exist under it."
                })
            }
        }

        const floorPlanValidationError = await validateTowerTotalFloorAgainstFloorPlans(record.id, data.totalFloor)
        if(floorPlanValidationError){
            return res.status(400).json({ message: floorPlanValidationError })
        }

        const result = await  prisma.tower.update({
            where:{id:parseInt(record.id)},
            data:data
        })

        res.status(200).json(result)
    } catch (error) {
        console.log(error);
        if(error.statusCode){
            return res.status(error.statusCode).json({ message: error.message })
        }
        res.status(500).json("Something went wrong")
    }
}

exports.deleteTower = async (req, res)=>{
    try {
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const record = await prisma.tower.findUnique({
            where:{id:parseInt(id)},
            include:{
                floors:{ select:{ id:true } },
                units:{
                    select:{
                        id:true,
                        unitList:{
                            select:{
                                id:true,
                                name:true,
                                status:true,
                            },
                        },
                    },
                },
                _count:{ select:{ floors:true, units:true } },
            },
        })
        if(!record)
            return res.status(400).json("Tower not found")

        const bookingCount = await prisma.booking.count({
            where: {
                OR: [
                    { unit: { is: { towerId: record.id } } },
                    { unitItem: { is: { unit: { is: { towerId: record.id } } } } },
                ],
            },
        })
        if(bookingCount){
            return res.status(409).json({
                message:`Cannot delete tower because ${bookingCount} booking${bookingCount === 1 ? "" : "s"} exist under it.`
            })
        }

        const unitModels = record.units.flatMap((unit) => unit.unitList || [])
        const nonAvailableUnit = unitModels.find((unit) => unit.status && unit.status !== "Available")
        if(nonAvailableUnit){
            return res.status(409).json({
                message:`Cannot delete tower because unit ${nonAvailableUnit.name || nonAvailableUnit.id} is ${nonAvailableUnit.status}. Only available generated units can be deleted with the tower.`
            })
        }

        const unitIds = record.units.map((unit) => unit.id)
        const unitModelIds = unitModels.map((unit) => unit.id)
        const floorPlanIds = record.floors.map((floor) => floor.id)

        await prisma.$transaction(async (tx) => {
            if(unitModelIds.length){
                await tx.unitModel.deleteMany({ where:{ id:{ in:unitModelIds } } })
            }
            if(unitIds.length){
                await tx.unit.deleteMany({ where:{ id:{ in:unitIds } } })
            }
            await tx.floorPlanSlot.deleteMany({ where:{ towerId:record.id } })
            if(floorPlanIds.length){
                await tx.floorPlan.deleteMany({ where:{ id:{ in:floorPlanIds } } })
            }
            await tx.tower.delete({ where:{ id:record.id } })
        })

        res.status(200).json("Tower deleted successfully")
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ message:error.message || "Unable to delete tower" })
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
            name:true,
            totalFloor:true,
            reraTowerId:true
    }})
        res.status(200).json(record)
    }
    else{
        const record = await prisma.tower.findMany({select:{
            id:true,
            name:true,
            totalFloor:true,
            reraTowerId:true
        }})
        res.status(200).json(record)
    }   
}
