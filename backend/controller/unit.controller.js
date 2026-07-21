const prisma = require("../lib/prisma")
const { UNIT_STATUS, normalizeUnitStatus, assertUnitStatusTransition } = require("../services/unitStatus.service")

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

const getAreaForRateBasis = (floor, basis) => {
  if (basis === "On Built-up") return toNumberOrNull(floor?.builtupArea)
  if (basis === "On Saleable") return toNumberOrNull(floor?.saleable)
  return toNumberOrNull(floor?.carpet)
}

const calculateBasePrice = (baseRate, floor) => {
  const rate = toNumberOrNull(baseRate)
  const area = getAreaForRateBasis(floor, floor?.rateBasis || "On Carpet")

  if (!rate || !area) return 0
  return Number((rate * area).toFixed(2))
}

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined || value === "") return []

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }

    return trimmed.split(",").map((item) => item.trim())
  }

  return [value]
}

const getSkippedFloorSet = (value) =>
  new Set(parseJsonArray(value).map((item) => Number(item)).filter((item) => Number.isInteger(item)))

const calculateUnitPricing = (floorPlan, floor) => {
  const baseRate = toNumberOrNull(floorPlan?.baseRate) || 0
  const floorRise = toNumberOrNull(floorPlan?.floorRisePerSqft) || 0
  const baseFloor = toNumberOrNull(floorPlan?.baseFloorForFloorRise) ?? toNumberOrNull(floorPlan?.applicableFloorFrom) ?? 0
  const floorNumber = toNumberOrNull(floor) ?? baseFloor
  const effectiveRate = Number((baseRate + ((floorNumber - baseFloor) * floorRise)).toFixed(2))

  return {
    baseRate: effectiveRate,
    basePrice: calculateBasePrice(effectiveRate, floorPlan),
  }
}

const generateUnitNumber = (wingCode, floor, position) => {
  const normalizedWing = String(wingCode || "").trim().toUpperCase()
  const floorNumber = toNumberOrNull(floor)
  const positionNumber = toNumberOrNull(position)

  if (!normalizedWing || floorNumber === null || positionNumber === null) return ""
  return `${normalizedWing}-${Math.trunc(floorNumber)}${String(Math.trunc(positionNumber)).padStart(2, "0")}`
}

const formatUnitPosition = (value) => {
  const position = toNumberOrNull(value)
  if (position === null || !Number.isInteger(position) || position < 0 || position > 99) return ""
  return String(position).padStart(2, "0")
}

const assertFloorPlanSlotClaim = async (floorPlanId, towerId, floor, unitIndex) => {
  const floorNumber = toNumberOrNull(floor)
  const unitPosition = formatUnitPosition(unitIndex)

  if (floorNumber === null || !unitPosition) {
    const error = new Error("Floor and Unit Position are required for every unit.")
    error.statusCode = 400
    throw error
  }

  const slot = await prisma.floorPlanSlot.findFirst({
    where: {
      floorPlanId: Number(floorPlanId),
      towerId: Number(towerId),
      floor: Math.trunc(floorNumber),
      unitPosition,
    },
    select: { id: true },
  })

  if (!slot) {
    const error = new Error(`Floor ${Math.trunc(floorNumber)}, unit position ${unitPosition} is not part of this floor plan's generated inventory set.`)
    error.statusCode = 400
    throw error
  }
}

const assertUniqueTowerFloorPosition = async ({ towerId, floor, unitIndex, excludeUnitModelId = null }) => {
  const floorNumber = toNumberOrNull(floor)
  const positionNumber = toNumberOrNull(unitIndex)
  if (floorNumber === null || positionNumber === null) return

  const duplicate = await prisma.unitModel.findFirst({
    where: {
      ...(excludeUnitModelId ? { id: { not: Number(excludeUnitModelId) } } : {}),
      floor: Math.trunc(floorNumber),
      unitIndex: Math.trunc(positionNumber),
      unit: {
        is: {
          towerId: Number(towerId),
        },
      },
    },
    select: {
      name: true,
    },
  })

  if (duplicate) {
    const error = new Error(`Floor ${Math.trunc(floorNumber)}, unit position ${formatUnitPosition(positionNumber)} already exists in this tower as ${duplicate.name}.`)
    error.statusCode = 409
    throw error
  }
}

const getClaimedSlotKeys = async (unitItems) => {
  const floorPlanIds = Array.from(new Set(unitItems.map((item) => item.unit?.floorId).filter(Boolean)))
  if (!floorPlanIds.length) return new Set()

  const slots = await prisma.floorPlanSlot.findMany({
    where: {
      floorPlanId: { in: floorPlanIds.map(Number) },
    },
    select: {
      floorPlanId: true,
      towerId: true,
      floor: true,
      unitPosition: true,
    },
  })

  return new Set(slots.map((slot) => `${slot.floorPlanId}:${slot.towerId}:${slot.floor}:${slot.unitPosition}`))
}

const getUnitItemClaimKey = (item) =>
  `${item.unit?.floorId}:${item.unit?.towerId}:${Math.trunc(Number(item.floor))}:${formatUnitPosition(item.unitIndex)}`

const getExpectedGeneratedUnitName = (item) =>
  generateUnitNumber(item.unit?.tower?.wingCode, item.floor, item.unitIndex)

const isFloorPlanGeneratedUnitItem = (item, claimedSlotKeys) => {
  const expectedName = getExpectedGeneratedUnitName(item)
  return Boolean(expectedName) &&
    claimedSlotKeys.has(getUnitItemClaimKey(item)) &&
    String(item.name || "").trim().toUpperCase() === expectedName
}

exports.createUnit = async (req, res) => {
  try {
    const payload = req.body || {}
    const projectId = toNumberOrNull(payload.projectId)
    const towerId = toNumberOrNull(payload.towerId)
    const floorId = toNumberOrNull(payload.floorId)
    const floor = toNumberOrNull(payload.floor)
    const unitIndex = toNumberOrNull(payload.unitIndex)

    if (!projectId || !towerId || !floorId || floor === null || unitIndex === null) {
      return res.status(400).json({ message: "Project, tower, floor plan, floor, and unit position are required." })
    }

    const unitPosition = formatUnitPosition(unitIndex)
    if (!unitPosition) {
      return res.status(400).json({ message: "Unit Position must be a whole number between 0 and 99." })
    }

    const floorPlan = await prisma.floorPlan.findFirst({
      where: {
        id: floorId,
        projectId,
        towerId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        tower: {
          select: {
            id: true,
            name: true,
            wingCode: true,
          },
        },
      },
    })

    if (!floorPlan) {
      return res.status(400).json({ message: "Selected floor plan must belong to the selected project and tower." })
    }

    const generatedName = generateUnitNumber(floorPlan.tower?.wingCode, floor, unitIndex)
    if (!generatedName) {
      return res.status(400).json({ message: "Selected tower needs a Wing Code before unit numbers can be generated." })
    }

    const floorNumber = Math.trunc(floor)
    const positionNumber = Math.trunc(unitIndex)
    const pricing = calculateUnitPricing(floorPlan, floorNumber)

    const result = await prisma.$transaction(async (tx) => {
      const existingSlot = await tx.floorPlanSlot.findFirst({
        where: {
          towerId,
          floor: floorNumber,
          unitPosition,
        },
        select: {
          id: true,
          floorPlanId: true,
        },
      })

      if (existingSlot && Number(existingSlot.floorPlanId) !== floorId) {
        const error = new Error(`Floor ${floorNumber}, unit position ${unitPosition} is already used by another floor plan.`)
        error.statusCode = 409
        throw error
      }

      if (!existingSlot) {
        await tx.floorPlanSlot.create({
          data: {
            floorPlanId: floorId,
            towerId,
            floor: floorNumber,
            unitPosition,
          },
        })
      }

      const duplicateUnit = await tx.unitModel.findFirst({
        where: {
          OR: [
            {
              name: generatedName,
              unit: {
                is: {
                  towerId,
                },
              },
            },
            {
              floor: floorNumber,
              unitIndex: positionNumber,
              unit: {
                is: {
                  towerId,
                },
              },
            },
          ],
        },
        select: {
          name: true,
        },
      })

      if (duplicateUnit) {
        const error = new Error(`${duplicateUnit.name || generatedName} already exists in this tower.`)
        error.statusCode = 409
        throw error
      }

      let unitGroup = await tx.unit.findFirst({
        where: {
          projectId,
          towerId,
          floorId,
        },
        orderBy: {
          id: "desc",
        },
      })

      if (!unitGroup) {
        unitGroup = await tx.unit.create({
          data: {
            projectId,
            towerId,
            floorId,
            type: floorPlan.type,
            category: floorPlan.category,
            bedrooms: floorPlan.bedrooms,
            bathrooms: floorPlan.bathrooms === null || floorPlan.bathrooms === undefined ? null : Math.trunc(floorPlan.bathrooms),
            measure: floorPlan.measure,
            carpet: floorPlan.carpet,
            saleable: floorPlan.saleable,
            loading: floorPlan.loading,
            description: floorPlan.configurationLabel || floorPlan.name || "",
          },
        })
      }

      const unitItem = await tx.unitModel.create({
        data: {
          unitId: unitGroup.id,
          name: generatedName,
          floor: floorNumber,
          unitIndex: positionNumber,
          baseRate: payload.baseRate === undefined || payload.baseRate === "" ? pricing.baseRate : toNumberOrNull(payload.baseRate),
          basePrice: payload.basePrice === undefined || payload.basePrice === "" ? pricing.basePrice : toNumberOrNull(payload.basePrice),
          propertyPurpose: payload.propertyPurpose || floorPlan.unitStream || "Sale Unit",
          status: normalizeUnitStatus(payload.status, UNIT_STATUS.Available),
        },
      })

      return {
        ...unitGroup,
        project: floorPlan.project,
        tower: floorPlan.tower,
        floor: floorPlan,
        unitList: [unitItem],
      }
    })

    res.status(201).json(result)
  } catch (error) {
    console.log(error)
    res.status(error.statusCode || 500).json({ message: error.message || "Something went wrong" })
  }
}

exports.getUnit = async (req, res) => {
  try {
    const { id } = req.params

    if (id) {
      const result = await prisma.unit.findUnique({
        where: { id: Number(id) },
        include: {
          unitList: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          tower: {
            select: {
              id: true,
              name: true,
            },
          },
          floor: {
            select: {
              id: true,
              name: true,
              projectType: true,
              configurationLabel: true,
              type: true,
              category: true,
              bedrooms: true,
              bathrooms: true,
              measure: true,
              floorPlanImages: true,
              rateBasis: true,
              carpet: true,
              builtupArea: true,
              saleable: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  projectType: true,
                },
              },
              tower: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
      if (!result) res.status(200).json("Unit not found")
      else {
        res.status(200).json(result)
      }
    } else {
      let unitItemConditions = {}
      if (req.query.projectId) {
        unitItemConditions.unit = {
          ...(unitItemConditions.unit || {}),
          floor: {
            is: {
              ...((unitItemConditions.unit || {}).floor?.is || {}),
              projectId: parseInt(req.query.projectId),
            },
          },
        }
      }
      if (req.query.towerId) {
        unitItemConditions.unit = {
          ...(unitItemConditions.unit || {}),
          floor: {
            is: {
              ...((unitItemConditions.unit || {}).floor?.is || {}),
              towerId: parseInt(req.query.towerId),
            },
          },
        }
      }
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10

      const skip = (page - 1) * limit

      const unitItems = await prisma.unitModel.findMany({
        where: unitItemConditions,
        skip: skip,
        take: limit,
        orderBy: [
          { floor: "desc" },
          { unitIndex: "asc" },
          { id: "asc" },
        ],
        select: {
          id:true,
          name:true,
          floor:true,
          unitIndex:true,
          baseRate:true,
          basePrice:true,
          propertyPurpose:true,
          status:true,
          heldBy:true,
          heldUntil:true,
          unit:{
            select:{
              id:true,
              floorId:true,
              towerId:true,
              description:true,
              project:{
                select:{
                  id:true,
                  name:true,
                  projectType:true
                }
              },
              tower:{
                select:{
                  id:true,
                  name:true,
                  wingCode:true
                }
              },
              floor:{
                select:{
                  id:true,
                  name:true,
                  configurationLabel:true,
                  type:true,
                  category:true,
                  bedrooms:true,
                  bathrooms:true,
                  measure:true,
                  floorPlanImages:true,
                  rateBasis:true,
                  carpet:true,
                  builtupArea:true,
                  saleable:true,
                  project:{
                    select:{
                      id:true,
                      name:true,
                      projectType:true
                    }
                  },
                  tower:{
                    select:{
                      id:true,
                      name:true,
                      wingCode:true
                    }
                  }
                }
              },
            }
          },

        },
      })
      const claimedSlotKeys = await getClaimedSlotKeys(unitItems)
      const validUnitItems = unitItems.filter((item) => isFloorPlanGeneratedUnitItem(item, claimedSlotKeys))
      const orphanUnitItems = unitItems.filter((item) => !isFloorPlanGeneratedUnitItem(item, claimedSlotKeys))
      const result = validUnitItems.map(({ unit, ...item }) => ({
        id: unit?.id,
        unitList: [item],
        project: unit?.project,
        tower: unit?.tower,
        floor: unit?.floor,
        description: unit?.description,
      }))

      let context = {
        page: page,
        limit: limit,
        totalItems: validUnitItems.length,
        orphanUnitCount: orphanUnitItems.length,
        orphanUnits: orphanUnitItems.map((item) => ({
          id: item.id,
          name: item.name,
          floor: item.floor,
          unitIndex: item.unitIndex,
          floorPlanId: item.unit?.floorId,
          towerId: item.unit?.towerId,
          expectedName: getExpectedGeneratedUnitName(item),
        })),
        data: result,
      }
      res.status(200).json(context)
    }
  } catch (error) {
    console.log(error)
    res.status(500).json("something went wrong")
  }
}

exports.updateUnit = async (req, res) => {
  try {
    const data = { ...req.body }
    const id = req.params.id
    if (!id) res.status(400).json("ID is required")

    const record = await prisma.unit.findUnique({
      where: { id: parseInt(id) },
    })
    if (!record) return res.status(400).json("Unit not found")

    if (data.projectId === null || data.towerId === null || data.floorId === null) {
      return res.status(400).json({ message: "Project, tower, and floor plan cannot be removed from a unit." })
    }

    const nextProjectId = data.projectId === undefined ? record.projectId : Number(data.projectId)
    const nextTowerId = data.towerId === undefined ? record.towerId : Number(data.towerId)
    const nextFloorId = data.floorId === undefined ? record.floorId : Number(data.floorId)

    if (!nextProjectId || !nextTowerId || !nextFloorId) {
      return res.status(400).json({ message: "Project, tower, and floor plan are required for every unit." })
    }

    const matchingFloorPlan = await prisma.floorPlan.findFirst({
      where: {
        id: nextFloorId,
        projectId: nextProjectId,
        towerId: nextTowerId,
      },
      select: { id: true },
    })

    if (!matchingFloorPlan) {
      return res.status(400).json({ message: "Selected floor plan must belong to the selected project and tower." })
    }

    const result = await prisma.unit.update({
      where: { id: parseInt(record.id) },
      data: data,
    })

    res.status(200).json(result)
  } catch (error) {
    console.log(error)
    res.status(500).json("Something went wrong")
  }
}

exports.updateUnitItem = async (req, res) => {
  try {
    const id = req.params.id
    if (!id) return res.status(400).json({ message: "ID is required" })

    const payload = req.body || {}
    const existingUnit = await prisma.unitModel.findUnique({
      where: { id: Number(id) },
      include: {
        unit: {
          include: {
            tower: {
              select: {
                wingCode: true,
              },
            },
            floor: {
              select: {
                carpet: true,
                builtupArea: true,
                saleable: true,
                rateBasis: true,
                baseRate: true,
                floorRisePerSqft: true,
                baseFloorForFloorRise: true,
                applicableFloorFrom: true,
              },
            },
          },
        },
      },
    })

    if (!existingUnit) return res.status(404).json({ message: "Unit not found" })

    const nextStatus = payload.status === undefined
      ? undefined
      : assertUnitStatusTransition(existingUnit.status, normalizeUnitStatus(payload.status), {
          actorRole: req.user?.role || payload.actorRole,
          approved: Boolean(payload.approved),
          reason: payload.reason || payload.statusReason || payload.bookingCancellationReason,
          note: payload.note,
        })
    const nextFloor = payload.floor === undefined ? existingUnit.floor : payload.floor
    const nextPosition = payload.unitIndex === undefined ? existingUnit.unitIndex : payload.unitIndex
    await assertFloorPlanSlotClaim(existingUnit.unit?.floorId, existingUnit.unit?.towerId, nextFloor, nextPosition)
    await assertUniqueTowerFloorPosition({
      towerId: existingUnit.unit?.towerId,
      floor: nextFloor,
      unitIndex: nextPosition,
      excludeUnitModelId: id,
    })

    const generatedName = generateUnitNumber(existingUnit.unit?.tower?.wingCode, nextFloor, nextPosition)
    if (generatedName) {
      const duplicateUnit = await prisma.unitModel.findFirst({
        where: {
          id: { not: Number(id) },
          name: generatedName,
          unit: {
            is: {
              towerId: existingUnit.unit?.towerId,
            },
          },
        },
        select: { name: true },
      })

      if (duplicateUnit) {
        return res.status(409).json({
          message: `${generatedName} already exists in this tower.`,
        })
      }
    }

    const pricing = calculateUnitPricing(existingUnit.unit?.floor, nextFloor)
    const data = {
      name: generatedName || undefined,
      floor: payload.floor,
      unitIndex: payload.unitIndex,
      baseRate: pricing.baseRate,
      basePrice: pricing.basePrice,
      propertyPurpose: payload.propertyPurpose,
      status: nextStatus,
      heldBy: nextStatus === "Held" ? payload.heldBy || req.user?.id || existingUnit.heldBy : nextStatus ? null : undefined,
      heldUntil: nextStatus === "Held" ? (payload.heldUntil ? new Date(payload.heldUntil) : existingUnit.heldUntil) : nextStatus ? null : undefined,
    }

    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) delete data[key]
    })

    const result = await prisma.unitModel.update({
      where: { id: Number(id) },
      data,
    })

    res.status(200).json(result)
  } catch (error) {
    console.log(error)
    res.status(error.statusCode || 500).json({ message: error.message || "Something went wrong" })
  }
}

exports.holdUnitItem = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: "ID is required" })

    const holder = String(req.body?.heldBy || req.user?.id || "booking-wizard")
    const holdMinutes = Math.min(Math.max(Number(req.body?.holdMinutes) || 15, 1), 60)
    const heldUntil = new Date(Date.now() + holdMinutes * 60 * 1000)
    const existingUnit = await prisma.unitModel.findUnique({
      where: { id },
      select: { id: true, status: true, heldBy: true, heldUntil: true },
    })

    if (!existingUnit) return res.status(404).json({ message: "Unit not found" })

    let currentStatus = normalizeUnitStatus(existingUnit.status)
    if (
      currentStatus === "Held" &&
      existingUnit.heldUntil &&
      new Date(existingUnit.heldUntil).getTime() <= Date.now()
    ) {
      await prisma.unitModel.updateMany({
        where: { id, status: "Held" },
        data: { status: "Available", heldBy: null, heldUntil: null },
      })
      currentStatus = "Available"
      existingUnit.heldBy = null
      existingUnit.heldUntil = null
    }
    if (currentStatus === "Held" && existingUnit.heldBy === holder) {
      const refreshed = await prisma.unitModel.update({
        where: { id },
        data: { heldUntil },
      })
      return res.status(200).json(refreshed)
    }

    assertUnitStatusTransition(existingUnit.status, "Held", {
      actor: holder,
      action: "select-unit",
    })

    const result = await prisma.unitModel.updateMany({
      where: { id, status: "Available" },
      data: {
        status: "Held",
        heldBy: holder,
        heldUntil,
      },
    })

    if (result.count !== 1) {
      return res.status(409).json({ message: "This unit was just taken. Please refresh and pick another unit." })
    }

    const unit = await prisma.unitModel.findUnique({ where: { id } })
    res.status(200).json(unit)
  } catch (error) {
    console.log(error)
    res.status(error.statusCode || 500).json({ message: error.message || "Something went wrong" })
  }
}

exports.releaseUnitItemHold = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: "ID is required" })

    const holder = String(req.body?.heldBy || req.user?.id || "booking-wizard")
    const result = await prisma.unitModel.updateMany({
      where: {
        id,
        status: "Held",
        heldBy: holder,
      },
      data: {
        status: "Available",
        heldBy: null,
        heldUntil: null,
      },
    })

    res.status(200).json({ released: result.count === 1 })
  } catch (error) {
    console.log(error)
    res.status(error.statusCode || 500).json({ message: error.message || "Something went wrong" })
  }
}

exports.deleteUnit = async (req, res) => {
  try {
    const id = req.params.id
    if (!id) res.status(400).json("ID is required")

    const record = await prisma.unit.findUnique({
      where: { id: parseInt(id) },
      include: {
        unitList: {
          select: {
            id: true,
            name: true,
            status: true,
            _count: { select: { bookings: true } },
          },
        },
        _count: { select: { bookings: true } },
      },
    })
    if (!record) return res.status(400).json("Unit not found")

    const unitWithBookings = record.unitList.find((unit) => unit._count.bookings > 0)
    if (record._count.bookings > 0 || unitWithBookings) {
      return res.status(409).json({ message: "Cannot delete unit because booking history exists for it." })
    }

    const nonAvailableUnit = record.unitList.find(
      (unit) => normalizeUnitStatus(unit.status) !== UNIT_STATUS.Available
    )
    if (nonAvailableUnit) {
      return res.status(409).json({
        message: `Cannot delete unit ${nonAvailableUnit.name || nonAvailableUnit.id} because its status is ${normalizeUnitStatus(nonAvailableUnit.status)}. Only Available units can be deleted.`,
      })
    }

    await prisma.$transaction(async (tx) => {
      await tx.unitModel.deleteMany({ where: { unitId: record.id } })
      await tx.unit.delete({ where: { id: record.id } })
    })

    res.status(200).json("Unit deleted successfully")
  } catch (error) {
    console.log(error)
    res.status(500).json("Something went wrong")
  }
}

exports.deleteUnitItem = async (req, res) => {
  try {
    const id = req.params.id
    if (!id) return res.status(400).json({ message: "ID is required" })

    const unitItem = await prisma.unitModel.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        unitId: true,
        status: true,
        _count: { select: { bookings: true } },
      },
    })

    if (!unitItem) return res.status(404).json({ message: "Unit not found" })

    if (unitItem._count.bookings > 0) {
      return res.status(409).json({ message: "Cannot delete unit because booking history exists for it." })
    }

    const unitStatus = normalizeUnitStatus(unitItem.status)
    if (unitStatus !== UNIT_STATUS.Available) {
      return res.status(409).json({
        message: `Cannot delete unit because its status is ${unitStatus}. Only Available units can be deleted.`,
      })
    }

    await prisma.$transaction(async (tx) => {
      await tx.unitModel.delete({ where: { id: unitItem.id } })

      const remainingUnits = await tx.unitModel.count({
        where: { unitId: unitItem.unitId },
      })

      if (remainingUnits === 0) {
        const unitGroup = await tx.unit.findUnique({
          where: { id: unitItem.unitId },
          select: { _count: { select: { bookings: true } } },
        })

        if (unitGroup && unitGroup._count.bookings === 0) {
          await tx.unit.delete({ where: { id: unitItem.unitId } })
        }
      }
    })

    res.status(200).json({ message: "Unit deleted successfully" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Something went wrong" })
  }
}

exports.listUnit = async (req, res) => {

    const record = await prisma.unit.findMany({
      select: {
        id: true,
        floorId: true,
        towerId: true,
        tower: {
          select: {
            wingCode: true,
          },
        },
        unitList: {
          select: {
            id: true,
            name: true,
            floor: true,
            unitIndex: true,
            status: true,
            heldBy: true,
            heldUntil: true,
          },
        },
      },
    })
    const flatItems = record.flatMap((unit) =>
      (unit.unitList || []).map((item) => ({
        ...item,
        unit: {
          floorId: unit.floorId,
          towerId: unit.towerId,
          tower: unit.tower,
        },
      }))
    )
    const claimedSlotKeys = await getClaimedSlotKeys(flatItems)
    const filtered = record.map((unit) => ({
      ...unit,
      unitList: (unit.unitList || []).filter((item) =>
        isFloorPlanGeneratedUnitItem({
          ...item,
          unit: {
            floorId: unit.floorId,
            towerId: unit.towerId,
            tower: unit.tower,
          },
        }, claimedSlotKeys)
      ),
    })).filter((unit) => unit.unitList.length > 0)

    res.status(200).json(filtered)
}
