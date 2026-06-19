const prisma = require("../lib/prisma")

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

exports.createUnit = async (req, res) => {
  try {
    const {
      unitList,
      projectId,
      towerId,
      floorId,
      type,
      category,
      bedrooms,
      bathrooms,
      measure,
      carpet,
      saleable,
      loading,
      description,
    } = req.body

    if (!Array.isArray(unitList) || unitList.length === 0) {
      return res.status(400).json({ message: "Unit list is required" })
    }

    const floorPlan = floorId
      ? await prisma.floorPlan.findUnique({
          where: { id: Number(floorId) },
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
          },
        })
      : null

    const record = await prisma.unit.create({ data: {
      unitList:{
        create:unitList.map(unit=>({
            name:unit.name,
            floor:unit.floor,
            unitIndex:unit.unitIndex,
            baseRate:unit.baseRate,
            basePrice:calculateBasePrice(unit.baseRate, floorPlan),
            propertyPurpose:unit.propertyPurpose
        }))
      },
      projectId,
      towerId,
      floorId,
      type: type ?? floorPlan?.type,
      category: category ?? floorPlan?.category,
      bedrooms: bedrooms ?? floorPlan?.bedrooms,
      bathrooms: bathrooms ?? floorPlan?.bathrooms,
      measure: measure ?? floorPlan?.measure,
      carpet: carpet ?? floorPlan?.carpet,
      saleable: saleable ?? floorPlan?.saleable,
      loading: loading ?? floorPlan?.loading,
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
              floorPlanImages: true,
              rateBasis: true,
              carpet: true,
              builtupArea: true,
              saleable: true,
            },
          },
        },
      })
      if (!result) res.status(200).json("Unit not found")
      else {
        res.status(200).json(result)
      }
    } else {
      let conditions = {}
      if (req.query.projectId) {
        conditions.projectId = parseInt(req.query.projectId)
      }
      if (req.query.towerId) {
        conditions.towerId = parseInt(req.query.towerId)
      }
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 10

      const skip = (page - 1) * limit

      const totalItems = await prisma.unit.count({ where: conditions })

      const result = await prisma.unit.findMany({
        where: conditions,
        skip: skip,
        take: limit,
        select: {
          id:true,
          unitList:{
            select:{
                id:true,
                name:true,
                floor:true,
                unitIndex:true,
                baseRate:true,
                basePrice:true,
                propertyPurpose:true
            }
          },
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
              floorPlanImages:true,
              rateBasis:true,
              carpet:true,
              builtupArea:true,
              saleable:true
            }
          },

          type: true,
          category: true,
          bedrooms: true,
          bathrooms: true,
          measure:true,
          carpet:true,
          saleable:true,
          loading:true,
          description:true

        },
      })

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
    const data = req.body
    const id = req.params.id
    if (!id) res.status(400).json("ID is required")

    const record = await prisma.unit.findUnique({
      where: { id: parseInt(id) },
    })
    if (!record) res.status(400).json("Unit not found")

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

    if (!existingUnit) return res.status(404).json({ message: "Unit not found" })

    const baseRate = payload.baseRate ?? existingUnit.baseRate
    const data = {
      name: payload.name,
      floor: payload.floor,
      unitIndex: payload.unitIndex,
      baseRate: payload.baseRate,
      basePrice: calculateBasePrice(baseRate, existingUnit.unit?.floor),
      propertyPurpose: payload.propertyPurpose,
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
    res.status(500).json({ message: "Something went wrong" })
  }
}

exports.deleteUnit = async (req, res) => {
  try {
    const id = req.params.id
    if (!id) res.status(400).json("ID is required")

    const record = await prisma.unit.findUnique({
      where: { id: parseInt(id) },
    })
    if (!record) res.status(400).json("Unit not found")

    const data = await prisma.unit.delete({ where: { id: record.id } })

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

    await prisma.unitModel.delete({ where: { id: Number(id) } })

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
          },
        },
      },
    })
    res.status(200).json(record)
}
