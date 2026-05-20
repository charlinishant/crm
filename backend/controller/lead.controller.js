const fs = require("fs")
const XLSX = require("xlsx")
const prisma = require("../lib/prisma")
const { create } = require("domain")

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phoneRegex = /^\d{10}$/
const validLeadStatuses = new Set([
  "New",
  "Qualified",
  "In_sourcing",
  "In_closing",
  "Booked",
  "Nurture",
])
const leadTeamSelect = {
  id: true,
  isActive: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  secondaryPhone: true,
  timeZone: true,
  linkedUrl: true,
  description: true,
  role: true,
  department: true,
  defaultRouting: true,
  defaultRoutingRule: true,
  autoRoster: true,
  teamId: true,
  pushNotification: true,
  gpsTracking: true,
}
const importStatusMap = {
  new: "New",
  qualified: "Qualified",
  in_sourcing: "In_sourcing",
  "in sourcing": "In_sourcing",
  in_closing: "In_closing",
  "in closing": "In_closing",
  booked: "Booked",
  nurture: "Nurture",
}

const normalizeImportStatus = (value) => {
  const rawValue = String(value || "").trim()
  if (!rawValue) return "New"
  if (validLeadStatuses.has(rawValue)) return rawValue

  return importStatusMap[rawValue.toLowerCase()] || "New"
}

const normalizeLeadStatusValue = (value) => {
  const rawValue = String(value || "").trim()
  if (!rawValue) return undefined
  if (validLeadStatuses.has(rawValue)) return rawValue

  return importStatusMap[rawValue.toLowerCase()] || "New"
}

const toNullableString = (value) => {
  if (value === undefined || value === null || value === "") return null
  return String(value).trim()
}

const toNullableJsonString = (value) => {
  const normalizedValue = toNullableString(value)
  return normalizedValue ? [normalizedValue] : null
}

const toRequiredString = (value) => String(value || "").trim()
const toNullableInt = (value) => {
  if (value === undefined || value === null || value === "") return null
  const number = parseInt(value)
  return Number.isNaN(number) ? null : number
}
const toImportInt = (value, defaultValue = null) => {
  const number = parseInt(value)
  return Number.isNaN(number) ? defaultValue : number
}
const toImportFloat = (value, defaultValue = null) => {
  const number = parseFloat(value)
  return Number.isNaN(number) ? defaultValue : number
}

const normalizeEmailValue = (value) => String(value || "").trim().toLowerCase()
const normalizePhoneValue = (value) => String(value || "").replace(/\D/g, "")
const toRequiredPhone = (value) => normalizePhoneValue(value)

const extractJsonValues = (items) => {
  if (!Array.isArray(items)) return []

  return items
    .map(item => {
      if (item && typeof item === "object") return item.value
      return item
    })
    .filter(value => value !== undefined && value !== null && value !== "")
}

const getLeadDuplicateKeys = (lead) => {
  const emails = extractJsonValues(lead.emails)
    .map(normalizeEmailValue)
    .filter(Boolean)
  const phones = extractJsonValues(lead.phones)
    .map(normalizePhoneValue)
    .filter(Boolean)

  return {
    emails,
    phones,
    keys: [
      ...emails.map(value => `email:${value}`),
      ...phones.map(value => `phone:${value}`),
    ],
  }
}

const addLeadKeysToSet = (keySet, lead) => {
  getLeadDuplicateKeys(lead).keys.forEach(key => keySet.add(key))
}

const hasDuplicateLeadKey = (keySet, lead) =>
  getLeadDuplicateKeys(lead).keys.some(key => keySet.has(key))

const filterDuplicateLeads = (leads) => {
  const seenKeys = new Set()

  return leads.filter(lead => {
    const duplicateKeys = getLeadDuplicateKeys(lead).keys

    if (!duplicateKeys.length) return true
    if (duplicateKeys.some(key => seenKeys.has(key))) return false

    duplicateKeys.forEach(key => seenKeys.add(key))
    return true
  })
}

const normalizeAddressList = (value) => {
  if (!Array.isArray(value)) return []

  return value.map(({ address, street, city, state, country, zip }) => ({
    address: toNullableString(address),
    street: toNullableString(street),
    city: toNullableString(city),
    state: toNullableString(state),
    country: toNullableString(country),
    zip: toNullableString(zip),
  }))
}

const findDuplicateLead = async (leadData) => {
  const existingLeads = await prisma.lead.findMany({
    where: { 
      is_delete: false  // Match the filter used in getLeads
    },
    select: { id: true, emails: true, phones: true },
  })
  const existingKeys = new Set()
  existingLeads.forEach(lead => addLeadKeysToSet(existingKeys, lead))

  return hasDuplicateLeadKey(existingKeys, leadData)
}

exports.createLead = async (req, res) => {
  try {
    let {
      salutation,
      firstName,
      lastName,
      emails,
      phones,
      status,
      timeZone,
      tags,
      interestedProjects,
      teamId,
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
      purpose,
      nri,
      budgetMin,
      budgetMax,
      possessionMin,
      possessionMax,
      area,
      fundingSource,
      propertyType,
      configration,
      budget,
      bathroomPreferences,
      furnishing,
      facing,
      locationPreferences,
      requirementComment,
    } = req.body

    const validEmails = Array.isArray(emails) ? emails.filter(item => item?.value) : []
    const validPhones = Array.isArray(phones) ? phones.filter(item => item?.value) : []

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "First name and last name are required" })
    }

    if (!validEmails.length || validEmails.some(item => !emailRegex.test(String(item.value).trim()))) {
      return res.status(400).json({ message: "A valid email address is required" })
    }

    if (!validPhones.length || validPhones.some(item => !phoneRegex.test(String(item.value).trim()))) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" })
    }

    const duplicateLeadExists = await findDuplicateLead({
      emails: validEmails,
      phones: validPhones,
    })

    if (duplicateLeadExists) {
      return res.status(409).json({ message: "Duplicate lead already exists with the same email or phone number" })
    }

    gender = gender ? gender.toUpperCase() : null
    teamId = toNullableInt(teamId)
    status = status ? normalizeLeadStatusValue(status) : "New"  // Set default status
    const leadAddressList = normalizeAddressList(leadAddress)
    const personalAddressList = normalizeAddressList(personalAddress)
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
        teamId,
        channelPartner,
        conductSiteVisit,
        conductSiteDate,
        leadAddress: {
          create: leadAddressList,
        },
        companyName,
        type,
        carpetArea,
        seats,
        tenure,
        gender,
        occupations,
        age,
        birthday: birthday && birthday !== "" ? new Date(birthday) : null,
        maritalStatus,
        anniversary:
          anniversary && anniversary !== "" ? new Date(anniversary) : null,
        industry,
        personalAddress: {
          create: personalAddressList,
        },
        url,
        education,
        companyTitle,
        income,
        purpose,
        nri,
        budgetMin,
        budgetMax,
        possessionMin,
        possessionMax,
        area,
        fundingSource,
        propertyType,
        configration,
        budget,
        bathroomPreferences,
        furnishing,
        facing,
        locationPreferences,
      },
      include: {
        leadAddress: true,
        personalAddress: true,
      },
    })
    res.status(201).json(lead)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.getLeads = async (req, res) => {
  try {
    const userId = req.query.userId || null
    const activeLeadWhere = {
      is_delete: false
    }
    
    if (userId) {
      const leads = await prisma.lead.findMany({
        where: {
          ...activeLeadWhere,
          teamId: parseInt(userId),
        },
        include:{
          team:{
            select:{
            id:true,
            isActive:true,
            username:true,
            email:true,
            firstName:true,
            lastName:true,
            phone:true,
            secondaryPhone:true,
            timeZone:true,
            linkedUrl:true,
            description:true,
            role:true,
            department:true,
            defaultRouting:true,
            defaultRoutingRule:true,
            autoRoster:true,
            teamId:true,
            pushNotification:true,
            gpsTracking:true
            }
          }
        },
      })
      res.status(200).json(filterDuplicateLeads(leads))
    } else {
      const Leads = await prisma.lead.findMany({
        where: {...activeLeadWhere},
        include:{
          team:{
            select:{
            id:true,
            isActive:true,
            username:true,
            email:true,
            firstName:true,
            lastName:true,
            phone:true,
            secondaryPhone:true,
            timeZone:true,
            linkedUrl:true,
            description:true,
            role:true,
            department:true,
            defaultRouting:true,
            defaultRoutingRule:true,
            autoRoster:true,
            teamId:true,
            pushNotification:true,
            gpsTracking:true
            }
          }
        }
      })
      res.status(200).json(filterDuplicateLeads(Leads))
    }
  } catch (err) {
  console.log(err)
  res.status(500).json("something went wrong")
  }
}

exports.getTrashLeads = async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: {
       is_delete:true
      },
      include:{
        team:{
          select:{
          id:true,
          isActive:true,
          username:true,
          email:true,
          firstName:true,
          lastName:true,
          phone:true,
          secondaryPhone:true,
          timeZone:true,
          linkedUrl:true,
          description:true,
          role:true,
          department:true,
          defaultRouting:true,
          defaultRoutingRule:true,
          autoRoster:true,
          teamId:true,
          pushNotification:true,
          gpsTracking:true
          }
        }
      },
      orderBy: {
        deletedAt: "desc",
      },
    })

    res.status(200).json(leads)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.getLeadById = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({
      where: { id: Number(id) },
      include: {
        leadAddress: true,
        personalAddress: true,
        team: {
          select: leadTeamSelect,
        },
      },
    })
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
    const data = { ...req.body }
    delete data.id
    delete data._id
    delete data.createdAt
    delete data.updatedAt
    delete data.team
    delete data.bookings
    delete data.transactionType
    delete data.requirementComment
    delete data.basiComment
    delete data.deletedAt
    delete data.is_delete

    if (data.status !== undefined) {
      data.status = normalizeLeadStatusValue(data.status)
    }
    if (data.teamId !== undefined) {
      data.teamId = toNullableInt(data.teamId)
    }
    if (data.gender) {
      data.gender = String(data.gender).toUpperCase()
    }
    if (data.birthday === "") data.birthday = null
    if (data.anniversary === "") data.anniversary = null
    if (data.conductSiteDate === "") data.conductSiteDate = null
    if (Array.isArray(data.leadAddress)) {
      data.leadAddress = {
        deleteMany: {},
        create: normalizeAddressList(data.leadAddress),
      }
    }
    if (Array.isArray(data.personalAddress)) {
      data.personalAddress = {
        deleteMany: {},
        create: normalizeAddressList(data.personalAddress),
      }
    }
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } })
    if (!lead) return res.status(404).json("Lead not found")

    const result = await prisma.lead.update({
      where: { id: lead.id },
      data: data,
      include: {
        leadAddress: true,
        personalAddress: true,
        team: {
          select: leadTeamSelect,
        },
      },
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

    const result = await prisma.lead.update({
      where: { id: lead.id },
      data: { deletedAt: new Date(), is_delete:true },
    })
    res.status(200).json(result)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.restoreLead = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } })
    if (!lead) return res.status(404).json("Lead not found")

    const result = await prisma.lead.update({
      where: { id: lead.id },
      data: { deletedAt: null, is_delete:false },
    })
    res.status(200).json(result)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.permanentlyDeleteLead = async (req, res) => {
  try {
    const id = req.params.id
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } })
    if (!lead) return res.status(404).json("Lead not found")

    const result = await prisma.$transaction([
      prisma.leadAddress.deleteMany({ where: { leadId: lead.id } }),
      prisma.personalAddress.deleteMany({ where: { leadId: lead.id } }),
      prisma.lead.delete({ where: { id: lead.id } }),
    ])
    res.status(200).json(result)
  } catch (err) {
    console.log(err)
    res.status(500).json("something went wrong")
  }
}

exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Excel file" })
    }

    const selectedTeamId = toNullableInt(req.body.teamId)
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(sheet)

    const projectNames = [
      ...new Set(data.map(row => row["Interested projects"]).filter(Boolean)),
    ]

    const projectsFromDb = await prisma.project.findMany({
      where: { name: { in: projectNames } },
      select: { id: true, name: true },
    })
    const usersFromDb = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true },
    })

    const projectMap = {}
    projectsFromDb.forEach(p => {
      projectMap[p.name] = p.name
    })
    const userMap = {}
    usersFromDb.forEach(user => {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
      ;[fullName, user.username, user.email, String(user.id)].filter(Boolean).forEach(key => {
        userMap[key.toLowerCase()] = user.id
      })
    })

    const roundRobinUsers = usersFromDb.filter(user => user.role !== "ADMIN")
    const assignableUsers = roundRobinUsers.length ? roundRobinUsers : usersFromDb
    const assignmentCounts = {}
    const userNameMap = {}

    usersFromDb.forEach(user => {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
      userNameMap[user.id] = fullName || user.username || user.email || `User #${user.id}`
    })

    const mapData = data.map((row, index) => {
      const firstName = toRequiredString(row["First name"])
      const lastName = toRequiredString(row["Last name"])
      const phone = toRequiredPhone(row["Phone"])

      if (!firstName || !lastName || !phone) {
        throw new Error(`Excel row ${index + 2}: First name, last name, and phone are required`)
      }

      if (!phoneRegex.test(phone)) {
        throw new Error(`Excel row ${index + 2}: Phone number must be exactly 10 digits`)
      }

      const projectName = row["Interested projects"]
      const projectId = projectMap[projectName] || null
      const teamValue = row["Team"] ? String(row["Team"]).trim().toLowerCase() : ""
      const teamId = selectedTeamId ||
        userMap[teamValue] ||
        (assignableUsers.length ? assignableUsers[index % assignableUsers.length].id : null)

      return {
        salutation: row["Salutation"] || null,
        firstName,
        lastName,
        emails: [
          { type: row["Email Type"] || null, value: row["Email"] || null },
        ],
        phones: [
          { type: row["Phone Type"] || null, value: phone },
        ],
        status: normalizeImportStatus(row["Status"]),
        timeZone: row["Timezone"] || null,
        tags: row["Tags"] || null,
        interestedProjects: projectId,
        teamId,
        channelPartner: row["Channel partner"] || null,
        conductSiteVisit: row["Conduct site visit"] || null,
        conductSiteDate:
          row["Conduct site date"] && row["Conduct site date"] !== ""
            ? new Date(row["Conduct site date"])
            : null,
        leadAddress: {
          address: row["Aaddress"] || null,
          street: row["Street"] || null,
          city: row["City"] || null,
          state: row["State"] || null,
          country: row["Country"] || null,
          zip: row["Zip"] || null,
        },
        companyName: row["Company name"] || null,
        type: row["Type"] || null,
        carpetArea: row["Carpet area"] || null,
        seats: toImportInt(row["Seats"], 0),
        tenure: toImportFloat(row["Tenure"], 0),
        gender: row["Gender"] || null,
        occupations: row["Occupations"] || null,
        age: toImportInt(row["Age"]),
        birthday:
          row["Birthday"] && row["Birthday"] !== ""
            ? new Date(row["Birthday"])
            : null,
        maritalStatus:
          row["Marital status"] && row["Marital status"] == "Married"
            ? true
            : false,
        anniversary:
          row["Anniversary"] && row["Anniversary"] !== ""
            ? new Date(row["Anniversary"])
            : null,
        industry: row["Industry"] || "",
        personalAddress: {
          address: row["Personal address"] || null,
          street: row["Personal street"] || null,
          city: row["Personal city"] || null,
          state: row["Personal state"] || null,
          country: row["Personal country"] || null,
          zip: row["Personal zip"] || null,
        },
        url: toNullableJsonString(row["Url"]),
        education: toNullableJsonString(row["Education"]),
        companyTitle: toNullableJsonString(row["Company title"]),
        income: toNullableJsonString(row["Income"]),
        purpose: toNullableJsonString(row["Purpose"]),
        nri: ["yes", "y", "true"].includes(String(row["NRI"] || "").toLowerCase()),
        budgetMin: toImportInt(row["Budget min"]),
        budgetMax: toImportInt(row["Budget max"]),
        possessionMin: row["Possession min"] || null,
        possessionMax: row["Possession Max"] || null,
        area: row["Area"] || null,
        fundingSource: row["Funding source"] || null,
        propertyType: row["Property type"] || null,
        configration: row["Configration"] || null,
        budget: toNullableString(row["Budget"]),
        bathroomPreferences: row["Bathroom preferences"] || null,
        furnishing: row["Furnishing"] || null,
        facing: row["Facing"] || null,
        locationPreferences: row["Location preferences"] || null,
      }
    })

    const existingLeads = await prisma.lead.findMany({
      where: { is_delete: false },
      select: { id: true, emails: true, phones: true },
    })
    const existingKeys = new Set()
    existingLeads.forEach(lead => addLeadKeysToSet(existingKeys, lead))

    const result = []
    const skippedDuplicates = []
    for (let index = 0; index < mapData.length; index += 1) {
      const row = mapData[index]

      if (hasDuplicateLeadKey(existingKeys, row)) {
        skippedDuplicates.push(index + 2)
        continue
      }

      try {
        const lead = await prisma.lead.create({
          data: {
            ...row,
            gender: row.gender ? String(row.gender).toUpperCase() : null,
            is_delete: false,
            is_active: true,
            leadAddress: {
              create: [row.leadAddress],
            },
            personalAddress: {
              create: [row.personalAddress],
            },
          },
        })
        result.push(lead)
        addLeadKeysToSet(existingKeys, row)

        if (row.teamId) {
          const userName = userNameMap[row.teamId] || `User #${row.teamId}`
          assignmentCounts[userName] = (assignmentCounts[userName] || 0) + 1
        }
      } catch (error) {
        console.log(`Lead import failed at Excel row ${index + 2}`, error)
        return res.status(400).json({
          message: `Import failed at Excel row ${index + 2}: ${error.message || "Invalid lead data"}`,
        })
      }
    }

    // const leads = await prisma.lead.createMany({ data: mapData })
    console.log(result)

    res.status(201).json({
      message: skippedDuplicates.length
        ? `Lead import completed. ${result.length} imported, ${skippedDuplicates.length} duplicate rows skipped.`
        : "lead inserted successfully",
      importedCount: result.length,
      skippedDuplicateCount: skippedDuplicates.length,
      skippedDuplicateRows: skippedDuplicates,
      assignedUserCount: assignableUsers.length,
      assignmentCounts,
    })
  } catch (error) {
    console.log(error)

    if (String(error.message || "").startsWith("Excel row ")) {
      return res.status(400).json({ message: error.message })
    }

    return res.status(500).json("Something went wrong")
  }
}

exports.sampleExcel = (req, res) => {
  const data = [
    {
      Salutation: "Mr",
      "First name": "John",
      "Last name": "Doe",
      "Email Type": "Office",
      Email: "john@gmail.com",
      "Phone Type": "Mobile",
      Phone: "9876543210",
      Status: "New",
      Timezone: "UTC",
      Tags: "Hot Lead",
      "Interested projects": "Project A",
      Team: "Sales",
      "Channel partner": "ABC Realty",
      "Conduct site visit": "Yes",
      "Conduct site date": "2024-01-01",

      Aaddress: "Office Address",
      Street: "Main Road",
      City: "Pune",
      State: "Maharashtra",
      Country: "India",
      Zip: "411001",

      "Company name": "ABC Pvt Ltd",
      Type: "MEETINGROOMS",
      "Carpet area": "1200",
      Seats: "10",
      Tenure: "2",
      Gender: "Male",
      Occupations: "Engineer",
      Age: "30",
      Birthday: "1994-01-01",
      "Marital status": "Single",
      Anniversary: "",

      Industry: "IT",

      "Personal address": "Home Address",
      "Personal street": "MG Road",
      "Personal city": "Pune",
      "Personal state": "Maharashtra",
      "Personal country": "India",
      "Personal zip": "411002",

      Url: "https://example.com",
      Education: "B.Tech",
      "Company title": "Manager",
      Income: "1000000",
      "Basi comment": "Interested",
      Purpose: "Investment",
      NRI: "Yes/No",

      "Budget min": "5000000",
      "Budget max": "10000000",
      "Possession min": "2025",
      "Possession Max": "2026",
      Area: "Pune",
      "Funding source": "Loan",
      "Property type": "Flat",
      Configration: "2BHK",
      Budget: "8000000",
      "Bathroom preferences": "2",
      Furnishing: "Semi",
      Facing: "East",
      "Location preferences": "Baner",
      "Requirement comment": "Near IT park",
    },
  ]

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, "Sample")

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  })

  res.setHeader("Content-Disposition", "attachment; filename=lead_sample.xlsx")
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  )

  res.send(buffer)
}
