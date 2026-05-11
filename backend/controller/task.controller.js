const prisma = require("../lib/prisma")

const allowedStatuses = ["Open", "Completed", "Archived"]

const toNumberOrNull = value => {
  if (value === undefined || value === null || value === "") return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}



exports.createTask = async (req, res) => {
  try {
    const requiredFields = ["title", "status"]
    let data = req.body
    const missingFields = requiredFields.filter(field => !req.body[field])
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      })
    }
    
    if(!data.assignedById)
    {
      assignedById = req.authUser.id
    }

    if(data.dueDate){
      data.dueDate = new Date(data.dueDate)
    }
    const task = await prisma.task.create({
      data: data,
    })

    res.status(201).json(task)
  } catch (error) {
    console.error("Create task error:", error)
    res.status(500).json({ message: "Unable to create task" })
  }
}

exports.getTasks = async (req, res) => {
  try {
    const where = {}
    const status = req.query.status
    const assignId = toNumberOrNull(req.query.assignId)

    if (status && status !== "All")
      where.status = status
    if (assignId) where.push(`assignId = ${assignId }`)

    const data = await prisma.task.findMany({where:where})
    res.status(200).json({ data: data })
  } catch (error) {
    console.error("Get tasks error:", error)
    res.status(500).json({ message: "Unable to load tasks" })
  }
}



exports.updateTask = async (req, res) => {
  try {

    const id = toNumberOrNull(req.params.id)
    if (!id) return res.status(400).json({ message: "Task id is required" })

    const fields = []
    const values = []

    if (req.body.status !== undefined) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid task status" })
      }
      fields.push("status = ?")
      values.push(req.body.status)
    }

    if (req.body.title !== undefined) {
      fields.push("title = ?")
      values.push(req.body.title)
    }

    if (req.body.priority !== undefined) {
      fields.push("priority = ?")
      values.push(req.body.priority)
    }

    if (!fields.length)
      return res.status(400).json({ message: "No updates provided" })

    const data = req.body
    
    const task = prisma.task.findUnique({where:{id:id}})
    
    if (!task) return res.status(404).json({ message: "Task not found" })
    
    const updatedTask = await prisma.task.update({where:{id:id}, data:data})
    res.status(200).json(updatedTask)
  } catch (error) {
    console.error("Update task error:", error)
    res.status(500).json({ message: "Unable to update task" })
  }
}
