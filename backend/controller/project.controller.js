const prisma = require("../lib/prisma")

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

const formatProject = (project) => {
    if(!project) return project

    const assignments = Array.isArray(project.salesUsers) ? project.salesUsers : []
    return {
        ...project,
        salesIds:assignments.map((assignment) => assignment.userId),
        salesUsers:assignments.map((assignment) => assignment.user)
    }
}

exports.createProject = async (req, res)=>{
    try{
        const {salesIds, ...data} = req.body
        const normalizedSalesIds = normalizeSalesIds(salesIds, data.salesId)
        data.salesId = normalizedSalesIds[0] || null

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
        res.status(201).json(formatProject(project))
    }
    catch(err)
    {
        console.error("Create project error:", err)
        res.status(500).json("something went wrong")
    }
}

exports.getProject = async (req, res)=>{
    try{
        const projects = await prisma.project.findMany({include:projectSalesInclude});
        res.status(200).json(projects.map(formatProject))
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json("something went wrong")
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
            return res.status(404).json("Project not found")
        res.status(200).json(formatProject(project))
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json("something went wrong")
    }
}

exports.updateProject = async (req, res)=>{
    try{
        const id = req.params.id
        const {salesIds, ...data} = req.body
        const project = await prisma.project.findUnique({where:{id:Number(id)}});
        if(!project)
            return res.status(404).json("Project not found")
        
        if(salesIds !== undefined){
            const normalizedSalesIds = normalizeSalesIds(salesIds, data.salesId)
            data.salesId = normalizedSalesIds[0] || null
            data.salesUsers = {
                deleteMany:{},
                create:normalizedSalesIds.map((userId) => ({
                    user:{connect:{id:userId}}
                }))
            }
        }

        const result = await prisma.project.update({
            where:{id:project.id},
            data:data,
            include:projectSalesInclude
        })
        res.status(200).json(formatProject(result))
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json("something went wrong")
    }
}

exports.deleteProject = async (req, res)=>{
    try{
        const id = req.params.id
        const project = await prisma.project.findUnique({where:{id:Number(id)}});
        if(!project)
            return res.status(404).json("Project not found")
        
        const result = await prisma.project.delete({
            where:{id:project.id}
        })
        res.status(200).json(result)
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json("something went wrong")
    }
}

exports.listProject = async (req, res)=>{
    
    const record = await prisma.project.findMany({select:{
        id:true,
        name:true
    }})
    res.status(200).json(record)
}
