const prisma = require("../lib/prisma")

exports.createLead = async (req, res) => {
  try {
    const {
      salutation,
      firstName,
      lastName,
      emails,
      phones,
      status,
      timeZone,
      tags,
      interestedProjects,
      team,
      channelPartner,
      conductSiteVisit,
      conductSiteDate,
      leadAddress,
      companyName,
      type,
      carpetArea,
      seats,
      tenure,
      gender,
      occupations,
      age,
      birthday,
      maritalStatus,
      anniversary,
      industry,
      personalAddress,
      url,
      education,
      companyTitle,
      income,
      basiComment,
      purpose,
      nri,
      budejetMin,
      budejetMax,
      professionMin,
      professionMax,
      area,
      fundingSouurce,
      propertyType,
      configration,
      budget,
      bathroomPreferences,
      furnishing,
      facing,
      locationPreferences,
      requirementComment,
    } = req.body
    const lead = await prisma.lead.create({
      data: {
        salutation,
        firstName,
        lastName,
        emails,
        phones,
        status,
        timeZone,
        tags,
        interestedProjects,
        team,
        channelPartner,
        conductSiteVisit,
        conductSiteDate,
        leadAddress:{
            create:leadAddress.map(addr=>({
                address:addr.address,
                street:addr.street,
                city:addr.city,
                state:addr.state,
                country:addr.country,
                zip:addr.zip
            }))
        },
        companyName,
        type,
        carpetArea,
        seats,
        tenure,
        gender,
        occupations,
        age,
        birthday:birthday && birthday!==""? new Date(birthday):null,
        maritalStatus,
        anniversary:anniversary && anniversary !==""? new Date(anniversary):null,
        industry,
        personalAddress:{
            create:personalAddress.map(addr=>({
                address:addr.address,
                street:addr.street,
                city:addr.city,
                state:addr.state,
                country:addr.country,
                zip:addr.zip
            }))
        },
        url,
        education,
        companyTitle,
        income,
        basiComment,
        purpose,
        nri,
        budejetMin,
        budejetMax,
        professionMin,
        professionMax,
        area,
        fundingSouurce,
        propertyType,
        configration,
        budget,
        bathroomPreferences,
        furnishing,
        facing,
        locationPreferences,
        requirementComment
      },
      include:{
        leadAddress:true,
        personalAddress:true
      }
    })
    res.status(201).json(lead)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.getLeads = async (req, res) => {
  try {
    const Leads = await prisma.lead.findMany()
    res.status(200).json(Leads)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.getLeadById = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) }, include:{leadAddress:true, personalAddress:true} })
    if (!lead) return res.status(404).json("Lead not found")
    res.status(200).json(lead)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.updateLead = async (req, res) => {
  try {
    const id = req.params.id
    const data = req.body
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } })
    if (!lead) return res.status(404).json("Lead not found")

    const result = await prisma.lead.update({
      where: { id: lead.id },
      data: data,
    })
    res.status(200).json(result)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.deleteLead = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } })
    if (!lead) return res.status(404).json("Lead not found")

    const result = await prisma.$transaction([
        prisma.leadAddress.deleteMany({where:{leadId:lead.id}}),
        prisma.personalAddress.deleteMany({where:{leadId:lead.id}}),
        prisma.lead.delete({where: { id: lead.id },})
    ]) 
    res.status(200).json(result)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}
