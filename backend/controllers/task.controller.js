const prisma = require("../lib/prisma")
const { sendNotification } = require("../services/notification.service")
const { isAdminUser, maskTaskData } = require("../utils/phoneMask")
const { emitToUser, emitToAdmin } = require("../socket")

const allowedStatuses = ["Open", "Completed", "Archived"]

const toNumberOrNull = value => {
  if (value === undefined || value === null || value === "") return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

const taskInclude = {
  assign: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  assignedBy: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
}

const normalizeStatus = status =>
  allowedStatuses.includes(status) ? status : "Open"

const getUserName = user =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "")

const notifyTaskAssigned = async (task, assignedBy) => {
  if (!task?.id || !task.assigneeId) return null
  const assignedByName =
    getUserName(assignedBy) ||
    task.assignedByName ||
    "Admin"
  const dedupeKey = `TASK_ASSIGNED:${task.id}:${task.assigneeId}`
  const due = task.dueDate ? ` Due: ${new Date(task.dueDate).toISOString().slice(0, 10)}${task.dueTime ? ` ${task.dueTime}` : ""}.` : ""

  try {
    const maskedTask = maskTaskData(task, false)
    emitToUser(task.assigneeId, "task:assigned", { task: maskedTask, assignedBy: assignedByName })
    emitToUser(task.assigneeId, "TaskAssigned", { task: maskedTask, assignedBy: assignedByName })
    emitToAdmin("task:assigned", { task, assignedBy: assignedByName })
  } catch (socketErr) {
    console.error("Task assignment socket error:", socketErr.message)
  }

  return sendNotification(
    task.assigneeId,
    "Task assigned to you",
    `${dedupeKey}\n${task.title || "Task"} was assigned by ${assignedByName}.${due} Priority: ${task.priority || "Medium"}.`,
    { link:"/user/sales?screen=tasks", dedupeKey }
  )
}



exports.createTask = async (req, res) => {
  try {
    const data = { ...req.body }
    const assigneeId = toNumberOrNull(data.assigneeId || data.assignId)
    const assignedById = toNumberOrNull(data.assignedById || req.authUser?.id || assigneeId)
    const missingFields = []

    if (!data.title) missingFields.push("title")
    if (!assigneeId) missingFields.push("assigneeId")
    if (!assignedById) missingFields.push("assignedById")

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      })
    }

    if (data.status && !allowedStatuses.includes(data.status)) {
      return res.status(400).json({ message: "Invalid task status" })
    }

    const [assignee, assignedBy] = await Promise.all([
      prisma.user.findUnique({ where: { id: assigneeId } }),
      prisma.user.findUnique({ where: { id: assignedById } }),
    ])

    if (!assignee) return res.status(400).json({ message: "Assigned user not found" })
    if (!assignedBy) return res.status(400).json({ message: "Assigned by user not found" })

    const task = await prisma.task.create({
      data: {
        title: String(data.title).trim(),
        description: data.description || null,
        remark: data.remark || null,
        type: data.type || "Folllow up",
        status: normalizeStatus(data.status),
        priority: data.priority || "Medium",
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
        dueTime: data.dueTime || "",
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        assigneeId,
        assigneeName: getUserName(assignee),
        assignedById,
        assignedByName: getUserName(assignedBy),
      },
      include: taskInclude,
    })
    await notifyTaskAssigned(task, assignedBy)

    const isAdmin = isAdminUser(req)
    res.status(201).json(isAdmin ? task : maskTaskData(task, false))
  } catch (error) {
    console.error("Create task error:", error)
    res.status(500).json({ message: "Unable to create task" })
  }
}

exports.getTasks = async (req, res) => {
  try {
    const where = {}
    const status = req.query.status
    const assigneeId = toNumberOrNull(req.query.assigneeId || req.query.assignId)

    if (!status) where.status = { notIn: ["Archived", "Deleted", "Trash", "Cancelled"] }

    if (status && status !== "All") {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid task status" })
      }
      where.status = status
    }
    if (assigneeId) where.assigneeId = assigneeId

    const data = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { createdAt: "desc" },
    })
    const isAdmin = isAdminUser(req)
    const safeData = isAdmin ? data : data.map((t) => maskTaskData(t, false))
    res.status(200).json({ data: safeData })
  } catch (error) {
    console.error("Get tasks error:", error)
    res.status(500).json({ message: "Unable to load tasks" })
  }
}



exports.updateTask = async (req, res) => {
  try {

    const id = toNumberOrNull(req.params.id)
    if (!id) return res.status(400).json({ message: "Task id is required" })

    const data = {}

    if (req.body.status !== undefined) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid task status" })
      }
      data.status = req.body.status
    }

    if (req.body.title !== undefined) {
      data.title = req.body.title
    }

    if (req.body.priority !== undefined) {
      data.priority = req.body.priority
    }

    if (req.body.description !== undefined) {
      data.description = req.body.description
    }

    if (req.body.remark !== undefined) {
      data.remark = req.body.remark
    }

    if (req.body.type !== undefined) {
      data.type = req.body.type
    }

    if (req.body.dueDate !== undefined) {
      data.dueDate = new Date(req.body.dueDate)
    }

    if (req.body.dueTime !== undefined) {
      data.dueTime = req.body.dueTime
    }

    if (req.body.assignId !== undefined || req.body.assigneeId !== undefined) {
      const assigneeId = toNumberOrNull(req.body.assigneeId || req.body.assignId)
      if (!assigneeId) return res.status(400).json({ message: "Valid assigneeId is required" })
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } })
      if (!assignee) return res.status(400).json({ message: "Assigned user not found" })
      data.assigneeId = assigneeId
      data.assigneeName = getUserName(assignee)
    }

    if (!Object.keys(data).length)
      return res.status(400).json({ message: "No updates provided" })
    
    const task = await prisma.task.findUnique({where:{id:id}})
    
    if (!task) return res.status(404).json({ message: "Task not found" })
    
    const updatedTask = await prisma.task.update({
      where:{id:id},
      data:data,
      include: taskInclude,
    })
    if (
      data.assigneeId &&
      String(data.assigneeId) !== String(task.assigneeId || "")
    ) {
      await notifyTaskAssigned(updatedTask, updatedTask.assignedBy)
    }

    try {
      const maskedTask = maskTaskData(updatedTask, false)
      emitToAdmin("task:updated", { task: updatedTask })
      if (updatedTask.assigneeId) {
        emitToUser(updatedTask.assigneeId, "task:updated", { task: maskedTask })
      }
      if (updatedTask.status === "Completed") {
        emitToAdmin("task:completed", { task: updatedTask })
        if (updatedTask.assigneeId) {
          emitToUser(updatedTask.assigneeId, "task:completed", { task: maskedTask })
        }
      }
    } catch (socketErr) {
      console.error("Task update socket error:", socketErr.message)
    }

    const isAdmin = isAdminUser(req)
    res.status(200).json(isAdmin ? updatedTask : maskTaskData(updatedTask, false))
  } catch (error) {
    console.error("Update task error:", error)
    res.status(500).json({ message: "Unable to update task" })
  }
}

exports.deleteTask = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id)
    if (!id) return res.status(400).json({ message: "Task id is required" })

    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) return res.status(404).json({ message: "Task not found" })

    await prisma.task.update({ where: { id }, data: { status: "Trash" } })
    res.status(200).json({ message: "Task moved to Bin" })
  } catch (error) {
    console.error("Delete task error:", error)
    res.status(500).json({ message: "Unable to delete task" })
  }
}
