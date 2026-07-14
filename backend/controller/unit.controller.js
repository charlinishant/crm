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

exports.createUnit = async (req, res) => {
  try {
    const {
      unitList,
      projectId,
      towerId,
      floorId,
      propertyPurpose,
      description,
    } = req.body

    if (!Array.isArray(unitList) || unitList.length === 0) {
      return res.status(400).json({ message: "Unit list is required" })
    }

    if (!projectId || !towerId || !floorId) {
      return res.status(400).json({
        message: "Project, tower, and floor plan are required before creating units.",
      })
    }

    const floorPlan = await prisma.floorPlan.findFirst({
      where: {
        id: Number(floorId),
        projectId: Number(projectId),
        towerId: Number(towerId),
      },
      select: {
        type: true,
        category: true,
        bedrooms: true,
        bathrooms: true,
        measure: true,
        carpet: true,
        builtupArea: true,
        saleable: true,
        loading: true,
        rateBasis: true,
        baseRate: true,
        floorRisePerSqft: true,
        baseFloorForFloorRise: true,
        applicableFloorFrom: true,
        tower: {
          select: {
            wingCode: true,
          },
        },
      },
    })

    if (!floorPlan) {
      return res.status(400).json({
        message: "Selected floor plan must belong to the selected project and tower.",
      })
    }

    if (!floorPlan.tower?.wingCode) {
      return res.status(400).json({
        message: "Selected tower needs a Wing Code before unit numbers can be generated.",
      })
    }

    const generatedUnits = unitList.map((unit) => ({
      ...unit,
      name: generateUnitNumber(floorPlan.tower.wingCode, unit.floor, unit.unitIndex),
      floor: toNumberOrNull(unit.floor),
      unitIndex: toNumberOrNull(unit.unitIndex),
    }))

    if (generatedUnits.some((unit) => !unit.name)) {
      return res.status(400).json({
        message: "Floor and Unit Position are required for every unit.",
      })
    }

    const duplicateInPayload = generatedUnits.find((unit, index) =>
      generatedUnits.findIndex((candidate) => candidate.name === unit.name) !== index
    )

    if (duplicateInPayload) {
      return res.status(400).json({
        message: `${duplicateInPayload.name} is duplicated in this unit list.`,
      })
    }

    const existingUnit = await prisma.unitModel.findFirst({
      where: {
        name: { in: generatedUnits.map((unit) => unit.name) },
        unit: {
          is: {
            projectId: Number(projectId),
            towerId: Number(towerId),
          },
        },
      },
      select: { name: true },
    })

    if (existingUnit) {
      return res.status(409).json({
        message: `${existingUnit.name} already exists in this project tower.`,
      })
    }

    const record = await prisma.unit.create({ data: {
      unitList:{
        create:generatedUnits.map(unit=>({
            ...calculateUnitPricing(floorPlan, unit.floor),
            name:unit.name,
            floor:unit.floor,
            unitIndex:unit.unitIndex,
            propertyPurpose:propertyPurpose,
            status: normalizeUnitStatus(unit.status)
        }))
      },
      projectId: Number(projectId),
      towerId: Number(towerId),
      floorId: Number(floorId),
      description,
    } })

    res.status(201).json({
      id: record.id,
      message: "Unit created successfully",
    })
  } catch (error) {
    console.log(error)

    res.status(500).json("Something went wrong")
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

      const totalItems = await prisma.unitModel.count({ where: unitItemConditions })

      const unitItems = await prisma.unitModel.findMany({
        where: unitItemConditions,
        skip: skip,
        take: limit,
        orderBy: { id: "desc" },
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
              description:true,
              project:{
                select:{
                  id:true,
                  name:true
                }
              },
              tower:{
                select:{
                  id:true,
                  name:true
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
                      name:true
                    }
                  },
                  tower:{
                    select:{
                      id:true,
                      name:true
                    }
                  }
                }
              },
            }
          },

        },
      })
      const result = unitItems.map(({ unit, ...item }) => ({
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
        totalItems: totalItems,
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
        unitList: {
          select: {
            id: true,
            name: true,
            status: true,
            heldBy: true,
            heldUntil: true,
          },
        },
      },
    })
    res.status(200).json(record)
}
