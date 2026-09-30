const prisma = require("../lib/prisma")
const { UNIT_STATUS, normalizeUnitStatus, assertUnitStatusTransition } = require("../services/unitStatus.service")
const { calculateUnitPrice } = require("../utils/unitPricing")

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
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
  const pricing = calculateUnitPrice({ floorPlan, floorNumber: floor })

  return {
    baseRate: pricing.baseRate,
    basePrice: pricing.finalPrice,
    pricing,
  }
}

const generateUnitNumber = (floor, position, type = "", category = "") => {
  const floorNumber = toNumberOrNull(floor)
  const positionNumber = toNumberOrNull(position)

  if (floorNumber === null || positionNumber === null) return ""

  const isCommercial =
    String(type || "").toLowerCase().includes("commercial") ||
    String(type || "").toLowerCase().includes("retail") ||
    String(category || "").toLowerCase() === "shop"

  if (isCommercial) {
    return `SH-${String(Math.trunc(positionNumber)).padStart(2, "0")}`
  }

  return `${Math.trunc(floorNumber)}${String(Math.trunc(positionNumber)).padStart(2, "0")}`
}

const formatUnitPosition = (value) => {
  const position = toNumberOrNull(value)
  if (position === null || !Number.isInteger(position) || position < 1 || position > 99) return ""
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
  generateUnitNumber(item.floor, item.unitIndex)

const isFloorPlanGeneratedUnitItem = (item, claimedSlotKeys) => {
  const nameStr = String(item.name || "").trim().toUpperCase()
  const expectedResidential = generateUnitNumber(item.floor, item.unitIndex)
  const expectedCommercial = generateUnitNumber(item.floor, item.unitIndex, "Commercial", "Shop")
  const matchesName = nameStr === expectedResidential || nameStr === expectedCommercial
  return Boolean(matchesName) && claimedSlotKeys.has(getUnitItemClaimKey(item))
}

const getUnitItemTowerFloorPositionKey = (item) => {
  const floorNumber = toNumberOrNull(item.floor)
  const unitPosition = formatUnitPosition(item.unitIndex)
  if (!item.unit?.towerId || floorNumber === null || !unitPosition) return ""
  return `${item.unit.towerId}:${Math.trunc(floorNumber)}:${unitPosition}`
}

const getFloorSortValue = (value) => {
  const number = Number(value)
  return Number.isNaN(number) ? Number.NEGATIVE_INFINITY : number
}

const parseBhkNumber = (text) => {
  if (!text) return null
  const str = String(text).trim()
  const match = str.match(/(\d+(\.\d+)?)\s*(bhk|bed|bedroom|rk)/i)
  if (match) return Number(match[1])
  const numberMatch = str.match(/^(\d+)\s*bhk$/i)
  if (numberMatch) return Number(numberMatch[1])
  const wordMatch = str.match(/\b(one|two|three|four|five|six)\s*(bhk|bed|bedroom)/i)
  if (wordMatch) {
    const map = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }
    return map[wordMatch[1].toLowerCase()] || null
  }
  const standaloneMatch = str.match(/\b(\d+)\s*b\b/i)
  if (standaloneMatch) return Number(standaloneMatch[1])
  return null
}

const parseBathroomNumber = (text) => {
  if (!text) return null
  const str = String(text).trim()
  const match = str.match(/(\d+(\.\d+)?)\s*(t|bath|bathroom|washroom|toilet)s?\b/i)
  if (match) return Number(match[1])
  const wordMatch = str.match(/\b(one|two|three|four|five|six)\s*(t|bath|bathroom|washroom|toilet)s?\b/i)
  if (wordMatch) {
    const map = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }
    return map[wordMatch[1].toLowerCase()] || null
  }
  return null
}

const normalizeBookingDetails = (unitItem) => {
  const unit = unitItem?.unit || {}
  const floorPlan = unit.floor || {}
  const pricing = calculateUnitPrice({ floorPlan, floorNumber: unitItem?.floor })

  const rawBedrooms = floorPlan.bedrooms ?? unit.bedrooms
  const parsedBedrooms = parseBhkNumber(
    floorPlan.configurationLabel ||
    floorPlan.name ||
    floorPlan.type ||
    unit.type ||
    unit.category ||
    unit.description ||
    unitItem.name ||
    unitItem.propertyPurpose
  )
  const resolvedBedrooms = (rawBedrooms !== null && rawBedrooms !== undefined && rawBedrooms !== "")
    ? Number(rawBedrooms)
    : (parsedBedrooms ?? null)

  const rawBathrooms = floorPlan.bathrooms ?? unit.bathrooms
  const parsedBathrooms = parseBathroomNumber(
    floorPlan.configurationLabel ||
    floorPlan.name ||
    floorPlan.type ||
    unit.description ||
    unit.type ||
    unit.category
  )
  const resolvedBathrooms = (rawBathrooms !== null && rawBathrooms !== undefined && rawBathrooms !== "")
    ? Number(rawBathrooms)
    : (parsedBathrooms ?? (resolvedBedrooms ? Math.max(1, Math.min(resolvedBedrooms, 3)) : null))

  return {
    project: {
      id: unit.project?.id ?? unit.projectId,
      name: unit.project?.name || "",
      type: unit.project?.projectType || "",
    },
    tower: {
      id: unit.tower?.id ?? unit.towerId,
      name: unit.tower?.name || "",
    },
    floorPlan: {
      id: floorPlan.id,
      name: floorPlan.name || floorPlan.configurationLabel || "",
      type: floorPlan.type || "",
      category: floorPlan.category || "",
      configurationLabel: floorPlan.configurationLabel || (resolvedBedrooms ? `${resolvedBedrooms} BHK` : ""),
      bedrooms: resolvedBedrooms,
      bathrooms: resolvedBathrooms,
      kitchen: floorPlan.kitchenType || "",
      reraArea: floorPlan.carpet ?? unit.carpet,
      carpet: floorPlan.carpet ?? unit.carpet,
      saleableArea: floorPlan.saleable ?? unit.saleable,
      rateBasis: floorPlan.rateBasis || "On Carpet",
      floorPlanImages: floorPlan.floorPlanImages,
      baseRate: floorPlan.baseRate,
      floorRiseEnabled: pricing.floorRiseEnabled,
      floorRisePerSqft: pricing.floorRisePerSqft,
      baseFloorForFloorRise: pricing.riseFromFloor,
    },
    unit: {
      id: unit.id,
      unitItemId: unitItem.id,
      name: unitItem.name,
      floorNumber: unitItem.floor,
      status: unitItem.status,
      bedrooms: resolvedBedrooms,
      bathrooms: resolvedBathrooms,
    },
    pricing: {
      baseRate: pricing.baseRate,
      floorRiseEnabled: pricing.floorRiseEnabled,
      floorRiseRate: pricing.floorRiseEnabled ? pricing.floorRisePerSqft : 0,
      riseFromFloor: pricing.floorRiseEnabled ? pricing.riseFromFloor : null,
      riseSteps: pricing.floorRiseEnabled ? pricing.riseSteps : 0,
      floorRiseAmount: pricing.floorRiseEnabled ? pricing.floorRiseAmount : 0,
      effectiveRate: pricing.effectiveRate,
      totalFlatPriceAtBaseRate: pricing.basePriceAtBaseFloor,
      validationMessage: pricing.validationMessage,
    },
  }
}

exports.getUnitBookingDetails = async (req, res) => {
  try {
    const rawId = req.params.unitItemId
    const unitItemId = Number(rawId)
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined
    const towerId = req.query.towerId ? Number(req.query.towerId) : undefined
    const unitName = req.query.unit || req.query.name || (typeof rawId === "string" ? rawId : undefined)

    if (!rawId && !unitName) return res.status(400).json({ success: false, message: "Unit item ID is required" })

    let unitItem = null

    if (Number.isInteger(unitItemId) && unitItemId > 0) {
      unitItem = await prisma.unitModel.findFirst({
        where: {
          id: unitItemId,
          ...(projectId ? { unit: { projectId } } : {}),
          ...(towerId ? { unit: { towerId } } : {}),
        },
        include: {
          unit: {
            include: {
              project: true,
              tower: true,
              floor: true,
            },
          },
        },
      })

      if (!unitItem) {
        unitItem = await prisma.unitModel.findUnique({
          where: { id: unitItemId },
          include: {
            unit: {
              include: {
                project: true,
                tower: true,
                floor: true,
              },
            },
          },
        })
      }

      if (!unitItem) {
        unitItem = await prisma.unitModel.findFirst({
          where: {
            unitId: unitItemId,
            ...(projectId ? { unit: { projectId } } : {}),
            ...(towerId ? { unit: { towerId } } : {}),
          },
          include: {
            unit: {
              include: {
                project: true,
                tower: true,
                floor: true,
              },
            },
          },
        })
      }
    }

    if (!unitItem && unitName) {
      unitItem = await prisma.unitModel.findFirst({
        where: {
          name: String(unitName),
          ...(projectId ? { unit: { projectId } } : {}),
          ...(towerId ? { unit: { towerId } } : {}),
        },
        include: {
          unit: {
            include: {
              project: true,
              tower: true,
              floor: true,
            },
          },
        },
      })
    }

    if (!unitItem && rawId) {
      unitItem = await prisma.unitModel.findFirst({
        where: {
          name: String(rawId),
        },
        include: {
          unit: {
            include: {
              project: true,
              tower: true,
              floor: true,
            },
          },
        },
      })
    }

    if (!unitItem) {
      const directUnit = Number.isInteger(unitItemId) && unitItemId > 0
        ? await prisma.unit.findUnique({
            where: { id: unitItemId },
            include: { project: true, tower: true, floor: true, unitList: true },
          })
        : null

      if (directUnit) {
        const matchingChild = directUnit.unitList?.find((child) => (unitName && child.name === unitName) || child.id === unitItemId) || directUnit.unitList?.[0]
        return res.status(200).json({
          success: true,
          data: normalizeBookingDetails({
            id: matchingChild?.id || directUnit.id,
            name: matchingChild?.name || directUnit.floor?.name || `Unit ${directUnit.id}`,
            floor: matchingChild?.floor ?? directUnit.floor?.applicableFloorFrom ?? 1,
            status: matchingChild?.status || "Available",
            unit: directUnit,
          }),
        })
      }

      const directUnitByName = unitName
        ? await prisma.unit.findFirst({
            where: {
              ...(projectId ? { projectId } : {}),
              ...(towerId ? { towerId } : {}),
              unitList: { some: { name: String(unitName) } },
            },
            include: { project: true, tower: true, floor: true, unitList: true },
          })
        : null

      if (directUnitByName) {
        const matchingChild = directUnitByName.unitList?.find((child) => child.name === unitName) || directUnitByName.unitList?.[0]
        return res.status(200).json({
          success: true,
          data: normalizeBookingDetails({
            id: matchingChild?.id || directUnitByName.id,
            name: matchingChild?.name || directUnitByName.floor?.name || `Unit ${directUnitByName.id}`,
            floor: matchingChild?.floor ?? directUnitByName.floor?.applicableFloorFrom ?? 1,
            status: matchingChild?.status || "Available",
            unit: directUnitByName,
          }),
        })
      }

      return res.status(404).json({ success: false, message: "Selected unit was not found" })
    }

    return res.status(200).json({ success: true, data: normalizeBookingDetails(unitItem) })
  } catch (error) {
    console.error("getUnitBookingDetails error:", error)
    res.status(500).json({ success: false, message: error.message || "Something went wrong" })
  }
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

    if (!Number.isInteger(floor) || floor < 0) {
      return res.status(400).json({ message: "Floor cannot be negative." })
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
          },
        },
      },
    })

    if (!floorPlan) {
      return res.status(400).json({ message: "Selected floor plan must belong to the selected project and tower." })
    }

    const generatedName = generateUnitNumber(floor, unitIndex, floorPlan.type, floorPlan.category)

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
            description: payload.description || floorPlan.configurationLabel || floorPlan.name || "",
          },
        })
      } else if (payload.description) {
        unitGroup = await tx.unit.update({
          where: {
            id: unitGroup.id,
          },
          data: {
            description: payload.description,
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
              kitchenType: true,
              measure: true,
              floorPlanImages: true,
              rateBasis: true,
              carpet: true,
              builtupArea: true,
              saleable: true,
              baseRate: true,
              basePrice: true,
              floorRiseEnabled: true,
              floorRisePerSqft: true,
              baseFloorForFloorRise: true,
              applicableFloorFrom: true,
              applicableFloorTo: true,
              skippedFloors: true,
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
      const andClauses = []

      if (req.query.projectId) {
        const pId = parseInt(req.query.projectId)
        andClauses.push({
          OR: [
            { unit: { projectId: pId } },
            { unit: { floor: { is: { projectId: pId } } } },
          ],
        })
      }
      if (req.query.towerId) {
        const tId = parseInt(req.query.towerId)
        andClauses.push({
          OR: [
            { unit: { towerId: tId } },
            { unit: { floor: { is: { towerId: tId } } } },
          ],
        })
      }
      if (req.query.floor !== undefined && req.query.floor !== null && req.query.floor !== "") {
        const fNum = parseInt(req.query.floor)
        if (!Number.isNaN(fNum)) {
          andClauses.push({ floor: fNum })
        }
      }
      if (req.query.status) {
        const s = String(req.query.status).trim()
        andClauses.push({ status: s })
      }
      if (req.query.type) {
        const t = String(req.query.type).trim()
        andClauses.push({
          OR: [
            { unit: { type: { contains: t } } },
            { unit: { floor: { is: { type: { contains: t } } } } },
            { unit: { category: { contains: t } } },
            { unit: { floor: { is: { category: { contains: t } } } } },
          ],
        })
      }
      if (andClauses.length > 0) {
        unitItemConditions.AND = andClauses
      }
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10

      const unitItems = await prisma.unitModel.findMany({
        where: unitItemConditions,
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
          bookings: {
            select: {
              id: true,
              stage: true,
              customerName: true,
              leadId: true,
              lead: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  companyName: true,
                },
              },
            },
          },
          unit:{
            select:{
              id:true,
              floorId:true,
              towerId:true,
              description:true,
              type:true,
              category:true,
              bedrooms:true,
              bathrooms:true,
              measure:true,
              carpet:true,
              saleable:true,
              loading:true,
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
                  name:true
                }
              },
              floor:{
                select:{
                  id:true,
                  name:true,
                  configurationLabel:true,
                  unitStream:true,
                  type:true,
                  category:true,
                  bedrooms:true,
                  bathrooms:true,
                  kitchenType:true,
                  measure:true,
                  floorPlanImages:true,
                  rateBasis:true,
                  carpet:true,
                  builtupArea:true,
                  saleable:true,
                  baseRate:true,
                  basePrice:true,
                  floorRiseEnabled:true,
                  floorRisePerSqft:true,
                  baseFloorForFloorRise:true,
                  applicableFloorFrom:true,
                  applicableFloorTo:true,
                  skippedFloors:true,
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
                      name:true
                    }
                  }
                }
              },
            }
          },

        },
      })
      const pricedUnitItems = unitItems.map((item) => {
        const pricing = calculateUnitPrice({ floorPlan: item.unit?.floor, floorNumber: item.floor })
        const rawBedrooms = item.unit?.floor?.bedrooms ?? item.unit?.bedrooms
        const parsedBedrooms = parseBhkNumber(
          item.unit?.floor?.configurationLabel ||
          item.unit?.floor?.name ||
          item.unit?.floor?.type ||
          item.unit?.type ||
          item.unit?.category ||
          item.unit?.description ||
          item.name ||
          item.propertyPurpose
        )
        const bedrooms = (rawBedrooms !== null && rawBedrooms !== undefined && rawBedrooms !== "")
          ? Number(rawBedrooms)
          : (parsedBedrooms ?? null)

        const rawBathrooms = item.unit?.floor?.bathrooms ?? item.unit?.bathrooms
        const parsedBathrooms = parseBathroomNumber(
          item.unit?.floor?.configurationLabel ||
          item.unit?.floor?.name ||
          item.unit?.floor?.type ||
          item.unit?.description ||
          item.unit?.type
        )
        const bathrooms = (rawBathrooms !== null && rawBathrooms !== undefined && rawBathrooms !== "")
          ? Number(rawBathrooms)
          : (parsedBathrooms ?? (bedrooms ? Math.max(1, Math.min(bedrooms, 3)) : null))

        const primaryBooking = (item.bookings || [])[0]
        const leadName = primaryBooking?.customerName || (primaryBooking?.lead ? [primaryBooking.lead.firstName, primaryBooking.lead.lastName].filter(Boolean).join(" ") || primaryBooking.lead.companyName : null) || null
        const leadId = primaryBooking?.leadId || primaryBooking?.lead?.id || null

        return {
          ...item,
          leadName,
          leadId,
          bedrooms,
          bathrooms,
          configurationLabel: item.unit?.floor?.configurationLabel || (bedrooms ? `${bedrooms} BHK` : ""),
          storedBaseRate: item.baseRate,
          storedBasePrice: item.basePrice,
          baseRate: pricing.baseRate,
          basePrice: pricing.finalPrice,
          floorRisePerSqft: pricing.floorRisePerSqft,
          floorRiseSteps: pricing.floorRiseSteps,
          floorRiseAmount: pricing.floorRiseAmount,
          finalPrice: pricing.finalPrice,
          reraArea: pricing.reraArea,
          pricing,
        }
      })
      const claimedSlotKeys = await getClaimedSlotKeys(pricedUnitItems)
      const generatedUnitItems = pricedUnitItems.filter((item) => isFloorPlanGeneratedUnitItem(item, claimedSlotKeys))
      const orphanUnitItems = pricedUnitItems.filter((item) => !isFloorPlanGeneratedUnitItem(item, claimedSlotKeys))
      const seenTowerFloorPositions = new Set()
      const duplicateUnitItems = []
      const validUnitItems = generatedUnitItems.filter((item) => {
        const slotKey = getUnitItemTowerFloorPositionKey(item)
        if (!slotKey) return false
        if (seenTowerFloorPositions.has(slotKey)) {
          duplicateUnitItems.push(item)
          return false
        }
        seenTowerFloorPositions.add(slotKey)
        return true
      })
      const hideOrphans = ["false", "0", "no", "valid"].includes(String(req.query.includeOrphans || "").toLowerCase())
      const visibleUnitItems = hideOrphans ? validUnitItems : pricedUnitItems
      const floorGroups = Array.from(visibleUnitItems.reduce((groups, { unit, ...item }) => {
        const groupKey = [
          unit?.project?.id || "project",
          unit?.tower?.id || "tower",
          unit?.floor?.id || "floor",
          item.floor ?? "floor-number",
        ].join(":")

        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            id: unit?.id,
            unitList: [],
            project: unit?.project,
            tower: unit?.tower,
            floor: unit?.floor,
            floorNumber: item.floor,
            description: unit?.description,
            type: unit?.floor?.type || unit?.type,
            category: unit?.floor?.category || unit?.category,
            bedrooms: item.bedrooms ?? unit?.floor?.bedrooms ?? unit?.bedrooms,
            bathrooms: item.bathrooms ?? unit?.floor?.bathrooms ?? unit?.bathrooms,
            carpet: unit?.floor?.carpet ?? unit?.carpet,
            saleable: unit?.floor?.saleable ?? unit?.saleable,
            rateBasis: unit?.floor?.rateBasis,
          })
        }

        groups.get(groupKey).unitList.push(item)
        return groups
      }, new Map()).values()).map((group) => ({
        ...group,
        unitList: group.unitList.sort((a, b) => {
          const getPosVal = (item) => {
            const explicitIndex = Number(item.unitIndex)
            if (Number.isFinite(explicitIndex) && explicitIndex > 0) return explicitIndex
            const match = String(item.name || "").trim().match(/(\d+)$/)
            if (match) {
              if (match[1].length >= 2) {
                const lastTwo = parseInt(match[1].slice(-2), 10)
                if (!Number.isNaN(lastTwo)) return lastTwo
              }
              const val = parseInt(match[1], 10)
              if (!Number.isNaN(val)) return val
            }
            return 0
          }
          const posA = getPosVal(a)
          const posB = getPosVal(b)
          if (posA !== posB) {
            return posA - posB
          }
          return String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true })
        }),
      })).sort((a, b) => {
        const floorDiff = getFloorSortValue(b.floorNumber) - getFloorSortValue(a.floorNumber)
        if (floorDiff) return floorDiff
        const projectDiff = String(a.project?.name || "").localeCompare(String(b.project?.name || ""))
        if (projectDiff) return projectDiff
        const towerDiff = String(a.tower?.name || "").localeCompare(String(b.tower?.name || ""))
        if (towerDiff) return towerDiff
        return String(a.floor?.configurationLabel || a.floor?.name || "").localeCompare(String(b.floor?.configurationLabel || b.floor?.name || ""))
      })

      const totalFloors = floorGroups.length
      const totalPages = Math.max(1, Math.ceil(totalFloors / limit))
      const safePage = Math.min(Math.max(page, 1), totalPages)
      const startIndex = (safePage - 1) * limit
      const result = floorGroups.slice(startIndex, startIndex + limit)

      let context = {
        page: safePage,
        limit: limit,
        totalItems: visibleUnitItems.length,
        totalFloors,
        totalPages,
        orphanUnitCount: orphanUnitItems.length + duplicateUnitItems.length,
        orphanUnits: [...orphanUnitItems, ...duplicateUnitItems].map((item) => ({
          id: item.id,
          name: item.name,
          floor: item.floor,
          unitIndex: item.unitIndex,
          floorPlanId: item.unit?.floorId,
          towerId: item.unit?.towerId,
          expectedName: getExpectedGeneratedUnitName(item),
          reason: duplicateUnitItems.includes(item) ? "Duplicate tower/floor/unit position" : "Not generated by this floor plan",
        })),
        items: visibleUnitItems,
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
            tower: true,
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
                applicableFloorTo: true,
                skippedFloors: true,
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

    const generatedName = generateUnitNumber(nextFloor, nextPosition)
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

    await prisma.unitModel.update({ where: { id: unitItem.id }, data: { status: "Cancelled" } })
    res.status(200).json({ message: "Unit moved to Bin" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Something went wrong" })
  }
}

exports.listUnit = async (req, res) => {

    const record = await prisma.unit.findMany({
      where: {
        project: { deletedAt: null },
        OR: [{ towerId: null }, { tower: { deletedAt: null } }],
        floor: { status: "Active", project: { deletedAt: null } },
        unitList: { some: { status: { notIn: ["Cancelled", "Refuge"] } } },
      },
      select: {
        id: true,
        floorId: true,
        towerId: true,
        tower: {
          select: {
            id: true,
            name: true,
          },
        },
        unitList: {
          where: { status: { notIn: ["Cancelled", "Refuge"] } },
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
