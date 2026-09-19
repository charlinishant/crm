const prisma = require("../lib/prisma")

const toPositiveInt = (value) => {
    if(value === undefined || value === null || value === "") return null
    const number = Number(value)
    return Number.isInteger(number) && number > 0 ? number : null
}

const getTowerErrorMessage = (error, fallback = "Unable to process tower request") => {
    if(!error) return fallback
    if(error.statusCode && error.message) return error.message
    if(error.code === "P2003") return "Selected project was not found."
    if(error.code === "P2025") return "Tower not found"
    return fallback
}

const towerSelect = {
    id:true,
    name:true,
    projectId:true,
    totalFloor:true,
    reraTowerId:true,
    image:true,
    elevationPhoto:true,
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

const formatTowerResponse = (tower) => {
    if(!tower || typeof tower !== "object") return tower

    return {
        id: tower.id,
        name: tower.name,
        towerName: tower.name,
        projectId: tower.projectId,
        projectName: tower.project?.name || "",
        totalFloor: tower.totalFloor,
        totalFloors: tower.totalFloor,
        reraTowerId: tower.reraTowerId,
        image: tower.image || tower.elevationPhoto || null,
        elevationPhoto: tower.elevationPhoto || tower.image || null,
        project: tower.project,
        floorPlanCount: tower._count?.floors ?? 0,
        unitCount: tower._count?.units ?? 0,
        _count: tower._count,
    }
}

const buildTowerPayload = (body = {}, { requireRequiredFields = false } = {}) => {
    const data = {}

    const rawName = body.name ?? body.towerName
    if(rawName !== undefined){
        data.name = String(rawName || "").trim()
    }

    const rawProjectId = body.projectId ?? body.project
    if(rawProjectId !== undefined){
        const projectId = toPositiveInt(rawProjectId)
        if(projectId){
            data.projectId = projectId
        }
        else if(rawProjectId !== null && rawProjectId !== ""){
            const error = new Error("Please select a valid project.")
            error.statusCode = 400
            throw error
        }
    }

    const rawTotalFloor = body.totalFloor ?? body.totalFloors
    if(rawTotalFloor !== undefined && rawTotalFloor !== null && rawTotalFloor !== ""){
        data.totalFloor = Number(rawTotalFloor)
        if(!Number.isInteger(data.totalFloor) || data.totalFloor < 1){
            const error = new Error("Total Floors must be at least 1.")
            error.statusCode = 400
            throw error
        }
    }

    const rawReraTowerId = body.reraTowerId ?? body.reraId
    if(rawReraTowerId !== undefined){
        data.reraTowerId = String(rawReraTowerId || "").trim() || null
    }

    const rawImage = body.image ?? body.elevationPhoto
    if(rawImage !== undefined){
        data.image = String(rawImage || "").trim() || null
        data.elevationPhoto = String(rawImage || "").trim() || null
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

const syncProjectTowerCount = async (projectId, tx = prisma) => {
    if (!projectId) return
    try {
        const count = await tx.tower.count({ where: { projectId: Number(projectId) } })
        await tx.project.update({
            where: { id: Number(projectId) },
            data: { noOfTowers: count }
        })
    } catch (e) {
        console.warn("Failed to sync project noOfTowers:", e.message)
    }
}

exports.createTower = async (req, res)=>{
    try {
        const data = buildTowerPayload(req.body, { requireRequiredFields: true })
        if (!data.projectId) {
            return res.status(400).json({ success:false, message: "Please select a project." })
        }

        if (!(await projectExists(data.projectId))) {
            return res.status(404).json({ success:false, message: "Project not found" })
        }

        const tower = await prisma.tower.create({
            data:data,
            select:towerSelect
        })
        await syncProjectTowerCount(data.projectId)
        const formattedTower = formatTowerResponse(tower)

        res.status(201).json({
            success:true,
            id:tower.id,
            message:"Tower created successfully",
            data:formattedTower
        })

    } catch (error) {
        console.error("Create tower error:", error);
        if(error.statusCode){
            return res.status(error.statusCode).json({ success:false, message: error.message })
        }
        
        res.status(500).json({ success:false, message: getTowerErrorMessage(error) })
    }
}

exports.getTower  = async (req, res)=>{
    try{
        const {id}  = req.params

        if(id){
            const result = await prisma.tower.findUnique({
                where:{id:Number(id)},
                select:towerSelect
            })
            if(!result)
                res.status(404).json({ success:false, message: "Tower not found" })
            else{
                res.status(200).json(formatTowerResponse(result))
            }
        }
        else{
            let conditions = {}
            if (req.query.projectId) {
                const projectId = toPositiveInt(req.query.projectId)
                if(!projectId){
                    return res.status(400).json({ success:false, message:"Please select a valid project." })
                }
                conditions.projectId = projectId
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
                select:towerSelect
            })

            let context = {
                page:page,
                limit:limit,
                totalItems:totalItems,
                data:result.map(formatTowerResponse)
            }
            res.status(200).json(context)
        }
    }
    catch(error){
        console.error("Load towers error:", error);
        res.status(500).json({ success:false, message: getTowerErrorMessage(error) })
    }
}

exports.updateTower = async (req, res)=>{
    try {
        const data = buildTowerPayload(req.body)
        const id = req.params.id
        if(!id)
            return res.status(400).json({ success:false, message: "ID is required" })

        if(data.projectId === null || data.projectId === ""){
            return res.status(400).json({ success:false, message: "Tower must remain linked to a project." })
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
            return res.status(404).json({ success:false, message: "Tower not found" })

        const oldProjectId = record.projectId

        if(data.projectId !== undefined && Number(data.projectId) !== Number(record.projectId)){
            if (!(await projectExists(data.projectId))) {
                return res.status(404).json({ success:false, message: "Project not found" })
            }

            if(record._count.floors || record._count.units){
                return res.status(409).json({
                    success:false,
                    message:"Cannot move tower to another project because floor plans or units exist under it."
                })
            }
        }

        const floorPlanValidationError = await validateTowerTotalFloorAgainstFloorPlans(record.id, data.totalFloor)
        if(floorPlanValidationError){
            return res.status(400).json({ success:false, message: floorPlanValidationError })
        }

        const result = await  prisma.tower.update({
            where:{id:parseInt(record.id)},
            data:data,
            select:towerSelect
        })

        if(data.projectId && Number(data.projectId) !== Number(oldProjectId)){
            await syncProjectTowerCount(oldProjectId)
            await syncProjectTowerCount(data.projectId)
        }

        res.status(200).json({
            success:true,
            message:"Tower updated successfully",
            data:formatTowerResponse(result)
        })
    } catch (error) {
        console.error("Update tower error:", error);
        if(error.statusCode){
            return res.status(error.statusCode).json({ success:false, message: error.message })
        }
        res.status(500).json({ success:false, message: getTowerErrorMessage(error) })
    }
}

exports.deleteTower = async (req, res)=>{
    try {
        const id = req.params.id
        if(!id)
            return res.status(400).json({ success:false, message:"ID is required" })    

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
            return res.status(404).json({ success:false, message:"Tower not found" })

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
                success:false,
                message:`Cannot delete tower because ${bookingCount} booking${bookingCount === 1 ? "" : "s"} exist under it.`
            })
        }

        const unitModels = record.units.flatMap((unit) => unit.unitList || [])
        const nonAvailableUnit = unitModels.find((unit) => unit.status && unit.status !== "Available")
        if(nonAvailableUnit){
            return res.status(409).json({
                success:false,
                message:`Cannot delete tower because unit ${nonAvailableUnit.name || nonAvailableUnit.id} is ${nonAvailableUnit.status}. Only available generated units can be deleted with the tower.`
            })
        }

        const unitIds = record.units.map((unit) => unit.id)
        const unitModelIds = unitModels.map((unit) => unit.id)
        const floorPlanIds = record.floors.map((floor) => floor.id)
        const projectId = record.projectId

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
            await syncProjectTowerCount(projectId, tx)
        })

        res.status(200).json({ success:true, message:"Tower deleted successfully" })
        
    } catch (error) {
        console.error("Delete tower error:", error);
        res.status(500).json({ success:false, message:getTowerErrorMessage(error, "Unable to delete tower") })
    }
}

exports.listTower = async (req, res)=>{
    try {
        const where = {}
        if(req.query.projectId){
            const projectId = toPositiveInt(req.query.projectId)
            if(!projectId){
                return res.status(400).json({ success:false, message:"Please select a valid project." })
            }
            where.projectId = projectId
        }

        const record = await prisma.tower.findMany({
            where,
            orderBy:{id:"desc"},
            select:towerSelect
        })
        res.status(200).json({
            success:true,
            data:record.map(formatTowerResponse)
        })
    } catch (error) {
        console.error("Tower list API failed:", error)
        res.status(500).json({
            success:false,
            message:getTowerErrorMessage(error)
        })
    }
}
