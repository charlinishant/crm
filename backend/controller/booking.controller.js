const prisma = require("../lib/prisma")
const { emitReportsUpdate } = require("../socket/socket")
const { buildBookingDocumentContext, mergeTemplate } = require("./postSales.utils")
const { UNIT_STATUS, normalizeUnitStatus, assertUnitStatusTransition } = require("../services/unitStatus.service")

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

const toNumberOrZero = (value) => {
  const number = toNumberOrNull(value)
  return number === null ? 0 : number
}

const getAreaForRateBasis = ({ rateBasis, carpetArea, builtupArea, saleableArea }) => {
  if (rateBasis === "On Built-up") return toNumberOrZero(builtupArea)
  if (rateBasis === "On Saleable") return toNumberOrZero(saleableArea)
  return toNumberOrZero(carpetArea)
}

const buildBookingPriceSnapshot = (unitItem, data = {}) => {
  const unit = unitItem?.unit || {}
  const floor = unit.floor || {}
  const rateBasis = data.rateBasis || floor.rateBasis || "On Carpet"
  const carpetArea = toNumberOrZero(unit.carpet ?? floor.carpet ?? data.carpetArea)
  const builtupArea = toNumberOrZero(floor.builtupArea ?? data.builtupArea)
  const saleableArea = toNumberOrZero(unit.saleable ?? floor.saleable ?? data.saleableArea)
  const baseRate = toNumberOrZero(unitItem?.baseRate ?? data.baseRate)
  const priceArea = getAreaForRateBasis({ rateBasis, carpetArea, builtupArea, saleableArea })
  const computedBasePrice = Number((baseRate * priceArea).toFixed(2))
  const basePrice = toNumberOrNull(unitItem?.basePrice) ?? computedBasePrice

  return {
    carpetArea,
    builtupArea,
    saleableArea,
    rateBasis,
    priceArea,
    baseRate,
    basePrice,
    priceFrozenAt: new Date(),
  }
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
        include: { costSheet: true, paymentSchedule: true, unitItem: true },
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
            baseRate: true,
            basePrice: true,
            unit: {
              select: {
                carpet: true,
                saleable: true,
                floor: {
                  select: {
                    carpet: true,
                    builtupArea: true,
                    saleable: true,
                    rateBasis: true,
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
            baseRate: true,
            basePrice: true,
            unit: {
              select: {
                carpet: true,
                saleable: true,
                floor: {
                  select: {
                    carpet: true,
                    builtupArea: true,
                    saleable: true,
                    rateBasis: true,
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

      let  bookingData =  {
          leadId: toNumberOrNull(data.leadId),
          unitCount: data.unitCount || null,
          customerName: data.customerName || null,
          stage: data.stage || "Tentative",
          projectDetails: data.projectDetails || null,
          bookedOn: data.bookedOn ? new Date(data.bookedOn) : null,
          carpetArea: priceSnapshot.carpetArea,
          builtupArea: priceSnapshot.builtupArea,
          saleableArea: priceSnapshot.saleableArea,
          rateBasis: priceSnapshot.rateBasis,
          priceArea: priceSnapshot.priceArea,
          priceFrozenAt: priceSnapshot.priceFrozenAt,
          basePrice: priceSnapshot.basePrice,
          baseRate: priceSnapshot.baseRate,
          source: data.source || null,
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
        await tx.lead.update({
          where: { id: bookingData.leadId },
          data: { status: "Booked" },
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

      let costSheetData = Array.isArray(req.body.costSheet) ? req.body.costSheet : []
      const firstCostSheet = costSheetData[0]

      if (firstCostSheet) {
        await tx.costSheet.create({
          data: {
            fieldName: firstCostSheet.fieldName,
            orignalValue: toNumberOrNull(firstCostSheet.orignalValue),
            costType: firstCostSheet.costType || "Discount",
            inputField: toNumberOrNull(firstCostSheet.inputField),
            newValue: Number(firstCostSheet.newValue) || 0,
            bookingId: booking.id,
          },
        })
      }

      
      let paymentScheduleData = Array.isArray(data.paymentSchedule) ? data.paymentSchedule : []
      const firstPaymentSchedule = paymentScheduleData[0]

      if (firstPaymentSchedule) {
        await tx.paymentSchedule.create({
          data: {
            name: firstPaymentSchedule.name,
            towerMilestone: firstPaymentSchedule.towerMilestone,
            value: toNumberOrNull(firstPaymentSchedule.value),
            amount: toNumberOrNull(firstPaymentSchedule.amount),
            taxes: toNumberOrNull(firstPaymentSchedule.taxes),
            tds: toNumberOrNull(firstPaymentSchedule.tds),
            grandTotal: Number(firstPaymentSchedule.grandTotal) || 0,
            bookingId: booking.id,
          },
        })
      }
      
      
      
    })

    const createdBooking = await prisma.booking.findFirst({
      where: { id: createdBookingId },
      include: { costSheet: true, paymentSchedule: true, unitItem: true },
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
        include: { costSheet: true, paymentSchedule: true, unitItem: true },
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
    res.status(error.statusCode || 500).json({ message: error.message || "Something went wrong" })
  }
}

exports.getBookings = async (req, res) => {
  try {
    const { id } = req.params

    if (id) {
      const booking = await prisma.booking.findUnique({ where: { id: Number(id) } })
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
      include:{costSheet:true, paymentSchedule:true, unitItem:true },
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
    if (data.baseRate !== undefined) updateData.baseRate = toNumberOrNull(data.baseRate)
    if (data.source !== undefined) updateData.source = data.source
    if (data.bookedBy !== undefined) updateData.bookedBy = data.bookedBy
    if (data.unitId !== undefined) updateData.unitId = toNumberOrNull(data.unitId)
    if (data.stage !== undefined) {
      updateData.activeUnitItemId = isActiveBookingStage(data.stage) ? booking.unitItemId : null
    }

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ message: "No booking fields provided" })
    }

    const result = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: { costSheet: true, paymentSchedule: true },
    })

    res.status(200).json(result)
    emitReportsUpdate("booking:updated")
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Something went wrong" })
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
