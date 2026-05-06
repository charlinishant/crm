const prisma = require("../lib/prisma")

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

    const record = await prisma.unit.create({ data: {
      unitList:{
        create:unitList.map(unit=>({
            name:unit.name,
            floor:unit.floor,
            unitIndex:unit.unitIndex,
            baseRate:unit.baseRate,
            basePrice:unit.basePrice,
            propertyPurpose:unit.propertyPurpose
        }))
      },
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
              name:true
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
    if (!id) res.status(400).json("ID is reuqred")

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

exports.deleteUnit = async (req, res) => {
  try {
    const id = req.params.id
    if (!id) res.status(400).json("ID is reuqred")

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
