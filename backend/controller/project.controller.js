const prisma = require("../lib/prisma")

exports.createProject = async (req, res)=>{
    try{
        let data = req.body
        console.log("Creating project:", data)
        const project = await prisma.project.create({
            data:data
        })
        console.log("Project created:", project)
        res.status(201).json(project)
    }
    catch(err)
    {
        console.error("Create project error:", err)
        res.status(500).json("something went wrong")
    }
}

exports.getProject = async (req, res)=>{
    try{
        const projects = await prisma.project.findMany();
        res.status(200).json(projects)
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
        const project = await prisma.project.findUnique({where:{id:Number(id)}});
        if(!project)
            return res.status(404).json("Project not found")
        res.status(200).json(project)
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
        const data = req.body
        const project = await prisma.project.findUnique({where:{id:Number(id)}});
        if(!project)
            return res.status(404).json("Project not found")
        
        const result = await prisma.project.update({
            where:{id:project.id},
            data:data
        })
        res.status(200).json(result)
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