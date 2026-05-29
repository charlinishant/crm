const prisma = require("../lib/prisma")

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

const toArray = (value) => {
    if (Array.isArray(value)) return value
    if (!value) return []
    return String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
}

const getAreaForBasis = (data, basis) => {
    if (basis === "On Saleable") return data.saleable
    if (basis === "On Built-up") return data.builtupArea
    return data.carpet
}

const validateFloorPlan = (data) => {
    if (
        data.applicableFloorFrom !== null &&
        data.applicableFloorTo !== null &&
        data.applicableFloorFrom > data.applicableFloorTo
    ) {
        return "Applicable Floor From must be less than or equal to Applicable Floor To"
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
        data.status === "Active" &&
        (!Array.isArray(data.floorPlanImages) || data.floorPlanImages.length === 0)
    ) {
        return "Floor Plan Image is required when status is Active"
    }

    return null
}

const normalizeFloorPlanPayload = (body) => {
    const autoCalc = body.autoCalc === undefined ? true : toBoolean(body.autoCalc)
    const data = {
        name: String(body.name || "").trim(),
        projectId: toIntOrNull(body.projectId),
        towerId: toIntOrNull(body.towerId),
        configurationLabel: body.configurationLabel || null,
        status: body.status || "Active",
        unitStream: body.unitStream || "Sale Unit",
        reraReference: body.reraReference || null,
        type: body.type || null,
        category: body.category || null,
        bedrooms: toIntOrNull(body.bedrooms),
        bathrooms: toNumberOrNull(body.bathrooms),
        balconies: toIntOrNull(body.balconies),
        kitchenType: body.kitchenType || null,
        additionalRooms: toArray(body.additionalRooms),
        applicableFloorFrom: toIntOrNull(body.applicableFloorFrom),
        applicableFloorTo: toIntOrNull(body.applicableFloorTo),
        unitNumbers: body.unitNumbers || null,
        totalUnitsOfPlan: toIntOrNull(body.totalUnitsOfPlan),
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
    if (autoCalc && data.baseRate !== null && rateArea !== null) {
        data.basePrice = Number((data.baseRate * rateArea).toFixed(2))
    } else {
        data.basePrice = toNumberOrNull(body.basePrice)
    }

    data.coverArea = data.builtupArea

    return data
}


exports.createFloor = async (req, res)=>{
    try {
        const data = normalizeFloorPlanPayload(req.body)
        const validationError = validateFloorPlan(data)
        if (validationError) {
            return res.status(400).json({ message: validationError })
        }

        const record = await prisma.floorPlan.create({data:data})

        res.status(201).json({
            "id":record.id,
            "message":"floor plan created successfully"
        })

    } catch (error) {
        console.log(error);
        
        res.status(500).json("Something went wrong")
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
                res.status(200).json(result)
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
                    measure:true,
                    baseRate:true,
                    basePrice:true,
                }
            })

            let context = {
                page:page,
                limit:limit,
                totalItems:totalItems,
                data:result
            }
            res.status(200).json(context)
        }
    }
    catch(error){
        console.log(error);
        res.status(500).json("something went wrong")
    }
}

exports.updateFloor = async (req, res)=>{
    try {
        const data = normalizeFloorPlanPayload(req.body)
        const validationError = validateFloorPlan(data)
        if (validationError) {
            return res.status(400).json({ message: validationError })
        }
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const record = await prisma.floorPlan.findUnique({where:{id:parseInt(id)}})
        if(!record)
            res.status(400).json("Floor plan not found")    

        const result = await  prisma.floorPlan.update({
            where:{id:parseInt(record.id)},
            data:data
        })

        res.status(200).json(result)
    } catch (error) {
        console.log(error);
        res.status(500).json("Something went wrong")
    }
}

exports.deleteFloor = async (req, res)=>{
    try {
        const id = req.params.id
        if(!id)
            res.status(400).json("ID is required")    

        const record = await prisma.floorPlan.findUnique({where:{id:parseInt(id)}})
        if(!record)
            res.status(400).json("Floor plan not found")    

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
