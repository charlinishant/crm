const Project = require("../models/Project")

exports.createProject = async (req, res)=> {
    try{
        let data = req.body
        const requireFields = ["name"]
        
        if(!requireFields.some(key=>Object.keys(data).includes(key))){
            res.status(404).json({ error: `Missing required fields` });    
        }
        const project = await Project.create(data);
        res.status(201).json(project)
    }catch(err)
    {
        res.status(500).json({ error: err.message });
    }
};

exports.getProjects = async (req, res)=> {
    try{
        const projects = await Project.findAll()
        res.json(projects)
    }catch(err)
    {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) =>{
    try{
        
        const project = await Project.findById(req.params.id)
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json(project)
    }catch(err)
    {
        res.status(500).json({ error: err.message });
    }
}


exports.updateProject = async (req, res)=>{
    try{
        const project = await Project.update(req.params.id, req.body)
        res.status(200).json(project)
    }
    catch(err){
        res.status(500).json({error:err.message})
    }
}