const prisma = require("../lib/prisma")

const allowedStatuses = ["Open", "Completed", "Archived"]

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

const ensureTaskTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Task (
      id INT NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      remark TEXT NULL,
      type VARCHAR(80) NULL DEFAULT 'Follow up',
      status VARCHAR(40) NOT NULL DEFAULT 'Open',
      priority VARCHAR(40) NOT NULL DEFAULT 'Medium',
      dueDate DATETIME NULL,
      dueTime VARCHAR(40) NULL,
      assigneeId INT NULL,
      assigneeName VARCHAR(255) NULL,
      assignedById INT NULL,
      assignedByName VARCHAR(255) NULL,
      attachments JSON NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX Task_assigneeId_idx (assigneeId),
      INDEX Task_status_idx (status)
    )
  `)
}

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "")

const formatTask = (task) => {
  if (!task) return null

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    remark: task.remark,
    subtitle: task.remark || task.type || "",
    type: task.type || "Follow up",
    status: task.status || "Open",
    priority: task.priority || "Medium",
    dueDate: task.dueDate,
    dueOn: task.dueDate,
    dueTime: task.dueTime,
    assigneeId: task.assigneeId,
    assignee: task.assigneeName,
    assignedTo: task.assigneeName,
    assignedById: task.assignedById,
    assignedBy: task.assignedByName,
    attachments: task.attachments,
    createdAt: task.createdAt,
    createdOn: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

exports.createTask = async (req, res) => {
  try {
    await ensureTaskTable()

    const assigneeId = toNumberOrNull(req.body.assigneeId)
    const assignedById = toNumberOrNull(req.body.assignedById || req.authUser?.id)

    let assigneeName = req.body.assigneeName || ""
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } })
      assigneeName = getUserName(assignee) || assigneeName
    }

    let assignedByName = req.body.assignedByName || "Admin"
    if (assignedById) {
      const assignedBy = await prisma.user.findUnique({ where: { id: assignedById } })
      assignedByName = getUserName(assignedBy) || assignedByName
    }

    const status = allowedStatuses.includes(req.body.status) ? req.body.status : "Open"
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null
    const title = String(req.body.title || "").trim()

    if (!title) {
      return res.status(400).json({ message: "Task title is required" })
    }

    const [, rows] = await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO Task (
          title, description, remark, type, status, priority, dueDate, dueTime,
          assigneeId, assigneeName, assignedById, assignedByName, attachments
        ) VALUES (
          ${title},
          ${req.body.description || null},
          ${req.body.remark || null},
          ${req.body.type || "Follow up"},
          ${status},
          ${req.body.priority || "Medium"},
          ${dueDate},
          ${req.body.dueTime || null},
          ${assigneeId},
          ${assigneeName || null},
          ${assignedById},
          ${assignedByName || null},
          ${JSON.stringify(req.body.attachments || [])}
        )
      `,
      prisma.$queryRaw`SELECT * FROM Task WHERE id = LAST_INSERT_ID()`,
    ])

    let createdTask = rows[0]

    if (!createdTask) {
      const fallbackRows = await prisma.$queryRaw`
        SELECT * FROM Task
        WHERE title = ${title}
          AND (${assigneeId} IS NULL OR assigneeId = ${assigneeId})
        ORDER BY id DESC
        LIMIT 1
      `
      createdTask = fallbackRows[0]
    }

    if (!createdTask) {
      return res.status(500).json({ message: "Task was saved but could not be loaded" })
    }

    res.status(201).json(formatTask(createdTask))
  } catch (error) {
    console.error("Create task error:", error)
    res.status(500).json({ message: "Unable to create task" })
  }
}

exports.getTasks = async (req, res) => {
  try {
    await ensureTaskTable()

    const where = []
    const status = req.query.status
    const assigneeId = toNumberOrNull(req.query.assigneeId)

    if (status && status !== "All") where.push(`status = '${String(status).replace(/'/g, "''")}'`)
    if (assigneeId) where.push(`assigneeId = ${assigneeId}`)

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
    const rows = await prisma.$queryRawUnsafe(`
      SELECT * FROM Task
      ${whereSql}
      ORDER BY createdAt DESC
      LIMIT 200
    `)

    res.status(200).json({ data: rows.map(formatTask) })
  } catch (error) {
    console.error("Get tasks error:", error)
    res.status(500).json({ message: "Unable to load tasks" })
  }
}

exports.getMyTasks = async (req, res) => {
  req.query.assigneeId = req.authUser?.id
  return exports.getTasks(req, res)
}

exports.updateTask = async (req, res) => {
  try {
    await ensureTaskTable()

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

    if (!fields.length) return res.status(400).json({ message: "No updates provided" })

    await prisma.$executeRawUnsafe(
      `UPDATE Task SET ${fields.join(", ")} WHERE id = ?`,
      ...values,
      id
    )

    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM Task WHERE id = ?`, id)
    if (!rows.length) return res.status(404).json({ message: "Task not found" })

    res.status(200).json(formatTask(rows[0]))
  } catch (error) {
    console.error("Update task error:", error)
    res.status(500).json({ message: "Unable to update task" })
  }
}
