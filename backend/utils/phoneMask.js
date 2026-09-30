const isAdminUser = (req) => {
  const role = String(req?.authUser?.role || req?.user?.role || "").trim().toUpperCase()
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

/**
 * Masks a phone number string dynamically (e.g. "9356532881" -> "9356XXXXXX" or "+91 9356532881" -> "+91 9356XXXXXX")
 * Handles standard 10-digit mobiles, 11-digit numbers with leading 0, 12-digit numbers with country codes,
 * landlines, WhatsApp prefixes, and international formats.
 */
const maskPhoneNumber = (phone) => {
  if (phone === undefined || phone === null || phone === "") return phone
  const str = String(phone).trim()
  if (!str || str === "-") return str

  // If already masked, return as is
  if (str.includes("X") || str.includes("x") || str.includes("*")) {
    return str
  }

  // Check whatsapp: prefix
  const isWhatsApp = str.toLowerCase().startsWith("whatsapp:")
  const rawValue = isWhatsApp ? str.slice(9).trim() : str

  // Extract country code or leading plus
  let prefix = isWhatsApp ? "whatsapp:" : ""
  let nationalNumber = rawValue

  if (rawValue.startsWith("+91")) {
    prefix += rawValue.startsWith("+91 ") ? "+91 " : "+91"
    nationalNumber = rawValue.slice(3).trim()
  } else if (rawValue.startsWith("+")) {
    const match = rawValue.match(/^(\+\d{1,3}\s*)/)
    if (match) {
      prefix += match[1]
      nationalNumber = rawValue.slice(match[1].length).trim()
    }
  } else if (rawValue.length === 12 && rawValue.startsWith("91") && /^\d+$/.test(rawValue)) {
    prefix += "+91"
    nationalNumber = rawValue.slice(2)
  }

  const digits = nationalNumber.replace(/\D/g, "")
  if (!digits) {
    const allDigits = rawValue.replace(/\D/g, "")
    if (!allDigits) return str
    if (allDigits.length === 12 && allDigits.startsWith("91")) {
      return `${isWhatsApp ? "whatsapp:" : ""}+91${allDigits.slice(2, 6)}XXXXXX`
    }
    const visible = allDigits.slice(0, 4)
    const maskedCount = Math.max(6, allDigits.length - 4)
    return `${isWhatsApp ? "whatsapp:" : ""}${visible}${"X".repeat(maskedCount)}`
  }

  if (digits.length <= 4) {
    return `${prefix}${digits[0]}${"X".repeat(Math.max(1, digits.length - 1))}`
  }

  // Dynamic masking: first 4 digits visible, remaining digits masked with X
  const visible = digits.slice(0, 4)
  const maskedCount = Math.max(6, digits.length - 4)
  const maskedDigits = `${visible}${"X".repeat(maskedCount)}`

  return `${prefix}${maskedDigits}`
}

/**
 * Masks phone objects or strings in arrays
 */
const maskPhoneValue = (val) => {
  if (!val) return val
  if (typeof val === "string" || typeof val === "number") {
    return maskPhoneNumber(val)
  }
  if (typeof val === "object") {
    const masked = { ...val }
    if (masked.value !== undefined) masked.value = maskPhoneNumber(masked.value)
    if (masked.phone !== undefined) masked.phone = maskPhoneNumber(masked.phone)
    if (masked.number !== undefined) masked.number = maskPhoneNumber(masked.number)
    return masked
  }
  return val
}

const maskPhoneList = (phones) => {
  if (!phones) return phones
  if (Array.isArray(phones)) {
    return phones.map(maskPhoneValue)
  }
  return maskPhoneValue(phones)
}

/**
 * Masks lead object phone fields
 */
const maskLeadData = (lead, isAdmin = false) => {
  if (!lead || isAdmin) return lead

  const masked = { ...lead }
  if (masked.phones !== undefined) {
    masked.phones = maskPhoneList(masked.phones)
  }
  if (masked.phone !== undefined) {
    masked.phone = maskPhoneNumber(masked.phone)
  }
  if (masked.alternatePhone !== undefined) {
    masked.alternatePhone = maskPhoneNumber(masked.alternatePhone)
  }
  if (masked.secondaryPhone !== undefined) {
    masked.secondaryPhone = maskPhoneNumber(masked.secondaryPhone)
  }
  if (masked.mobile !== undefined) {
    masked.mobile = maskPhoneNumber(masked.mobile)
  }
  if (masked.callerNumber !== undefined) {
    masked.callerNumber = maskPhoneNumber(masked.callerNumber)
  }
  if (masked.customerNumber !== undefined) {
    masked.customerNumber = maskPhoneNumber(masked.customerNumber)
  }
  if (masked.leadPhone !== undefined) {
    masked.leadPhone = maskPhoneNumber(masked.leadPhone)
  }
  if (Array.isArray(masked.bookings)) {
    masked.bookings = masked.bookings.map((b) => maskBookingData(b, false))
  }
  if (Array.isArray(masked.callLogs)) {
    masked.callLogs = masked.callLogs.map((c) => maskCallLogData(c, false))
  }

  return masked
}

const maskBookingData = (booking, isAdmin = false) => {
  if (!booking || isAdmin) return booking
  const masked = { ...booking }
  if (masked.phone !== undefined) {
    masked.phone = maskPhoneNumber(masked.phone)
  }
  if (masked.customerPhone !== undefined) {
    masked.customerPhone = maskPhoneNumber(masked.customerPhone)
  }
  if (masked.lead) {
    masked.lead = maskLeadData(masked.lead, false)
  }
  return masked
}

const maskCallLogData = (callLog, isAdmin = false) => {
  if (!callLog || isAdmin) return callLog
  const masked = { ...callLog }
  if (masked.phone !== undefined) {
    masked.phone = maskPhoneNumber(masked.phone)
  }
  if (masked.leadPhone !== undefined) {
    masked.leadPhone = maskPhoneNumber(masked.leadPhone)
  }
  if (masked.callerNumber !== undefined) {
    masked.callerNumber = maskPhoneNumber(masked.callerNumber)
  }
  if (masked.customerNumber !== undefined) {
    masked.customerNumber = maskPhoneNumber(masked.customerNumber)
  }
  if (masked.lead) {
    masked.lead = maskLeadData(masked.lead, false)
  }
  return masked
}

const maskWhatsAppMessageData = (msg, isAdmin = false) => {
  if (!msg || isAdmin) return msg
  const masked = { ...msg }
  if (masked.to !== undefined) {
    masked.to = maskPhoneNumber(masked.to)
  }
  if (masked.from !== undefined) {
    masked.from = maskPhoneNumber(masked.from)
  }
  if (masked.lead) {
    masked.lead = maskLeadData(masked.lead, false)
  }
  return masked
}

const maskFollowUpData = (followUp, isAdmin = false) => {
  if (!followUp || isAdmin) return followUp
  const masked = { ...followUp }
  if (masked.phone !== undefined) {
    masked.phone = maskPhoneNumber(masked.phone)
  }
  if (masked.leadPhone !== undefined) {
    masked.leadPhone = maskPhoneNumber(masked.leadPhone)
  }
  if (masked.customerPhone !== undefined) {
    masked.customerPhone = maskPhoneNumber(masked.customerPhone)
  }
  if (masked.lead) {
    masked.lead = maskLeadData(masked.lead, false)
  }
  return masked
}

const maskScheduleVisitData = (visit, isAdmin = false) => {
  if (!visit || isAdmin) return visit
  const masked = { ...visit }
  if (masked.phone !== undefined) {
    masked.phone = maskPhoneNumber(masked.phone)
  }
  if (masked.leadPhone !== undefined) {
    masked.leadPhone = maskPhoneNumber(masked.leadPhone)
  }
  if (masked.visitorPhone !== undefined) {
    masked.visitorPhone = maskPhoneNumber(masked.visitorPhone)
  }
  if (masked.customerPhone !== undefined) {
    masked.customerPhone = maskPhoneNumber(masked.customerPhone)
  }
  if (masked.lead) {
    masked.lead = maskLeadData(masked.lead, false)
  }
  return masked
}

const maskTaskData = (task, isAdmin = false) => {
  if (!task || isAdmin) return task
  const masked = { ...task }
  if (masked.phone !== undefined) {
    masked.phone = maskPhoneNumber(masked.phone)
  }
  if (masked.lead) {
    masked.lead = maskLeadData(masked.lead, false)
  }
  return masked
}

const maskTextWithPhone = (text) => {
  if (!text || typeof text !== "string") return text
  return text.replace(/(?:\+?91[\s-]?)?([6-9]\d{9})/g, (match) => {
    return maskPhoneNumber(match)
  })
}

const maskNotificationData = (notification, isAdmin = false) => {
  if (!notification || isAdmin) return notification
  const masked = { ...notification }
  if (masked.phone !== undefined) {
    masked.phone = maskPhoneNumber(masked.phone)
  }
  if (masked.description) {
    masked.description = maskTextWithPhone(masked.description)
  }
  if (masked.message) {
    masked.message = maskTextWithPhone(masked.message)
  }
  if (masked.lead) {
    masked.lead = maskLeadData(masked.lead, false)
  }
  return masked
}

module.exports = {
  isAdminUser,
  maskPhoneNumber,
  maskPhoneList,
  maskLeadData,
  maskFollowUpData,
  maskScheduleVisitData,
  maskBookingData,
  maskCallLogData,
  maskWhatsAppMessageData,
  maskTaskData,
  maskNotificationData,
}
