const prisma = require("../lib/prisma")
const { isAdminUser, maskLeadData, maskTaskData } = require("../utils/phoneMask")
const { emitReportsUpdate } = require("../socket/socket")

const permanentlyDeleteBookings = async (db, bookingIds) => {
  if (!bookingIds.length) return
  for (const table of ["bookingExpense", "bookingCharge", "demand", "receipt", "ledgerEntry", "generatedDocument", "documentAuditLog", "costSheet", "paymentSchedule"]) {
    await db[table].deleteMany({ where: { bookingId: { in: bookingIds } } })
  }
  await db.booking.deleteMany({ where: { id: { in: bookingIds } } })
}

const permanentlyDeleteFloorPlan = async (db, floorPlanId) => {
  const plan = await db.floorPlan.findUnique({
    where: { id: floorPlanId },
    select: { id: true, units: { select: { id: true, unitList: { select: { id: true } } } } },
  })
  if (!plan) return false
  const unitIds = plan.units.map((unit) => unit.id)
  const unitModelIds = plan.units.flatMap((unit) => unit.unitList.map((item) => item.id))
  const bookings = await db.booking.findMany({
    where: { OR: [{ floorPlanId }, { unitId: { in: unitIds } }, { unitItem: { is: { unitId: { in: unitIds } } } }] },
    select: { id: true },
  })
  await permanentlyDeleteBookings(db, bookings.map((booking) => booking.id))
  await db.unitModel.deleteMany({ where: { id: { in: unitModelIds } } })
  await db.floorPlanSlot.deleteMany({ where: { floorPlanId } })
  await db.unit.deleteMany({ where: { id: { in: unitIds } } })
  await db.floorPlan.delete({ where: { id: floorPlanId } })
  return true
}

const permanentlyDeleteUnitModel = async (db, unitModelId) => {
  const item = await db.unitModel.findUnique({ where: { id: unitModelId }, select: { id: true, unitId: true } })
  if (!item) return false
  const bookings = await db.booking.findMany({ where: { unitItemId: item.id }, select: { id: true } })
  await permanentlyDeleteBookings(db, bookings.map((booking) => booking.id))
  await db.unitModel.delete({ where: { id: item.id } })
  return true
}

const permanentlyDeleteProject = async (db, projectId) => {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      tower: { select: { id: true } },
      floor: { select: { id: true } },
      unit: { select: { id: true } },
    },
  })
  if (!project) return false

  const towerIds = project.tower.map((item) => item.id)
  const floorIds = project.floor.map((item) => item.id)
  const unitIds = project.unit.map((item) => item.id)
  const bookings = await db.booking.findMany({
    where: {
      OR: [
        { projectId },
        { towerId: { in: towerIds } },
        { floorPlanId: { in: floorIds } },
        { unitId: { in: unitIds } },
        { unitItem: { is: { unitId: { in: unitIds } } } },
      ],
    },
    select: { id: true },
  })
  const bookingIds = bookings.map((item) => item.id)

  if (bookingIds.length) {
    await db.bookingExpense.deleteMany({ where: { bookingId: { in: bookingIds } } })
    await db.bookingCharge.deleteMany({ where: { bookingId: { in: bookingIds } } })
    await db.demand.deleteMany({ where: { bookingId: { in: bookingIds } } })
    await db.receipt.deleteMany({ where: { bookingId: { in: bookingIds } } })
    await db.ledgerEntry.deleteMany({ where: { bookingId: { in: bookingIds } } })
    await db.generatedDocument.deleteMany({ where: { bookingId: { in: bookingIds } } })
    await db.documentAuditLog.deleteMany({ where: { bookingId: { in: bookingIds } } })
    await db.costSheet.deleteMany({ where: { bookingId: { in: bookingIds } } })
    await db.paymentSchedule.deleteMany({ where: { bookingId: { in: bookingIds } } })
    await db.booking.deleteMany({ where: { id: { in: bookingIds } } })
  }

  await db.callLog.updateMany({ where: { interestedProjectId: projectId }, data: { interestedProjectId: null } })
  if (unitIds.length) await db.unitModel.deleteMany({ where: { unitId: { in: unitIds } } })
  if (floorIds.length || towerIds.length) {
    await db.floorPlanSlot.deleteMany({ where: { OR: [
      ...(floorIds.length ? [{ floorPlanId: { in: floorIds } }] : []),
      ...(towerIds.length ? [{ towerId: { in: towerIds } }] : []),
    ] } })
  }
  if (unitIds.length) await db.unit.deleteMany({ where: { id: { in: unitIds } } })
  if (floorIds.length) await db.floorPlan.deleteMany({ where: { id: { in: floorIds } } })
  if (towerIds.length) await db.tower.deleteMany({ where: { id: { in: towerIds } } })
  await db.projectSalesUser.deleteMany({ where: { projectId } })
  await db.project.delete({ where: { id: projectId } })
  return true
}

const permanentlyDeleteTower = async (db, towerId) => {
  const tower = await db.tower.findUnique({
    where: { id: towerId },
    select: {
      id: true,
      floors: { select: { id: true } },
      units: { select: { id: true, unitList: { select: { id: true } } } },
    },
  })
  if (!tower) return false

  const unitIds = tower.units.map((unit) => unit.id)
  const unitModelIds = tower.units.flatMap((unit) => unit.unitList.map((item) => item.id))
  const bookings = await db.booking.findMany({
    where: { OR: [{ towerId }, { unitId: { in: unitIds } }, { unitItem: { is: { unitId: { in: unitIds } } } }] },
    select: { id: true },
  })
  const bookingIds = bookings.map((booking) => booking.id)
  await permanentlyDeleteBookings(db, bookingIds)
  await db.unitModel.deleteMany({ where: { id: { in: unitModelIds } } })
  await db.floorPlanSlot.deleteMany({ where: { towerId } })
  await db.unit.deleteMany({ where: { id: { in: unitIds } } })
  await db.floorPlan.deleteMany({ where: { id: { in: tower.floors.map((floor) => floor.id) } } })
  await db.tower.delete({ where: { id: towerId } })
  return true
}

/**
 * Helper to safely extract phone string from JSON phones field
 */
const extractPhone = (phones) => {
  if (!phones) return ""
  if (Array.isArray(phones)) {
    return phones[0]?.value || phones[0]?.phone || phones[0] || ""
  }
  if (typeof phones === "string") return phones
  if (typeof phones === "object") return phones.value || phones.phone || ""
  return ""
}

/**
 * Helper to safely extract email string from JSON emails field
 */
const extractEmail = (emails) => {
  if (!emails) return ""
  if (Array.isArray(emails)) {
    return emails[0]?.value || emails[0]?.email || emails[0] || ""
  }
  if (typeof emails === "string") return emails
  if (typeof emails === "object") return emails.value || emails.email || ""
  return ""
}

/**
 * GET /api/bin
 * Fetch all items in the Bin, organized or filtered by category and project
 */
exports.getBinItems = async (req, res) => {
  try {
    const { category = "all", projectId, search = "" } = req.query
    const isAdmin = isAdminUser(req)
    const normalizedSearch = String(search || "").trim().toLowerCase()
    const filterProjectId = projectId ? Number(projectId) : null

    // 1. Leads in Trash (is_delete: true or deletedAt is set)
    const leadWhere = {
      OR: [
        { is_delete: true },
        { deletedAt: { not: null } }
      ]
    }
    const trashedLeads = await prisma.lead.findMany({
      where: leadWhere,
      include: {
        team: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true }
        },
        _count: { select: { callLogs: true } }
      },
      orderBy: { id: "desc" }
    })

    // 2. Inactive Projects in Trash
    const projectWhere = { deletedAt: { not: null } }
    if (filterProjectId) projectWhere.id = filterProjectId
    const trashedProjects = await prisma.project.findMany({
      where: projectWhere,
      orderBy: { createdAt: "desc" }
    })

    // Towers belonging to archived projects are shown separately so users can
    // restore or permanently remove the inventory level they selected.
    const trashedTowers = await prisma.tower.findMany({
      where: { OR: [{ deletedAt: { not: null } }, { project: { deletedAt: { not: null } } }] },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { floors: true, units: true } },
      },
      orderBy: { id: "desc" },
    })

    // Call logs remain linked to deleted leads so the lead can be restored with
    // its history. Surface those logs in the Bin as a separate category.
    const trashedCallLogs = await prisma.callLog.findMany({
      where: {
        OR: [
          { lead: { is_delete: true } },
          { lead: { deletedAt: { not: null } } },
          { deletedAt: { not: null } },
          { interestedProjectRef: { deletedAt: { not: null } } },
        ],
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        interestedProjectRef: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // 3. Archived / Trashed Floor Plans
    const floorPlanWhere = {
      OR: [
        { status: "Trash" },
        { status: "Archived" },
        { status: "Inactive" }
      ]
    }
    if (filterProjectId) floorPlanWhere.projectId = filterProjectId
    const trashedFloorPlans = await prisma.floorPlan.findMany({
      where: floorPlanWhere,
      include: {
        project: { select: { id: true, name: true } },
        tower: { select: { id: true, name: true } }
      },
      orderBy: { id: "desc" }
    })

    // 4. Trashed Units (UnitModel with Cancelled / Refuge / Blocked)
    const unitWhere = {
      status: { in: ["Cancelled", "Refuge"] }
    }
    const trashedUnits = await prisma.unitModel.findMany({
      where: unitWhere,
      include: {
        unit: {
          include: {
            project: { select: { id: true, name: true } },
            tower: { select: { id: true, name: true } },
            floor: { select: { id: true, name: true, configurationLabel: true } }
          }
        }
      },
      orderBy: { id: "desc" }
    })

    // 5. Archived Tasks
    const trashedTasks = await prisma.task.findMany({
      where: {
        status: { in: ["Archived", "Deleted", "Trash", "Cancelled"] }
      },
      include: {
        assign: { select: { id: true, firstName: true, lastName: true, username: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    // 6. Deactivated Users
    const trashedUsers = await prisma.user.findMany({
      where: { isActive: false },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        phone: true,
        isActive: true
      },
      orderBy: { id: "desc" }
    })

    // Format into unified category structures
    const formattedLeads = trashedLeads.map((item) => {
      const name = [item.firstName, item.lastName].filter(Boolean).join(" ") || `Lead #${item.id}`
      const email = extractEmail(item.emails)
      const phone = extractPhone(item.phones)
      const subtitle = email || phone || `Stage: ${item.status || "New"}`

      return {
        id: item.id,
        category: "leads",
        categoryLabel: "Lead",
        title: name,
        subtitle,
        project: item.interestedProjects || item.siteVisitProject || "-",
        deletedAt: item.deletedAt || new Date(),
        details: isAdmin ? item : maskLeadData(item, false),
      meta: `Assigned: ${item.team ? [item.team.firstName, item.team.lastName].filter(Boolean).join(" ") || item.team.username : "Unassigned"} • Call logs: ${item._count?.callLogs || 0}`
      }
    })

    const formattedProjects = trashedProjects.map((item) => ({
      id: item.id,
      category: "projects",
      categoryLabel: "Project",
      title: item.name,
      subtitle: `${item.projectType || "Residential"} • City: ${item.city || "-"}`,
      project: item.name,
      deletedAt: item.deletedAt || item.createdAt || new Date(),
      details: item,
      meta: `${item.noOfTowers || 0} Towers`
    }))

    const formattedTowers = trashedTowers.map((item) => ({
      id: item.id,
      category: "towers",
      categoryLabel: "Tower",
      title: item.name,
      subtitle: `${item._count?.floors || 0} Floor Plans • ${item._count?.units || 0} Units`,
      project: item.project?.name || "-",
      deletedAt: item.deletedAt || new Date(),
      details: item,
      meta: "Archived with project",
    }))

    const formattedCallLogs = trashedCallLogs.map((item) => ({
      id: item.id,
      category: "calllogs",
      categoryLabel: "Call Log",
      title: `Call #${item.id}`,
      subtitle: `${item.direction || "Call"} • ${item.status || "Logged"} • ${item.duration || 0}s`,
      project: item.interestedProjectRef?.name || "-",
      deletedAt: item.createdAt || new Date(),
      details: item,
      meta: item.lead ? `Lead: ${[item.lead.firstName, item.lead.lastName].filter(Boolean).join(" ") || `#${item.lead.id}`}` : "Unassigned call",
    }))

    const formattedFloorPlans = trashedFloorPlans.map((item) => ({
      id: item.id,
      category: "floorplans",
      categoryLabel: "Floor Plan",
      title: item.name,
      subtitle: item.configurationLabel || `${item.bedrooms || 0} BHK`,
      project: item.project?.name || "-",
      tower: item.tower?.name || "-",
      deletedAt: item.possessionDate || new Date(),
      details: item,
      meta: `Tower: ${item.tower?.name || "-"}`
    }))

    const formattedUnits = trashedUnits.map((item) => ({
      id: item.id,
      category: "units",
      categoryLabel: "Unit",
      title: `Unit ${item.name || `#${item.id}`}`,
      subtitle: `Floor ${item.floor ?? "-"} • Price: ₹${item.basePrice || item.baseRate || "-"}`,
      project: item.unit?.project?.name || "-",
      tower: item.unit?.tower?.name || "-",
      deletedAt: new Date(),
      details: item,
      meta: `Floor Plan: ${item.unit?.floor?.name || "-"}`
    }))

    const formattedTasks = trashedTasks.map((item) => ({
      id: item.id,
      category: "tasks",
      categoryLabel: "Task",
      title: item.title,
      subtitle: item.description || `Priority: ${item.priority}`,
      project: "-",
      deletedAt: item.updatedAt || item.createdAt || new Date(),
      details: isAdmin ? item : maskTaskData(item, false),
      meta: `Assigned to: ${item.assigneeName || item.assign?.username || "-"}`
    }))

    const formattedUsers = trashedUsers.map((item) => ({
      id: item.id,
      category: "users",
      categoryLabel: "User",
      title: [item.firstName, item.lastName].filter(Boolean).join(" ") || item.username || `User #${item.id}`,
      subtitle: `${item.email || "-"} • Role: ${item.role || "-"}`,
      project: "-",
      deletedAt: new Date(),
      details: item,
      meta: `Department: ${item.department || "-"}`
    }))

    const counts = {
      all: formattedLeads.length + formattedProjects.length + formattedTowers.length + formattedCallLogs.length + formattedFloorPlans.length + formattedUnits.length + formattedTasks.length + formattedUsers.length,
      leads: formattedLeads.length,
      projects: formattedProjects.length,
      towers: formattedTowers.length,
      calllogs: formattedCallLogs.length,
      floorplans: formattedFloorPlans.length,
      units: formattedUnits.length,
      tasks: formattedTasks.length,
      users: formattedUsers.length
    }

    let items = []
    if (category === "leads") items = formattedLeads
    else if (category === "projects") items = formattedProjects
    else if (category === "towers") items = formattedTowers
    else if (category === "calllogs") items = formattedCallLogs
    else if (category === "floorplans") items = formattedFloorPlans
    else if (category === "units") items = formattedUnits
    else if (category === "tasks") items = formattedTasks
    else if (category === "users") items = formattedUsers
    else {
      items = [
        ...formattedLeads,
        ...formattedProjects,
        ...formattedTowers,
        ...formattedCallLogs,
        ...formattedFloorPlans,
        ...formattedUnits,
        ...formattedTasks,
        ...formattedUsers
      ]
    }

    // Apply Project filter
    if (filterProjectId) {
      const targetProject = await prisma.project.findUnique({ where: { id: filterProjectId }, select: { name: true } })
      const pName = targetProject?.name?.toLowerCase() || ""
      items = items.filter((it) => it.project && it.project.toLowerCase().includes(pName))
    }

    // Apply Search filter
    if (normalizedSearch) {
      items = items.filter(
        (it) =>
          it.title?.toLowerCase().includes(normalizedSearch) ||
          it.subtitle?.toLowerCase().includes(normalizedSearch) ||
          it.project?.toLowerCase().includes(normalizedSearch) ||
          it.categoryLabel?.toLowerCase().includes(normalizedSearch)
      )
    }

    res.status(200).json({
      success: true,
      counts,
      totalCount: items.length,
      data: items
    })
  } catch (error) {
    console.error("Get bin items error:", error)
    res.status(500).json({ message: "Unable to load bin items" })
  }
}

/**
 * POST /api/bin/restore
 * Restore item(s) from the Bin back to active status
 */
exports.restoreBinItem = async (req, res) => {
  try {
    const { category, id, ids = [] } = req.body
    const targetIds = ids.length ? ids.map(Number) : id ? [Number(id)] : []

    if (!category || !targetIds.length) {
      return res.status(400).json({ message: "Category and target ID(s) are required" })
    }

    let restoredCount = 0

    if (category === "leads") {
      const updateResult = await prisma.lead.updateMany({
        where: { id: { in: targetIds } },
        data: { is_delete: false, deletedAt: null }
      })
      restoredCount = updateResult.count
      emitReportsUpdate("lead:restored")
    } else if (category === "calllogs") {
      const logs = await prisma.callLog.findMany({ where: { id: { in: targetIds } }, select: { leadId: true } })
      const leadIds = [...new Set(logs.map((log) => log.leadId).filter(Boolean))]
      const updateResult = await prisma.callLog.updateMany({ where: { id: { in: targetIds } }, data: { deletedAt: null } })
      restoredCount = updateResult.count
      if (leadIds.length) await prisma.lead.updateMany({ where: { id: { in: leadIds } }, data: { is_delete: false, deletedAt: null } })
      emitReportsUpdate("lead:restored")
    } else if (category === "towers") {
      const towers = await prisma.tower.findMany({ where: { id: { in: targetIds } }, select: { projectId: true } })
      const updateResult = await prisma.tower.updateMany({ where: { id: { in: targetIds } }, data: { deletedAt: null } })
      if (towers.length) await prisma.project.updateMany({ where: { id: { in: [...new Set(towers.map((tower) => tower.projectId))] } }, data: { active: true, deletedAt: null } })
      restoredCount = updateResult.count
      emitReportsUpdate("project:updated")
    } else if (category === "projects") {
      const updateResult = await prisma.project.updateMany({
        where: { id: { in: targetIds } },
        data: { active: true, deletedAt: null }
      })
      restoredCount = updateResult.count
      emitReportsUpdate("project:updated")
    } else if (category === "floorplans") {
      const plans = await prisma.floorPlan.findMany({ where: { id: { in: targetIds } }, select: { projectId: true, towerId: true } })
      const updateResult = await prisma.floorPlan.updateMany({
        where: { id: { in: targetIds } },
        data: { status: "Active" }
      })
      const projectIds = [...new Set(plans.map((plan) => plan.projectId).filter(Boolean))]
      const towerIds = [...new Set(plans.map((plan) => plan.towerId).filter(Boolean))]
      if (projectIds.length) await prisma.project.updateMany({ where: { id: { in: projectIds } }, data: { deletedAt: null, active: true } })
      if (towerIds.length) await prisma.tower.updateMany({ where: { id: { in: towerIds } }, data: { deletedAt: null } })
      restoredCount = updateResult.count
      emitReportsUpdate("floorplan:updated")
    } else if (category === "units") {
      const units = await prisma.unitModel.findMany({ where: { id: { in: targetIds } }, select: { unit: { select: { projectId: true, towerId: true, floor: { select: { projectId: true, towerId: true } } } } } })
      const updateResult = await prisma.unitModel.updateMany({
        where: { id: { in: targetIds } },
        data: { status: "Available" }
      })
      const projectIds = [...new Set(units.flatMap((item) => [item.unit?.projectId, item.unit?.floor?.projectId]).filter(Boolean))]
      const towerIds = [...new Set(units.flatMap((item) => [item.unit?.towerId, item.unit?.floor?.towerId]).filter(Boolean))]
      if (projectIds.length) await prisma.project.updateMany({ where: { id: { in: projectIds } }, data: { deletedAt: null, active: true } })
      if (towerIds.length) await prisma.tower.updateMany({ where: { id: { in: towerIds } }, data: { deletedAt: null } })
      restoredCount = updateResult.count
      emitReportsUpdate("unit:updated")
    } else if (category === "tasks") {
      const updateResult = await prisma.task.updateMany({
        where: { id: { in: targetIds } },
        data: { status: "Open" }
      })
      restoredCount = updateResult.count
    } else if (category === "users") {
      const updateResult = await prisma.user.updateMany({
        where: { id: { in: targetIds } },
        data: { isActive: true }
      })
      restoredCount = updateResult.count
      emitReportsUpdate("user:updated")
    } else {
      return res.status(400).json({ message: `Unsupported category: ${category}` })
    }

    res.status(200).json({
      success: true,
      message: `Successfully restored ${restoredCount} item(s)`,
      restoredCount
    })
  } catch (error) {
    console.error("Restore bin item error:", error)
    res.status(500).json({ message: error.message || "Failed to restore item(s)" })
  }
}

/**
 * POST /api/bin/permanent-delete
 * Permanently delete item(s) from the database
 */
exports.permanentDeleteBinItem = async (req, res) => {
  try {
    const { category, id, ids = [] } = req.body
    const targetIds = ids.length ? ids.map(Number) : id ? [Number(id)] : []

    if (!category || !targetIds.length) {
      return res.status(400).json({ message: "Category and target ID(s) are required" })
    }

    let deletedCount = 0

    if (category === "leads") {
      for (const leadId of targetIds) {
        try {
          await prisma.leadActivity.deleteMany({ where: { leadId } })
          await prisma.leadAddress.deleteMany({ where: { leadId } })
          await prisma.personalAddress.deleteMany({ where: { leadId } })
          await prisma.leadNote.deleteMany({ where: { leadId } })
          await prisma.followUp.deleteMany({ where: { leadId } })
          await prisma.scheduleVisit.deleteMany({ where: { leadId } })
          await prisma.callLog.deleteMany({ where: { leadId } })
          await prisma.whatsAppMessage.deleteMany({ where: { leadId } })
          await prisma.lead.delete({ where: { id: leadId } }).catch(() => {})
          deletedCount += 1
        } catch (e) {
          console.error(`Failed to permanently delete lead ${leadId}:`, e.message)
        }
      }
      emitReportsUpdate("lead:permanently-deleted")
    } else if (category === "calllogs") {
      const result = await prisma.callLog.deleteMany({ where: { id: { in: targetIds } } })
      deletedCount = result.count
    } else if (category === "towers") {
      for (const towerId of targetIds) {
        if (await permanentlyDeleteTower(prisma, towerId)) deletedCount += 1
      }
    } else if (category === "projects") {
      for (const pId of targetIds) {
        try {
          if (await permanentlyDeleteProject(prisma, pId)) deletedCount += 1
        } catch (error) {
          console.error(`Failed to permanently delete project ${pId}:`, error.message)
        }
      }
      emitReportsUpdate("project:deleted")
    } else if (category === "floorplans") {
      for (const fId of targetIds) {
        if (await permanentlyDeleteFloorPlan(prisma, fId)) deletedCount += 1
      }
      emitReportsUpdate("floorplan:deleted")
    } else if (category === "units") {
      for (const uId of targetIds) {
        if (await permanentlyDeleteUnitModel(prisma, uId)) deletedCount += 1
      }
      emitReportsUpdate("unit:deleted")
    } else if (category === "tasks") {
      const delResult = await prisma.task.deleteMany({ where: { id: { in: targetIds } } })
      deletedCount = delResult.count
    } else if (category === "users") {
      for (const uId of targetIds) {
        await prisma.userSession.deleteMany({ where: { userId: uId } })
        await prisma.userAttendance.deleteMany({ where: { userId: uId } })
        await prisma.user.delete({ where: { id: uId } }).catch(() => {})
        deletedCount += 1
      }
      emitReportsUpdate("user:deleted")
    } else {
      return res.status(400).json({ message: `Unsupported category: ${category}` })
    }

    res.status(200).json({
      success: true,
      message: `Permanently deleted ${deletedCount} item(s)`,
      deletedCount
    })
  } catch (error) {
    console.error("Permanent delete bin item error:", error)
    res.status(500).json({ message: error.message || "Failed to permanently delete item(s)" })
  }
}

/**
 * POST /api/bin/empty
 * Empty the entire Bin or a specific category
 */
exports.emptyBin = async (req, res) => {
  try {
    const { category = "all" } = req.body

    if (category === "all" || category === "leads") {
      const trashed = await prisma.lead.findMany({
        where: {
          OR: [{ is_delete: true }, { deletedAt: { not: null } }]
        },
        select: { id: true }
      })
      for (const l of trashed) {
        try {
          await prisma.leadActivity.deleteMany({ where: { leadId: l.id } })
          await prisma.leadAddress.deleteMany({ where: { leadId: l.id } })
          await prisma.personalAddress.deleteMany({ where: { leadId: l.id } })
          await prisma.leadNote.deleteMany({ where: { leadId: l.id } })
          await prisma.followUp.deleteMany({ where: { leadId: l.id } })
          await prisma.scheduleVisit.deleteMany({ where: { leadId: l.id } })
          await prisma.callLog.deleteMany({ where: { leadId: l.id } })
          await prisma.whatsAppMessage.deleteMany({ where: { leadId: l.id } })
          await prisma.lead.delete({ where: { id: l.id } }).catch(() => {})
        } catch (e) {}
      }
    }

    if (category === "all" || category === "tasks") {
      await prisma.task.deleteMany({
        where: {
          status: { in: ["Archived", "Deleted", "Trash", "Cancelled"] }
        }
      })
    }

    if (category === "all" || category === "units") {
      const trashedUnits = await prisma.unitModel.findMany({
        where: { status: { in: ["Cancelled", "Refuge"] } },
        select: { id: true },
      })
      for (const unit of trashedUnits) {
        try { await permanentlyDeleteUnitModel(prisma, unit.id) } catch (error) {
          console.error(`Failed to empty unit ${unit.id}:`, error.message)
        }
      }
    }

    if (category === "all" || category === "floorplans") {
      const trashedPlans = await prisma.floorPlan.findMany({
        where: { status: { in: ["Trash", "Archived", "Inactive"] } },
        select: { id: true },
      })
      for (const plan of trashedPlans) {
        try { await permanentlyDeleteFloorPlan(prisma, plan.id) } catch (error) {
          console.error(`Failed to empty floor plan ${plan.id}:`, error.message)
        }
      }
    }

    if (category === "all" || category === "projects") {
      const inactiveProjects = await prisma.project.findMany({ where: { deletedAt: { not: null } }, select: { id: true } })
      for (const project of inactiveProjects) {
        try { await permanentlyDeleteProject(prisma, project.id) } catch (error) {
          console.error(`Failed to empty project ${project.id}:`, error.message)
        }
      }
    }

    if (category === "all" || category === "users") {
      await prisma.user.deleteMany({ where: { isActive: false } })
    }

    if (category === "all" || category === "towers") {
      const trashedTowers = await prisma.tower.findMany({
        where: { OR: [{ deletedAt: { not: null } }, { project: { deletedAt: { not: null } } }] },
        select: { id: true },
      })
      for (const tower of trashedTowers) {
        try { await permanentlyDeleteTower(prisma, tower.id) } catch (error) {
          console.error(`Failed to empty tower ${tower.id}:`, error.message)
        }
      }
    }

    if (category === "all" || category === "calllogs") {
      await prisma.callLog.deleteMany({
        where: {
          OR: [
            { deletedAt: { not: null } },
            { lead: { is_delete: true } },
            { lead: { deletedAt: { not: null } } },
          ],
        },
      })
    }

    emitReportsUpdate("bin:emptied")
    res.status(200).json({ success: true, message: "Bin emptied successfully" })
  } catch (error) {
    console.error("Empty bin error:", error)
    res.status(500).json({ message: "Failed to empty bin" })
  }
}
