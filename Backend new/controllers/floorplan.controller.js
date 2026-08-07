const prisma = require("../lib/prisma")
const { UNIT_STATUS, normalizeUnitStatus } = require("../services/unitStatus.service")

const toNumberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null
    const number = Number(value)
    return Number.isNaN(number) ? null : number
}

const toIntOrNull = (value) => {
    const number = toNumberOrNull(value)
    return number === null ? null : Math.trunc(number)
}

const toBoolean = (value) => {
    if (typeof value === "boolean") return value
    if (value === "true" || value === "1" || value === 1) return true
    return false
}

const toDateOrNull = (value) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

const toArray = (value) => {
    if (Array.isArray(value)) return value
    if (!value) return []
    if (typeof value === "string") {
        const trimmed = value.trim()
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                const parsed = JSON.parse(trimmed)
                return Array.isArray(parsed) ? parsed : []
            } catch {
                return []
            }
        }
    }
    return String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
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

const normalizeSkippedFloors = (value, from, to) => {
    const values = parseJsonArray(value)
    if (!values.length) return { floors: [], error: null }
    if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
        return { floors: [], error: "Select a valid applicable floor range before entering skipped floors." }
    }

    const normalized = []
    for (const item of values) {
        const text = String(item).trim()
        if (!/^\d+$/.test(text)) {
            return { floors: [], error: `Skipped floors must contain unique whole floor numbers between ${from} and ${to}.` }
        }

        const floor = Number(text)
        if (!Number.isInteger(floor) || floor < from || floor > to) {
            return { floors: [], error: `Skipped floors must contain unique whole floor numbers between ${from} and ${to}.` }
        }

        normalized.push(floor)
    }

    return { floors: Array.from(new Set(normalized)).sort((a, b) => a - b), error: null }
}

const isPublishedStatus = (status) => String(status || "").toLowerCase() === "published"

const getAreaForBasis = (data, basis) => {
    if (basis === "On Saleable") return data.saleable
    if (basis === "On Built-up") return data.builtupArea
    return data.carpet
}

const roundMoney = (value) => Number((Number(value) || 0).toFixed(2))

const getFloorPlanErrorMessage = (error, fallback = "Something went wrong") => {
    if (!error) return fallback

    if (error.code === "P2002") {
        return "Another floor plan already claims one of these tower / floor / unit-position slots"
    }

    if (error.meta?.cause) return error.meta.cause
    if (error.meta?.field_name) return `${error.meta.field_name} is invalid`
    if (error.code) return `${error.code}: ${error.message || fallback}`
    if (error.message) return error.message

    return fallback
}

const validateFloorPlan = (data) => {
    if (!data.projectId) {
        return "Project is required for every floor plan"
    }

    if (!data.towerId) {
        return "Tower is required for every floor plan"
    }

    if (!parseUnitPositions(data.unitPosition).length) {
        return "Enter at least one valid Unit Position, for example 01 or 01, 02, 03"
    }

    if (data.applicableFloorFrom === null || data.applicableFloorTo === null) {
        return "Applicable Floor From and Applicable Floor To are required"
    }

    if (data.validationError) {
        return data.validationError
    }

    if (
        data.applicableFloorFrom !== null &&
        data.applicableFloorTo !== null &&
        data.applicableFloorFrom > data.applicableFloorTo
    ) {
        return "Applicable Floor From must be less than or equal to Applicable Floor To"
    }

    if (data.applicableFloorFrom !== null && data.applicableFloorFrom < 1) {
        return "Applicable Floor From must be at least 1"
    }

    if (data.applicableFloorTo !== null && data.applicableFloorTo < 1) {
        return "Applicable Floor To must be at least 1"
    }

    if (data.loading !== null && (data.loading < 0 || data.loading > 100)) {
        return "Loading % must be between 0 and 100"
    }

    if (data.gstPercent !== null && data.gstPercent > 18) {
        return "GST % cannot exceed 18"
    }

    if (data.stampDutyPercent !== null && data.stampDutyPercent > 10) {
        return "Stamp Duty % cannot exceed 10"
    }

    if (
        data.carpet !== null &&
        data.builtupArea !== null &&
        data.saleable !== null &&
        !(data.carpet < data.builtupArea && data.builtupArea < data.saleable)
    ) {
        return "RERA Carpet must be less than Built-up Area and Built-up Area must be less than Saleable Area"
    }

    if (
        isPublishedStatus(data.status) &&
        (!Array.isArray(data.floorPlanImages) || data.floorPlanImages.length === 0)
    ) {
        return "Floor Plan Image is required before publishing a floor plan"
    }

    return null
}

const validateFloorPlanTowerBounds = async (data) => {
    const tower = await prisma.tower.findUnique({
        where: { id: data.towerId },
        select: {
            id: true,
            projectId: true,
            totalFloor: true,
            skippedFloors: true,
        },
    })

    if (!tower) {
        return "Selected tower was not found"
    }

    if (Number(tower.projectId) !== Number(data.projectId)) {
        return "Selected tower must belong to the selected project"
    }

    const totalFloors = Number(tower.totalFloor) || 0
    if (totalFloors < 1) {
        return "Selected tower must have Total Floors set to at least 1 before adding floor plans"
    }

    if (data.applicableFloorTo !== null && data.applicableFloorTo > totalFloors) {
        return `Applicable Floor To cannot exceed this tower's Total Floors (${totalFloors})`
    }

    return null
}

const applyDerivedFloorPlanFields = async (data) => {
    const tower = await prisma.tower.findUnique({
        where: { id: data.towerId },
        select: { wingCode: true },
    })
    const inheritedData = {
        ...data,
        skippedFloors: data.skippedFloors || "[]",
    }

    return {
        ...inheritedData,
        totalUnitsOfPlan: getClaimedSlots(inheritedData).length,
        unitNumbers: getClaimedSlots(inheritedData)
            .map((slot) => buildGeneratedUnitNumber(tower?.wingCode, slot.floor, slot.unitPosition))
            .filter(Boolean)
            .join(", ") || null,
    }
}

const parseSkippedFloorSet = (value) =>
    new Set(parseJsonArray(value).map((item) => Number(item)).filter((item) => Number.isInteger(item)))

const getClaimedFloors = (data) => {
    const from = Number(data.applicableFloorFrom)
    const to = Number(data.applicableFloorTo)

    if (!Number.isInteger(from) || !Number.isInteger(to) || from > to || !data.unitPosition) {
        return []
    }

    const skippedFloors = parseSkippedFloorSet(data.skippedFloors)
    const floors = []

    for (let floor = from; floor <= to; floor += 1) {
        if (!skippedFloors.has(floor)) {
            floors.push(floor)
        }
    }

    return floors
}

const parseUnitPositions = (value) =>
    Array.from(new Set(String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
            const position = Number(item)
            if (!Number.isInteger(position) || position < 0 || position > 99) return ""
            return String(position).padStart(2, "0")
        })
        .filter(Boolean)))

const getClaimedSlots = (data) => {
    const positions = parseUnitPositions(data.unitPosition)
    if (!positions.length) return []

    return getClaimedFloors(data).flatMap((floor) =>
        positions.map((unitPosition) => ({
            floor,
            unitPosition,
        }))
    )
}

const validateFloorPlanSlotClaims = async (data, excludeFloorPlanId = null) => {
    const claimedSlots = new Set(
        getClaimedSlots(data).map((slot) => `${slot.floor}:${slot.unitPosition}`)
    )
    if (!claimedSlots.size) return null

    const conflictingPlans = await prisma.floorPlan.findMany({
        where: {
            towerId: data.towerId,
            unitPosition: { not: null },
            ...(excludeFloorPlanId ? { id: { not: excludeFloorPlanId } } : {}),
            applicableFloorFrom: { lte: data.applicableFloorTo },
            applicableFloorTo: { gte: data.applicableFloorFrom },
        },
        select: {
            id: true,
            name: true,
            applicableFloorFrom: true,
            applicableFloorTo: true,
            skippedFloors: true,
            unitPosition: true,
        },
    })

    for (const plan of conflictingPlans) {
        const overlapSlot = getClaimedSlots(plan).find((slot) =>
            claimedSlots.has(`${slot.floor}:${slot.unitPosition}`)
        )
        if (overlapSlot) {
            const planName = plan.name || `Floor Plan #${plan.id}`
            return `${planName} already claims floor ${overlapSlot.floor}, unit position ${overlapSlot.unitPosition} in this tower.`
        }
    }

    return null
}

const replaceFloorPlanSlotClaims = async (tx, floorPlan) => {
    await tx.floorPlanSlot.deleteMany({
        where: { floorPlanId: floorPlan.id },
    })

    const slots = getClaimedSlots(floorPlan)
    if (!slots.length) return

    await tx.floorPlanSlot.createMany({
        data: slots.map((slot) => ({
            floorPlanId: floorPlan.id,
            towerId: floorPlan.towerId,
            floor: slot.floor,
            unitPosition: slot.unitPosition,
        })),
    })
}

const normalizeFloorPlanPayload = (body) => {
    const autoCalc = body.autoCalc === undefined ? true : toBoolean(body.autoCalc)
    const data = {
        name: String(body.name || "").trim(),
        projectId: toIntOrNull(body.projectId),
        towerId: toIntOrNull(body.towerId),
        configurationLabel: body.configurationLabel || null,
        status: body.status || "Draft",
        unitStream: body.unitStream || "Sale Unit",
        reraReference: null,
        reraNumber: null,
        reraDate: null,
        possessionDate: toDateOrNull(body.possessionDate),
        type: body.type || null,
        category: body.category || null,
        bedrooms: toIntOrNull(body.bedrooms),
        bathrooms: toNumberOrNull(body.bathrooms),
        balconies: toIntOrNull(body.balconies),
        kitchenType: body.kitchenType || null,
        additionalRooms: toArray(body.additionalRooms),
        applicableFloorFrom: toIntOrNull(body.applicableFloorFrom),
        applicableFloorTo: toIntOrNull(body.applicableFloorTo),
        unitPosition: parseUnitPositions(body.unitPosition).join(", ") || null,
        skippedFloors: null,
        unitNumbers: body.unitNumbers || null,
        totalUnitsOfPlan: null,
        facing: body.facing || null,
        cornerUnit: toBoolean(body.cornerUnit),
        view: toArray(body.view),
        autoCalc,
        measure: body.measure || "sqft",
        carpet: toNumberOrNull(body.carpet),
        builtupArea: toNumberOrNull(body.builtupArea),
        loading: toNumberOrNull(body.loading),
        loadingBasis: body.loadingBasis || "On Carpet",
        balconyArea: toNumberOrNull(body.balconyArea),
        enclosedBalconyUtility: toNumberOrNull(body.enclosedBalconyUtility),
        terraceArea: toNumberOrNull(body.terraceArea),
        flowerBedPocketTerrace: toNumberOrNull(body.flowerBedPocketTerrace),
        serviceSlabAcLedge: toNumberOrNull(body.serviceSlabAcLedge),
        refugeAreaShare: toNumberOrNull(body.refugeAreaShare),
        parkingRequired: body.parkingRequired || null,
        carParkingSlots: toIntOrNull(body.carParkingSlots),
        parkingType: body.parkingType || null,
        twoWheelerSlots: toIntOrNull(body.twoWheelerSlots),
        basementStoreroom: toNumberOrNull(body.basementStoreroom),
        rateBasis: body.rateBasis || "On Carpet",
        baseRate: toNumberOrNull(body.baseRate),
        floorRisePerSqft: toNumberOrNull(body.floorRisePerSqft),
        baseFloorForFloorRise: toIntOrNull(body.baseFloorForFloorRise),
        cornerPlcPercent: toNumberOrNull(body.cornerPlcPercent),
        viewPlcPercent: toNumberOrNull(body.viewPlcPercent),
        facingPlcPercent: toNumberOrNull(body.facingPlcPercent),
        clubMembership: toNumberOrNull(body.clubMembership),
        infrastructureDevelopmentCharges: toNumberOrNull(body.infrastructureDevelopmentCharges),
        infrastructureDevelopmentChargeBasis: body.infrastructureDevelopmentChargeBasis || null,
        legalDocumentation: toNumberOrNull(body.legalDocumentation),
        gstPercent: toNumberOrNull(body.gstPercent) ?? 5,
        stampDutyPercent: toNumberOrNull(body.stampDutyPercent) ?? 6,
        registrationPercent: toNumberOrNull(body.registrationPercent) ?? 1,
        registrationAmount: toNumberOrNull(body.registrationAmount),
        parkingCharges: toNumberOrNull(body.parkingCharges),
        advanceMaintenanceMonths: toIntOrNull(body.advanceMaintenanceMonths),
        maintenanceRatePerSqftPerMonth: toNumberOrNull(body.maintenanceRatePerSqftPerMonth),
        sinkingFundCorpus: toNumberOrNull(body.sinkingFundCorpus),
        societyFormationCharges: toNumberOrNull(body.societyFormationCharges),
        floorPlanImages: toArray(body.floorPlanImages),
        brochurePageReference: body.brochurePageReference || null,
        walkthrough3dLink: body.walkthrough3dLink || null,
        paymentPlan: body.paymentPlan || null,
        allotmentLetterTemplate: body.allotmentLetterTemplate || null,
        agreementTemplate: body.agreementTemplate || null,
    }

    if (autoCalc && data.loading !== null) {
        const basisArea = data.loadingBasis === "On Built-up" ? data.builtupArea : data.carpet
        if (basisArea !== null) {
            data.saleable = Number((basisArea * (1 + data.loading / 100)).toFixed(2))
        } else {
            data.saleable = toNumberOrNull(body.saleable)
        }
    } else {
        data.saleable = toNumberOrNull(body.saleable)
    }

    const rateArea = getAreaForBasis(data, data.rateBasis)
    if (data.baseRate !== null && rateArea !== null) {
        data.basePrice = roundMoney(data.baseRate * rateArea)
    } else {
        data.basePrice = 0
    }

    data.coverArea = data.builtupArea
    const skippedFloors = normalizeSkippedFloors(
        body.skippedFloors,
        data.applicableFloorFrom,
        data.applicableFloorTo
    )
    if (skippedFloors.error) {
        data.validationError = skippedFloors.error
    }
    data.skippedFloors = JSON.stringify(skippedFloors.floors)
    data.totalUnitsOfPlan = getClaimedSlots(data).length

    return data
}

const buildFloorPlanMutationData = (data, { allowDisconnect = false } = {}) => {
    const { projectId, towerId, validationError, ...payload } = data

    payload.project = { connect: { id: projectId } }

    payload.tower = { connect: { id: towerId } }

    return payload
}

const getUnitPricingForFloor = (floorPlan, floor) => {
    const baseRate = Number(floorPlan.baseRate) || 0
    const floorRise = Number(floorPlan.floorRisePerSqft) || 0
    const baseFloor = Number.isInteger(Number(floorPlan.baseFloorForFloorRise))
        ? Number(floorPlan.baseFloorForFloorRise)
        : Number(floorPlan.applicableFloorFrom) || 0
    const area = Number(getAreaForBasis(floorPlan, floorPlan.rateBasis)) || 0
    const floorNumber = Number(floor) || baseFloor
    const effectiveRate = roundMoney(baseRate + ((floorNumber - baseFloor) * floorRise))
    const basePrice = roundMoney(effectiveRate * area)

    return {
        baseRate: effectiveRate,
        basePrice,
    }
}

const buildGeneratedUnitNumber = (wingCode, floor, unitPosition) => {
    const code = String(wingCode || "").trim().toUpperCase()
    if (!code || !Number.isInteger(Number(floor)) || !unitPosition) return ""

    return `${code}-${Number(floor)}${String(unitPosition).padStart(2, "0")}`
}

const formatFloorPlanResponse = (floorPlan) => {
    if (!floorPlan || typeof floorPlan !== "object") return floorPlan
    const skippedFloors = parseJsonArray(floorPlan.skippedFloors)
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item))
        .sort((a, b) => a - b)

    return {
        ...floorPlan,
        skippedFloors,
        eligibleFloorCount: getClaimedFloors({ ...floorPlan, skippedFloors }).length,
        totalUnitsOfPlan: getClaimedSlots({ ...floorPlan, skippedFloors }).length,
    }
}

const createUnitsFromFloorPlanTemplate = async (tx, floorPlan) => {
    if (!isPublishedStatus(floorPlan.status)) return null

    const tower = floorPlan.tower?.wingCode
        ? floorPlan.tower
        : await tx.tower.findUnique({
            where: { id: floorPlan.towerId },
            select: { wingCode: true },
        })
    const wingCode = tower?.wingCode
    const generatedUnits = getClaimedSlots(floorPlan)
        .map((slot) => ({
            name: buildGeneratedUnitNumber(wingCode, slot.floor, slot.unitPosition),
            floor: slot.floor,
            unitIndex: Number(slot.unitPosition),
        }))
        .filter((unit) => unit.name)

    if (!generatedUnits.length) return null

    const existingUnits = await tx.unitModel.findMany({
        where: {
            name: { in: generatedUnits.map((unit) => unit.name) },
            unit: { is: { towerId: floorPlan.towerId } },
        },
        select: {
            name: true,
            unit: {
                select: {
                    floorId: true,
                    floor: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    })
    const conflictingUnit = existingUnits.find((unit) => Number(unit.unit?.floorId) !== Number(floorPlan.id))
    if (conflictingUnit) {
        const error = new Error(
            `${conflictingUnit.name} already exists in this tower from ${conflictingUnit.unit?.floor?.name || "another floor plan"}.`
        )
        error.statusCode = 409
        throw error
    }

    const existingNames = new Set(existingUnits.map((unit) => unit.name))
    const unitsToCreate = generatedUnits.filter((unit) => !existingNames.has(unit.name))

    if (!unitsToCreate.length) {
        return tx.unit.findFirst({
            where: { floorId: floorPlan.id },
            orderBy: { id: "desc" },
        })
    }

    return tx.unit.create({
        data: {
            projectId: floorPlan.projectId,
            towerId: floorPlan.towerId,
            floorId: floorPlan.id,
            type: floorPlan.type,
            category: floorPlan.category,
            bedrooms: floorPlan.bedrooms,
            bathrooms: floorPlan.bathrooms === null || floorPlan.bathrooms === undefined ? null : Math.trunc(floorPlan.bathrooms),
            measure: floorPlan.measure,
            carpet: floorPlan.carpet,
            saleable: floorPlan.saleable,
            loading: floorPlan.loading,
            description: floorPlan.configurationLabel || floorPlan.name || "",
            unitList: {
                create: unitsToCreate.map((unit) => {
                    const pricing = getUnitPricingForFloor(floorPlan, unit.floor)

                    return {
                        name: unit.name,
                        floor: unit.floor,
                        unitIndex: unit.unitIndex,
                        baseRate: pricing.baseRate,
                        basePrice: pricing.basePrice,
                        propertyPurpose: floorPlan.unitStream || "Sale",
                        status: "Available",
                    }
                }),
            },
        },
    })
}

const getGeneratedUnitNamesForFloorPlan = async (tx, floorPlan) => {
    const tower = floorPlan.tower?.wingCode
        ? floorPlan.tower
        : await tx.tower.findUnique({
            where: { id: floorPlan.towerId },
            select: { wingCode: true },
        })
    const wingCode = tower?.wingCode

    return new Set(
        getClaimedSlots(floorPlan)
            .map((slot) => buildGeneratedUnitNumber(wingCode, slot.floor, slot.unitPosition))
            .filter(Boolean)
    )
}

const removeUnitsNoLongerClaimed = async (tx, floorPlan) => {
    const expectedNames = await getGeneratedUnitNamesForFloorPlan(tx, floorPlan)
    const unitGroups = await tx.unit.findMany({
        where: { floorId: floorPlan.id },
        select: {
            id: true,
            _count: { select: { bookings: true } },
            unitList: {
                select: {
                    id: true,
                    name: true,
                    floor: true,
                    status: true,
                    _count: { select: { bookings: true } },
                },
            },
        },
    })

    const removableUnitIds = []

    for (const group of unitGroups) {
        for (const unit of group.unitList || []) {
            if (expectedNames.has(unit.name)) continue

            const isProtected =
                group._count.bookings > 0 ||
                unit._count.bookings > 0 ||
                normalizeUnitStatus(unit.status) !== UNIT_STATUS.Available

            if (isProtected) {
                const error = new Error(
                    `Floor ${unit.floor || unit.name || unit.id} cannot be skipped because ${unit.name || "this unit"} is linked to an active booking or protected inventory status. Resolve it before updating this floor plan.`
                )
                error.statusCode = 409
                throw error
            }

            removableUnitIds.push(unit.id)
        }
    }

    if (removableUnitIds.length) {
        await tx.unitModel.deleteMany({
            where: { id: { in: removableUnitIds } },
        })
    }

    const refreshedGroups = await tx.unit.findMany({
        where: { floorId: floorPlan.id },
        select: {
            id: true,
            _count: { select: { unitList: true, bookings: true } },
        },
    })

    const emptyGroupIds = refreshedGroups
        .filter((group) => group._count.unitList === 0 && group._count.bookings === 0)
        .map((group) => group.id)

    if (emptyGroupIds.length) {
        await tx.unit.deleteMany({
            where: { id: { in: emptyGroupIds } },
        })
    }
}

const refreshGeneratedUnitPricing = async (tx, floorPlan) => {
    const unitGroups = await tx.unit.findMany({
        where: { floorId: floorPlan.id },
        include: {
            unitList: true,
        },
    })

    await Promise.all(
        unitGroups.flatMap((group) =>
            group.unitList.map((unit) => {
                const pricing = getUnitPricingForFloor(floorPlan, unit.floor)

                return tx.unitModel.update({
                    where: { id: unit.id },
                    data: {
                        baseRate: pricing.baseRate,
                        basePrice: pricing.basePrice,
                    },
                })
            })
        )
    )
}


exports.createFloor = async (req, res)=>{
    try {
        const data = normalizeFloorPlanPayload(req.body)
        const validationError = validateFloorPlan(data)
        if (validationError) {
            return res.status(400).json({ message: validationError })
        }
        const towerValidationError = await validateFloorPlanTowerBounds(data)
        if (towerValidationError) {
            return res.status(400).json({ message: towerValidationError })
        }

        const inheritedData = await applyDerivedFloorPlanFields(data)
        const slotValidationError = await validateFloorPlanSlotClaims(inheritedData)
        if (slotValidationError) {
            return res.status(400).json({ message: slotValidationError })
        }

        const { record, generatedUnitGroup } = await prisma.$transaction(async (tx) => {
            const record = await tx.floorPlan.create({
                data: buildFloorPlanMutationData(inheritedData),
            })
            await replaceFloorPlanSlotClaims(tx, record)
            const generatedUnitGroup = await createUnitsFromFloorPlanTemplate(tx, record)

            return { record, generatedUnitGroup }
        })

        res.status(201).json({
            "id":record.id,
            "unitGroupId": generatedUnitGroup?.id || null,
            "unitCount": getClaimedSlots(record).length,
            "message":"floor plan created successfully"
        })

    } catch (error) {
        console.log(error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message })
        }

        res.status(500).json({
            message: getFloorPlanErrorMessage(error, "Failed to create floor plan"),
        })
    }
}

exports.getFloor  = async (req, res)=>{
    try{
        const {id}  = req.params

        if(id){
            const result = await prisma.floorPlan.findUnique({where:{id:Number(id)}})
            if(!result)
                res.status(200).json("Floor plan not found")
            else{
                res.status(200).json(formatFloorPlanResponse(result))
            }
        }
        else{
            let conditions = {}
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 10
            
            const skip = (page-1)*limit

            const totalItems = await prisma.floorPlan.count({where:conditions})

            const result = await prisma.floorPlan.findMany({
                where:conditions,
                skip:skip,
                take:limit,
                select:{
                    id:true,
                    name:true,
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
                    configurationLabel:true,
                    status:true,
                    unitStream:true,
                    type:true,
                    category:true,
                    bedrooms:true,
                    bathrooms:true,
                    balconies:true,
                    carpet:true,
                    builtupArea:true,
                    saleable:true,
                    loading:true,
                    loadingBasis:true,
                    rateBasis:true,
                    measure:true,
                    baseRate:true,
                    basePrice:true,
                    floorRisePerSqft:true,
                    baseFloorForFloorRise:true,
                    applicableFloorFrom:true,
                    applicableFloorTo:true,
                    unitPosition:true,
                    skippedFloors:true,
                    unitNumbers:true,
                    totalUnitsOfPlan:true,
                }
            })

            let context = {
                page:page,
                limit:limit,
                totalItems:totalItems,
                data:result.map(formatFloorPlanResponse)
            }
            res.status(200).json(context)
        }
    }
    catch(error){
        console.log(error);
        res.status(500).json({
            message: getFloorPlanErrorMessage(error, "Failed to load floor plan"),
        })
    }
}

exports.updateFloor = async (req, res)=>{
    try {
        const data = normalizeFloorPlanPayload(req.body)
        const validationError = validateFloorPlan(data)
        if (validationError) {
            return res.status(400).json({ message: validationError })
        }
        const towerValidationError = await validateFloorPlanTowerBounds(data)
        if (towerValidationError) {
            return res.status(400).json({ message: towerValidationError })
        }
        const id = req.params.id
        if(!id) {
            return res.status(400).json("ID is required")
        }

        const record = await prisma.floorPlan.findUnique({
            where:{id:parseInt(id)},
            include:{ _count:{ select:{ units:true } } },
        })
        if(!record) {
            return res.status(400).json("Floor plan not found")
        }

        const inheritedData = await applyDerivedFloorPlanFields(data)
        const slotValidationError = await validateFloorPlanSlotClaims(inheritedData, record.id)
        if (slotValidationError) {
            return res.status(400).json({ message: slotValidationError })
        }

        const result = await prisma.$transaction(async (tx) => {
            await tx.floorPlanSlot.deleteMany({
                where: { floorPlanId: record.id },
            })

            const updated = await tx.floorPlan.update({
                where:{id:parseInt(record.id)},
                data: buildFloorPlanMutationData(inheritedData)
            })
            await replaceFloorPlanSlotClaims(tx, updated)
            await removeUnitsNoLongerClaimed(tx, updated)
            if (isPublishedStatus(updated.status)) {
                await createUnitsFromFloorPlanTemplate(tx, updated)
                await refreshGeneratedUnitPricing(tx, updated)
            }

            return updated
        })

        res.status(200).json(formatFloorPlanResponse(result))
    } catch (error) {
        console.log(error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message })
        }
        res.status(500).json({
            message: getFloorPlanErrorMessage(error, "Failed to update floor plan"),
        })
    }
}

exports.deleteFloor = async (req, res)=>{
    try {
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const record = await prisma.floorPlan.findUnique({
            where:{id:parseInt(id)},
            include:{
                units:{
                    select:{
                        id:true,
                        _count:{ select:{ bookings:true } },
                        unitList:{
                            select:{
                                id:true,
                                name:true,
                                status:true,
                                _count:{ select:{ bookings:true } },
                            },
                        },
                    },
                },
            },
        })
        if(!record) {
            return res.status(400).json("Floor plan not found")
        }

        const unitGroups = record.units || []
        const unitGroupWithBookings = unitGroups.find((unitGroup) => unitGroup._count.bookings > 0)
        const generatedUnits = unitGroups.flatMap((unitGroup) => unitGroup.unitList || [])
        const unitWithBookings = generatedUnits.find((unit) => unit._count.bookings > 0)

        if (unitGroupWithBookings || unitWithBookings) {
            return res.status(409).json({
                message: "Cannot delete floor plan because booking history exists under it.",
            })
        }

        const nonAvailableUnit = generatedUnits.find(
            (unit) => normalizeUnitStatus(unit.status) !== UNIT_STATUS.Available
        )
        if (nonAvailableUnit) {
            return res.status(409).json({
                message: `Cannot delete floor plan because unit ${nonAvailableUnit.name || nonAvailableUnit.id} is ${normalizeUnitStatus(nonAvailableUnit.status)}. Only Available generated units can be deleted first.`,
            })
        }

        if (unitGroups.length > 0) {
            return res.status(409).json({
                message: "Cannot delete floor plan because generated units exist under it. Delete Available units first.",
            })
        }

        const data = await prisma.floorPlan.delete({where:{id:record.id}})

        res.status(200).json("Floor plan deleted successfully")
        
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
    }
}

exports.listFloor = async (req, res)=>{
    const towerId =  req.query.towerId || null
    if(towerId)
    {
        const record = await prisma.floorPlan.findMany({
            where:{towerId:parseInt(towerId)},
        select:{
            id:true,
            name:true
    }})
        res.status(200).json(record)
    }
    else{
        const record = await prisma.floorPlan.findMany({select:{
            id:true,
            name:true
        }})
        res.status(200).json(record)
    }   
}
