const fs = require("fs")
const path = require("path")
const prisma = require("../lib/prisma")

const saveMediaFile = (dataOrUrl, subfolder = "projects") => {
    if (!dataOrUrl || typeof dataOrUrl !== "string") return dataOrUrl
    const trimmed = dataOrUrl.trim()
    if (!trimmed.startsWith("data:image/")) return trimmed

    try {
        const commaIndex = trimmed.indexOf(",")
        if (commaIndex === -1) return trimmed

        const metaPart = trimmed.substring(0, commaIndex)
        const base64Data = trimmed.substring(commaIndex + 1)

        let ext = "jpg"
        const typeMatch = metaPart.match(/data:image\/([a-zA-Z0-9+]+)/)
        if (typeMatch) {
            ext = typeMatch[1].toLowerCase()
            if (ext === "jpeg") ext = "jpg"
            if (ext === "svg+xml") ext = "svg"
        }

        const dirPath = path.join(__dirname, "..", "uploads", subfolder)
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
        }

        const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
        const filePath = path.join(dirPath, filename)
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"))

        return `/uploads/${subfolder}/${filename}`
    } catch (err) {
        console.error("Error saving base64 image:", err)
        return trimmed
    }
}

const withGeneratedUnitCounts = async (projects) => {
    const rows = Array.isArray(projects) ? projects : [projects]
    const projectIds = rows.map((project) => project?.id).filter((id) => Number.isInteger(Number(id)))
    if(!projectIds.length) return projects

    const unitGroups = await prisma.unit.findMany({
        where:{ projectId:{ in:projectIds.map(Number) } },
        select:{ id:true, projectId:true },
    })
    const unitGroupProjectById = new Map(unitGroups.map((unit) => [unit.id, unit.projectId]))

    const unitModels = await prisma.unitModel.findMany({
        where: { unitId: { in: unitGroups.map((u) => u.id) } },
        select: { id: true, unitId: true, status: true, propertyPurpose: true }
    })

    const statsByProject = new Map(projectIds.map((id) => [Number(id), {
        generatedUnitCount: 0,
        availableUnits: 0,
        soldUnits: 0,
        rehabUnits: 0,
        heldUnits: 0,
        blockedUnits: 0
    }]))

    unitModels.forEach(model => {
        const projectId = unitGroupProjectById.get(model.unitId)
        if (projectId) {
            const stats = statsByProject.get(projectId)
            stats.generatedUnitCount += 1
            
            const purpose = String(model.propertyPurpose || '').toLowerCase()
            const status = String(model.status || '').toLowerCase()

            if (purpose.includes('rehab')) {
                stats.rehabUnits += 1
            } else {
                if (status === 'available' || status === 'vacant') {
                    stats.availableUnits += 1
                } else if (['booked', 'registered', 'possession_given', 'possession', 'sold'].includes(status)) {
                    stats.soldUnits += 1
                } else if (status === 'held') {
                    stats.heldUnits += 1
                } else if (['blocked', 'block', 'investor'].includes(status)) {
                    stats.blockedUnits += 1
                } else {
                    stats.availableUnits += 1 // fallback
                }
            }
        }
    })

    const attachCount = (project) => ({
        ...project,
        generatedUnitCount: statsByProject.get(Number(project.id))?.generatedUnitCount || 0,
        availableUnits: statsByProject.get(Number(project.id))?.availableUnits || 0,
        soldUnits: statsByProject.get(Number(project.id))?.soldUnits || 0,
        rehabUnits: statsByProject.get(Number(project.id))?.rehabUnits || 0,
        heldUnits: statsByProject.get(Number(project.id))?.heldUnits || 0,
        blockedUnits: statsByProject.get(Number(project.id))?.blockedUnits || 0,
    })

    return Array.isArray(projects) ? rows.map(attachCount) : attachCount(projects)
}

const projectSalesInclude = {
    salesUsers: {
        include: {
            user: {
                select: {
                    id:true,
                    firstName:true,
                    lastName:true,
                    username:true,
                    email:true,
                    role:true
                }
            }
        }
    },
    _count: {
        select: {
            tower: true,
            floor: true,
            unit: true,
        }
    }
}

const normalizeSalesIds = (salesIds, fallbackSalesId) => {
    const values = Array.isArray(salesIds)
        ? salesIds
        : fallbackSalesId !== undefined && fallbackSalesId !== null
            ? [fallbackSalesId]
            : []

    return [...new Set(values.map(Number).filter(Number.isInteger))]
}

const assertProjectModelRules = (data) => {
    if(data.active === true && data.inventory !== true){
        const error = new Error("Project cannot be Active until Inventory is Yes.")
        error.statusCode = 400
        throw error
    }
}

const formatProject = (project) => {
    if(!project) return project

    const assignments = Array.isArray(project.salesUsers) ? project.salesUsers : []
    const unitCount = project.generatedUnitCount ?? project._count?.unit ?? 0
    return {
        ...project,
        noOfTowers: project._count?.tower ?? 0,
        towerCount: project._count?.tower ?? 0,
        floorPlanCount: project._count?.floor ?? 0,
        unitCount,
        availableUnits: project.availableUnits ?? 0,
        soldUnits: project.soldUnits ?? 0,
        rehabUnits: project.rehabUnits ?? 0,
        heldUnits: project.heldUnits ?? 0,
        blockedUnits: project.blockedUnits ?? 0,
        inventory: unitCount > 0,
        active: unitCount > 0 ? project.active : false,
        salesIds:assignments.map((assignment) => assignment.userId),
        salesUsers:assignments.map((assignment) => assignment.user)
    }
}

exports.createProject = async (req, res)=>{
    try{
        const {salesIds, ...data} = req.body
        delete data.noOfTowers
        const normalizedSalesIds = normalizeSalesIds(salesIds, data.salesId)
        data.salesId = normalizedSalesIds[0] || null
        data.inventory = false
        data.active = false
        assertProjectModelRules(data, normalizedSalesIds)

        if (data.elevationPhoto) {
            data.elevationPhoto = saveMediaFile(data.elevationPhoto, "projects");
        }
        if (data.image) {
            if (data.elevationPhoto && (data.image === req.body.elevationPhoto || data.image === data.elevationPhoto)) {
                data.image = data.elevationPhoto;
            } else {
                data.image = saveMediaFile(data.image, "projects");
            }
        }
        if (data.elevationPhoto && !data.image) data.image = data.elevationPhoto;
        if (data.image && !data.elevationPhoto) data.elevationPhoto = data.image;

        const project = await prisma.project.create({
            data:{
                ...data,
                salesUsers: normalizedSalesIds.length ? {
                    create:normalizedSalesIds.map((userId) => ({
                        user:{connect:{id:userId}}
                    }))
                } : undefined
            },
            include:projectSalesInclude
        })
        res.status(201).json(formatProject(await withGeneratedUnitCounts(project)))
    }
    catch(err)
    {
        console.error("Create project error:", err)
        if(err.statusCode){
            return res.status(err.statusCode).json({ message: err.message })
        }
        res.status(500).json({ message: err.message || "Failed to create project" })
    }
}

exports.getProject = async (req, res)=>{
    try{
        const projects = await prisma.project.findMany({where:{ deletedAt:null }, include:projectSalesInclude});
        const projectsWithUnitCounts = await withGeneratedUnitCounts(projects)
        res.status(200).json(projectsWithUnitCounts.map(formatProject))
    }
    catch(err)
    {
        console.error("Get projects error:", err);
        if(err.statusCode){
            return res.status(err.statusCode).json({ message: err.message })
        }
        res.status(500).json({ message: err.message || "Failed to fetch projects" })
    }
}

exports.getProjectById = async (req, res)=>{
    try{
        const id = req.params.id
        const project = await prisma.project.findUnique({
            where:{id:Number(id)},
            include:projectSalesInclude
        });
        if(!project)
            return res.status(404).json({ message: "Project not found" })
        res.status(200).json(formatProject(await withGeneratedUnitCounts(project)))
    }
    catch(err)
    {
        console.error("Get project by ID error:", err);
        res.status(500).json({ message: err.message || "Failed to fetch project" })
    }
}

exports.updateProject = async (req, res)=>{
    try{
        const id = req.params.id
        const {salesIds, ...data} = req.body
        delete data.noOfTowers
        const project = await prisma.project.findUnique({
            where:{id:Number(id)},
            include:{ _count:{ select:{ unit:true } } }
        });
        if(!project)
            return res.status(404).json({ message: "Project not found" })

        const derivedInventory = (project._count?.unit ?? 0) > 0
        delete data.inventory
        if(data.active === true && !derivedInventory){
            return res.status(400).json({ message:"Project cannot be Active until Inventory is Yes." })
        }
        
        if(salesIds !== undefined){
            const normalizedSalesIds = normalizeSalesIds(salesIds, data.salesId)
            assertProjectModelRules({ ...data, inventory: derivedInventory }, normalizedSalesIds)
            data.salesId = normalizedSalesIds[0] || null
            data.salesUsers = {
                deleteMany:{},
                create:normalizedSalesIds.map((userId) => ({
                    user:{connect:{id:userId}}
                }))
            }
        }

        if (data.elevationPhoto) {
            data.elevationPhoto = saveMediaFile(data.elevationPhoto, "projects");
        }
        if (data.image) {
            if (data.elevationPhoto && (data.image === req.body.elevationPhoto || data.image === data.elevationPhoto)) {
                data.image = data.elevationPhoto;
            } else {
                data.image = saveMediaFile(data.image, "projects");
            }
        }
        if (data.elevationPhoto !== undefined && data.image === undefined) data.image = data.elevationPhoto;
        if (data.image !== undefined && data.elevationPhoto === undefined) data.elevationPhoto = data.image;

        const result = await prisma.project.update({
            where:{id:project.id},
            data:data,
            include:projectSalesInclude
        })
        res.status(200).json(formatProject(await withGeneratedUnitCounts(result)))
    }
    catch(err)
    {
        console.error("Update project error:", err);
        if(err.statusCode){
            return res.status(err.statusCode).json({ message: err.message })
        }
        res.status(500).json({ message: err.message || "Failed to update project" })
    }
}

exports.deleteProject = async (req, res)=>{
    try{
        const id = req.params.id
        const project = await prisma.project.findUnique({ where:{id:Number(id)} });
        if(!project)
            return res.status(404).json("Project not found")

        // Normal delete is recoverable: hide the project from active lists and
        // keep its inventory tree until the user chooses Delete Forever in Bin.
        const result = await prisma.project.update({
            where:{id:project.id},
            data:{ active:false, deletedAt:new Date() },
        })
        res.status(200).json({ ...result, message:"Project moved to Bin" })
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json("something went wrong")
    }
}

exports.listProject = async (req, res)=>{
    
    const record = await prisma.project.findMany({where:{ deletedAt:null }, select:{
        id:true,
        name:true
    }})
    res.status(200).json(record)
}
