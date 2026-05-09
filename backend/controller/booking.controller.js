const prisma = require("../lib/prisma")

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

exports.createBooking = async (req, res) => {
  try {
    const data = req.body

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

      let costSheetData = req.body.costSheet
      
      const costSheet = await tx.costSheet.createMany({
        data:costSheetData.map(item=>({
          ...item,
          bookingId:booking.id
        }))
      })

      
      let paymentScheduleData = data.paymentSchedule
      
      const paymentSchedule = await tx.paymentSchedule.createMany({
        data:paymentScheduleData.map(item=>({
          ...item,
          bookingId:booking.id
        }))
      })
      
      
      
    })

    res.status(201).json("Booking create successfully")
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
