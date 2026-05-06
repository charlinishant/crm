const prisma = require("../lib/prisma")

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

exports.createBooking = async (req, res) => {
  try {
    const data = req.body

    const booking = await prisma.booking.create({
      data: {
        leadId: toNumberOrNull(data.leadId),
        unit: data.unit || null,
        customerName: data.customerName || null,
        stage: data.stage || "Tentative",
        projectDetails: data.projectDetails || null,
        bookedOn: data.bookedOn ? new Date(data.bookedOn) : null,
        saleableArea: toNumberOrNull(data.saleableArea),
        basePrice: toNumberOrNull(data.basePrice),
        baseRate: toNumberOrNull(data.baseRate),
        source: data.source || null,
        bookedBy: data.bookedBy || null,
      },
    })

    res.status(201).json(booking)
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
    const where = req.query.leadId ? { leadId: Number(req.query.leadId) } : {}

    const totalItems = await prisma.booking.count({ where })
    const data = await prisma.booking.findMany({
      where,
      skip,
      take: limit,
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

    const result = await prisma.booking.update({
      where: { id },
      data: {
        unit: data.unit,
        customerName: data.customerName,
        stage: data.stage,
        projectDetails: data.projectDetails,
        bookedOn: data.bookedOn ? new Date(data.bookedOn) : data.bookedOn,
        saleableArea: toNumberOrNull(data.saleableArea),
        basePrice: toNumberOrNull(data.basePrice),
        baseRate: toNumberOrNull(data.baseRate),
        source: data.source,
        bookedBy: data.bookedBy,
      },
    })

    res.status(200).json(result)
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
