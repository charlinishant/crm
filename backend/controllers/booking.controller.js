const prisma = require("../lib/prisma")
const { emitReportsUpdate } = require("../socket/socket")
const { buildBookingDocumentContext, mergeTemplate } = require("./postSales.utils")
const { UNIT_STATUS, normalizeUnitStatus, assertUnitStatusTransition } = require("../services/unitStatus.service")
const { calculateUnitPrice } = require("../utils/unitPricing")
const { calculateBookingPrice, normalizeOtherExpenses } = require("../utils/bookingPricing")

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

const toNumberOrZero = (value) => {
  const number = toNumberOrNull(value)
  return number === null ? 0 : number
}

const toNonNegativeNumberOrNull = (value, label) => {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) {
    const error = new Error(`${label} must be a valid non-negative number`)
    error.statusCode = 400
    throw error
  }
  return number
}

const toBoolean = (value) => value === true || value === "true" || value === "Yes" || value === "1" || value === 1

const toNonNegativeIntOrNull = (value, label) => {
  const number = toNonNegativeNumberOrNull(value, label)
  if (number === null) return null
  if (!Number.isInteger(number)) {
    const error = new Error(`${label} must be a whole number`)
    error.statusCode = 400
    throw error
  }
  return number
}

const normalizeBookingCharges = (data = {}) => {
  const agreementValue = toNumberOrZero(data.agreementValue)
  const standardRows = [
    ["GST", "GST", "Percentage", toNonNegativeNumberOrNull(data.gstPercent, "GST %"), agreementValue * (toNumberOrZero(data.gstPercent) / 100), true],
    ["STAMP_DUTY", "Stamp Duty", "Percentage", toNonNegativeNumberOrNull(data.stampDutyPercent, "Stamp Duty %"), agreementValue * (toNumberOrZero(data.stampDutyPercent) / 100), false],
    ["REGISTRATION", "Registration Charges", "Fixed", null, toNonNegativeNumberOrNull(data.registrationAmount, "Registration Charges") || 0, false],
    ["LEGAL", "Legal Documentation Charges", "Fixed", null, toNonNegativeNumberOrNull(data.legalDocumentationCharges, "Legal Documentation Charges") || 0, false],
    ["DEVELOPMENT", "Infrastructure/Development Charges", "Fixed", null, toNonNegativeNumberOrNull(data.infrastructureDevelopmentCharges, "Infrastructure/Development Charges") || 0, false],
    ["SOCIETY", "Society Formation Charges", "Fixed", null, toNonNegativeNumberOrNull(data.societyFormationCharges, "Society Formation Charges") || 0, false],
    ["CLUB", "Club Membership Charges", "Fixed", null, toNonNegativeNumberOrNull(data.clubMembershipCharges, "Club Membership Charges") || 0, false],
    ["SINKING_FUND", "Sinking Fund/Corpus", "Fixed", null, toNonNegativeNumberOrNull(data.sinkingFundCorpus, "Sinking Fund/Corpus") || 0, false],
    ["PARKING", "Parking Charges", "Fixed", null, toNonNegativeNumberOrNull(data.parkingAmount ?? data.parkingCharges, "Parking Charges") || 0, false],
  ]

  const customRows = (Array.isArray(data.customOtherCharges) ? data.customOtherCharges : [])
    .filter((row) => row && String(row.name || "").trim())
    .map((row) => {
      const chargeType = row.chargeType === "Percentage" ? "Percentage" : "Fixed"
      const rate = chargeType === "Percentage"
        ? toNonNegativeNumberOrNull(row.rate, `${row.name} percentage`)
        : null
      const amount = chargeType === "Percentage"
        ? agreementValue * ((rate || 0) / 100)
        : toNonNegativeNumberOrNull(row.amount ?? row.rate, `${row.name} amount`) || 0

      return {
        code: "CUSTOM",
        name: String(row.name).trim(),
        chargeType,
        rate,
        amount,
        taxable: toBoolean(row.taxable),
      }
    })

  return standardRows
    .map(([code, name, chargeType, rate, amount, taxable]) => ({ code, name, chargeType, rate, amount, taxable }))
    .concat(customRows)
}

const buildBookingPriceSnapshot = (unitItem, data = {}) => {
  const unit = unitItem?.unit || {}
  const floor = unit.floor || {}
  const pricing = calculateUnitPrice({ floorPlan: floor, floorNumber: unitItem?.floor })
  const bookingPricing = calculateBookingPrice({ unitItem, data })
  const rateBasis = pricing.rateBasis || data.rateBasis || floor.rateBasis || "On Carpet"
  const carpetArea = toNumberOrZero(unit.carpet ?? floor.carpet ?? data.carpetArea)
  const builtupArea = toNumberOrZero(floor.builtupArea ?? data.builtupArea)
  const saleableArea = toNumberOrZero(unit.saleable ?? floor.saleable ?? data.saleableArea)
  const masterBaseRate = pricing.baseRate || toNumberOrZero(unitItem?.baseRate ?? data.baseRate)
  const baseRate = masterBaseRate
  const closingBaseRate = toNonNegativeNumberOrNull(data.closingRate ?? data.closingBaseRate, "Closing Rate") ?? baseRate
  const priceArea = pricing.reraArea || carpetArea
  const totalPrice = bookingPricing.totalAllInclusiveCost
  const soldPrice = bookingPricing.totalAllInclusiveCost
  const agreementValue = bookingPricing.agreementValue
  const basePrice = bookingPricing.totalFlatPrice

  return {
    projectId: unit.projectId ?? null,
    towerId: unit.towerId ?? null,
    floorPlanId: unit.floorId ?? null,
    carpetArea,
    builtupArea,
    saleableArea,
    rateBasis,
    priceArea,
    baseRate,
    closingRate: closingBaseRate,
    closingBaseRate,
    totalFlatPrice: bookingPricing.totalFlatPrice,
    totalPrice,
    soldPrice,
    agreementValue,
    basePrice,
    floorRiseEnabled: bookingPricing.floorRiseEnabled,
    floorRisePerSqft: bookingPricing.floorRisePerSqft,
    baseFloorForFloorRise: bookingPricing.baseFloorForFloorRise,
    floorNumber: bookingPricing.floorNumber,
    riseSteps: bookingPricing.riseSteps,
    floorRiseCalculatedAmount: bookingPricing.floorRiseCalculatedAmount,
    calculatedUnitPrice: bookingPricing.calculatedUnitPrice,
    gstAmount: bookingPricing.gstAmount,
    stampDutyAmount: bookingPricing.stampDutyAmount,
    otherExpenseTotal: bookingPricing.otherExpenseTotal,
    totalTaxes: bookingPricing.totalTaxes,
    totalAllInclusiveCost: bookingPricing.totalAllInclusiveCost,
    priceSnapshot: bookingPricing,
    bookingPricing,
    pricing,
    priceFrozenAt: new Date(),
  }
}

const bookingInclude = {
  costSheet: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
  paymentSchedule: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
  bookingCharges: true,
  bookingExpenses: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
  unit: {
    include: {
      project: true,
    },
  },
  unitItem: {
    include: {
      unit: {
        include: {
          project: true,
          tower: true,
          floor: true,
        },
      },
    },
  },
}

const ACTIVE_BOOKING_STAGES = new Set(["confirmed", "held", "booked", "registered"])
const FROZEN_PRICE_FIELDS = new Set([
  "carpetArea",
  "builtupArea",
  "saleableArea",
  "rateBasis",
  "priceArea",
  "priceFrozenAt",
  "basePrice",
  "baseRate",
  "closingBaseRate",
  "totalPrice",
  "soldPrice",
  "agreementValue",
  "floorRiseEnabled",
  "floorRisePerSqft",
  "baseFloorForFloorRise",
  "floorNumber",
  "riseSteps",
  "floorRiseCalculatedAmount",
  "calculatedUnitPrice",
  "priceSnapshot",
])

const isActiveBookingStage = (stage) => ACTIVE_BOOKING_STAGES.has(String(stage || "").toLowerCase())

exports.createBooking = async (req, res) => {
  const data = req.body || {}
  const idempotencyKey = String(data.idempotencyKey || req.headers["idempotency-key"] || "").trim() || null

  try {
    let createdBookingId = null

    if (idempotencyKey) {
      const existingBooking = await prisma.booking.findUnique({
        where: { idempotencyKey },
        include: bookingInclude,
      })

      if (existingBooking) {
        return res.status(200).json({ ...existingBooking, unit: data.unit || null, replayed: true })
      }
    }

    await prisma.$transaction(async(tx)=>{
      const requestedUnitItemId = toNumberOrNull(data.unitItemId || data.unitModelId || data.unitListId)
      const requestedUnitId = toNumberOrNull(data.unitId)
      const lockOwner = String(data.bookedBy || data.userId || data.leadId || req.user?.id || "booking-wizard")
      const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000)
      let selectedUnitItem = null

      if (requestedUnitItemId) {
        selectedUnitItem = await tx.unitModel.findUnique({
          where: { id: requestedUnitItemId },
          select: {
            id: true,
            unitId: true,
            status: true,
            heldBy: true,
            heldUntil: true,
            floor: true,
            unitIndex: true,
            baseRate: true,
            basePrice: true,
            unit: {
              select: {
                projectId: true,
                towerId: true,
                floorId: true,
                carpet: true,
                saleable: true,
                floor: {
                  select: {
                    carpet: true,
                    builtupArea: true,
                    saleable: true,
                    rateBasis: true,
                    baseRate: true,
                    basePrice: true,
                    floorRiseEnabled: true,
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
      }

      if (!selectedUnitItem && requestedUnitId) {
        selectedUnitItem = await tx.unitModel.findUnique({
          where: { id: requestedUnitId },
          select: {
            id: true,
            unitId: true,
            status: true,
            heldBy: true,
            heldUntil: true,
            floor: true,
            unitIndex: true,
            baseRate: true,
            basePrice: true,
            unit: {
              select: {
                projectId: true,
                towerId: true,
                floorId: true,
                carpet: true,
                saleable: true,
                floor: {
                  select: {
                    carpet: true,
                    builtupArea: true,
                    saleable: true,
                    rateBasis: true,
                    baseRate: true,
                    basePrice: true,
                    floorRiseEnabled: true,
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
      }

      if (!selectedUnitItem && requestedUnitItemId) {
        const conflict = new Error("Selected unit was not found")
        conflict.statusCode = 404
        throw conflict
      }

      const requestedProjectId = toNumberOrNull(data.projectId)
      const requestedTowerId = toNumberOrNull(data.towerId)
      if (
        selectedUnitItem &&
        ((requestedProjectId && Number(selectedUnitItem.unit?.projectId) !== requestedProjectId) ||
          (requestedTowerId && Number(selectedUnitItem.unit?.towerId) !== requestedTowerId))
      ) {
        const hierarchyError = new Error("Selected unit must belong to the selected project and tower")
        hierarchyError.statusCode = 400
        throw hierarchyError
      }

      const selectedStatus = normalizeUnitStatus(selectedUnitItem?.status, UNIT_STATUS.Available)
      const heldByCurrentUser =
        selectedStatus === UNIT_STATUS.Held &&
        String(selectedUnitItem?.heldBy || "") === lockOwner &&
        (!selectedUnitItem?.heldUntil || new Date(selectedUnitItem.heldUntil).getTime() > Date.now())

      if (selectedUnitItem && selectedStatus !== UNIT_STATUS.Available && !heldByCurrentUser) {
        const conflict = new Error("Selected unit is already booked or unavailable")
        conflict.statusCode = 409
        throw conflict
      }

      if (selectedUnitItem && selectedStatus === UNIT_STATUS.Available) {
        assertUnitStatusTransition(selectedUnitItem.status, UNIT_STATUS.Held, {
          actor: lockOwner,
          action: "select-unit",
        })

        const holdResult = await tx.unitModel.updateMany({
          where: {
            id: selectedUnitItem.id,
            status: UNIT_STATUS.Available,
          },
          data: {
            status: UNIT_STATUS.Held,
            heldBy: lockOwner,
            heldUntil: holdExpiresAt,
          },
        })

        if (holdResult.count !== 1) {
          const conflict = new Error("This unit was just taken. Please pick another unit.")
          conflict.statusCode = 409
          throw conflict
        }
      }

      const priceSnapshot = buildBookingPriceSnapshot(selectedUnitItem, data)
      if (selectedUnitItem && priceSnapshot.pricing?.validationMessage) {
        const pricingError = new Error(priceSnapshot.pricing.validationMessage)
        pricingError.statusCode = 400
        throw pricingError
      }
      if (selectedUnitItem && !(priceSnapshot.priceArea > 0)) {
        const areaError = new Error("RERA Area must be greater than zero for booking")
        areaError.statusCode = 400
        throw areaError
      }
      if (toBoolean(data.parkingRequired) && (!toNumberOrNull(data.carParkingSlots) || !data.parkingType)) {
        const parkingError = new Error("Parking Details are required when parking is selected")
        parkingError.statusCode = 400
        parkingError.validationErrors = {
          carParkingSlots: !toNumberOrNull(data.carParkingSlots) ? "Number of Car Parking Slots is required" : undefined,
          parkingType: !data.parkingType ? "Parking Type is required" : undefined,
        }
        throw parkingError
      }

      let  bookingData =  {
          leadId: toNumberOrNull(data.leadId),
          unitCount: data.unitCount || null,
          customerName: data.customerName || null,
          bookingName: data.bookingName || data.customerName || null,
          stage: data.stage || "Tentative",
          projectDetails: data.projectDetails || null,
          projectId: priceSnapshot.projectId,
          towerId: priceSnapshot.towerId,
          floorPlanId: priceSnapshot.floorPlanId,
          bookedOn: data.bookedOn ? new Date(data.bookedOn) : null,
          bookingDate: data.bookingDate ? new Date(data.bookingDate) : (data.bookedOn ? new Date(data.bookedOn) : null),
          carpetArea: priceSnapshot.carpetArea,
          builtupArea: priceSnapshot.builtupArea,
          saleableArea: priceSnapshot.saleableArea,
          rateBasis: priceSnapshot.rateBasis,
          priceArea: priceSnapshot.priceArea,
          priceFrozenAt: priceSnapshot.priceFrozenAt,
          basePrice: priceSnapshot.basePrice,
          baseRate: priceSnapshot.baseRate,
          closingRate: priceSnapshot.closingRate,
          closingBaseRate: priceSnapshot.closingBaseRate,
          totalFlatPrice: priceSnapshot.totalFlatPrice,
          totalPrice: priceSnapshot.totalPrice,
          soldPrice: priceSnapshot.soldPrice,
          agreementValue: priceSnapshot.agreementValue,
          floorRiseEnabled: priceSnapshot.floorRiseEnabled,
          floorRisePerSqft: priceSnapshot.floorRisePerSqft,
          baseFloorForFloorRise: priceSnapshot.baseFloorForFloorRise,
          floorNumber: priceSnapshot.floorNumber,
          riseSteps: priceSnapshot.riseSteps,
          floorRiseCalculatedAmount: priceSnapshot.floorRiseCalculatedAmount,
          calculatedUnitPrice: priceSnapshot.calculatedUnitPrice,
          priceSnapshot: priceSnapshot.priceSnapshot,
          parkingRequired: toBoolean(data.parkingRequired),
          carParkingSlots: toBoolean(data.parkingRequired) ? toNonNegativeIntOrNull(data.carParkingSlots, "Number of Car Parking Slots") : null,
          parkingType: toBoolean(data.parkingRequired) ? data.parkingType || null : null,
          parkingSlotNumber: toBoolean(data.parkingRequired) ? data.parkingSlotNumber || null : null,
          twoWheelerSlots: toBoolean(data.parkingRequired) ? toNonNegativeIntOrNull(data.twoWheelerSlots, "Number of Two-Wheeler Slots") : null,
          basementStoreroomArea: toBoolean(data.parkingRequired) ? toNonNegativeNumberOrNull(data.basementStoreroomArea, "Basement/Storeroom Area") : null,
          parkingCharges: priceSnapshot.bookingPricing.parkingAmount,
          parkingAmount: priceSnapshot.bookingPricing.parkingAmount,
          gstPercent: priceSnapshot.bookingPricing.gstPercent,
          gstAmount: priceSnapshot.gstAmount,
          stampDutyPercent: priceSnapshot.bookingPricing.stampDutyPercent,
          stampDutyAmount: priceSnapshot.stampDutyAmount,
          registrationAmount: priceSnapshot.bookingPricing.registrationCharges,
          registrationCharges: priceSnapshot.bookingPricing.registrationCharges,
          legalDocumentationCharges: priceSnapshot.bookingPricing.legalCharges,
          legalCharges: priceSnapshot.bookingPricing.legalCharges,
          otherExpenseTotal: priceSnapshot.otherExpenseTotal,
          totalTaxes: priceSnapshot.totalTaxes,
          totalAllInclusiveCost: priceSnapshot.totalAllInclusiveCost,
          infrastructureDevelopmentCharges: toNonNegativeNumberOrNull(data.infrastructureDevelopmentCharges, "Infrastructure/Development Charges"),
          societyFormationCharges: toNonNegativeNumberOrNull(data.societyFormationCharges, "Society Formation Charges"),
          clubMembershipCharges: toNonNegativeNumberOrNull(data.clubMembershipCharges, "Club Membership Charges"),
          maintenanceAdvanceMonths: toNonNegativeIntOrNull(data.maintenanceAdvanceMonths, "Maintenance Advance Months"),
          maintenanceRatePerSqftPerMonth: toNonNegativeNumberOrNull(data.maintenanceRatePerSqftPerMonth, "Maintenance Rate / Sqft / Month"),
          sinkingFundCorpus: toNonNegativeNumberOrNull(data.sinkingFundCorpus, "Sinking Fund/Corpus"),
          customOtherCharges: Array.isArray(data.customOtherCharges) ? data.customOtherCharges : [],
          source: data.source || null,
          channelPartnerId: toNumberOrNull(data.channelPartnerId),
          channelPartnerName: data.channelPartnerName || data.channelPartner || null,
          channelPartnerReraId: data.channelPartnerReraId || data.cpReraNumber || null,
          bookedBy: data.bookedBy || null,
          idempotencyKey,
        }
      
      if(selectedUnitItem){
        bookingData.unitId = selectedUnitItem.unitId
        bookingData.unitItemId = selectedUnitItem.id
        if (isActiveBookingStage(bookingData.stage)) bookingData.activeUnitItemId = selectedUnitItem.id
      } else if(requestedUnitId){
        bookingData.unitId = requestedUnitId
      }

      const booking = await tx.booking.create({
        data:bookingData,
      })
      createdBookingId = booking.id

      if (bookingData.leadId) {
        const existingLead = await tx.lead.findUnique({
          where: { id: bookingData.leadId },
          select: { status: true },
        })
        await tx.lead.update({
          where: { id: bookingData.leadId },
          data: { status: "Booked" },
        })
        await tx.leadActivity.create({
          data: {
            leadId: bookingData.leadId,
            userId: req.authUser?.id ? Number(req.authUser.id) : null,
            type: "BOOKING_CONFIRMED",
            message: `Booking #${booking.id} confirmed${bookingData.unitItemId ? ` for unit #${bookingData.unitItemId}` : ""}`,
            oldStatus: existingLead?.status || null,
            newStatus: "Booked",
          },
        })
      }

      if (selectedUnitItem) {
        assertUnitStatusTransition(UNIT_STATUS.Held, UNIT_STATUS.Booked, {
          actor: lockOwner,
          action: "confirm-booking",
        })

        const bookResult = await tx.unitModel.updateMany({
          where: {
            id: selectedUnitItem.id,
            status: UNIT_STATUS.Held,
            heldBy: lockOwner,
          },
          data: {
            status: UNIT_STATUS.Booked,
            heldBy: null,
            heldUntil: null,
          },
        })

        if (bookResult.count !== 1) {
          const conflict = new Error("This unit hold expired or belongs to another user")
          conflict.statusCode = 409
          throw conflict
        }
      }

      const bookingCharges = normalizeBookingCharges({ ...data, agreementValue: priceSnapshot.agreementValue })
      if (bookingCharges.length) {
        await tx.bookingCharge.createMany({
          data: bookingCharges.map((charge) => ({
            ...charge,
            bookingId: booking.id,
          })),
        })
      }

      const rawOtherExpenses = Array.isArray(data.otherExpenses) ? data.otherExpenses : (Array.isArray(data.customOtherCharges) ? data.customOtherCharges : [])
      const missingExpenseName = rawOtherExpenses.some((row) => !String(row?.name || row?.expenseName || "").trim() && toNumberOrZero(row?.amount ?? row?.rate) > 0)
      if (missingExpenseName) {
        const expenseError = new Error("Expense name is required when amount is entered")
        expenseError.statusCode = 400
        throw expenseError
      }
      const otherExpenses = normalizeOtherExpenses(rawOtherExpenses)
      if (otherExpenses.length) {
        await tx.bookingExpense.createMany({
          data: otherExpenses.map((row, index) => ({
            bookingId: booking.id,
            name: row.name,
            amount: row.amount,
            sortOrder: row.sortOrder ?? index,
          })),
        })
      }

      const costSheetData = Array.isArray(req.body.costSheet) ? req.body.costSheet : []
      const validCostSheetRows = costSheetData.filter((row) => row && row.fieldName)

      if (validCostSheetRows.length) {
        await tx.costSheet.createMany({
          data: validCostSheetRows.map((row, index) => ({
            fieldName: row.fieldName,
            orignalValue: toNumberOrNull(row.orignalValue ?? row.originalValue),
            costType: row.costType || "Discount",
            inputField: toNumberOrNull(row.inputField),
            newValue: Number(row.newValue) || 0,
            sortOrder: row.sortOrder ?? index,
            bookingId: booking.id,
          })),
        })
      }

      const paymentScheduleData = Array.isArray(data.paymentSchedule) ? data.paymentSchedule : []
      const validPaymentScheduleRows = paymentScheduleData.filter((row) => row && row.name)

      if (validPaymentScheduleRows.length) {
        await tx.paymentSchedule.createMany({
          data: validPaymentScheduleRows.map((row, index) => ({
            name: row.name,
            towerMilestone: row.towerMilestone,
            value: toNumberOrNull(row.value),
            amount: toNumberOrNull(row.amount),
            taxes: toNumberOrNull(row.taxes),
            tds: toNumberOrNull(row.tds),
            grandTotal: Number(row.grandTotal) || 0,
            sortOrder: row.sortOrder ?? index,
            bookingId: booking.id,
          })),
        })
      }
      
    })

    const createdBooking = await prisma.booking.findFirst({
      where: { id: createdBookingId },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
    })

    res.status(201).json(
      createdBooking
        ? { ...createdBooking, unit: data.unit || null }
        : { message: "Booking create successfully", unit: data.unit || null }
    )
    emitReportsUpdate("booking:created")
  } catch (error) {
    console.log(error)
    if (
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("idempotencyKey") &&
      idempotencyKey
    ) {
      const existingBooking = await prisma.booking.findUnique({
        where: { idempotencyKey },
        include: bookingInclude,
      })
      if (existingBooking) return res.status(200).json({ ...existingBooking, unit: data.unit || null, replayed: true })
    }
    if (
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      (error.meta.target.includes("unitItemId") || error.meta.target.includes("activeUnitItemId"))
    ) {
      return res.status(409).json({ message: "Selected unit is already booked or unavailable" })
    }
    res.status(error.statusCode || 500).json({
      ...(error.validationErrors ? { success: false } : {}),
      message: error.message || "Something went wrong",
      ...(error.validationErrors ? { errors: error.validationErrors } : {}),
    })
  }
}

exports.getBookings = async (req, res) => {
  try {
    const { id } = req.params

    if (id) {
      const booking = await prisma.booking.findUnique({ where: { id: Number(id) }, include: bookingInclude })
      if (!booking) return res.status(404).json({ message: "Booking not found" })
      return res.status(200).json(booking)
    }

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const where = {}
    if (req.query.leadId) where.leadId = Number(req.query.leadId)
    if (req.query.stage) where.stage = String(req.query.stage)

    const totalItems = await prisma.booking.count({ where })
    const data = await prisma.booking.findMany({
      where,
      skip,
      take: limit,
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
    })

    res.status(200).json({ page, limit, totalItems, data })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Something went wrong" })
  }
}

exports.updateBooking = async (req, res) => {
  try {
    const id = Number(req.params.id)
    const data = req.body
    const booking = await prisma.booking.findUnique({ where: { id } })

    if (!booking) return res.status(404).json({ message: "Booking not found" })

    const updateData = {}
    const touchesFrozenPrice = Object.keys(data || {}).some((field) => FROZEN_PRICE_FIELDS.has(field))

    if (isActiveBookingStage(booking.stage) && touchesFrozenPrice) {
      return res.status(400).json({ message: "Confirmed booking price is frozen and cannot be changed" })
    }

    if (data.customerName !== undefined) updateData.customerName = data.customerName
    if (data.stage !== undefined) updateData.stage = data.stage
    if (data.projectDetails !== undefined) updateData.projectDetails = data.projectDetails
    if (data.bookedOn !== undefined) updateData.bookedOn = data.bookedOn ? new Date(data.bookedOn) : null
    if (data.carpetArea !== undefined) updateData.carpetArea = toNumberOrNull(data.carpetArea)
    if (data.builtupArea !== undefined) updateData.builtupArea = toNumberOrNull(data.builtupArea)
    if (data.saleableArea !== undefined) updateData.saleableArea = toNumberOrNull(data.saleableArea)
    if (data.rateBasis !== undefined) updateData.rateBasis = data.rateBasis || null
    if (data.priceArea !== undefined) updateData.priceArea = toNumberOrNull(data.priceArea)
    if (data.priceFrozenAt !== undefined) updateData.priceFrozenAt = data.priceFrozenAt ? new Date(data.priceFrozenAt) : null
    if (data.basePrice !== undefined) updateData.basePrice = toNumberOrNull(data.basePrice)
    if (data.baseRate !== undefined) updateData.baseRate = toNonNegativeNumberOrNull(data.baseRate, "Base Rate")
    if (data.closingBaseRate !== undefined) updateData.closingBaseRate = toNonNegativeNumberOrNull(data.closingBaseRate, "Closing Base Rate")
    if (data.totalPrice !== undefined) updateData.totalPrice = toNonNegativeNumberOrNull(data.totalPrice, "Total Price")
    if (data.soldPrice !== undefined) updateData.soldPrice = toNonNegativeNumberOrNull(data.soldPrice, "Sold Price")
    if (data.agreementValue !== undefined) updateData.agreementValue = toNonNegativeNumberOrNull(data.agreementValue, "Agreement Value")
    if (data.parkingRequired !== undefined) updateData.parkingRequired = toBoolean(data.parkingRequired)
    if (data.carParkingSlots !== undefined) updateData.carParkingSlots = toBoolean(data.parkingRequired ?? booking.parkingRequired) ? toNonNegativeIntOrNull(data.carParkingSlots, "Number of Car Parking Slots") : null
    if (data.parkingType !== undefined) updateData.parkingType = toBoolean(data.parkingRequired ?? booking.parkingRequired) ? data.parkingType || null : null
    if (data.parkingSlotNumber !== undefined) updateData.parkingSlotNumber = toBoolean(data.parkingRequired ?? booking.parkingRequired) ? data.parkingSlotNumber || null : null
    if (data.twoWheelerSlots !== undefined) updateData.twoWheelerSlots = toBoolean(data.parkingRequired ?? booking.parkingRequired) ? toNonNegativeIntOrNull(data.twoWheelerSlots, "Number of Two-Wheeler Slots") : null
    if (data.basementStoreroomArea !== undefined) updateData.basementStoreroomArea = toBoolean(data.parkingRequired ?? booking.parkingRequired) ? toNonNegativeNumberOrNull(data.basementStoreroomArea, "Basement/Storeroom Area") : null
    if (data.parkingCharges !== undefined) updateData.parkingCharges = toBoolean(data.parkingRequired ?? booking.parkingRequired) ? toNonNegativeNumberOrNull(data.parkingCharges, "Parking Charges") || 0 : 0
    if (data.gstPercent !== undefined) updateData.gstPercent = toNonNegativeNumberOrNull(data.gstPercent, "GST %")
    if (data.stampDutyPercent !== undefined) updateData.stampDutyPercent = toNonNegativeNumberOrNull(data.stampDutyPercent, "Stamp Duty %")
    if (data.registrationAmount !== undefined) updateData.registrationAmount = toNonNegativeNumberOrNull(data.registrationAmount, "Registration Charges")
    if (data.legalDocumentationCharges !== undefined) updateData.legalDocumentationCharges = toNonNegativeNumberOrNull(data.legalDocumentationCharges, "Legal Documentation Charges")
    if (data.infrastructureDevelopmentCharges !== undefined) updateData.infrastructureDevelopmentCharges = toNonNegativeNumberOrNull(data.infrastructureDevelopmentCharges, "Infrastructure/Development Charges")
    if (data.societyFormationCharges !== undefined) updateData.societyFormationCharges = toNonNegativeNumberOrNull(data.societyFormationCharges, "Society Formation Charges")
    if (data.clubMembershipCharges !== undefined) updateData.clubMembershipCharges = toNonNegativeNumberOrNull(data.clubMembershipCharges, "Club Membership Charges")
    if (data.maintenanceAdvanceMonths !== undefined) updateData.maintenanceAdvanceMonths = toNonNegativeIntOrNull(data.maintenanceAdvanceMonths, "Maintenance Advance Months")
    if (data.maintenanceRatePerSqftPerMonth !== undefined) updateData.maintenanceRatePerSqftPerMonth = toNonNegativeNumberOrNull(data.maintenanceRatePerSqftPerMonth, "Maintenance Rate / Sqft / Month")
    if (data.sinkingFundCorpus !== undefined) updateData.sinkingFundCorpus = toNonNegativeNumberOrNull(data.sinkingFundCorpus, "Sinking Fund/Corpus")
    if (data.customOtherCharges !== undefined) updateData.customOtherCharges = Array.isArray(data.customOtherCharges) ? data.customOtherCharges : []
    if (data.source !== undefined) updateData.source = data.source
    if (data.bookedBy !== undefined) updateData.bookedBy = data.bookedBy
    if (data.unitId !== undefined) updateData.unitId = toNumberOrNull(data.unitId)
    if (data.stage !== undefined) {
      updateData.activeUnitItemId = isActiveBookingStage(data.stage) ? booking.unitItemId : null
    }

    const hasRowUpdates = Array.isArray(data.costSheet) || Array.isArray(data.paymentSchedule) || data.customOtherCharges !== undefined
    if (!Object.keys(updateData).length && !hasRowUpdates) {
      return res.status(400).json({ message: "No booking fields provided" })
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = Object.keys(updateData).length
        ? await tx.booking.update({ where: { id }, data: updateData })
        : booking

      if (Array.isArray(data.costSheet)) {
        await tx.costSheet.deleteMany({ where: { bookingId: id } })
        const rows = data.costSheet.filter((row) => row && row.fieldName)
        if (rows.length) {
          await tx.costSheet.createMany({
            data: rows.map((row, index) => ({
              fieldName: row.fieldName,
              orignalValue: toNumberOrNull(row.orignalValue ?? row.originalValue),
              costType: row.costType || "Discount",
              inputField: toNumberOrNull(row.inputField),
              newValue: Number(row.newValue) || 0,
              sortOrder: row.sortOrder ?? index,
              bookingId: id,
            })),
          })
        }
      }

      if (Array.isArray(data.paymentSchedule)) {
        await tx.paymentSchedule.deleteMany({ where: { bookingId: id } })
        const rows = data.paymentSchedule.filter((row) => row && row.name)
        if (rows.length) {
          await tx.paymentSchedule.createMany({
            data: rows.map((row, index) => ({
              name: row.name,
              towerMilestone: row.towerMilestone,
              value: toNumberOrNull(row.value),
              amount: toNumberOrNull(row.amount),
              taxes: toNumberOrNull(row.taxes),
              tds: toNumberOrNull(row.tds),
              grandTotal: Number(row.grandTotal) || 0,
              sortOrder: row.sortOrder ?? index,
              bookingId: id,
            })),
          })
        }
      }

      if (data.customOtherCharges !== undefined || Object.keys(updateData).some((field) => field.includes("Charges") || field.includes("Percent") || field === "parkingRequired")) {
        await tx.bookingCharge.deleteMany({ where: { bookingId: id } })
        const charges = normalizeBookingCharges({ ...updated, ...data, agreementValue: updated.agreementValue })
        if (charges.length) {
          await tx.bookingCharge.createMany({
            data: charges.map((charge) => ({ ...charge, bookingId: id })),
          })
        }
      }

      return tx.booking.findUnique({ where: { id }, include: bookingInclude })
    })

    res.status(200).json(result)
    emitReportsUpdate("booking:updated")
  } catch (error) {
    console.log(error)
    res.status(error.statusCode || 500).json({ message: error.message || "Something went wrong" })
  }
}

exports.deleteBooking = async (req, res) => {
  try {
    const id = Number(req.params.id)
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        select: { unitItemId: true, activeUnitItemId: true },
      })

      await tx.booking.delete({ where: { id } })

      if (booking?.activeUnitItemId && booking.unitItemId) {
        await tx.unitModel.updateMany({
          where: {
            id: booking.unitItemId,
            status: UNIT_STATUS.Booked,
          },
          data: {
            status: UNIT_STATUS.Available,
            heldBy: null,
            heldUntil: null,
          },
        })
      }
    })
    res.status(200).json({ message: "Booking deleted successfully" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Something went wrong" })
  }
}

exports.generateBookingDocument = async (req, res) => {
  try {
    const bookingId = Number(req.params.id)
    const { type = "WELCOME_LETTER" } = req.body

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { lead: true, unit: true },
    })

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" })
    }

    const documentTemplates = {
      WELCOME_LETTER: '<!doctype html><html><body><h1>Welcome Letter</h1><p>Dear {{customerName}},</p><p>Thank you for booking your unit at {{projectName}}. Your booking ID is {{bookingId}}.</p><p>Unit: {{unitSummary}}</p><p>Booking date: {{bookingDate}}</p></body></html>',
      ALLOTMENT_LETTER: '<!doctype html><html><body><h1>Allotment Letter</h1><p>Dear {{customerName}},</p><p>This is to confirm allotment for {{unitSummary}} in {{projectName}}.</p><p>Booking reference: {{bookingId}}</p></body></html>',
      PARKING_CONSENT: '<!doctype html><html><body><h1>Parking Consent</h1><p>Dear {{customerName}},</p><p>Your parking consent for {{projectName}} has been generated successfully.</p></body></html>',
      POSSESSION_LETTER: '<!doctype html><html><body><h1>Possession Letter</h1><p>Dear {{customerName}},</p><p>Possession for {{unitSummary}} in {{projectName}} is being processed.</p></body></html>',
      RERA_EXTENSION: '<!doctype html><html><body><h1>RERA Extension</h1><p>Dear {{customerName}},</p><p>This notice confirms the RERA extension for your booking in {{projectName}}.</p></body></html>',
    }

    const template = documentTemplates[type] || documentTemplates.WELCOME_LETTER
    const context = buildBookingDocumentContext(booking, type)
    const html = mergeTemplate(template, context)

    const document = await prisma.generatedDocument.create({
      data: {
        bookingId: booking.id,
        type,
        title: `${context.documentType} for ${booking.customerName || "Customer"}`,
        htmlContent: html,
        pdfUrl: `/documents/${booking.id}/${(type || "welcome").toLowerCase()}.pdf`,
      },
    })

    res.status(201).json({ message: "Document generated successfully", document })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Something went wrong" })
  }
}

exports.getBookingLedger = async (req, res) => {
  try {
    const bookingId = Number(req.params.id)
    const entries = await prisma.ledgerEntry.findMany({
      where: { bookingId },
      orderBy: { date: "asc" },
    })

    res.status(200).json(entries)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Something went wrong" })
  }
}
