const prisma = require("../lib/prisma")
const { emitReportsUpdate } = require("../socket/socket")
const { buildBookingDocumentContext, mergeTemplate } = require("./postSales.utils")

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

exports.createBooking = async (req, res) => {
  try {
    const data = req.body
    let createdBookingId = null

    await prisma.$transaction(async(tx)=>{
      let  bookingData =  {
          leadId: toNumberOrNull(data.leadId),
          unitCount: data.unitCount || null,
          customerName: data.customerName || null,
          stage: data.stage || "Tentative",
          projectDetails: data.projectDetails || null,
          bookedOn: data.bookedOn ? new Date(data.bookedOn) : null,
          saleableArea: toNumberOrNull(data.saleableArea),
          basePrice: toNumberOrNull(data.basePrice),
          baseRate: toNumberOrNull(data.baseRate),
          source: data.source || null,
          bookedBy: data.bookedBy || null,
        }
      
      if(data.unitId){
        bookingData.unitId = data.unitId
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
      include: { costSheet: true, paymentSchedule: true },
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
    res.status(500).json({ message: "Something went wrong" })
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
      include:{costSheet:true, paymentSchedule:true },
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

    if (data.customerName !== undefined) updateData.customerName = data.customerName
    if (data.stage !== undefined) updateData.stage = data.stage
    if (data.projectDetails !== undefined) updateData.projectDetails = data.projectDetails
    if (data.bookedOn !== undefined) updateData.bookedOn = data.bookedOn ? new Date(data.bookedOn) : null
    if (data.saleableArea !== undefined) updateData.saleableArea = toNumberOrNull(data.saleableArea)
    if (data.basePrice !== undefined) updateData.basePrice = toNumberOrNull(data.basePrice)
    if (data.baseRate !== undefined) updateData.baseRate = toNumberOrNull(data.baseRate)
    if (data.source !== undefined) updateData.source = data.source
    if (data.bookedBy !== undefined) updateData.bookedBy = data.bookedBy
    if (data.unitId !== undefined) updateData.unitId = toNumberOrNull(data.unitId)

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
    await prisma.booking.delete({ where: { id } })
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
